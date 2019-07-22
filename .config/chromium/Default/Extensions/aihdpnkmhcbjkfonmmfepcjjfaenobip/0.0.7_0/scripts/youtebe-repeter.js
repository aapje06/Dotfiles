let youtubeBtnDivName = "ytp-left-controls";
let videoFrame = document.getElementsByClassName("html5-main-video")[0];
let videoPage = document.getElementsByClassName("watch-title")[0];
if (!videoPage) {
  videoPage = document.getElementsByClassName("ytd-video-primary-info-renderer")[0];
}

let initDone = false;
let btnCreated = false;

let detectVideoInfo = () => {
  return setInterval( () => { getVideoInfo(); } ,100);
};

let getVideoInfo = () => {

  if (videoFrame && videoPage ) {
    if (!btnCreated) {
      createBtn();
      // console.log('create!');
      btnCreated = true;
    }

    if (videoFrame.readyState === 4) {
      clearInterval(runDetectVideoInfo);
      initDone = true;

    }
  } else {
    videoPage = document.getElementsByClassName("watch-title")[0];
    if (!videoPage) {
      videoPage = document.getElementsByClassName("ytd-video-primary-info-renderer")[0];
    }
    videoFrame = document.getElementsByClassName("html5-main-video")[0];
  }
};


let setLargeBtn = () => {
  let btn = document.getElementsByClassName('btn-div');
  if (btn) {
    btn = btn[0];
    let icon = btn.getElementsByClassName('material-icons')[0];
    icon.setAttribute('class', 'material-icons icon material-font-large');
  }
};


let setSmallBtn = () => {
  let btn = document.getElementsByClassName('btn-div');
  if (btn) {
    btn = btn[0];
    let icon = btn.getElementsByClassName('material-icons')[0];
    icon.setAttribute('class', 'material-icons icon material-font-small');
  }
};



let createBtn = () => {
  let btn = document.createElement("div");
  btn.setAttribute('class','btn-div ytp-button');

  let icon = document.createElement("i");
  icon.setAttribute('class', 'material-icons icon material-font-small');
  icon.textContent = 'repeat';
  

  btn.appendChild(icon)
  // btn.textContent = 'Loop';
  
  btn.onclick = repeat;
  
  let btnPanel = document.getElementsByClassName(youtubeBtnDivName)[0];
  btnPanel.insertBefore(btn, btnPanel.firstChild);
  //console.log('btn created!');
};

let repeatItval = null;
let repeat = () => {

  let repeating = videoFrame.getAttribute("loop");
  console.log(repeating);
  
  if (!repeating) {
    videoFrame.setAttribute("loop", true);
    document.getElementsByClassName('btn-div')[0].setAttribute('style', 'color: red !important;');
  } else {
    videoFrame.removeAttribute("loop");
    document.getElementsByClassName('btn-div')[0].setAttribute('style', 'color: white !important;');
  }

};

let runDetectVideoInfo = detectVideoInfo();
let usingSmallBtn = true;
setInterval( () => { 
  if (document.webkitFullscreenElement && usingSmallBtn) {
    setLargeBtn();
    usingSmallBtn = false;
  }

  if (!document.webkitFullscreenElement && !usingSmallBtn) {
    setSmallBtn();
    usingSmallBtn = true;
  }
}, 100);
