//var GphApiClient = require('giphy-js-sdk-core');
//client = GphApiClient("S4FNeAFFA7Szp1CwDeP3naDy4cRlqzsT");


var vid = document.getElementById('videoel');
var vid_width = vid.width;
var vid_height = vid.height;
var overlay = document.getElementById('overlay');
var overlayCC = overlay.getContext('2d');

fetch("http://api.giphy.com/v1/gifs/random?tag=sad&api_key=S4FNeAFFA7Szp1CwDeP3naDy4cRlqzsT&limit=1")
    .then(function(response) {
        return response.json();
    }).then(function(json) {
    console.log(json);
});

/********** check and set up video/webcam **********/

function enablestart() {
    var startbutton = document.getElementById('startbutton');
    startbutton.value = "start";
    startbutton.disabled = null;
}

function adjustVideoProportions() {
    // resize overlay and video if proportions are different
    // keep same height, just change width
    var proportion = vid.videoWidth/vid.videoHeight;
    vid_width = Math.round(vid_height * proportion);
    vid.width = vid_width;
    overlay.width = vid_width;
}

function gumSuccess( stream ) {
    // add camera stream if getUserMedia succeeded
    if ("srcObject" in vid) {
        vid.srcObject = stream;
    } else {
        vid.src = (window.URL && window.URL.createObjectURL(stream));
    }
    vid.onloadedmetadata = function() {
        adjustVideoProportions();
        vid.play();
    };
    vid.onresize = function() {
        adjustVideoProportions();
        if (trackingStarted) {
            ctrack.stop();
            ctrack.reset();
            ctrack.start(vid);
        }
    }
}

function gumFail() {
    alert("There was some problem trying to fetch video from your webcam. If you have a webcam, please make sure to accept when the browser asks for access to your webcam.");
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

// check for camerasupport
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({video : true}).then(gumSuccess).catch(gumFail);
} else if (navigator.getUserMedia) {
    navigator.getUserMedia({video : true}, gumSuccess, gumFail);
} else {
    alert("This demo depends on getUserMedia, which your browser does not seem to support. :(");
}

vid.addEventListener('canplay', enablestart, false);

/*********** setup of emotion detection *************/

// set eigenvector 9 and 11 to not be regularized. This is to better detect motion of the eyebrows
pModel.shapeModel.nonRegularizedVectors.push(9);
pModel.shapeModel.nonRegularizedVectors.push(11);

var ctrack = new clm.tracker({useWebGL : true});
ctrack.init(pModel);
var trackingStarted = false;

function startVideo() {
    // start video
    vid.play();
    // start tracking
    ctrack.start(vid);
    trackingStarted = true;
    // start loop to draw face
    drawLoop();
}

function drawLoop() {
    requestAnimFrame(drawLoop);
    overlayCC.clearRect(0, 0, vid_width, vid_height);
    //psrElement.innerHTML = "score :" + ctrack.getScore().toFixed(4);
    if (ctrack.getCurrentPosition()) {
        ctrack.draw(overlay);
    }
    var cp = ctrack.getCurrentParameters();

    var er = ec.meanPredict(cp);
    if (er) {
        updateData(er);
        for (var i = 0;i < er.length;i++) {
            if (er[i].value > 0.5) {
                searchgif(er[i]);
                document.getElementById('icon'+(i+1)).style.visibility = 'visible';
            } else {
                document.getElementById('icon'+(i+1)).style.visibility = 'hidden';
            }
        }
    }
}

delete emotionModel['disgusted'];
delete emotionModel['fear'];
var ec = new emotionClassifier();
ec.init(emotionModel);
var emotionData = ec.getBlank();

/************ d3 code for barchart *****************/

var margin = {top : 20, right : 20, bottom : 10, left : 40},
    width = 400 - margin.left - margin.right,
    height = 100 - margin.top - margin.bottom;

var barWidth = 30;

var formatPercent = d3.format(".0%");

var x = d3.scale.linear()
    .domain([0, ec.getEmotions().length]).range([margin.left, width+margin.left]);

var y = d3.scale.linear()
    .domain([0,1]).range([0, height]);

var svg = d3.select("#emotion_chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

svg.selectAll("rect").
data(emotionData).
enter().
append("svg:rect").
attr("x", function(datum, index) { return x(index); }).
attr("y", function(datum) { return height - y(datum.value); }).
attr("height", function(datum) { return y(datum.value); }).
attr("width", barWidth).
attr("fill", "#2d578b");

svg.selectAll("text.labels").
data(emotionData).
enter().
append("svg:text").
attr("x", function(datum, index) { return x(index) + barWidth; }).
attr("y", function(datum) { return height - y(datum.value); }).
attr("dx", -barWidth/2).
attr("dy", "1.2em").
attr("text-anchor", "middle").
text(function(datum) { return datum.value;}).
attr("fill", "white").
attr("class", "labels");

svg.selectAll("text.yAxis").
data(emotionData).
enter().append("svg:text").
attr("x", function(datum, index) { return x(index) + barWidth; }).
attr("y", height).
attr("dx", -barWidth/2).
attr("text-anchor", "middle").
attr("style", "font-size: 12").
text(function(datum) { return datum.emotion;}).
attr("transform", "translate(0, 18)").
attr("class", "yAxis");

function updateData(data) {
    // update
    var rects = svg.selectAll("rect")
        .data(data)
        .attr("y", function(datum) { return height - y(datum.value); })
        .attr("height", function(datum) { return y(datum.value); });
    var texts = svg.selectAll("text.labels")
        .data(data)
        .attr("y", function(datum) { return height - y(datum.value); })
        .text(function(datum) { return datum.value.toFixed(1);});

    // enter
    rects.enter().append("svg:rect");
    texts.enter().append("svg:text");

    // exit
    rects.exit().remove();
    texts.exit().remove();
}

/******** stats ********/

stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.getElementById('container').appendChild( stats.domElement );

// update stats on every iteration
document.addEventListener('clmtrackrIteration', function(event) {
    stats.update();
}, false);


function searchgif(prediction) {
    let gifs = document.getElementById('gifs');
    console.log(prediction);
    let search = prediction.emotion;

    let url = "http://api.giphy.com/v1/gifs/search?q="+search+"&api_key=S4FNeAFFA7Szp1CwDeP3naDy4cRlqzsT&limit=1"
    fetch(url)
        .then(function(response) {
            return response.json();
        }).then(function(json) {
        console.log(json);
        json.data.forEach((gif) => {
            let image = document.createElement('img');
            image.src = gif.images.fixed_height.url;
            gifs.appendChild(image);
        })
    });
}
