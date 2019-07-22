window.addEventListener("load", ()=>{
	var url = atob(window.location.href.split("?open=")[1]);
	if(url.match(/opener.html/)){
		url = "https://accounts.geogebra.org/user/signin/caller/web?url=https://cdn.geogebra.org/apps/latest/web3d/html/ggtcallback.html"
	}
	document.getElementById("extview").src = url;
	document.getElementById("extview").addEventListener("loadredirect", e=> {
		if(e.newUrl.match(/ggtcallback.html\?token=/)){
			console.log(e.newUrl.split("?token=")[1]);
			chrome.runtime.sendMessage(JSON.stringify({"login": e.newUrl.split(/\?token=|#/)[1]}));
			window.close();
		}
	});
});
//+