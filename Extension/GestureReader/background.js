let cameraTabId = null;  // track the camera tab
let gesturesEnabled = false; // track gestures flag from server

// --- Gesture to Browser Command Mapping ---
const gestureMap = {
    "open_palm": "scrollDown",
    "fist": "scrollUp",
    "thumbs_up": "nextTab",
    "thumbs_down": "prevTab",
    "ok_sign": "voiceSearch",
    "peace_sign": "openTab",
    "call_me": "closeTab",
    "three_fingers_up": "pausePlay",
    "bull_sign": "toggleGestures"
};

// --- Listen for messages from popup.js or cam.js ---
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg.action) return;

    console.log("[Background] Received action:", msg.action, msg);

    switch (msg.action) {
        case "startCamera":
            if (cameraTabId) {
                console.warn("[Background] Camera already open:", cameraTabId);
                return;
            }
            chrome.tabs.create({ url: chrome.runtime.getURL("cam.html") }, (tab) => {
                cameraTabId = tab.id;
                console.log("[Background] Camera tab opened:", cameraTabId);
            });
            break;

        case "stopCamera":
            if (cameraTabId) {
                chrome.tabs.remove(cameraTabId);
                console.log("[Background] Camera tab closed:", cameraTabId);
                cameraTabId = null;
            }
            break;

        case "simulateCommand": // from popup
            handleCommand(msg.command);
            break;

        case "gesturePrediction": // from cam.js (ML model)
            console.log("[Background] Gesture prediction:", msg.gesture);
            if (msg.gesture in gestureMap) {
                const mappedCmd = gestureMap[msg.gesture];
                console.log(`[Background] Mapping gesture '${msg.gesture}' → command '${mappedCmd}'`);
                handleCommand(mappedCmd);
            } else {
                console.warn("[Background] No mapping found for gesture:", msg.gesture);
            }
            break;

        default:
            console.warn("[Background] Unknown action:", msg.action);
    }
});

// --- Handle Commands ---
function handleCommand(cmd) {
    console.log("[Background] Handling command:", cmd);

    fetch("http://127.0.0.1:5000/status")
        .then(res => res.json())
        .then(data => {
            gesturesEnabled = data.gestures_enabled;
            console.log("[Background] Gestures enabled?", gesturesEnabled);

            if (!gesturesEnabled && cmd !== "toggleGestures") {
                console.warn("[Background] Gestures disabled. Ignoring:", cmd);
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

                    case "toggleGestures":
                        gesturesEnabled = !gesturesEnabled;
                        console.log("[Background] Gestures toggled:", gesturesEnabled);
                        break;

                    default:
                        console.warn("[Background] Unknown command:", cmd);
                }
            });
        })
        .catch(err => console.error("[Background] Error fetching gesturesEnabled:", err));
}

// --- Tab switching helper ---
function switchTab(currentTabId, offset) {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const idx = tabs.findIndex(t => t.id === currentTabId);
        if (idx === -1) return;
        const newIdx = (idx + offset + tabs.length) % tabs.length;
        chrome.tabs.update(tabs[newIdx].id, { active: true });
    });
}

// --- Inject code into a tab ---
function executeInTab(tabId, func) {
    chrome.scripting.executeScript({
        target: { tabId },
        func
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("[Background] Script injection error:", chrome.runtime.lastError.message);
        }
    });
}
