let camTabId = null; // store the ID of the hidden cam tab

chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "startCamera") {
        // Only open a new tab if one isn't already open
        if (camTabId === null) {
            const tab = await chrome.tabs.create({
                url: chrome.runtime.getURL("cam.html"),
                active: false // keep it hidden
            });
            camTabId = tab.id;
        }
    } 
    else if (msg.action === "stopCamera") {
        // Close the cam tab if it exists
        if (camTabId !== null) {
            chrome.tabs.remove(camTabId, () => {
                camTabId = null;
            });
        }
    }
});
    