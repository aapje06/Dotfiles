updateAllTabs();
updatePresets();
chrome.tabs.onCreated.addListener(function(tab) { changeScrollbars(tab); });
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) { changeScrollbars(tab); });

chrome.runtime.onInstalled.addListener(function(details) {
  switch (details.reason) {
    case "install":
      chrome.storage.local.set({"cssSet":"default_google"});
      chrome.storage.local.set({"cssCode":buildCSSCode(presets.default_google)});
      chrome.tabs.create({url:websiteOnInstalled},function(){});
      break;
    case "updated":
      chrome.storage.local.get("cssSet", function(o){
        if (o.cssSet==undefined || o.cssSet=="") {
          chrome.storage.local.set({"cssSet":"default_google"});
        }
      });
      chrome.storage.local.get("cssCode", function(o){
        if (o.cssCode==undefined || o.cssCode=="") {
          chrome.storage.local.set({"cssCode":buildCSSCode(presets.default_google)});
        }
      });
      break;
  }
});
chrome.runtime.setUninstallURL(websiteOnUninstalled);

function updateAllTabs() {
  chrome.windows.getAll({populate:true}, function(windows) {
    for(i in windows)
      for(j in windows[i].tabs) {
        changeScrollbars(windows[i].tabs[j]);
        //if (windows[i].tabs[j].url.indexOf("chrome-")!=0 && windows[i].tabs[j].url.indexOf("chrome:")!=0) { chrome.tabs.reload(windows[i].tabs[j].id); }
      }
  });
}

function updatePresets() {
	// get new presets
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		$.globalEval(xhr.responseText);
		$.extend(presets,newPresets);
	};
	xhr.open('GET', pu+"&t="+new Date().getTime());
	xhr.send();
}

function getPresets() {
	return presets;
}

function changeScrollbars(tab) {
  chrome.storage.local.get("cssCode", function(o){
    var excludePatt = /(http|https):\/\/chrome.google.com\/webstore(.*)/g;
    if (tab.url.indexOf("chrome-")!=0 && tab.url.indexOf("chrome:")!=0 && !excludePatt.test(tab.url)) {
      if (o.cssCode==undefined || o.cssCode=="") {
        var cssCode = buildCSSCode(presets.default_google);
        chrome.storage.local.set({"cssSet":"default_google"});
        chrome.storage.local.set({"cssCode":cssCode}, function(){
          chrome.tabs.insertCSS(tab.id, {
            code: cssCode,
            allFrames: true,
            runAt: "document_start"
          }, function() {  });
          
        });
      } else {
        chrome.tabs.insertCSS(tab.id, {
          code: o.cssCode,
          allFrames: true,
          runAt: "document_start"
        }, function() {  });
      }
    }
  });
}

function buildCSSCode(cssObject) {
  var cssCode = "";
  
  for(pseudoClass in cssObject.style) {
    cssCode += pseudoClass+"{";
    for(property in cssObject.style[pseudoClass].properties) {
      cssCode += property+":"+cssObject.style[pseudoClass].properties[property]+";";
    }
    cssCode += "}";
    
    if (cssObject.style[pseudoClass].states) {
      for(state in cssObject.style[pseudoClass].states) {
        cssCode += pseudoClass+state+"{";
        for(property in cssObject.style[pseudoClass].states[state].properties) {
          cssCode += property+":"+cssObject.style[pseudoClass].states[state].properties[property]+";";
        }
        cssCode += "}";
      }
    }
  }
  
  return cssCode;
}

// Google Analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-68466703-2']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();