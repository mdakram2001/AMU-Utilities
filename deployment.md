# End-to-End Deployment Guide & Troubleshooting

This document outlines the complete deployment process for hosting **AMU Utilities** on a DigitalOcean Droplet as both a FastAPI web application and an MCP (Model Context Protocol) server. It also covers the issues encountered during setup and how they were resolved.

---

## Part 1: End-to-End Deployment Steps

### Step 1: Push Code to GitHub (from Local Machine)
1. Add a `Dockerfile` and a `.dockerignore` file to the root of your project directory.
2. Commit your files (make sure `.venv` is ignored in `.gitignore`):
   ```bash
   git init
   git add .
   git commit -m "Configure droplet deployment"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Create a DigitalOcean Droplet
1. Go to the DigitalOcean Dashboard, click **Create** > **Droplets**.
2. **Choose Image:** Select **Ubuntu 24.04 LTS**.
3. **Choose Plan:** Select **Shared CPU** > **Basic** > Select the **$4.00/mo** or **$6.00/mo** plan.
4. **Authentication:** Select your SSH key (see Troubleshooting for key fingerprint issues) and click **Create Droplet**.
5. Copy the Droplet's public IP address.

### Step 3: Configure DNS Subdomain (Namecheap)
1. Log in to Namecheap, go to **Domain List** > **Manage** > **Advanced DNS** tab.
2. Add a new **A Record**:
   - **Type:** `A Record`
   - **Host:** `amu-utilities` (or your chosen prefix)
   - **Value:** `<YOUR_DROPLET_IP_ADDRESS>`
   - **TTL:** `Automatic`

### Step 4: SSH into your Droplet & Install Docker/Nginx
Open your local terminal and connect:
```bash
ssh root@<YOUR_DROPLET_IP_ADDRESS>
```
Install dependencies on the Droplet:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io nginx certbot python3-certbot-nginx
```

### Step 5: Build and Run the Container on the Droplet
```bash
# Clone the repository
git clone <your-github-repo-url> AMU-Utilities
cd AMU-Utilities

# Build the Docker image
docker build -t amu-utilities .

# Run the container (binding to localhost:8000 internally)
docker run -d \
  --name amu-utilities \
  --restart always \
  -p 127.0.0.1:8000:8000 \
  amu-utilities
```

### Step 6: Configure Nginx Reverse Proxy
1. Create a new Nginx configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/amu-utilities
   ```
2. Paste the following configuration (replace `amu-utilities.akramchy.me` with your subdomain):
   ```nginx
   server {
       listen 80;
       server_name amu-utilities.akramchy.me;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # For MCP HTTP SSE support
           proxy_set_header Connection '';
           proxy_http_version 1.1;
           chunked_transfer_encoding off;
           proxy_buffering off;
           proxy_cache off;
       }
   }
   ```
3. Enable the site and reload Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/amu-utilities /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 7: Enable SSL (HTTPS) with Let's Encrypt
```bash
sudo certbot --nginx -d amu-utilities.akramchy.me
```

---

## Part 2: Problems Faced & Solutions

### 1. SSH Key Fingerprint Already Exists
* **Problem:** When adding an SSH public key, DigitalOcean shows: *"SSH Key with this fingerprint already exists"*.
* **Cause:** The key has already been added to the DigitalOcean account in the past.
* **Solution:** On the Droplet creation page, simply find the existing key in the checklist, check the box next to it, and continue. Alternatively, generate a fresh key pair using:
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/id_new_droplet
  ```

### 2. Case-Sensitivity of Directory Names in Linux
* **Problem:** Running `cd amu-utilities` failed with `Not a directory`.
* **Cause:** Linux is case-sensitive. The repository directory was capitalized (`AMU-Utilities`), while a file named `amu-utilities` was present in the root folder.
* **Solution:** Change directory using the exact capitalized folder name:
  ```bash
  cd AMU-Utilities
  ```

### 3. Container Crashes / 502 Bad Gateway
* **Problem:** Accessing the website returned a `502 Bad Gateway` error. Running `docker logs amu-utilities` revealed a crash on start:
  ```text
  NameError: name 'json' is not defined. Did you forget to import 'json'?
  ```
* **Cause:** 
  1. `json` module was used in `amu_result.py` but never imported.
  2. `data.json` initially contains `{}`, which reads as a dictionary, but the script calls `.append()`, causing a subsequent type crash.
* **Solution:**
  1. Added `import json` to `amu_result.py`.
  2. Moved the file loading/writing logic inside `get_result()` and added a safe fallback block:
     ```python
     try:
         with open("data.json", "r") as file:
             data = json.load(file)
             if not isinstance(data, list):
                 data = []
     except Exception:
         data = []
     ```

### 4. FastAPI Routes Return "Not Found" (404)
* **Problem:** The MCP endpoints worked, but FastAPI routes (like `/docs818`) returned `Not Found`.
* **Cause:** The server was started using `mcp.run()`. FastMCP's HTTP transport spins up a clean HTTP server that only exposes the MCP protocol endpoints, leaving the original FastAPI routes unserved.
* **Solution:** 
  Mounted the FastMCP server's SSE application onto the main FastAPI application, and ran the main application using Uvicorn:
  ```python
  # Mount FastMCP HTTP/SSE application onto main FastAPI application
  app.mount("/", mcp.http_app(transport="sse"))

  # Start Uvicorn serving the main app
  if __name__ == "__main__":
      import uvicorn
      uvicorn.run(app, host="0.0.0.0", port=8000)
  ```

---

## Part 3: Deploying Updates

Whenever you make code changes locally:
1. Commit and push the changes:
   ```bash
   git add .
   git commit -m "Update code"
   git push origin main
   ```
2. Log into the Droplet and redeploy:
   ```bash
   cd ~/AMU-Utilities
   git pull
   docker build -t amu-utilities .
   docker stop amu-utilities
   docker rm amu-utilities
   docker run -d --name amu-utilities --restart always -p 127.0.0.1:8000:8000 amu-utilities
   ```
