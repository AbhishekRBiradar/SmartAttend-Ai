import os
import sys
# Add current directory to path for config imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import cv2
import time
import base64
import threading
from datetime import datetime
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

import config

# Recognition Modules
from recognition.engine import engine
from recognition.quality import check_face_quality
from recognition.embedding import process_embedding
from recognition.matcher import matcher
from recognition.liveness import check_liveness
from academic_db import init_academic_db, resolve_academic_attendance, sync_academic_entities, get_connection

app = Flask(__name__)
CORS(app)

KNOWN_DIR = "known_faces"
CAPTURE_DIR = "captured_logs"

os.makedirs(KNOWN_DIR, exist_ok=True)
os.makedirs(CAPTURE_DIR, exist_ok=True)

# Initialize authoritative academic database schema and sample structures
init_academic_db()

# Temporal Verification State
temporal_tracker = {}  # student_id -> {"count": int, "last_seen": float}

@app.route("/enroll", methods=["POST"])
def enroll():
    data = request.json["image"]
    student_id = request.json["student_id"]
    
    department = request.json.get("department", "Unknown_Department")
    year = request.json.get("year", "Unknown_Year")
    semester = request.json.get("semester", "Unknown_Semester")
    role = request.json.get("role", "Student")
    name = request.json.get("name", student_id)
    
    img_data = base64.b64decode(data.split(",")[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    # Analyze face using InsightFace
    faces = engine.analyze(frame)
    
    if len(faces) == 0:
        return jsonify({"success": False, "message": "No face detected in the image. Please try again."})
    
    if len(faces) > 1:
        return jsonify({"success": False, "message": "Multiple faces detected. Please ensure only one person is in frame."})
        
    face = faces[0]
    
    # Quality Check
    is_valid, reason = check_face_quality(frame, face)
    
    # Liveness check during enrollment to prevent spoofed enrollments
    if is_valid:
        is_live, liveness_reason = check_liveness(frame, face)
        if not is_live:
            is_valid = False
            reason = f"Spoof Detected: {liveness_reason}"

    if not is_valid:
        return jsonify({"success": False, "message": f"Poor image quality: {reason}"})
        
    # Process Embedding
    emb = process_embedding(face.embedding)
    if emb is None:
        return jsonify({"success": False, "message": "Failed to extract facial features."})
    
    # Save Image
    student_dir = os.path.join(KNOWN_DIR, role, department, str(year), str(semester), student_id)
    os.makedirs(student_dir, exist_ok=True)
    filename = f"{student_id}_{int(time.time())}.jpg"
    filepath = os.path.join(student_dir, filename)
    cv2.imwrite(filepath, frame)
    
    # Add to FAISS Index
    metadata = {
        "student_id": student_id,
        "name": name,
        "department": department,
        "year": year,
        "semester": semester,
        "role": role
    }
    matcher.add_face(emb, metadata)
    
    return jsonify({"success": True, "message": f"Successfully enrolled face for {student_id}"})


@app.route("/detect", methods=["POST"])
def detect():
    current_time = time.time()
    req_json = request.json or {}
    data = req_json.get("image")
    if not data:
        return jsonify({"error": "Missing image in request"}), 400

    # Active session provided by frontend or API
    session_id = req_json.get("session_id") or req_json.get("sessionId")
    
    # Optional academic sync payload passed with request to ensure sync with active state
    if "sync_payload" in req_json:
        sync_academic_entities(req_json["sync_payload"])

    img_data = base64.b64decode(data.split(",")[1]) if "," in data else base64.b64decode(data)
    np_arr = np.frombuffer(img_data, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    # Analyze faces using InsightFace (SCRFD detector + ArcFace 512-D embedder)
    faces = engine.analyze(frame)
    result = []
    
    for face in faces:
        bbox = face.bbox
        left, top, right, bottom = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
        
        # 1. Quality check for recognition
        is_valid, reason = check_face_quality(frame, face)
        
        # Liveness check if enabled
        if is_valid and config.ENABLE_LIVENESS:
            is_live, liveness_reason = check_liveness(frame, face)
            if not is_live:
                is_valid = False
                reason = f"Spoof Detected: {liveness_reason}"

        if not is_valid:
            result.append({
                "student_id": "UNKNOWN",
                "name": "Unknown",
                "similarity": 0.0,
                "recognition_status": "LOW_QUALITY",
                "enrollment_status": "NOT_ENROLLED",
                "attendance_status": "LOW_QUALITY",
                "box": {"top": top, "right": right, "bottom": bottom, "left": left}
            })
            continue
            
        # 2. Extract & L2-normalize 512-D embedding (never return embedding to frontend)
        emb = process_embedding(face.embedding)
        if emb is None:
            continue
            
        # 3. FAISS HNSW candidate search
        matches = matcher.search(emb, k=5)
        
        best_match = None
        best_dist = -1.0
        
        for dist, meta in matches:
            if dist < config.MATCH_THRESHOLD:
                continue
            if dist > best_dist:
                best_dist = dist
                best_match = meta
                
        if best_match is not None:
            # 4. Resolve candidate to student_id
            student_id = best_match['student_id']
            name = best_match.get('name', student_id)
            similarity = float(best_dist)
            
            # 5. Temporal verification tracking
            tracker = temporal_tracker.get(student_id, {"count": 0, "last_seen": 0})
            if current_time - tracker["last_seen"] > config.CONFIRMATION_WINDOW_SECONDS:
                tracker["count"] = 1
            else:
                tracker["count"] += 1
            tracker["last_seen"] = current_time
            temporal_tracker[student_id] = tracker
            
            # 6. Check temporal consistency threshold
            if tracker["count"] < config.REQUIRED_CONSISTENT_FRAMES:
                recog_status = "VERIFYING"
                # Check enrollment without writing attendance
                rec_st, enr_st, att_st, extra_meta = resolve_academic_attendance(
                    student_id, session_id, similarity, execute_write=False
                )
                if enr_st == "NOT_ENROLLED" or enr_st == "NO_ACTIVE_SESSION":
                    att_status = "NOT_ENROLLED"
                    enrollment_status = enr_st
                elif att_st == "ALREADY_MARKED":
                    att_status = "ALREADY_MARKED"
                    enrollment_status = "ENROLLED"
                else:
                    att_status = "VERIFYING"
                    enrollment_status = "ENROLLED"
            else:
                recog_status = "HIGH_CONFIDENCE"
                # 7. Authoritative Academic Verification:
                # session_id -> ClassSession -> course_offering_id -> Enrollment -> student_id
                rec_st, enrollment_status, att_status, extra_meta = resolve_academic_attendance(
                    student_id, session_id, similarity, execute_write=True
                )
            
            result.append({
                "student_id": student_id,
                "name": name,
                "similarity": round(similarity, 4),
                "recognition_status": recog_status,
                "enrollment_status": enrollment_status,
                "attendance_status": att_status,
                "session_id": extra_meta.get("session_id") or session_id,
                "course_offering_id": extra_meta.get("course_offering_id"),
                "box": {"top": top, "right": right, "bottom": bottom, "left": left}
            })
        else:
            # Unknown person: do NOT save unknown face automatically
            result.append({
                "student_id": "UNKNOWN",
                "name": "Unknown",
                "similarity": round(float(face.det_score), 4),
                "recognition_status": "UNKNOWN",
                "enrollment_status": "UNKNOWN",
                "attendance_status": "UNKNOWN",
                "box": {"top": top, "right": right, "bottom": bottom, "left": left}
            })
            
    return jsonify(result)

@app.route("/academic/sync", methods=["POST"])
def sync_academic():
    payload = request.json or {}
    success = sync_academic_entities(payload)
    return jsonify({"success": success, "message": "Academic entities synchronized"})

@app.route("/academic/attendance/<session_id>", methods=["GET"])
def get_session_attendance(session_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM attendance WHERE session_id = ? ORDER BY timestamp DESC", (session_id,))
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(rows)

if __name__=="__main__":
    app.run(port=5000, debug=True)


@app.route("/config", methods=["GET", "POST"])
def config_route():
    import onnxruntime as ort
    from config import EXECUTION_PROVIDERS, MATCH_THRESHOLD, CAMERA_RESOLUTION
    
    available_providers = ort.get_available_providers()
    has_cuda = 'CUDAExecutionProvider' in available_providers
    
    if request.method == "POST":
        # Here we could dynamically update config.py or internal state if needed
        # but for this assignment, we'll just acknowledge it
        return jsonify({"success": True})
        
    return jsonify({
        "available_providers": available_providers,
        "has_cuda": has_cuda,
        "active_providers": EXECUTION_PROVIDERS,
        "match_threshold": MATCH_THRESHOLD,
        "camera_resolution": f"{CAMERA_RESOLUTION[0]}x{CAMERA_RESOLUTION[1]}"
    })
