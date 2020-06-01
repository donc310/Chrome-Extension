var app = {};

app.data = {};
app.loadedPromises = [];
app.urls = {};
app.loaded = function () {
	for (var intItr in app.loadedPromises) {
		if (app.loadedPromises && app.loadedPromises[intItr])
			app.loadedPromises[intItr]();
	}
	for (var intItr in app.loadedPromises) {
		delete app.loadedPromises[intItr];
	}
};
app.getBookmark = function () {
	var objBookmark = null;
	if (app.data.bookmarks_found)
		objBookmark = app.data.bookmarks_found[0];
	if (!objBookmark)
		objBookmark = app.data;
	return objBookmark;
};
// Chrome fix part 3 
app.stacks=[]
app.objTags={}
app.backgroundPost = sessionPostWithRetries;
initalizeAccount();

function initalizeAccount() {
	sessionPostWithRetries({ url: "https://webcull.com/api/load", post: {}, }, 1)
		.then(function (arrData) {
			if (arrData.no_user)
				return;
			// The data property is currently being changed in bookmarks.js
			// and the data structure of both responses differ so am 
			// adding the 'stack' property of the response to the app 
			// object instead of the data , this is to prevent break 
			// in current implementaion 
			// TODO change this  behaviour
			app.stacks = arrData.stacks;
			handleInitialData();
		})
		.catch(error => {
			console.log(error)
		})
}
function handleInitialData(){
	for (var intParent in app.stacks) {
		var intLen = app.stacks[intParent].length;
		for (var intItr = 0; intItr < intLen; ++intItr) {
			var objStack = app.stacks[intParent][intItr];
			if (objStack.is_url == 1) {
				app.urls[objStack.value] = 1;
			}
			if (objStack.tags && objStack.tags.length){
				var arrTags = String(objStack.tags).split(',')
				arrTags.forEach((tag)=>{
					if (tag in app.objTags){
						app.objTags[tag]+=1
					}
					app.objTags[tag] = 1
				})
			}
		}
	}
}

app.processURLs = processURLs;
function processURLs() {
	for (var intParent in app.data.stacks) {
		var intLen = app.data.stacks[intParent].length;
		for (var intItr = 0; intItr < intLen; ++intItr) {
			var objStack = app.data.stacks[intParent][intItr];
			if (objStack.is_url == 1) {
				app.urls[objStack.value] = 1;
			}
		}
	}
}

app.alterIcon = alterIcon;
function alterIcon(strUrl) {
	var boolExists = strUrl != "" && app.urls[strUrl];
	if (boolExists) {
		chrome.browserAction.setIcon({
			path: {
				"16": "images/webcull-16x.png",
				"32": "images/webcull-32x.png",
				"48": "images/webcull-48x.png",
				"128": "images/webcull-128x.png"
			}
		});
	} else {
		chrome.browserAction.setIcon({
			path: {
				"128": "images/logo-gray-128.png"
			}
		});
	}

}
app.modifyBookmark=modifyBookmark;
function modifyBookmark(strName, strVal) {
	var objBookmark = app.getBookmark(),
	arrModify = {
		proc: 'modify',
		stack_id: objBookmark.stack_id,
		name: strName,
		value: dblEncode(strVal)
	};
	app.backgroundPost({ url: "https://webcull.com/api/modify", post: arrModify })
		.then(response => console.log(response))
		.catch(error => console.log(error))
}

// make sure it saves on disconnect
chrome.runtime.onConnect.addListener(function (externalPort) {
	externalPort.onDisconnect.addListener(function () {
		app.saveCrumbs();
	});
});

// for general navigation
chrome.webNavigation.onBeforeNavigate.addListener(function (tab) {
	if (tab.frameId == 0) {
		chrome.tabs.getSelected(null, function (selectedTab) {
			if (selectedTab.id == tab.tabId) {
				alterIcon(tab.url);
			}
		});
	}
});

// for tracking forwarding
chrome.webRequest.onBeforeRequest.addListener(function (details) {
	if (details.type == "main_frame") {
		chrome.tabs.getSelected(null, function (selectedTab) {
			if (selectedTab.id == details.tabId) {
				alterIcon(details.url);
			}
		});
	}
}, { urls: ["<all_urls>"] });

// for when the tab is switched
chrome.tabs.onActivated.addListener(function (info) {
	chrome.tabs.get(info.tabId, function (tab) {
		//if (tab.url != "")
		alterIcon(tab.url);
	});
});
