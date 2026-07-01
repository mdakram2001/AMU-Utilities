from fastmcp import FastMCP
from main import app

mcp = FastMCP.from_fastapi(
    app=app,
    name="Amu Utilities",
    description="",
    version="1.0.0",
    author="Md Ahmod Akram Choudhury",
    profile="https://akramchy.me"
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


# Start the Server
if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000)