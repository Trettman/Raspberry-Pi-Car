/**
 * Config file for server constans
 *
 */

var server_config = {
    steer_port: 3000,
    
    stream_port: 8082,
    websocket_port: 8084,
    stream_magic_bytes: "jsmp", // Must be 4 bytes. Will be written to stream header to decide type
    
    default_width: 240,
    default_height: 180
}

module.exports = server_config;