OLD_FILE_ENTRY_PATH = "";

onLoad();

function onLoad() {
   var fileEntry = window.fileEntry;
   if (!fileEntry) {
       return;
   }
   document.onreadystatechange = () => {
       if (document.readyState === "complete") {

            // openFileFromEntryAfterLoad is a function implemented in fileOpener.js
           openFileFromEntryAfterLoad(fileEntry);
           OLD_FILE_ENTRY_PATH = fileEntry.fullPath;
           window.fileEntry = undefined;
       }
   }
}

function onFileEntryUpdate(fileEntry) {
    var fileEntryPath = fileEntry.fullPath;
    if (fileEntryPath !== OLD_FILE_ENTRY_PATH) {

        // openFile is a function implemented in fileOpener.js
        fileEntry.file(openFile);
        OLD_FILE_ENTRY_PATH = fileEntryPath;
    }
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

chrome.runtime.onMessage.addListener(function(a){
      console.log(a);
      var msg = JSON.parse(a);
      if(msg.open){
          chrome.app.window.create("external.html?open="+btoa(msg.open));
      }
      if(msg["export"]){
              chrome.fileSystem.chooseEntry({'type': "saveFile", "suggestedName":msg["title"]}, function(fileEntry) {
                  fileEntry.createWriter(function(fileWriter) {

                      fileWriter.onwriteend = function(e) {
                        console.log('Write completed.');
                      };

                      fileWriter.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                      };
                      console.log(msg["export"]);
                      // Create a new Blob and write it to log.txt.
                      var blob = dataURLtoBlob(msg["export"]);

                      fileWriter.write(blob);

                    }, e => console.error(e));
              });
      }
      if(typeof msg["exam"] != "undefined"){
          var wnd = chrome.app.window.current();
          msg["exam"] ? wnd.fullscreen() : wnd.restore();
      }

      if(typeof msg["login"] != "undefined"){
          var webView = document.getElementsByClassName("ggbview")[0];
          var loginMessage = JSON.stringify({"action": "logintoken", "msg": msg["login"]});
          console.log(loginMessage);
          console.log(webView.contentWindow);
          webView.contentWindow.postMessage(loginMessage,"*")
      }
});
