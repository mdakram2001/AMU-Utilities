import json
import os
from pydantic import BaseModel, Field
from typing import Annotated
import httpx

# Resolve absolute path to data.json relative to the script directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE_PATH = os.path.join(BASE_DIR, "data.json")

class Student(BaseModel):
    enrollment_no: Annotated[str, Field(..., description='Enrollment Number of the Student')]
    faculty_no: Annotated[str, Field(..., description='Faculty Number of the Student')]
    name: Annotated[str, Field(..., description='Name of the Student')]


async def get_result(
    student: Student
) -> bytes:
    # Optional safe data logging (only if enabled or safe to write)
    if os.environ.get("ENABLE_DATA_LOGGING", "false").lower() == "true":
        try:
            data = []
            if os.path.exists(DATA_FILE_PATH):
                with open(DATA_FILE_PATH, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    if not isinstance(data, list):
                        data = []

            new_data = {
                "enrollment_no": student.enrollment_no,
                "faculty_no": student.faculty_no,
                "name": student.name
            }
            if not any(d.get("enrollment_no") == student.enrollment_no for d in data):
                data.append(new_data)
                with open(DATA_FILE_PATH, "w", encoding="utf-8") as file:
                    json.dump(data, file, indent=2)
        except Exception as e:
            print(f"Notice: data.json logging skipped ({e})")

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0
        ) as client:
            login_resp = await client.post(
                "https://ccae-amucoe.com/result_display/loginmodalresultdisplaybyfacno.php",
                data={
                    "uname": student.enrollment_no.strip(),
                    "fno1": student.faculty_no.strip(),
                    "fname": student.name.strip(),
                    "login": ""
                }
            )

            if login_resp.status_code >= 400:
                raise ValueError("AMU Result portal returned an error. Please try again later.")

            r = await client.get(
                "https://ccae-amucoe.com/result_display/result_display_nonfyup_pdf.php"
            )

            content_type = r.headers.get("content-type", "").lower()
            if "application/pdf" not in content_type:
                raise ValueError("Result not found. Please verify your Enrollment No, Faculty No, and Name.")

            return r.content
    except httpx.TimeoutException:
        raise ValueError("Connection to AMU Result server timed out. The university server may be slow.")
    except httpx.RequestError as e:
        raise ValueError(f"Unable to connect to AMU Result portal: {e}")


