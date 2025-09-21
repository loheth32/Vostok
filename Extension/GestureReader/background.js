let cameraTabId = null;  // track the camera tab
let gesturesEnabled = false; // track gestures flag from server

// Listen to messages from popup.js
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg.action) return;

    switch (msg.action) {
        // --- Camera control ---
        case "startCamera":
            if (cameraTabId) return; // already open
            chrome.tabs.create({ url: chrome.runtime.getURL("cam.html") }, (tab) => {
                cameraTabId = tab.id;
                console.log("Camera tab opened:", cameraTabId);
            });
            break;

        case "stopCamera":
            if (cameraTabId) {
                chrome.tabs.remove(cameraTabId);
                console.log("Camera tab closed:", cameraTabId);
                cameraTabId = null;
            }
            break;

        // --- Gesture commands ---
        case "simulateCommand":
            handleSimulatedCommand(msg.command);
            break;

        default:
            console.warn("Unknown action:", msg.action);
    }
});

// --- Simulated gesture commands ---
function handleSimulatedCommand(cmd) {
    // Only allow gestures if gesturesEnabled = true
    fetch("http://127.0.0.1:5000/status")
        .then(res => res.json())
        .then(data => {
            gesturesEnabled = data.gestures_enabled;
            if (!gesturesEnabled && cmd !== "toggleGestures") {
                console.log("Gestures are disabled, ignoring command:", cmd);
                return;
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) return;
                const tabId = tabs[0].id;

                switch (cmd) {
                    case "openTab":
                        chrome.tabs.create({ url: "https://www.google.com" });
                        break;
                    case "closeTab":
                        chrome.tabs.remove(tabId);
                        break;
                    case "nextTab":
                        switchTab(tabId, 1);
                        break;
                    case "prevTab":
                        switchTab(tabId, -1);
                        break;
                    case "pausePlay":
                        executeInTab(tabId, () => {
                            const video = document.querySelector("video");
                            if (video) video.paused ? video.play() : video.pause();
                        });
                        break;
                    case "scrollUp":
                        executeInTab(tabId, () => window.scrollBy(0, -300));
                        break;
                    case "scrollDown":
                        executeInTab(tabId, () => window.scrollBy(0, 300));
                        break;
                    case "voiceSearch":
                        executeInTab(tabId, () => {
                            if (!window.location.hostname.includes("google.")) return;
                            const micBtn = document.querySelector('button[aria-label="Search by voice"]') ||
                                           document.querySelector('div[aria-label="Search by voice"]') ||
                                           document.querySelector('[aria-label*="voice"]');
                            if (micBtn) {
                                micBtn.style.outline = "3px solid red";
                                setTimeout(() => {
                                    micBtn.style.outline = "";
                                    micBtn.click();
                                }, 1000);
                            }
                        });
                        break;
                    default:
                        console.warn("Unknown simulated command:", cmd);
                }
            });
        })
        .catch(err => console.error("Error fetching gesturesEnabled:", err));
}

// --- Helper: switch tab left/right ---
function switchTab(currentTabId, offset) {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const idx = tabs.findIndex(t => t.id === currentTabId);
        if (idx === -1) return;
        const newIdx = (idx + offset + tabs.length) % tabs.length;
        chrome.tabs.update(tabs[newIdx].id, { active: true });
    });
}

// --- Helper: execute function in tab ---
function executeInTab(tabId, func) {
    chrome.scripting.executeScript({
        target: { tabId },
        func
    });
}
