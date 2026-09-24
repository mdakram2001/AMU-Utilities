import json
from amu_result import Student, get_result
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from typing import Optional
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

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#6366f1"/><text x="50" y="58" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">AMU</text></svg>"""

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")

# Tools & UI Routes
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

@app.get("/accenture/games/lock-and-key", response_class=HTMLResponse)
async def lock_and_key_game(request: Request):
    return templates.TemplateResponse(request=request, name="lock_and_key.html")

@app.get("/accenture/games/grid-path-builder", response_class=HTMLResponse)
async def grid_path_builder_game(request: Request):
    return templates.TemplateResponse(request=request, name="grid_path_builder.html")

# Backwards compatibility aliases
@app.get("/games/bubble-sort", response_class=HTMLResponse)
async def bubble_sort_legacy(request: Request):
    return templates.TemplateResponse(request=request, name="bubble_sort.html")

@app.get("/games/lock-and-key", response_class=HTMLResponse)
async def lock_and_key_legacy(request: Request):
    return templates.TemplateResponse(request=request, name="lock_and_key.html")

@app.get("/games/grid-path-builder", response_class=HTMLResponse)
async def grid_path_builder_legacy(request: Request):
    return templates.TemplateResponse(request=request, name="grid_path_builder.html")

@app.get('/aka818', operation_id='about_us')
async def about_us():
    """
    Returns information about AMU Utilities.
    """
    info = {
        "name": "AMU Utilities",
        "version": "1.0.0",
        "description": "An MCP Server that helps students of AMU to retrieve information easily.",
        "tools": ["get_result_pdf"],
        "author": "Md Ahmod Akram Choudhury",
        "profile": "https://www.linkedin.com/in/md-ahmod-akram-choudhury/"
    }
    return info

class ResultQuery(BaseModel):
    enrollment: str = Field(..., description="Enrollment Number of the student (e.g. GH1234).")
    faculty_no: str = Field(..., description="Faculty Number of the student (e.g. 21COB123).")
    full_name: str = Field(..., description="Full Name of the student as per university records.")

@app.post('/aka819', operation_id='get_result_pdf')
async def get_result_pdf(
    payload: Optional[ResultQuery] = None,
    enrollment: Optional[str] = None,
    faculty_no: Optional[str] = None,
    full_name: Optional[str] = None,
) -> dict:
    """
    Retrieve semester exam result PDF for an AMU student.
    Returns Base64-encoded PDF of the result.
    """
    enr = (payload.enrollment if payload else None) or enrollment
    fac = (payload.faculty_no if payload else None) or faculty_no
    name = (payload.full_name if payload else None) or full_name

    if not enr or not fac or not name:
        raise HTTPException(
            status_code=400,
            detail="All fields are required: enrollment, faculty_no, and full_name."
        )

    try:
        student = Student(
            enrollment_no=enr.strip(),
            faculty_no=fac.strip(),
            name=name.strip()
        )
        pdf_bytes = await get_result(student)
        encoded = base64.b64encode(pdf_bytes).decode('utf-8')

        return {
            "filename": f"{enr.strip()}.pdf",
            "mime_type": "application/pdf",
            "content_base64": encoded
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# Start the Server
# if __name__ == "__main__":
#     mcp.run(transport="http", host="0.0.0.0", port=8000)