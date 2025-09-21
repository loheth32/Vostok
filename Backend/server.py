from flask import Flask, request, jsonify
from flask_cors import CORS
import base64

app = Flask(__name__)
CORS(app)  # <- allows requests from chrome-extension://

camera_enabled = False

@app.route('/toggle', methods=['POST'])
def toggle_camera():
    global camera_enabled
    data = request.get_json()
    camera_enabled = data.get("enabled", False)
    print(f"Camera enabled: {camera_enabled}")
    return jsonify({"success": True, "camera_enabled": camera_enabled})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"camera_enabled": camera_enabled})

@app.route('/frame', methods=['POST'])
def frame():
    data = request.get_json()
    image_data = data.get("image", "")
    if image_data.startswith("data:image/jpeg;base64,"):
        img_bytes = base64.b64decode(image_data.split(",")[1])
        print(f"Received frame! Size: {len(img_bytes)} bytes")
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True)
