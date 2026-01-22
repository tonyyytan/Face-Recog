"""
Face Recognition Inference API
Flask REST API for celebrity face recognition using PyTorch ResNet18 model.
"""

import os
import json
import base64
import logging
from io import BytesIO

import cv2
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model and resources
model = None
label_map = None
face_cascade = None
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Image preprocessing constants
IMG_SIZE = 224

# Image transforms (same as training)
transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])


def load_model():
    """Load the PyTorch ResNet18 model, label map, and Haar cascade."""
    global model, label_map, face_cascade
    
    # Load label map
    with open('label_map.json', 'r') as f:
        label_map = json.load(f)
    # Convert keys to integers for lookup
    label_map = {int(k): v for k, v in label_map.items()}
    logger.info(f"Loaded label map with {len(label_map)} classes")
    
    # Load Haar cascade for face detection
    face_cascade = cv2.CascadeClassifier('haar_face.xml')
    logger.info("Loaded Haar cascade for face detection")
    
    # Load PyTorch ResNet18 model
    num_classes = len(label_map)
    try:
        model = models.resnet18(weights=None)
    except TypeError:
        # Fallback for older torchvision versions
        model = models.resnet18(pretrained=False)
    
    # Replace final FC layer to match number of classes
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    
    # Load weights
    checkpoint = torch.load('cnn_face_model.pth', map_location=device)
    if 'model_state_dict' in checkpoint:
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        model.load_state_dict(checkpoint)
    
    model.to(device)
    model.eval()
    logger.info(f"ResNet18 model loaded successfully on {device}")


def preprocess_image(image_bytes):
    """
    Preprocess image for model inference.
    Detects face using Haar cascade and crops to face region.
    """
    # Load image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_bgr is None:
        raise ValueError("Could not decode image")
    
    # Convert to grayscale for face detection
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=4
    )
    
    face_detected = len(faces) > 0
    
    # Convert BGR to RGB
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    
    if face_detected:
        # Use the first detected face
        x, y, w, h = faces[0]
        face_roi = img_rgb[y:y+h, x:x+w]
    else:
        # No face detected, use center crop
        height, width = img_rgb.shape[:2]
        face_roi = img_rgb[int(height*0.2):int(height*0.8), int(width*0.2):int(width*0.8)]
    
    # Convert to PIL Image and apply transforms
    pil_img = Image.fromarray(face_roi)
    input_tensor = transform(pil_img).unsqueeze(0)
    
    return input_tensor.to(device), face_detected


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for container orchestration."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': str(device)
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict celebrity from uploaded image.
    
    Accepts either:
    - JSON body with base64-encoded image: {"image": "<base64_string>"}
    - Multipart form with image file: file=<image_file>
    
    Returns:
    {
        "predicted_celebrity": "Leonardo DiCaprio",
        "confidence": 0.95,
        "class_index": 7,
        "face_detected": true,
        "top_predictions": [...]
    }
    """
    try:
        # Get image data
        if request.is_json:
            data = request.get_json()
            if 'image' not in data:
                return jsonify({'error': 'Missing "image" field in JSON body'}), 400
            image_bytes = base64.b64decode(data['image'])
        elif 'file' in request.files:
            file = request.files['file']
            image_bytes = file.read()
        else:
            return jsonify({'error': 'No image provided. Send base64 JSON or multipart file.'}), 400
        
        # Preprocess image
        input_tensor, face_detected = preprocess_image(image_bytes)
        
        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, predicted_class = torch.max(probabilities, 1)
        
        predicted_idx = predicted_class.item()
        predicted_celebrity = label_map.get(predicted_idx, f"Unknown ({predicted_idx})")
        
        # Get top 5 predictions
        top5_probs, top5_indices = torch.topk(probabilities, min(5, len(label_map)), dim=1)
        top5_predictions = [
            {
                'celebrity': label_map.get(idx.item(), f"Unknown ({idx.item()})"),
                'confidence': round(prob.item(), 4)
            }
            for prob, idx in zip(top5_probs[0], top5_indices[0])
        ]
        
        return jsonify({
            'predicted_celebrity': predicted_celebrity,
            'confidence': round(confidence.item(), 4),
            'class_index': predicted_idx,
            'face_detected': face_detected,
            'top_predictions': top5_predictions
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/celebrities', methods=['GET'])
def list_celebrities():
    """List all celebrities the model can recognize."""
    return jsonify({
        'celebrities': list(label_map.values()),
        'total': len(label_map)
    })


# Load model when app starts
load_model()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
