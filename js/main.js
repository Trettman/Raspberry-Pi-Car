$(document).ready(function(){
    
    $("#steer_button").click(function(){
        $("#steer_button").hide();
        $("#about_button").hide();
        
        $("#tilt_button").show();
        $("#touch_button").show();
        $("#steering_type_text").show();
    });
        
});