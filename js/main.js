$(document).ready(function(){
    
    $("#steer_button").click(function(){
        $("#steer_button").hide();
        $("#about_button").hide();
        
        $("#steering_type_text").show();
        $("#tilt_button").show();
        $("#touch_button").show();
        $("#home_button").show();
    });
        
});