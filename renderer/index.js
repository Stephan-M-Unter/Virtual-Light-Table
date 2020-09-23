'use strict';

const { UIController } = require("./classes/UIController");
const { ipcRenderer } = require("electron");
 
var xyz; // TODO: entfernen

$(document).ready(function(){
    var uic = new UIController("lighttable", window.innerWidth, window.innerHeight);
    var stage = uic.getStage();
    
    /* ##########################################
    #               INPUT/OUTPUT
    ###########################################*/

    // Clear Table Button
    $('#clear_table').click(function(){uic.sendToServer("server-clear-table");});
    // Save Table Button
    $('#save_table').click(function(){uic.sendToServer('server-open-save-window');});
    // Load Table Button
    $('#load_table').click(function(){uic.sendToServer('server-open-load-window');});
    // Flip Buttons
    $('#flip_table').click(function(){
        if ($('#hor_flip_table').css("display") == "none") {
            // open flipping buttons
            $('#flip_table').addClass('button_active');
            $('#hor_flip_table').css("display", "inline-block");
            $('#vert_flip_table').css("display", "inline-block");
            $('#flip_table>img').attr("src","../imgs/symbol_x.png");
        } else {
            // close flipping buttons
            $('#flip_table').removeClass('button_active');
            $('#vert_flip_table').css("display", "none");
            $('#hor_flip_table').css("display", "none");
            $('#flip_table>img').attr("src","../imgs/symbol_flip.png");
        }
    });
    // Horizontal Flip Button
    $('#hor_flip_table').click(function(){stage.flipTable(true);});
    $('#hor_flip_table').mouseenter(function(){stage.showFlipLine(true);});
    $('#hor_flip_table').mouseleave(function(){stage.hideFlipeLines();});
    // Vertical Flip Button
    $('#vert_flip_table').click(function(){stage.flipTable(false);});
    $('#vert_flip_table').mouseenter(function(){stage.showFlipLine(false);});
    $('#vert_flip_table').mouseleave(function(){stage.hideFlipeLines();});
    // Export Buttons
    $('#export').click(function(){
        if ($('#export_jpg').css("display") == "none") {
            // open export buttons
            $('#export').addClass('button_active');
            $('#export_jpg').css("display", "inline-block");
            $('#export_png').css("display", "inline-block");
            $('#export>img').attr("src","../imgs/symbol_x.png");
        } else {
            // close export buttons
            $('#export').removeClass('button_active');
            $('#export_jpg').css("display", "none");
            $('#export_png').css("display", "none");
            $('#export>img').attr("src","../imgs/symbol_export.png");
        }
    });
    $('#export_jpg').click(function(){stage.exportCanvas("jpg");});
    $('#export_png').click(function(){stage.exportCanvas("png");});

    // Light Switch Button
    var light_mode = "dark";
    var dark_background;
    $('#light_switch').click(function(){
        if (light_mode == "dark") {
            // current light_mode is "dark" => change to "bright"
            dark_background = $('body').css('background');
            $('body').css({backgroundColor: "white"});
            $('#light_switch').addClass('button_active');
            light_mode = "bright";
        } else {
            // current light_mode is "bright" => change to "dark"
            $('body').css({background: dark_background});
            $('#light_switch').removeClass('button_active');
            light_mode = "dark";
        }
    });

    $('#zoom_slider').on("change", () => {
        let new_scaling = $('#zoom_slider').val();
        $('#zoom_factor').html('Zoom<br/>x'+new_scaling/100);
        stage.setScaling(new_scaling);
    });

    $('#sidebar_handle').on("mousedown", (event) => {
        window.addEventListener("mousemove", resizeSidebar, false);
        window.addEventListener("mouseup", stopResizingSidebar, false);
        console.log($('#left_sidebar').css('max-width'));
    });

    function resizeSidebar(event){
        $('#left_sidebar').css('width', event.pageX);
    }
    function stopResizingSidebar(event){
        window.removeEventListener("mousemove", resizeSidebar);
    }
    
    window.addEventListener('resize', (event) => {stage.resizeCanvas(window.innerWidth, window.innerHeight);});

    /* Keystrokes */
    $('html').keydown(function(event){
        // Delete
        if (event.keyCode == 46) {uic.removeFragments();}
    });



    /* ##########################################
    #           SERVER/CLIENT COMMUNICATION
    ###########################################*/

    // Client-Load-From-Model
    // Receiving stage and fragment configuration from server.
    ipcRenderer.on('client-load-from-model', (event, data) => {
        console.log('Received client-load-from-model');
        uic.loadScene(data);
    });


    // TODO just for testing
    stage._loadFragments({"1":{"name":"CP001_002","xPos":400,"yPos":100,"rotation":60,"recto":true,"rectoURLlocal":"../imgs/CP001_002rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP001_002vs_cutout_0_96ppi.png"},"2":{"name":"CP004_005","xPos":200,"yPos":553,"rotation":30,"recto":true,"rectoURLlocal":"../imgs/CP004_005rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP004_005vs_cutout_0_96ppi.png"}});
    xyz = stage;
});