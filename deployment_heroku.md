# End-to-End Heroku Deployment Guide & Troubleshooting

This document outlines the complete deployment process for hosting **AMU Utilities** natively on Heroku as a Python application, bypassing Docker entirely.

---

## Part 1: Pre-Deployment Code Changes

Heroku dynamically assigns a port to your web application using the `$PORT` environment variable. You must update your code to listen on this port.

### Update `server.py`
Modify the bottom of `server.py` to read the port from the environment variables instead of hardcoding `8000`.

```python
import os
import uvicorn

# Start the Server
if __name__ == "__main__":
    # Heroku assigns a dynamic port via the PORT environment variable.
    # Default to 8000 for local development if PORT is not set.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

---

## Part 2: End-to-End Deployment Steps

### Step 1: Install Prerequisites
1. Install [Git](https://git-scm.com/downloads).
2. Install the Heroku CLI based on your operating system:
   - **macOS:**
     ```bash
     brew tap heroku/brew && brew install heroku
     ```
   - **Windows:** Download and run the [Heroku CLI Installer](https://devcenter.heroku.com/articles/heroku-cli#download-and-install) (or use `npm install -g heroku`).
   - **Linux:**
     ```bash
     curl https://cli-assets.heroku.com/install.sh | sh
     ```

To verify that these are installed correctly, run the following commands in your terminal. They should output the installed versions:
```bash
git --version
heroku --version
```

### Step 2: Log in to Heroku
Open your terminal and log in to your Heroku account:
```bash
# Log in to your Heroku account (opens a browser window)
heroku login
```

### Step 3: Create a Heroku App
In your terminal, navigate to the root directory of `AMU-Utilities` and create a new Heroku app:
```bash
heroku create amu-utilities
```
*(Note: App names on Heroku must be globally unique. If `amu-utilities` is taken, try something like `amu-utilities-api` or let Heroku generate a random name by just running `heroku create`)*.

### Step 4: Deploy using Git
Since we are using Heroku's native Python support, we deploy simply by pushing our code to Heroku's git repository. Make sure you have a `requirements.txt` and a `Procfile` in your project root!

Run these commands:
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Step 5: Verify Deployment
Open the app in your browser to verify it's running:
```bash
heroku open -a <your-heroku-app-name>
```
Your application should now be live on `https://<your-heroku-app-name>.herokuapp.com`!

---

## Part 3: Problems Faced & Solutions

### 1. Application Crashes on Startup (Error R10 - Boot timeout)
* **Problem:** Checking Heroku logs (`heroku logs --tail`) shows `Error R10 (Boot timeout) -> Web process failed to bind to $PORT within 60 seconds of launch`.
* **Cause:** The server was explicitly exposing and binding to port `8000`, but Heroku routes traffic to a dynamically assigned port injected via the `$PORT` environment variable.
* **Solution:** 
  Ensure `server.py` is configured to use `int(os.environ.get("PORT", 8000))` as shown in **Part 1**. 

### 2. Ephemeral Filesystem (Data Loss)
* **Problem:** The `data.json` file used by `amu_result.py` to log student searches resets every time the app restarts or redeploys.
* **Cause:** Heroku's filesystem is ephemeral. Any files created or modified on the disk will be lost when the application restarts (which happens at least once every 24 hours).
* **Solution:** 
  For persistent data, you should migrate away from writing to `data.json` locally. Instead, provision a free PostgreSQL database add-on on Heroku (`heroku addons:create heroku-postgresql:mini`) and update `amu_result.py` to write logs to the database, or use an external logging service.

---

## Part 4: Deploying Updates

Whenever you make code changes locally and want to push an update to Heroku:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Update code"
   ```
2. Push to Heroku:
   ```bash
   git push heroku main
   ```
