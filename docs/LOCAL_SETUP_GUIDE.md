# CommuteShare - Local Development Setup Guide

## For Windows (PowerShell / VS Code)

---

## Prerequisites

Before you start, install the following:

### 1. Node.js (v18 or higher)
```
Download from: https://nodejs.org/
Choose the LTS version
```

### 2. Python (v3.10 or higher)
```
Download from: https://www.python.org/downloads/
✅ Check "Add Python to PATH" during installation
```

### 3. MongoDB
**Option A: MongoDB Local Installation**
```
Download from: https://www.mongodb.com/try/download/community
Install MongoDB Community Server
```

**Option B: MongoDB Atlas (Cloud - Recommended for beginners)**
```
1. Go to https://www.mongodb.com/atlas
2. Create free account
3. Create a free cluster
4. Get your connection string
```

### 4. Git (if not already installed)
```
Download from: https://git-scm.com/download/win
```

---

## Step-by-Step Setup

### Step 1: Open PowerShell or VS Code Terminal

**PowerShell:**
- Press `Win + X` → Select "Windows Terminal" or "PowerShell"

**VS Code:**
- Open VS Code
- Press `` Ctrl + ` `` to open terminal
- Or go to: Terminal → New Terminal

---

### Step 2: Navigate to Project Folder

```powershell
# If you cloned to Downloads folder
cd ~\Downloads\Commuteshare

# Or wherever you cloned the repo
cd C:\path\to\Commuteshare
```

---

### Step 3: Setup Backend

```powershell
# Navigate to backend folder
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate

# You should see (venv) at the start of your prompt

# Install Python dependencies
pip install -r requirements.txt
```

---

### Step 4: Configure Backend Environment

Create a `.env` file in the `backend` folder:

```powershell
# Create .env file
New-Item -Path ".env" -ItemType File
```

Open the `.env` file in VS Code or Notepad and add:

```env
# MongoDB Connection (Choose one option)

# Option A: Local MongoDB
MONGO_URL=mongodb://localhost:27017

# Option B: MongoDB Atlas (replace with your connection string)
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# Database name
DB_NAME=commuteshare

# JWT Secret (change this to any random string)
JWT_SECRET=your-super-secret-key-change-this-in-production

# Solana Network (devnet for testing)
SOLANA_NETWORK=devnet
```

Save the file.

---

### Step 5: Start Backend Server

```powershell
# Make sure you're in the backend folder with venv activated
# (venv) PS C:\...\Commuteshare\backend>

# Start the backend server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process...
INFO:     Started server process...
INFO:     Application startup complete.
```

✅ **Keep this terminal running!**

---

### Step 6: Open New Terminal for Frontend

**In VS Code:** Click the `+` button in the terminal panel
**In PowerShell:** Open a new PowerShell window

---

### Step 7: Setup Frontend

```powershell
# Navigate to frontend folder (from project root)
cd C:\path\to\Commuteshare\frontend

# Install Node.js dependencies
npm install

# OR if you prefer yarn
yarn install
```

---

### Step 8: Configure Frontend Environment

Create a `.env` file in the `frontend` folder:

```powershell
# Create .env file
New-Item -Path ".env" -ItemType File
```

Add to the `.env` file:

```env
# Backend URL (points to your local backend)
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

---

### Step 9: Start Frontend (Expo)

```powershell
# Start Expo development server
npx expo start
```

You should see:
```
Starting project at C:\...\Commuteshare\frontend
Starting Metro Bundler

› Press w │ open web
› Press a │ open Android
› Press i │ open iOS simulator
› Press r │ reload app
› Press m │ toggle menu
› Press ? │ open more commands

Waiting on http://localhost:8081
```

---

### Step 10: View the App

**Option A: Web Browser (Easiest)**
```
Press 'w' in the terminal
OR
Open browser and go to: http://localhost:8081
```

**Option B: Expo Go App (Mobile)**
```
1. Install "Expo Go" app on your phone (iOS/Android)
2. Scan the QR code shown in the terminal
3. App will load on your phone
```

**Option C: Android Emulator**
```
1. Install Android Studio
2. Create a virtual device (AVD)
3. Start the emulator
4. Press 'a' in the Expo terminal
```

---

## Quick Start Commands Summary

Open **two terminals** and run:

**Terminal 1 - Backend:**
```powershell
cd Commuteshare\backend
.\venv\Scripts\Activate
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

**Terminal 2 - Frontend:**
```powershell
cd Commuteshare\frontend
npx expo start
```

---

## Testing the App

### 1. Register a New Account
- Open the app (web or mobile)
- Click "Get Started"
- Fill in the registration form
- You'll receive 10 COST tokens as welcome bonus!

### 2. Test API Directly
```powershell
# In a new terminal, test the backend
curl http://localhost:8001/api/health
```

Or open in browser: `http://localhost:8001/api/health`

---

## Troubleshooting

### Problem: "python is not recognized"
**Solution:** Reinstall Python and check "Add to PATH"
```powershell
# Verify Python installation
python --version
```

### Problem: "npm is not recognized"
**Solution:** Reinstall Node.js
```powershell
# Verify Node installation
node --version
npm --version
```

### Problem: MongoDB connection error
**Solution:** 
- If using local MongoDB, make sure it's running
- If using Atlas, check your connection string and IP whitelist

### Problem: "Port 8001 already in use"
**Solution:**
```powershell
# Find and kill the process
netstat -ano | findstr :8001
taskkill /PID <PID_NUMBER> /F
```

### Problem: Expo not loading on phone
**Solution:**
- Make sure phone and computer are on same WiFi network
- Try using tunnel mode: `npx expo start --tunnel`

### Problem: Module not found errors
**Solution:**
```powershell
# Backend
pip install -r requirements.txt

# Frontend
npm install
# or
yarn install
```

---

## VS Code Extensions (Recommended)

Install these for better development experience:

1. **Python** - Microsoft
2. **Pylance** - Microsoft
3. **ES7+ React/Redux/React-Native snippets**
4. **Prettier** - Code formatter
5. **MongoDB for VS Code**
6. **Thunder Client** - API testing

---

## Project Structure

```
Commuteshare/
├── backend/
│   ├── server.py          # Main FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
│
├── frontend/
│   ├── app/              # Expo Router screens
│   ├── src/              # Components, stores, utils
│   ├── package.json      # Node dependencies
│   └── .env              # Frontend environment variables
│
└── docs/
    ├── SOLANA_COST_TOKEN_GUIDE.md
    ├── INVESTOR_PITCH_DECK.md
    └── proposals/
```

---

## Need Help?

- **GitHub Issues:** https://github.com/benartistery/Commuteshare/issues
- **Expo Docs:** https://docs.expo.dev/
- **FastAPI Docs:** https://fastapi.tiangolo.com/

---

*Happy coding! 🚀*
