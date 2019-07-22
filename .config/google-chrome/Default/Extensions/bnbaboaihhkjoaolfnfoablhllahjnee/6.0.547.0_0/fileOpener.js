WEBVIEW_SRC_BASE = "";

function openFileFromEntryAfterLoad(fileEntry) {
    onWebViewLoad(() => {
        fileEntry.file(openFile);
    });
}

function onWebViewLoad(f) {
    let stateCheck = setInterval(() => {
        if (findWebView()) {
            clearInterval(stateCheck);
            f();
        }
    }, 10);
}

function findWebView() {
    return document.getElementsByClassName("ggbview")[0];
}

function openFile(file) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload =  function(e){
        var url = e.target.result;
        updateWebViewSrc(url);
    };
}

function updateWebViewSrc(url) {
    var webView = findWebView();
    if (!WEBVIEW_SRC_BASE) {
        WEBVIEW_SRC_BASE = webView.getAttribute("src");
    }
    webView.setAttribute("src", WEBVIEW_SRC_BASE + "?filename=" + url);
}