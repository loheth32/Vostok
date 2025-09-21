const enablebox = document.getElementById("enable");

// 1️⃣ On popup load, fetch server state
async function loadState() {
    try {
        const res = await fetch("http://127.0.0.1:5000/status");
        const data = await res.json();
        enablebox.checked = data.camera_enabled;  // set checkbox according to server
        // Also send message to background to start camera if enabled
        chrome.runtime.sendMessage({ action: data.camera_enabled ? "startCamera" : "stopCamera" });
    } catch (err) {
        console.error("Error fetching server state:", err);
    }
}

loadState();

// 2️⃣ When checkbox changes, update server and background script
enablebox.addEventListener("change", async function() {
    const enabled = enablebox.checked;

    // Update server
    await fetch("http://127.0.0.1:5000/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
    });

    // Notify background script
    chrome.runtime.sendMessage({ action: enabled ? "startCamera" : "stopCamera" });
});
