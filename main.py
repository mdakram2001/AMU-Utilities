import json
from fastmcp import FastMCP

# FastMCP Server instance
mcp = FastMCP("AMU Utilities")

# Tools

# Resource
@mcp.resource("info://server")
def server_info()->str:
    """Get information about this server"""
    info = {
        "name":"AMU Utilities",
        "version":"1.0.0",
        "description":"An MCP Server that helps students of AMU to retrive information very easily.",
        "tools":[],
        "author":"Md Ahmod Akram Choudhury"
    }
    return json.dumps(info, indent=2)


# Start the Server
if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000)