(async () => {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    try {
        // Start the webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        console.log("Camera started successfully!");

        // Capture frames and send to Flask every 200ms
        setInterval(async () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg"));
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );

            // Send frame to Flask
            await fetch("http://127.0.0.1:5000/frame", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` })
            });
        }, 200);

    } catch (err) {
        console.error("Camera error:", err);
    }

    // Optional: stop camera on message from background
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.action === "stopCamera") {
            stream.getTracks().forEach(track => track.stop());
            console.log("Camera stopped");
        }
    });
})();
