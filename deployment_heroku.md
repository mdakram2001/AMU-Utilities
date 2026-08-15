# End-to-End Heroku Deployment Guide & Troubleshooting

This document outlines the complete deployment process for hosting **AMU Utilities** natively on Heroku as a Python application, bypassing Docker entirely. It also contains detailed notes on all the troubleshooting steps, background tasks, and fixes applied to get the application running smoothly in production.

---

## Part 1: Initial Setup

### Step 1: Install Prerequisites
1. Install [Git](https://git-scm.com/downloads).
2. Install the Heroku CLI based on your operating system:
   - **Windows:** Download and run the [Heroku CLI Installer](https://devcenter.heroku.com/articles/heroku-cli#download-and-install).
   - **macOS:** `brew tap heroku/brew && brew install heroku`
   - **Linux:** `curl https://cli-assets.heroku.com/install.sh | sh`

### Step 2: Log in and Create App
Open your terminal and log in to your Heroku account:
```bash
heroku login
```
Navigate to your project root and create a new Heroku app:
```bash
heroku create amu-utilities
```

---

## Part 2: Project Configuration (The Fixes)

During deployment, several Heroku-specific issues were encountered and resolved. Ensure your project has the following configurations:

### 1. Multiple Package Managers Conflict
Heroku's Python buildpack strictly requires only **one** package manager lockfile. Because the repository originally contained both a `uv.lock` (for the `uv` package manager) and a `requirements.txt` (for `pip`), Heroku rejected the build.
* **The Fix:** We deleted the `uv.lock` file entirely (`git rm uv.lock`) so Heroku defaults to standard `pip` installation via `requirements.txt`.

### 2. Dependency Pinning (FastMCP Crash)
The application initially crashed on Heroku with an `ImportError: cannot import name 'deprecated' from 'typing_extensions'`. This happened because standard Pip resolved an incompatible combination of `anyio` and `typing_extensions` needed by `fastmcp` on Python 3.12.
* **The Fix:** We explicitly forced newer versions in `requirements.txt`. Your `requirements.txt` must include at least:
  ```txt
  fastapi>=0.138.1
  fastmcp>=3.4.2
  uvicorn>=0.30.0
  typing-extensions>=4.11.0
  anyio>=4.0.0
  ```

### 3. Uvicorn Workers Crash (`WEB_CONCURRENCY`)
By default, Heroku detects server memory and injects a `WEB_CONCURRENCY=2` environment variable to spawn multiple worker processes. If `server.py` uses `uvicorn.run(app, ...)` where `app` is passed as an object instead of an import string, Uvicorn immediately crashes (Exit Status 3) when trying to spawn workers.
* **The Fix:** Instead of running `python server.py`, we created a `Procfile` in the root directory that passes the application as an import string (`server:app`), allowing Uvicorn to safely consume Heroku's `WEB_CONCURRENCY` variable:
  ```txt
  web: uvicorn server:app --host 0.0.0.0 --port ${PORT}
  ```

---

## Part 3: Deploying the Application

Because we are using native Python deployment, only files tracked by Git will be uploaded to Heroku. Hidden environments (like `.venv`) and secrets (like `.env`) are safely ignored.

To deploy or push updates, run:
```bash
git add .
git commit -m "Deploy AMU Utilities to Heroku"
git push heroku main
```

To view the live application logs in your terminal:
```bash
heroku logs --tail
```

---

## Part 4: Custom Domain & SSL Setup

Heroku provides free SSL out-of-the-box for `*.herokuapp.com` URLs. To use a custom domain (e.g., `amu-utilities.akramchy.me`) and secure it:

1. **Add the domain to Heroku:**
   ```bash
   heroku domains:add amu-utilities.akramchy.me
   ```
2. **Enable Automated Certificate Management (ACM):**
   *(Note: This requires a paid 'Eco' or 'Basic' dyno).*
   ```bash
   heroku certs:auto:enable
   ```
3. **Configure DNS (Namecheap):**
   Heroku generates a unique **DNS Target** (e.g., `fundamental-forest-izlc...herokudns.com`). Log into Namecheap, delete any old `A Records` for this subdomain, and create a **`CNAME Record`** pointing `amu-utilities` to the Heroku DNS Target. Once DNS propagates, SSL will activate automatically.

---

## Part 5: Connecting to Claude Desktop

Because your MCP server is hosted remotely via SSE (Server-Sent Events) and doesn't use a proprietary enterprise OAuth flow, you cannot use the "Connectors" tab in the Claude UI. You must bypass the UI and use the local config file.

1. Install Node.js on your machine.
2. Open the Claude Desktop configuration file:
   * **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   * **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Add the official MCP bridge tool to proxy the remote SSE connection into local stdio:

```json
{
  "mcpServers": {
    "amu-utilities": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-cli",
        "https://amu-utilities-378492016f18.herokuapp.com/sse"
      ]
    }
  }
}
```
Restart Claude completely, and the tools will appear!

---

## Part 6: Understanding Heroku's Ephemeral Filesystem

Heroku's filesystem is **ephemeral**. Every time your app restarts (at least once every 24 hours) or a new deployment is pushed, the server is wiped clean and restored entirely from your Git repository.
* **What this means:** Any data dynamically written to files (like `data.json`) during runtime will be permanently deleted on restart. The file will reset back to whatever state it was in when you ran `git commit`. 
* **Reading Server Files:** If you want to see what is currently inside a file on the live server before it wipes, you can run a one-off bash command from your terminal:
  ```bash
  heroku run cat data.json
  ```
  Or, open an interactive SSH-like session to explore the server:
  ```bash
  heroku run bash
  ```
* **Long-term Solution:** For persistent data storage, you must migrate away from writing to `data.json` and instead provision a database (like Heroku Postgres).
