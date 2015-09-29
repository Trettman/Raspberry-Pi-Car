var webSocket = require("ws");
var http = require("http");

if(process.argv.length < 3 ){
	console.log(
		"Usage: \n" +
		"node stream-server.js <secret> [<stream-port> <websocket-port>]"
	);
	process.exit();
}

var STREAM_SECRET = process.argv[2];
var	STREAM_PORT = process.argv[3] || 8082;
var	WEBSOCKET_PORT = process.argv[4] || 8084;
var	STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes

var webSocketServer = webSocket.Server({ port: WEBSOCKET_PORT });

var width = 320;
var	height = 240;

// Websocket Server
//var socketServer = new (require("ws").Server)({port: WEBSOCKET_PORT});
webSocketServer.on('connection', function(socket) {
	// Send magic bytes and video size to the newly connected socket
	// struct { char magic[4]; unsigned short width, height;}
	var streamHeader = new Buffer(8);
	streamHeader.write(STREAM_MAGIC_BYTES);
	streamHeader.writeUInt16BE(width, 4);
	streamHeader.writeUInt16BE(height, 6);
	socket.send(streamHeader, {binary:true});

	console.log("New WebSocket Connection(" + webSocketServer.clients.length + " total)");
	
	socket.on("close", function(code, message){
		console.log("Disconnected WebSocket(" + webSocketServer.clients.length + " total)");
	});
});

webSocketServer.broadcast = function(data, opts) {
	for( var i in this.clients ) {
		if (this.clients[i].readyState == 1) {
			this.clients[i].send(data, opts);
		}
		else {
			console.log("Error: Client (" + i + ") not connected.");
		}
	}
};


// HTTP Server to accept incomming MPEG Stream
var streamServer = http.createServer(function(request, response){
	var params = request.url.substr(1).split("/");

	if(params[0] == STREAM_SECRET) {
		width = (params[1] || 320) | 0;
		height = (params[2] || 240) | 0;
		
		console.log(
			"Stream Connected: " + request.socket.remoteAddress + 
			":" + request.socket.remotePort + " size: " + width + "x" + height
		);
		request.on("data", function(data){
			webSocketServer.broadcast(data, { binary: true });
		});
	} else{
		console.log(
			"Failed Stream Connection: " + request.socket.remoteAddress + 
			request.socket.remotePort + " - wrong secret."
		);
		response.end();
	}
}).listen(STREAM_PORT);

console.log("Listening for MPEG Stream on http://127.0.0.1:" + STREAM_PORT + "/<secret>/<width>/<height>");
console.log("Awaiting WebSocket connections on ws://127.0.0.1:" + WEBSOCKET_PORT + "/");
