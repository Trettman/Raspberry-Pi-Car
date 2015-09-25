var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var piblaster = require("pi-blaster.js");
var exec = require("child_process").exec;

var autoStopInterval = 0;

var gamma;
var beta;
// The values that the car is stationary or max speed/max angle at
var maxgamma = 1;
var mingamma = 0;
var maxbeta = 1;
var minbeta = 0;

app.get("/", function(req, res){
    res.sendFile(__dirname + "/site.html"); // res.sendFile requires and absolute path
});

http.listen(3000, "0.0.0.0", function(){
    console.log("Listening on port: 3000");
});

autoStopInterval = setInterval(autoStop, 2000); // If no commands are sent to the pi within the interval of 2000ms, then the car will stop

io.on("connection", function(socket){
    
    socket.on("device orientation", function(data){
        
        // Do some stuff
        
        gamma = data.gamma;
        beta = data.beta;
        
        if(gamma > maxgamma){
            gamma = maxgamma;
        } else if(gamma < mingamma){
            gamma = mingamma;
        }
        
        if(beta > maxbeta){
            beta = maxbeta;
        } else if(beta < minbeta){
            beta = minbeta;
        }
        
        // Controls the car width PWM using pi-blaster.js ("<value>" seems like it has to be between 0 and 1, where 1 is 100% and so on)
        piblaster.setPwm(17, "<value>"); // Forwards and backwards
        piblaster.setPwm(18, "<value>"); // Left and right
        
        // Reset the auto stop interval
        clearInterval(autoStopInterval);
        autoStopInterval = setInterval(autoStop, 2000);
    });
    
    // Shuts down Raspberry Pi upon request from socket
    socket.on("shut down", function(){
        exec("sudo shutdown -h now");
    });
    
    // Starts video recording
    socket.on("start video", function(requested_fps){
        var fps = 30;
        var width = 1920;
        var height = 1080;
        
        if(requested_fps == 60){
            width= 720;
            height: 720;
        }
        
        exec("sudo raspivideo -fps + fps + " -h + height + " -w " +width + " -vf -t 999999 -o ./videos/video_" + videoID);
    });
});

function autoStop(){
    // Stops the car. I think 0 will stop the car...
    piblaster.setPwn(17, 0);
    piblaster.setPwn(18, 0);
    console.log("CAR STOPPED. Either and error occured or a user shut down the server.");
}

// The user presses CTRL + C to stop the server
process.on("SIGINT", function(){
    autoStop();
    console.log("Shutting down server and stopping car.");
    process.exit(); // Exits everything
});
