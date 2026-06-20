import json
import httpx
from fastmcp import FastMCP

# FastMCP Server instance
mcp = FastMCP("AMU Utilities")

# Tools

@mcp.tool()
async def test_bytes() -> bytes:
    return b"hello world"


@mcp.tool()
async def get_result_pdf(
    enrollment: str,
    faculty_no: str,
    full_name: str
) -> bytes:

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=60
    ) as client:

        await client.post(
            "https://ccae-amucoe.com/result_display/loginmodalresultdisplaybyfacno.php",
            data={
                "uname": enrollment,
                "fno1": faculty_no,
                "fname": full_name,
                "login": ""
            }
        )

        r = await client.get("https://ccae-amucoe.com/result_display/result_display_nonfyup_pdf.php")

        content_type = r.headers.get("content-type", "").lower()

        if "application/pdf" not in content_type:
            raise ValueError("PDF not returned")

        return r.content


# Resource
@mcp.resource("info://server")
def server_info()->str:
    """Get information about this server"""
    info = {
        "name":"AMU Utilities",
        "version":"1.0.0",
        "description":"An MCP Server that helps students of AMU to retrieve information very easily.",
        "tools":["get_result_pdf"],
        "author":"Md Ahmod Akram Choudhury"
    }
    return json.dumps(info, indent=2)


# Start the Server
if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000)