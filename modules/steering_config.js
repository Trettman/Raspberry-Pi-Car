/**
 * Config file for server constans
 *
 */

var steering_config = {
    max_beta: 30, // Full left
    min_beta: -30, // Full right
    
    max_gamma: -10, // Full speed
    min_gamma: -90, // Full brake
    
    starting_throttle: 0.148, // The value that the car is stationary at
    starting_steering: 0.145 // Straight forward 
}

module.exports = steering_config;