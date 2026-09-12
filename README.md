# Alfred the Butler

**Alfred** is a sophisticated, AI-powered personal assistant dashboard inspired by J.A.R.V.I.S and Alfred Pennyworth. It serves as a central hub for daily routines, communication, and productivity, featuring a beautifully crafted glassmorphism UI with WebGL-powered specular interactive buttons.

## 🌟 Key Features

- **Voice AI & Push-To-Talk Dictation**
  - **Talk to Alfred (Ctrl+M):** Push-to-talk voice interface to dictate commands directly to the AI brain.
  - **Alfred's Rundown (Ctrl+Space):** Instantly trigger a personalized daily rundown that uses Text-to-Speech to brief you on your day.
- **Dynamic Aesthetic Environment**
  - The dashboard automatically adapts to the time of day, displaying a deep, warm hue during the day (6 AM - 6 PM) and seamlessly transitioning to a sleek, solid black for the night.
  - Time-aware greetings ("Good morning, Mr. Wayne").
- **Productivity & Life Tracking**
  - **Habit & Streak Tracker:** Track daily habits with an integrated streak counter. Includes a "Freeze" mechanic to preserve streaks on days you can't complete them (e.g., when the gym is closed).
  - **GitHub Integration:** Alfred monitors your latest GitHub pushes and commits to keep you up-to-date with your codebase progress.
  - **Email Monitoring:** Connects to your inbox to summarize and track unread emails.
  - **Sticky Notes & Reminders:** Keep track of quick thoughts and important upcoming tasks.

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS
- **UI Details:** Custom WebGL shaders (`ogl`) for dynamic `SpecularButton` lighting and hover effects. 
- **Backend:** Python (FastAPI / Vercel Serverless)
- **AI Core:** Google Gemini 1.5 Pro / Flash models for intelligent context parsing and conversational abilities.
- **Voice:** Web Speech API for dictation and TTS (Text-to-Speech) for spoken rundowns.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- API Keys for Google Gemini (and any other integrated services)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rajdeeppal01/alfredthebuttler.git
   cd alfredthebuttler
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

## 🎨 Design Philosophy
The design strictly prioritizes visual excellence. Using a dark mode-centric palette, glassmorphism (`backdrop-filter`), and interactive light-reactive buttons, Alfred is designed to feel like a premium, state-of-the-art terminal straight out of the Batcave.
