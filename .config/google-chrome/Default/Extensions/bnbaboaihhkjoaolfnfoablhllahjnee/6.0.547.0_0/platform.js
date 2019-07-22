defaultParams.laf = "chrome"
	
window.open = e => {
	chrome.runtime.sendMessage(JSON.stringify({"open":e}));
}

window.ggbExportFile = (url, title) => {
	chrome.runtime.sendMessage(JSON.stringify({"export":url, "title":title}));
}

window.ggbExamMode = e => {
	chrome.runtime.sendMessage(JSON.stringify({"exam":e}));
}
