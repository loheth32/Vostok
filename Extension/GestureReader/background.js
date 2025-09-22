let cameraTabId = null;  // track the camera tab

// --- 1. YOUR FINALIZED GESTURE MAP ---
const gestureMap = {
    "open_palm": "pausePlay",
    "thumbs_up": "scrollUp",
    "pointing_right": "nextTab",
    "pointing_left": "prevTab",
    "fist": "voiceSearch",
    "l_shape": "openTab",
    "ok_sign": "closeTab",
    "thumbs_down": "scrollDown",
    "peace_sign": "toggleGestures"
};

// --- 2. CONFIGURABLE DELAYS (in milliseconds) ---
// Here you can tune the "cooldown" for each command.
const commandCooldowns = {
    pausePlay: 1000,       // 1 second cooldown
    scrollUp: 300,         // Can scroll every 300ms
    scrollDown: 300,       // Can scroll every 300ms
    nextTab: 500,          // Half a second cooldown
    prevTab: 500,          // Half a second cooldown
    voiceSearch: 2000,     // 2 second cooldown to prevent accidental activation
    openTab: 1000,
    closeTab: 1000,
    toggleGestures: 500
};

// This object will store the last time a command was executed
let lastExecutionTimes = {};


// --- Listen for messages from popup.js or cam.js ---
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg.action) return;

    switch (msg.action) {
        case "startCamera":
            if (cameraTabId) return;
            chrome.tabs.create({ url: chrome.runtime.getURL("cam.html") }, (tab) => {
                cameraTabId = tab.id;
            });
            break;

        case "stopCamera":
            if (cameraTabId) {
                chrome.tabs.remove(cameraTabId);
                cameraTabId = null;
            }
            break;
        
        case "gesturePrediction": // from cam.js (ML model)
            if (msg.gesture in gestureMap) {
                const mappedCmd = gestureMap[msg.gesture];
                handleCommand(mappedCmd);
            }
            break;
    }
});

// --- Handle Commands with Cooldown Logic ---
function handleCommand(cmd) {
    // --- 3. THE COOLDOWN LOGIC ---
    const now = Date.now();
    const cooldown = commandCooldowns[cmd] || 200; // Default cooldown of 200ms if not specified
    const lastExecution = lastExecutionTimes[cmd] || 0;

    if (now - lastExecution < cooldown) {
        console.log(`[Background] Command '${cmd}' is on cooldown. Ignoring.`);
        return; // Stop if the command was executed too recently
    }
    
    // If not on cooldown, execute the command and update the timestamp
    lastExecutionTimes[cmd] = now;
    console.log(`[Background] Executing command: ${cmd}`);


    // --- The rest of your command handling logic ---
    fetch("http://127.0.0.1:5000/status")
        .then(res => res.json())
        .then(data => {
            if (!data.gestures_enabled && cmd !== "toggleGestures") {
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
                        executeInTab(tabId, () => window.scrollBy(0, -500));
                        break;

                    case "scrollDown":
                        executeInTab(tabId, () => window.scrollBy(0, 500));
                        break;

                    case "voiceSearch":
                        executeInTab(tabId, () => {
                            if (!window.location.hostname.includes("google.")) return;
                            const micBtn = document.querySelector('div[aria-label="Search by voice"]');
                            if (micBtn) micBtn.click();
                        });
                        break;
                    
                    case "toggleGestures":
                         // This command toggles the state on the server
                        fetch("http://127.0.0.1:5000/toggle_gestures", { method: "POST" });
                        break;
                }
            });
        })
        .catch(err => console.error("[Background] Error fetching status:", err));
}

// --- Helper Functions ---
function switchTab(currentTabId, offset) {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const idx = tabs.findIndex(t => t.id === currentTabId);
        if (idx === -1) return;
        const newIdx = (idx + offset + tabs.length) % tabs.length;
        chrome.tabs.update(tabs[newIdx].id, { active: true });
    });
}

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
