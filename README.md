# AMU Utilities & Cognitive Games Hub

A modern web application and [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed for Aligarh Muslim University (AMU) students to retrieve semester results seamlessly, plus a comprehensive practice hub for Accenture recruitment cognitive assessment games.

---

## 🌟 Key Features

### 1. 🎓 AMU Semester Results Portal
- Instant retrieval and direct download of semester examination result PDFs.
- Simple, elegant glassmorphic interface requiring Enrollment Number, Faculty Number, and Full Name.
- Live integration with AMU Controller of Examinations portal.

### 2. 🤖 Model Context Protocol (MCP) Server
- Exposes tools via **FastMCP** over Server-Sent Events (SSE) at `/sse`.
- Plug-and-play with **Claude Desktop** and other MCP-compatible AI clients.
- Available tools:
  - `get_result_pdf`: Fetch and encode student semester exam results as Base64 PDF.
  - `about_us`: Server metadata and developer info.

### 3. 🎮 Accenture Cognitive Assessment Games
- **Bubble Sort Practice (`/accenture/games/bubble-sort`):** Evaluate math expressions in floating bubbles and tap them in order from Lowest to Highest before the 15-second timer expires. Includes 3 difficulty tiers (Easy, Medium, Hard).
- **Lock & Key Memory Game (`/accenture/games/lock-and-key`):** Spatial and working memory simulation. Navigate grids through directional one-way doors, avoid invisible barriers, collect the key, and reach the exit.
- **3×3 Grid Path Builder (`/accenture/games/grid-path-builder`):** Rotate 3×3 blocks and cycle directional arrow layouts to establish a continuous vector flow from Rocket (🚀) to Target (🪐).

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- `pip` or `uv`

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/amu-utilities.git
   cd "AMU Utilities"
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # Linux / macOS:
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running Locally

To launch the full server with MCP SSE support:
```bash
python server.py
```
Or directly with Uvicorn:
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🔌 Connecting with Claude Desktop (MCP)

Add the following configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "amu-utilities": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/client-cli",
        "http://localhost:8000/sse"
      ]
    }
  }
}
```

---

## 📡 API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/` | AMU Results Portal home page |
| `GET` | `/accenture` | Accenture Preparation Hub landing page |
| `GET` | `/accenture/games` | Cognitive games directory |
| `GET` | `/accenture/games/bubble-sort` | Bubble Sort practice game |
| `GET` | `/accenture/games/lock-and-key` | Lock & Key memory game |
| `GET` | `/accenture/games/grid-path-builder` | 3×3 Grid Path Builder game |
| `GET` | `/aka818` | MCP info endpoint (`about_us`) |
| `POST` | `/aka819` | Fetch result PDF (`get_result_pdf`) |
| `GET` | `/sse` | FastMCP SSE stream |

---

## 👨‍💻 Author

**Md Ahmod Akram Choudhury**
- LinkedIn: [md-ahmod-akram-choudhury](https://www.linkedin.com/in/md-ahmod-akram-choudhury/)
- Website: [akramchy.me](https://akramchy.me)
