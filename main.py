import json
from amu_result import Student, get_result
from find_train_tickets import FindTicket, find_train_availability
from fastapi import FastAPI
from fastapi.responses import Response
from typing import List, Any, Dict

app = FastAPI(title="AMU Utilities")

# Tools
@app.get("/")
async def root():
    return {"message": "Home Page"}


@app.get('/about-us')
async def About_Us():
    info = {
        "name":"AMU Utilities",
        "version":"1.0.0",
        "description":"An MCP Server that helps students of AMU to retrieve information very easily.",
        "tools":["get_result_pdf", "find_ticket"],
        "author":"Md Ahmod Akram Choudhury",
        "profile":"https://akramchy.me"
    }
    return info

@app.post('/get_result')
async def get_result_pdf(
    enrollment: str,
    faculty_no: str,
    full_name: str
) -> bytes:
    student = Student(
        enrollment_no=enrollment,
        faculty_no=faculty_no,
        name=full_name
    )
    pdf_bytes = await get_result(student)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            f"Content-Disposition": 'inline; filename="{enrollment}.pdf"'
        }
    )

@app.post('/find_ticket')
def get_train_ticket(
    source: str,
    destination: str,
    date_of_journey: str
) -> List[Dict[str, Any]]:
    find_ticket = FindTicket(
        source=source,
        destination=destination,
        date_of_journey=date_of_journey
    )
    return find_train_availability(find_ticket)



# Start the Server
# if __name__ == "__main__":
#     mcp.run(transport="http", host="0.0.0.0", port=8000)