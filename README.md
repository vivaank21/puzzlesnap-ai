# 🧩 PuzzleSnap AI

> **Capture. Shuffle. Solve.** — A gesture-controlled, privacy-first photo puzzle game built with Flask and MediaPipe.

![PuzzleSnap AI](https://img.shields.io/badge/Python-Flask-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Status](https://img.shields.io/badge/Status-Production-brightgreen)

---

## 🎮 Overview

**PuzzleSnap AI** is a web-based puzzle game that transforms your photos into interactive jigsaw puzzles. Using hand gesture recognition, you simply show a **thumbs-up** gesture to your webcam to capture a photo. The server then enhances the image and converts it into a puzzle with 4 difficulty levels (3×3 to 6×6 grids). Solve it for a score, but rest assured — **your photo is never stored**.

### Key Philosophy
🔒 **Privacy-First**: Photos are processed in memory only — never written to disk or database.  
🎯 **Gesture-Driven**: One deliberate gesture prevents accidental captures.  
🌐 **Browser-Native**: Hand detection runs entirely client-side using WebAssembly (MediaPipe).  
📱 **Responsive**: Works seamlessly on desktop, tablet, and mobile.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤚 **Gesture Control** | Show a thumbs-up for ~0.4 seconds to trigger photo capture. MediaPipe detects hand landmarks in real-time. |
| 🔐 **Zero Data Storage** | Images are processed in RAM, never written to disk. Server sends the enhanced image back and discards it. |
| 📊 **4 Difficulty Modes** | **Easy** (3×3), **Medium** (4×4), **Hard** (5×5), **Expert** (6×6) — each offers unique challenge. |
| 🎯 **Magnetic Snapping** | Puzzle pieces snap into place with satisfying click when positioned near target. |
| ⏱️ **Live Scoring** | Real-time timer, move counter, and progress tracking. Points awarded based on speed and efficiency. |
| 💡 **Hint System** | Stuck? Request a hint to see the target location — but it costs you score points. |
| 🌙 **Dark & Light Themes** | Switch themes anytime. Preference persists across sessions. |
| 🏆 **Leaderboard** | Anonymous high-score tracking. See how you stack up against other players. |
| 🎨 **Auto-Enhancement** | Server brightens, sharpens, and crops photos to optimal puzzle squares. |
| 📲 **PWA Ready** | Service worker support for offline-first experience and installability. |

---

## 📸Snapshots
 - **Home**
 <img width="1907" height="910" alt="image" src="https://github.com/user-attachments/assets/ae5a05ce-a39c-45db-804c-fabb4bea3720" />

 - **LeaderBoard**
 <img width="1907" height="846" alt="image" src="https://github.com/user-attachments/assets/20bd9407-b950-407b-a5ca-f48a3d4e811d" />

 - **Analytics**
 <img width="1912" height="775" alt="image" src="https://github.com/user-attachments/assets/7b82c810-a273-4184-ac42-3ec09c68ccfb" />

 - **Play Area**
 <img width="1911" height="918" alt="image" src="https://github.com/user-attachments/assets/eaac4ab4-8d76-421b-8e50-bc3baa83773c" /> 

 - **Setting**
 <img width="1917" height="725" alt="image" src="https://github.com/user-attachments/assets/679b577a-64af-4453-b302-8714767a8673" />

 - **About US**
 <img width="1907" height="862" alt="image" src="https://github.com/user-attachments/assets/690a02d8-494a-4ca0-a197-a6915c2ae6a7" />


 ---


## 🏗️ Architecture

### Stack
- **Backend**: Flask 3.0.3 (Python)
- **Frontend**: Vanilla JS + MediaPipe Tasks Vision (WebAssembly)
- **Image Processing**: Pillow, NumPy
- **Database**: SQLite (anonymous gameplay stats only)
- **Styling**: Custom CSS with CSS variables, glassmorphic design

### Directory Structure
```
puzzlesnap-ai/
├── app.py                    # Flask app entry point
├── requirements.txt          # Python dependencies
├── database/
│   └── puzzlesnap.db        # SQLite database
├── routes/
│   ├── main.py              # Page routes (/, /capture, /play, etc.)
│   └── api.py               # API endpoints (/api/capture, /api/analytics)
├── utils/
│   ├── database.py          # SQLite operations (read/write stats)
│   ├── image_processing.py  # Image enhancement pipeline
│   ├── puzzle.py            # Puzzle generation logic (grid slicing)
│   ├── scoring.py           # Score calculation (time, moves, difficulty)
│   ├── gesture.py           # Hand gesture verification
│   ├── analytics.py         # Game statistics aggregation
│   └── camera.py            # Camera frame processing
├── static/
│   ├── css/style.css        # Global styles + design system
│   ├── js/
│   │   ├── main.js          # Page initialization
│   │   ├── gesture.js       # Camera & gesture detection
│   │   ├── puzzle.js        # Game logic & piece interactions
│   │   └── audio.js         # Sound effects
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
└── templates/
    ├── base.html            # Layout wrapper
    ├── landing.html         # Home page (features, FAQ, CTA)
    ├── capture.html         # Camera & gesture capture
    ├── puzzle.html          # Game board interface
    ├── leaderboard.html     # High-score display
    ├── analytics.html       # Game stats dashboard
    ├── settings.html        # User preferences (theme, audio)
    ├── about.html           # Project info
    ├── help.html            # Tutorial & controls guide
    ├── admin.html           # Admin dashboard
    └── 404.html             # Error page
```

### Data Flow

```
User Shows Thumbs-Up
        ↓
[Browser] MediaPipe detects hand gesture (client-side)
        ↓
Gesture confirmed → Countdown & Photo Capture
        ↓
[Browser] Encode to JPEG, send via HTTPS POST
        ↓
[Server] Flask receives image bytes
        ↓
[Server] Decode → Enhance (brightness, sharpness, crop) → Slice into grid
        ↓
[Server] Re-encode enhanced image, send back in response
        ↓
[Browser] Display puzzle pieces, scatter animation
        ↓
User drags pieces and solves puzzle
        ↓
[Server] POST final score (moves, time, hints) to /api/submit
        ↓
[Database] Store anonymous stat record
```

### Image Processing Pipeline (utils/image_processing.py)

1. **Decode** JPEG bytes into PIL Image
2. **Enhance** Brightness & contrast (optional)
3. **Sharpen** for clearer piece edges
4. **Crop** to square (center crop)
5. **Resize** to optimal puzzle size (based on grid difficulty)
6. **Slice** into grid of equal-sized pieces
7. **Encode** enhanced image back to JPEG
8. **Discard** original image (garbage collected)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Modern browser with WebRTC + WebAssembly support (Chrome 88+, Firefox 89+, Safari 15.4+)
- Webcam (for gesture-based capture)

### Installation

1. **Clone or extract the project**
   ```bash
   cd puzzlesnap-ai
   ```

2. **Create a virtual environment** (optional but recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask server**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   https://localhost:5000
   ```
   (Accept the self-signed SSL certificate if prompted)

### Configuration

Environment variables (optional):
```bash
FLASK_ENV=production          # Set to 'development' for debug mode
FLASK_DEBUG=False
MAX_CONTENT_LENGTH=12.5MB     # Max image upload size (hardcoded in app.py)
```

Database is auto-initialized on first run (`utils/database.py:init_db()`).

---

## 🎮 How to Play

### Step 1: Choose Difficulty
Select **Easy** (3×3), **Medium** (4×4), **Hard** (5×5), or **Expert** (6×6) on the capture page.

### Step 2: Show Thumbs-Up
Point your **thumbs-up** gesture at the camera. Your thumb must be the highest point visible. Keep it steady for ~0.4 seconds.

*No thumbs-up?* Use the **Manual Capture** button instead.

### Step 3: Countdown & Capture
A 3-2-1 countdown appears, then the server receives your photo frame.

### Step 4: Enhance & Slice
The server brightens, sharpens, crops, and slices your photo into puzzle pieces.

### Step 5: Solve It
Drag pieces onto the board. They snap into place when close enough. Complete the picture to finish.

### Scoring
Your score is calculated as:
```
Base Score = 1000
Speed Bonus = +200 if completed faster than par time
Move Bonus = +150 if moves ≤ optimal moves
Hint Penalty = −5% per hint used
Difficulty Multiplier = 1.0× (Easy) → 2.5× (Expert)
```

---

## 🎯 Key Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page — features, FAQ, stats, CTA |
| `/capture` | Camera interface for gesture detection & photo capture |
| `/play` | Game board — drag pieces, timer, scoring |
| `/leaderboard` | Top scores (anonymous) |
| `/analytics` | Overall game statistics dashboard |
| `/settings` | Theme, sound, preferences |
| `/about` | Project info & credits |
| `/help` | Tutorial & keyboard shortcuts |
| `/admin` | Admin dashboard (all stats, board management) |

---

## 📡 API Endpoints

### POST /api/capture
Receive captured JPEG image, enhance it, and return puzzle data.

**Request:**
```json
{
  "image": "<base64-encoded JPEG>",
  "difficulty": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "image_base64": "<enhanced JPEG>",
  "grid_size": 4,
  "tiles": [
    { "x": 0, "y": 0, "width": 100, "height": 100 },
    ...
  ]
}
```

### POST /api/submit
Submit final gameplay score.

**Request:**
```json
{
  "difficulty": "medium",
  "completion_time": 42,
  "total_moves": 23,
  "hints_used": 1
}
```

**Response:**
```json
{
  "success": true,
  "score": 1847,
  "rank": 15,
  "timestamp": "2024-06-30T12:34:56Z"
}
```

### GET /api/analytics
Fetch global game statistics.

**Response:**
```json
{
  "total_games_played": 1523,
  "average_completion_time": 87.4,
  "average_moves": 18,
  "difficulty_breakdown": {
    "easy": 412,
    "medium": 601,
    "hard": 387,
    "expert": 123
  }
}
```

### GET /api/leaderboard
Fetch top scores (anonymous).

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "score": 2891,
      "difficulty": "expert",
      "completion_time": 53,
      "timestamp": "2024-06-30T10:15:22Z"
    },
    ...
  ]
}
```

---

## 🔐 Privacy & Security

### What Gets Stored?
✅ **Anonymous gameplay statistics only:**
- Difficulty level
- Completion time (seconds)
- Total moves
- Hints used
- Calculated score
- Timestamp

### What Does NOT Get Stored?
❌ No photos or images  
❌ No video frames  
❌ No face data or biometrics  
❌ No personally identifiable information  
❌ No cookies (except theme preference)

### Architecture Details
1. **Client-side gesture detection**: MediaPipe runs in browser as WebAssembly. The server never sees video.
2. **Memory-only image processing**: JPEG is decoded into RAM, enhanced in RAM, and re-encoded back. Never touches disk.
3. **HTTPS only**: All communication is encrypted. Self-signed cert for development.
4. **Stateless processing**: Each request is independent. No session data persists beyond stats.

---

## 🎨 Design System

### Color Palette
| Variable | Value | Usage |
|----------|-------|-------|
| `--violet` | `#7c5cff` | Primary accent, buttons, headings |
| `--cyan` | `#33e1ed` | Secondary accent, highlights |
| `--coral` | `#ff6b6b` | Alerts, danger actions |
| `--green` | `#4ade80` | Success, confirmation |
| `--gold` | `#ffc857` | Premium, rewards |
| `--bg` | `#0a0c18` | Dark background |
| `--text` | `#f1f0fb` | Primary text |

### Typography
- **Display**: Space Grotesk (headings, large text)
- **Body**: Inter (paragraphs, labels)
- **Mono**: JetBrains Mono (code, data)

### Radius & Spacing
- Border Radius: 10px (small), 18px (medium), 28px (large)
- Spacing: 8px baseline (multiples: 8, 16, 24, 32, 40, 48, 56, 64)
- Shadows: Soft drop shadows, subtle glow on interactive elements

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Pause/Resume game |
| `H` | Request hint |
| `R` | Restart puzzle |
| `P` | Preview original image (hold) |
| `Escape` | Return to capture page |

---

## 📱 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Full support |
| Edge | 88+ | ✅ Full support |
| Firefox | 89+ | ✅ Full support |
| Safari | 15.4+ | ✅ Full support |
| Mobile Safari | 15.4+ | ✅ Responsive, touch-friendly |
| Chrome Mobile | 88+ | ✅ Gesture detection works |

**Note**: Gesture recognition performs best on Chrome/Edge due to WebGPU delegate support in MediaPipe.

---

## 🛠️ Development

### Project Structure Overview
```
Backend:
  app.py              → Flask app factory
  routes/*.py         → URL handlers
  utils/*.py          → Business logic (images, DB, scoring)
  
Frontend:
  static/js/*.js      → Game logic, gesture detection
  static/css/style.css → Design system & component styles
  templates/*.html    → Jinja2 page templates
  
Database:
  database/puzzlesnap.db  → SQLite with game stats
```

### Testing Locally

1. **Test gesture detection without gesture:**
   Click "Manual Capture" button on `/capture` page.

2. **Test image enhancement:**
   Post a JPEG to `http://localhost:5000/api/capture` with a test image.

3. **Test database:**
   Submit a score via `/api/submit` and check leaderboard.

4. **Admin dashboard:**
   Visit `http://localhost:5000/admin` to see all stats and scores.

### Adding Custom Features

**Example: Add new difficulty level (7×7)**
1. Edit `utils/puzzle.py`: Add `7` to `GRID_SIZES`
2. Edit `templates/capture.html`: Add 7×7 option
3. Update CSS grid preview styling
4. Test difficulty selection in UI

---

## 📊 Database Schema

### Table: `gameplay_records`
```sql
CREATE TABLE gameplay_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  difficulty TEXT NOT NULL,           -- easy, medium, hard, expert
  completion_time REAL NOT NULL,      -- seconds
  total_moves INTEGER NOT NULL,
  hints_used INTEGER DEFAULT 0,
  calculated_score INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `settings`
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- Example rows:
-- ('theme', 'dark') or ('theme', 'light')
-- ('sound_enabled', '1')
```

---

## 🐛 Troubleshooting

### "Camera permission denied"
**Solution**: Check browser permissions. On Chrome: Settings → Privacy → Camera. Reload page and grant permission.

### "Gesture detection not working"
**Solution**: Ensure good lighting. Gesture must be held steady for ~0.4s. Try Manual Capture as fallback.

### "Image too large (413)"
**Solution**: Server has max 12.5MB image limit. Your photo exceeds this (unlikely). Try lower-resolution device.

### "Database is locked"
**Solution**: Multiple processes accessing SQLite. Close other instances of Flask. SQLite isn't ideal for high concurrency — consider PostgreSQL for production.

### "Styles not loading"
**Solution**: Clear browser cache (`Ctrl+Shift+Delete`). Check static file paths in Flask configuration.

---

## 🚀 Production Deployment

### Recommended Stack
- **Web Server**: Gunicorn (WSGI) or uWSGI
- **Database**: PostgreSQL (replaces SQLite)
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Hosting**: AWS EC2, DigitalOcean, Heroku, or self-hosted

### Deployment Checklist
- [ ] Set `FLASK_ENV=production`
- [ ] Disable `debug=True`
- [ ] Replace SQLite with PostgreSQL
- [ ] Use Gunicorn: `gunicorn -w 4 app:app`
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Enable CORS for cross-origin requests if needed
- [ ] Monitor logs and error rates
- [ ] Scale with load balancing if traffic spike

---

## 📝 License

MIT License. See LICENSE file for details.

---

## 🙏 Credits

- **MediaPipe**: Hand gesture detection (TensorFlow Lite in browser)
- **Flask**: Web framework
- **Pillow**: Image processing
- **Font Stack**: Space Grotesk (display), Inter (body), JetBrains Mono (code)

---

## 📧 Support & Feedback

Found a bug or have a feature request?  
Create an issue or reach out via the **Help** page.

---

**Built with ❤️ and 🎯 for privacy-conscious puzzle lovers.**

*Capture. Shuffle. Solve.*
