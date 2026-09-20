# SmartAttend AI

A comprehensive, real-time facial recognition attendance system combining a modern React/Vite frontend with a high-performance Python/Flask backend.

## AI Architecture (Updated)

The facial recognition pipeline has been upgraded from legacy MTCNN/dlib to a modern, scalable architecture:

1. **Face Detection**: **SCRFD** (via InsightFace)
   - Extremely fast and accurate face detection.
   - Robust against various lighting conditions and angles.
2. **Feature Extraction**: **InsightFace (ArcFace-style)**
   - Generates highly discriminative **512-D embeddings**.
   - Normalized vectors for cosine/inner-product similarity.
3. **Vector Search**: **FAISS** (HNSW Flat)
   - Blazing-fast similarity search capable of scaling to millions of embeddings.
4. **Quality & Temporal Verification**:
   - Built-in heuristics for blur, face size, and detection confidence.
   - Requires multiple consistent frames (configurable) before registering attendance.

## System Requirements

- Node.js (v18+)
- Python 3.11+
- (Optional but Recommended) NVIDIA GPU with CUDA for ONNXRuntime hardware acceleration.

## Setup Instructions

### 1. Frontend (React/Vite)

```bash
npm install
npm run dev
```

### 2. Backend (Python/Flask)

Navigate to `python_backend/` and install dependencies:

```bash
cd python_backend
pip install -r requirements.txt
```

Run the backend:

```bash
python app.py
```

*Note: The backend will automatically detect and utilize CUDA if available, falling back to CPU otherwise.*

## Benchmarking & Configuration

You can configure thresholds and behavior via `python_backend/config.py`:
- \`AI_DETECTION_RESOLUTION\`: Resolution the AI processes (default 640x640).
- \`MATCH_THRESHOLD\`: Similarity threshold for 512-D embeddings.
- \`REQUIRED_CONSISTENT_FRAMES\`: Frames required for temporal verification.

If you ever need to manually rebuild the FAISS index from the `known_faces/` directory, run:
```bash
python rebuild_index.py
```
