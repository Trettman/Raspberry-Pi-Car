var express = require("express");
var app = express();
var http_steering = require("http").Server(app);
var io = require("socket.io")(http_steering);
var piblaster = require("pi-blaster.js");
var exec = require("child_process").exec;
var server_config = require("./modules/server_config.js");
var steering_config = require("./modules/steering_config.js");

var autoStopInterval = 0;

var steering = steering_config.starting_steering;
var beta;

var throttle = steering_config.starting_throttle;;
var gamma;

app.use(express.static(__dirname));

app.get("/", function(req, res){
    res.sendFile(__dirname + "/views/site.html"); // sendFile() requires and absolute path
});

app.get("/tilt", function(req, res){
    res.sendFile(__dirname + "/views/tilt.html");
});

app.get("/touch", function(req, res){
    res.sendFile(__dirname + "/views/touch.html");
});

app.get("/about", function(req, res){
    res.sendFile(__dirname + "/views/about.html");
});

// Sets steering server to listen to port 3000
http_steering.listen(server_config.steer_port);

// autoStopInterval = setInterval(autoStop, 2000); // If no commands are sent to the pi within the interval of 2000ms, then the car will stop

io.on("connection", function(socket){
    
    socket.on("device update", function(data){
        
        beta = data.beta;
        steering = normalize(steering_config.max_beta, steering_config.min_beta, -beta);
        
        gamma = data.gamma;
        throttle = normalize(steering_config.max_gamma, steering_config.min_gamma, gamma);
        
        // Sets PWM output using pi-blaster.js
        piblaster.setPwm(17, steering); // Forwards and backwards
        piblaster.setPwm(18, throttle); // Left and right
        console.log("Steering: " + steering + ". Throttle" + throttle);

        // Resets the auto stop interval
        clearInterval(autoStopInterval);
        autoStopInterval = setInterval(autoStop, 750);
    });
    
    // Starts Raspberry Pi video stream
    socket.on("start_stream", function(){
        exec("ffmpeg -s 240x180 -f video4linux2 -i /dev/video0 -f mpeg1video -b 75k -r 20 http://localhost:8082/");
    });

    // Ends Raspberry Pi video stream
    socket.on("stop stream", function(){
        exec("sudo kill ffmpeg");
    });

    // Shuts down Raspberry Pi upon request from socket
    socket.on("shut down", function(){
        exec("sudo shutdown -h now");
    });
});

/**
 * Returns a value between 0.12 and 0.17 calculated from maximum and minimum allowed beta/gamma and a given value
 *
 */
function normalize(max, min, value){
    if(value < min){
        gamma = min;
    } else if(gamma > max){
        gamma = max;
    }
    
    var from_zero = 0 - min; // How far the min value is from zero
    value += from_zero;
    var divider = (max + from_zero)/0.05 // The divider for normalizing
    value /= divider;
    value += 0.12; // 0.12 is the minimum allowed steering/throttle value
    
    return value;
}

function autoStop(){
    // Stops the car
    piblaster.setPwm(17, 0);
    piblaster.setPwm(18, 0);
    console.log("CAR STOPPED. Either an error occured or a user shut down the server.");
}

// The user presses CTRL + C to stop the server
process.on("SIGINT", function(){
    autoStop();
    console.log("Shutting down server and stopping car.");
    process.exit(); // Exits everything
});

console.log("Waiting for client connection on http://<RaPi ip>:3000");

/* The streaming server ------------------------------------------------------------------------------------- */

var webSocket = require("ws");
var http_streaming = require("http");

// Creates the ws-server using already defined port
var webSocketServer = new webSocket.Server({ port: server_config.websocket_port });

// Define width and height
var width = server_config.default_width;
var	height = server_config.default_height;

// Websocket Server
webSocketServer.on("connection", function(ws){
	// Send magic bytes and video size to the newly connected socket
	var streamHeader = new Buffer(8); // To deal with binary data directly
	streamHeader.write(stream_magic_bytes); // Writes magic bytes
	streamHeader.writeUInt16BE(width, 4); // Writes width
	streamHeader.writeUInt16BE(height, 6); // Writes height
	ws.send(streamHeader, { binary: true }); // Sends the stream header to the client where jsmpg deals with it
});

// Broadcasts stream to all connected clients (it'll only be one but support for more doesn't hurt)
webSocketServer.broadcast = function(data, opts){
	for(var i in this.clients){
		if(this.clients[i].readyState == 1){
			this.clients[i].send(data, opts);
		}
	}
};

// HTTP Server to accept incomming MPEG stream
var streamServer = http_streaming.createServer(function(req, res){
	req.on("data", function(data){
		webSocketServer.broadcast(data, { binary: true });
	});
}).listen(server_config.stream_port);

console.log("Listening for MPEG stream on http://<RaPi ip>:" + server_config.stream_port);
console.log("Listening for WebSocket connections on ws://<RaPi ip>:" + server_config.websocket_port);
