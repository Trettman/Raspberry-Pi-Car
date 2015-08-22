var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var piblaster = require("pi-blaster.js");

var autoStopInterval = 0;

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
        
        // Controls the car width PWM using pi-blaster.js ("<value>" seems like it has to be between 0 and 1, where 1 is 100% and so on)
        piblaster.setPwm(17, "<value>"); // Forwards and backwards
        piblaster.setPwm(18, "<value>"); // Left and right
        
        // Reset the auto stop interval
        clearInterval(autoStopInterval);
        autoStopInterval = setInterval(autoStop, 2000);
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
