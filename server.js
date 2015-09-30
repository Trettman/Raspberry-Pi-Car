var express = require('express');
var app = express();
var http_steering = require("http").Server(app);
var io = require("socket.io")(http_steering);
var piblaster = require("pi-blaster.js");
var exec = require("child_process").exec;

var autoStopInterval = 0;

var steering = 0.145; // Straight forward
var beta;
var maxbeta = 30; // Full left
var minbeta = -30; // Full right

var throttle = 0.148; // The value that the car is stationary at
var gamma;
var maxgamma = -10; // Full speed
var mingamma = -90; // Full brake

app.use(express.static(__dirname));

app.get("/", function(req, res){
    res.sendFile(__dirname + "/site.html"); // res.sendFile requires and absolute path
});

app.get("/tilt", function(req, res){
    res.sendFile(__dirname + "/tilt.html");
});

app.get("/touch", function(req, res){
    res.sendFile(__dirname + "/touch.html");
});

app.get("/about", function(req, res){
    res.sendFile(__dirname + "/about.html");
});

http_steering.listen(3000, "0.0.0.0", function(){
    console.log("Listening on port: 3000");
});

// autoStopInterval = setInterval(autoStop, 2000); // If no commands are sent to the pi within the interval of 2000ms, then the car will stop

io.on("connection", function(socket){
    
    socket.on("device orientation", function(data){
        
        beta = data.beta;
        if(beta < minbeta){
            beta = minbeta;
        } else if(beta > maxbeta){
            beta = maxbeta;
        }
        
        // Provides a value between 0.12 and 0.17
        beta *= -1;
        beta += 30;
        beta /= 1200;
        beta += 0.12;
        steering = beta;
        
        gamma = data.gamma;
        if(gamma < mingamma){
            gamma = mingamma;
        } else if(gamma > maxgamma){
            gamma = maxgamma;
        }
        
        // Provides a value between 0.12 and 0.17
        gamma += 100;
        gamma /= 1833;
        gamma += 0.12;
        throttle = gamma;
        
        // Controls the car width PWM using pi-blaster.js
        piblaster.setPwm(17, steering); // Forwards and backwards
        piblaster.setPwm(18, throttle); // Left and right
        
        // Reset the auto stop interval
        clearInterval(autoStopInterval);
        autoStopInterval = setInterval(autoStop, 750);
    });
    
    // Shuts down Raspberry Pi upon request from socket
    socket.on("shut down", function(){
        exec("sudo shutdown -h now");
    });
});

function autoStop(){
    // Stops the car. I think 0 will stop the car...
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

/* The streaming server ------------------------------------------------------------------------------------- */

var webSocket = require("ws");
var http_streaming = require("http");

var	stream_port = 8082;
var	websocket_port = 8084;
var	stream_magic_bytes = "jsmp"; // Must be 4 bytes. Will be written to stream header to decide type

// Creates the ws-server using already defined port
var webSocketServer = new webSocket.Server({ port: websocket_port });

// Define width and height
var width = 240;
var	height = 180;

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

// HTTP Server to accept incomming MPEG Stream
var streamServer = http_streaming.createServer(function(req, res){
	req.on("data", function(data){
		webSocketServer.broadcast(data, { binary: true });
	});
}).listen(stream_port);

console.log("Listening for MPEG Stream on http://127.0.0.1:" + stream_port);
console.log("Awaiting WebSocket connections on ws://127.0.0.1:" + websocket_port);