from fastmcp import FastMCP
from main import app
import json

mcp = FastMCP.from_fastapi(
    app=app,
    name="Amu Utilities",
)

@mcp.resource("info://server")
def server_info()->str:
    """Get information about this server"""
    info = {
        "name":"AMU Utilities",
        "version":"1.0.0",
        "description":"An MCP Server that helps students of AMU to retrieve information very easily.",
        "tools":["get_result_pdf"],
        "author":"Md Ahmod Akram Choudhury",
        "profile":"https://akramchy.me"
    }
    return json.dumps(info, indent=2)


# Mount the FastMCP HTTP/SSE application onto the main FastAPI application at root
app.mount("/", mcp.http_app(transport="sse"))


# Start the Server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)