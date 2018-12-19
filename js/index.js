
var vid = document.getElementById('videoel');
var vid_width = vid.width;
var vid_height = vid.height;
var overlay = document.getElementById('overlay');
var overlayCC = overlay.getContext('2d');
let gifs = document.getElementById('gif_container');
let gifArray = [];
let currentPos = -1;
let lastTime = new Date();
let happyTime = 0;
let sadTime = 0;
let surprisedTime = 0;
let angryTime = 0;
const sad = ['sad+mrw', 'cry+mrw', 'reaction+sad+face', 'reaction+sad', 'reaction+cry'];
const happy = ['reaction+happy','haha+excited','happy+lol','happy+smile','veryfunny', 'reaction+ohshit', 'haha+lmao'];
const surprised = ['reaction+surprised+shocked','reaction+wow', 'reaction+omg', 'omg+no','surprised+face'];
const angry = ['angry+mad','reaction+angry','reaction+pissed','reaction+angry','reaction+mad','angry+hulk'];


/********** check and set up video/webcam **********/

function enablestart() {
/*    var startbutton = document.getElementById('startbutton');
    startbutton.value = "start";
    startbutton.disabled = null;*/
    createGifs();
    startVideo();
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
    alert("There was some problem trying to fetch video from your webcam.");
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.mediaDevices.getUserMedia;
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
        let highestEmo = null;
        for (var i = 0;i < er.length;i++) {
            if (highestEmo === null||er[i].value > highestEmo.value){
                highestEmo = er[i];
            }
            document.getElementById('icon_'+(er[i].emotion)).style.visibility = 'hidden';
        }

        if (highestEmo.value > 0.5) {
            //console.log(highestEmo);
            if (emotionTime(highestEmo) > 20){
                //console.log("searchgif");
                searchgif(highestEmo);
            }
            document.getElementById('icon_'+(highestEmo.emotion)).style.visibility = 'visible';
        } else {

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
    .attr("height", height + margin.top + margin.bottom);

svg.selectAll("rect").
data(emotionData).
enter().
append("svg:rect").
attr("x", function(datum, index) { return x(index); }).
attr("y", function(datum) { return height - y(datum.value); }).
attr("height", function(datum) { return y(datum.value); }).
attr("width", barWidth).
attr("fill", "#222222");

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


function emotionTime(prediction) {
    switch (prediction.emotion) {
        case "happy":
            happyTime += 1;
            sadTime = 0;
            angryTime = 0;
            surprisedTime = 0;
            return happyTime;
        case "sad":
            happyTime = 0;
            sadTime += 1;
            angryTime = 0;
            surprisedTime = 0;
            return sadTime;
        case "angry":
            happyTime = 0;
            sadTime = 0;
            angryTime += 1;
            surprisedTime = 0;
            return angryTime;
        case "surprised":
            happyTime = 0;
            sadTime = 0;
            angryTime = 0;
            surprisedTime += 1;
            return surprisedTime;
    }



}


function searchgif(prediction) {

    if (timePassed()){

        //console.log(prediction);
        let searchArray = selectSearchTerm(prediction);
        let search = searchArray[Math.floor(Math.random() * searchArray.length)];
        //console.log(search);

        let url = "https://api.giphy.com/v1/gifs/random?tag="+search+"d&api_key=S4FNeAFFA7Szp1CwDeP3naDy4cRlqzsT";
        fetch(url)
            .then(function(response) {
                return response.json();
            }).then(function(json) {
            console.log(json);

            if (json.data.images != null) {
                currentPos = (currentPos + 1) % gifArray.length;
                gifArray.forEach(el => {
                    el.parentElement.style.borderBottom = "";
                    el.parentElement.style.opacity = "0.4";
                });
                gifArray[currentPos].src = json.data.images.fixed_width.url;
                gifArray[currentPos].myData.src = json.data.images.original.url;
                gifArray[currentPos].myData.emotion = prediction.emotion;
                gifArray[currentPos].parentElement.style.borderBottom = "5px solid #222222";
                gifArray[currentPos].parentElement.style.opacity = "1";
            }

        });
        lastTime = new Date();
   }

}

function selectSearchTerm(prediction) {
    switch (prediction.emotion) {
        case "happy":
            return happy;
        case "sad":
            return sad;
        case "angry":
            return angry;
        case "surprised":
            return surprised;
    }
}

function timePassed() {
    let currentTime = new Date();
    //console.log(currentTime.getTime() - lastTime.getTime());
    return (currentTime.getTime() - lastTime.getTime() > 3000 )
}

function createGifs() {
    for (let i = 0; i < 4; i++){
        let div = document.createElement('div');
        div.className += " gif_background";
        let image = document.createElement('img');
        image.src = "";
        image.className += " gif";
        image.addEventListener('click', openModal);
        image.myData = {
            src:"",
            emotion:""
        };
        div.appendChild(image);
        gifArray.push(image);
        gifs.appendChild(div);
    }
}



function openModal(evt) {
    let modal = document.getElementById("modal");
    modal.style.display = "block";
    let gif_modal = document.getElementById("gif_modal");
    let image = document.createElement('img');
    image.id = "shareGif";
    image.src = evt.target.myData.src;
    gif_modal.appendChild(image);

    let icon_modal = document.getElementById("icon_modal");
    let icon = document.createElement("i");
    let emotionClass = iconClass(evt.target.myData);
    icon.className +="far fa-5x";
    icon.className += " "+emotionClass;
    icon.id = "icon_big";

    let text = document.createElement("p");
    text.innerText += "You look "+ evt.target.myData.emotion;

    let link = document.getElementById("link");
    link.value = filterURL(evt.target.myData.src);

    icon_modal.appendChild(icon);
    icon_modal.appendChild(text);

}

function filterURL(url) {
    let pattern = /media\d/;
    let newURL = url.replace(pattern, "media");
    console.log(newURL);
    return newURL;
}

function closeModal() {
    let modal = document.getElementById("modal");
    let gif_modal = document.getElementById("gif_modal");
    let image = document.getElementById("shareGif");
    gif_modal.removeChild(image);

    let icon_modal = document.getElementById("icon_modal");
    while (icon_modal.firstChild) {
        icon_modal.firstChild.remove();
    }

    let btn = document.getElementById("copy_btn");
    btn.innerText = "Copy link";
    modal.style.display = "none";
}

function copyLink() {
    let link = document.getElementById("link");
    link.select();
    document.execCommand('copy');
    let btn = document.getElementById("copy_btn");
    btn.innerHTML = '<i class="fas fa-check"></i>' +'<p>Copied</p>';

}


function iconClass(prediction) {
    switch (prediction.emotion) {
        case "happy":
            return "fa-laugh-squint";
        case "sad":
            return "fa-sad-tear";
        case "angry":
            return "fa-angry";
        case "surprised":
            return "fa-surprise";
    }
}