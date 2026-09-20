# SmartAttend-Ai

### AI-Powered Smart Attendance Monitoring System

SmartAttend-Ai is an intelligent attendance management platform designed to automate student attendance using **AI-based face recognition**, while providing dedicated interfaces for **students, teachers, and administrators**.

The system combines a modern React frontend, Python-based AI/backend services, and Firebase for authentication and cloud data management.

---

## 🚀 Features

### 🤖 AI-Powered Attendance

* Face-based student identification
* Automated attendance marking
* Live camera-based attendance sessions
* Unknown-person detection
* Student enrollment with facial data
* Attendance session monitoring

### 👨‍🏫 Teacher Portal

* Start and manage attendance sessions
* View student attendance
* Manual attendance entry
* Student information management
* Course and timetable access
* Attendance reports

### 👨‍🎓 Student Portal

* Student dashboard
* Attendance overview
* Attendance history and calendar
* Course information
* Academic information
* Results
* Personal profile
* Timetable

### 🛠️ Admin Portal

* Administrative dashboard
* Student management
* User management
* Course management
* Course offerings
* Academic structure management
* Timetable management
* Attendance management
* Reports and analytics
* Data migration tools
* Deleted-record management
* System integration testing
* Unknown-person management

### 🔔 Additional Features

* Notification center
* Offline synchronization support
* Attendance analytics
* Firebase error handling
* Role-based application layouts
* Light/Dark theme support
* Responsive user interface
* Security access matrix

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │      User / Client   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   React + TypeScript │
                         │      Frontend        │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          Student Portal      Teacher Portal      Admin Portal
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Firebase         │
                         │ Auth + Firestore     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Python Backend     │
                         │   AI / Processing    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Face Recognition   │
                         │   & Attendance       │
                         └──────────────────────┘
```

---

# 🧰 Technology Stack

| Layer                | Technology               |
| -------------------- | ------------------------ |
| Frontend             | React                    |
| Language             | TypeScript               |
| Styling              | CSS                      |
| Build Tool           | Vite                     |
| Backend / AI         | Python                   |
| Backend API          | Flask                    |
| Database             | Firebase Firestore       |
| Authentication       | Firebase Authentication  |
| Security             | Firestore Security Rules |
| Package Management   | npm / Bun                |
| AI / Computer Vision | Face Recognition         |
| Camera Processing    | Browser Camera APIs      |

---

# 📁 Project Structure

```text
smartattend-ai/
│
├── app/
│   └── applet/
│       └── test-fb.js
│
├── python_backend/
│   ├── app.py
│   └── requirements.txt
│
├── src/
│   ├── components/
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── notifications/
│   │   └── ui/
│   │
│   ├── context/
│   │   ├── AcademicContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── DataContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── pages/
│   │   ├── admin/
│   │   ├── student/
│   │   ├── teacher/
│   │   └── common/
│   │
│   ├── utils/
│   ├── firebase.ts
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
│
├── firebase-applet-config.example.json
├── firebase-blueprint.json
├── firestore.rules
├── package.json
├── package-lock.json
├── server.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/AbhishekRBiradar/SmartAttend-Ai.git
cd SmartAttend-Ai
```

## 2. Install frontend dependencies

Using npm:

```bash
npm install
```

Or using Bun:

```bash
bun install
```

---

# 🔐 Firebase Configuration

SmartAttend-Ai uses Firebase for authentication and data management.

### Important

**Never commit your real Firebase configuration or private credentials to GitHub.**

This repository provides:

```text
firebase-applet-config.example.json
```

as a template.

Create your local configuration from the example and add your actual Firebase values locally.

The following files are intentionally excluded from Git:

```text
.env
firebase-applet-config.json
credentials.json
serviceAccountKey.json
*.pem
*.key
```

See `.gitignore` for the complete list.

---

# 🔑 Environment Variables

Create a local `.env` file when required.

Example:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

The repository includes:

```text
.env.example
```

as a reference.

**Do not commit your real API keys.**

---

# ▶️ Running the Application

Start the development server:

```bash
npm run dev
```

The Vite development server will provide a local URL, typically:

```text
http://localhost:5173
```

---

# 🐍 Python Backend

The project includes a Python backend under:

```text
python_backend/
```

Install the Python dependencies:

```bash
cd python_backend
pip install -r requirements.txt
```

Run the backend:

```bash
python app.py
```

---

# 🔥 Firebase Services

The application uses Firebase components for application data and authentication.

### Firebase Authentication

Used for:

* User authentication
* Role-based access
* Student accounts
* Teacher accounts
* Administrator accounts

### Cloud Firestore

Used for application data such as:

* Students
* Users
* Attendance
* Courses
* Academic information
* Timetables
* Results
* Application records

### Firestore Security Rules

Security rules are maintained in:

```text
firestore.rules
```

These rules should be reviewed and configured appropriately before production deployment.

---

# 🧠 AI Attendance Workflow

The general attendance workflow is:

```text
Student
   │
   ▼
Camera Capture
   │
   ▼
Face Detection / Processing
   │
   ▼
Face Identification
   │
   ▼
Student Matching
   │
   ├── Match Found ──────► Attendance Marked
   │
   └── Unknown Person ───► Unknown Person Record
                              │
                              ▼
                         Admin Review
```

---

# 📊 Attendance Management

SmartAttend-Ai provides tools for:

* Automated attendance
* Manual attendance
* Attendance calendars
* Attendance reports
* Attendance analytics
* Session-based attendance
* Student attendance history
* Offline synchronization

---

# 👥 User Roles

The system is organized around three primary application roles.

### Administrator

Responsible for:

* System management
* Students
* Users
* Courses
* Academic structure
* Timetables
* Reports
* System configuration

### Teacher

Responsible for:

* Attendance sessions
* Student attendance
* Manual attendance
* Courses
* Student information
* Teacher dashboard

### Student

Can access:

* Personal dashboard
* Attendance
* Courses
* Results
* Academic information
* Timetable
* Profile

---

# 🛡️ Security

The project follows several security practices:

* Firebase Authentication
* Firestore Security Rules
* Role-based access
* Environment variables
* Sensitive configuration excluded through `.gitignore`
* Private credentials excluded from version control

### Never commit

```text
.env
firebase-applet-config.json
serviceAccountKey.json
credentials.json
*.pem
*.key
```

---

# 🧪 Development

Check the project before committing changes:

```bash
git status
```

Build the frontend:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

# 📦 Production Build

Create a production build using:

```bash
npm run build
```

The generated production files are placed in:

```text
dist/
```

The `dist/` directory is excluded from Git.

---

# 🔄 Git Workflow

Recommended workflow:

```bash
git pull origin main
```

Make your changes and test them.

Then:

```bash
git status
git add .
git commit -m "Describe your changes"
git push origin main
```

Before committing, always verify that credentials and private configuration files are not staged.

---

# 🗺️ Future Improvements

Potential future improvements include:

* Improved face recognition accuracy
* Advanced attendance analytics
* Mobile application support
* Real-time notifications
* Automated attendance reports
* Improved offline-first functionality
* Cloud deployment
* Performance optimization
* Advanced administrative analytics
* Automated backup and recovery
* Enhanced security monitoring

---

# 👨‍💻 Project

**SmartAttend-Ai**

An AI-based attendance monitoring and academic management platform designed to simplify attendance workflows and provide centralized tools for students, teachers, and administrators.

---

## 📄 License

This project is currently maintained as an academic/project development repository.

License information can be added here when the project is released under a specific open-source license.
