import json
from amu_result import Student, get_result
from fastapi import FastAPI, Request
from fastapi.responses import Response, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Any, Dict
import base64
app = FastAPI(
    title="AMU Utilities",
    docs_url="/docs818",
    redoc_url="/redoc818",
    openapi_url="/openapi818.json",
    )

# Mount static files and initialize templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Tools
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/accenture", response_class=HTMLResponse)
async def accenture_home(request: Request):
    return templates.TemplateResponse(request=request, name="accenture_landing.html")

@app.get("/accenture/games", response_class=HTMLResponse)
async def accenture_games(request: Request):
    return templates.TemplateResponse(request=request, name="games_landing.html")

@app.get("/accenture/games/bubble-sort", response_class=HTMLResponse)
async def bubble_sort_game(request: Request):
    return templates.TemplateResponse(request=request, name="bubble_sort.html")

# Keep backwards compatibility / redirect alias
@app.get("/games/bubble-sort", response_class=HTMLResponse)
async def bubble_sort_legacy(request: Request):
    return templates.TemplateResponse(request=request, name="bubble_sort.html")


@app.get('/aka818', operation_id='About Us')
async def About_Us():
    """
    This will return information about the AMU Utilities.
    It is a MCP server that helps students of AMU to retrieve information very easily.
    """
    info = {
        "name":"AMU Utilities",
        "version":"1.0.0",
        "description":"An MCP Server that helps students of AMU to retrieve information very easily.",
        "tools":["get_result_pdf"],
        "Developer":"Md Ahmod Akram Choudhury",
        "profile":"https://www.linkedin.com/in/md-ahmod-akram-choudhury/"
    }
    return info

@app.post('/aka819', operation_id='Get Result')
async def get_result_pdf(
    enrollment: str,
    faculty_no: str,
    full_name: str
) -> dict:
    """
    This will help AMU student to get their result of semester exam.
    :param enrollment: Enrollment Number of the student.
    :param faculty_no: Faculty Number of the student.
    :param full_name: Full Name of the student.
    :return: Base64-encoded PDF of the result.
    """
    student = Student(
        enrollment_no=enrollment,
        faculty_no=faculty_no,
        name=full_name
    )
    pdf_bytes = await get_result(student)
    encoded = base64.b64encode(pdf_bytes).decode('utf-8')

    return {
        "filename": f"{enrollment}.pdf",
        "mime_type": "application/pdf",
        "content_base64": encoded
    }

# Start the Server
# if __name__ == "__main__":
#     mcp.run(transport="http", host="0.0.0.0", port=8000)