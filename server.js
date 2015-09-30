var express = require('express');
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
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

http.listen(3000, "0.0.0.0", function(){
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
