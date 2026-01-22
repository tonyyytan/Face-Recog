# Celebrity Face Recognition Web Application

A machine learning-powered web application that identifies celebrity resemblances from user-submitted photographs. The system employs a Convolutional Neural Network (CNN) trained on facial features to classify images against a dataset of 17 notable public figures.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Technology Stack](#technology-stack)
- [License](#license)

## Overview

This application provides an interactive interface for users to capture or upload photographs and receive AI-powered predictions of celebrity resemblance. The system returns confidence scores and ranks the top matching celebrities.

### Screenshots

<!-- Add your screenshots here -->
| Capture Screen | Results Screen |
|----------------|----------------|
| ![Capture](<img width="1860" height="909" alt="image" src="https://github.com/user-attachments/assets/99a8760f-d468-4be8-b1c5-5e64b3e641a7" />
) | ![Results](<img width="1803" height="906" alt="image" src="https://github.com/user-attachments/assets/1abbc317-14cd-4b09-9b93-ece30948cfba" />
) |

> **Note:** To add screenshots, create a `docs/` folder and add images named `capture-screen.png` and `results-screen.png`.

### Demo

<!-- Add a GIF demo here if available -->
<!-- ![Demo](docs/demo.gif) -->

## Architecture

```
┌─────────────────┐     HTTP/REST     ┌──────────────────────┐
│   React + Vite  │ ◄──────────────►  │   Flask API Server   │
│   (Frontend)    │     JSON/Image    │   (Docker Container) │
└─────────────────┘                   └──────────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────────┐
                                      │  ResNet18 CNN Model  │
                                      │  + Haar Cascade      │
                                      └──────────────────────┘
```

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Docker | 20.0+ |
| Node.js | 18+ |
| Python | 3.10+ (for local development) |

Additionally, the model weights file (`cnn_face_model.pth`) must be obtained separately and placed in the `deployment/` directory.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Face-Recog.git
cd Face-Recog
```

### 2. Deploy the API Container

```bash
cd deployment
docker build -t face-recog-api .
docker run -d -p 5000:5000 --name face-recog face-recog-api
```

### 3. Install and Run the Frontend

```bash
cd webapp
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## Usage

1. **Grant Camera Permissions**: Allow browser access to your camera when prompted.
2. **Capture or Upload**: Use the camera interface to take a photograph, or upload an existing image file.
3. **View Results**: The application displays the predicted celebrity match along with confidence percentages for the top 5 candidates.

## API Reference

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu"
}
```

### List Celebrities

```http
GET /celebrities
```

**Response:**
```json
{
  "celebrities": ["Angelina Jolie", "Brad Pitt", ...],
  "total": 17
}
```

### Predict Celebrity

```http
POST /predict
Content-Type: multipart/form-data
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | File | Image file (JPEG, PNG) |

**Response:**
```json
{
  "predicted_celebrity": "Leonardo DiCaprio",
  "confidence": 0.8723,
  "class_index": 7,
  "face_detected": true,
  "top_predictions": [
    {"celebrity": "Leonardo DiCaprio", "confidence": 0.8723},
    {"celebrity": "Brad Pitt", "confidence": 0.0891},
    ...
  ]
}
```

## Technology Stack

### Backend
- **Framework**: Flask 3.0
- **ML Framework**: PyTorch 2.x
- **Model Architecture**: ResNet18 (transfer learning)
- **Face Detection**: OpenCV Haar Cascades
- **Server**: Gunicorn (production)
- **Containerization**: Docker

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Features**: WebRTC camera access, responsive design

## Supported Celebrities

The model is trained to recognize the following individuals:

| | | | |
|---|---|---|---|
| Angelina Jolie | Brad Pitt | Denzel Washington | Hugh Jackman |
| Jennifer Lawrence | Johnny Depp | Kate Winslet | Leonardo DiCaprio |
| Megan Fox | Natalie Portman | Nicole Kidman | Robert Downey Jr |
| Sandra Bullock | Scarlett Johansson | Tom Cruise | Tom Hanks |
| Will Smith | | | |

## Project Structure

```
Face-Recog/
├── deployment/
│   ├── app.py              # Flask API application
│   ├── Dockerfile          # Container configuration
│   ├── requirements.txt    # Python dependencies
│   ├── cnn_face_model.pth  # Model weights (not tracked)
│   ├── haar_face.xml       # Face detection cascade
│   └── label_map.json      # Class label mapping
│
├── webapp/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   └── index.css       # Tailwind CSS imports
│   ├── tailwind.config.js  # Tailwind configuration
│   └── package.json        # Node.js dependencies
│
├── .gitignore
└── README.md
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*For questions or issues, please open a GitHub issue.*
