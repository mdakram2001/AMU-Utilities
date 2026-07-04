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
    student:Student
) -> bytes:

    try:
        with open(DATA_FILE_PATH, "r") as file:
            data = json.load(file)
            if not isinstance(data, list):
                data = []
    except Exception as e:
        print(f"Error reading data.json: {e}")
        data = []

    new_data = {
        "enrollment_no": student.enrollment_no,
        "faculty_no": student.faculty_no,
        "name": student.name
    }
    data.append(new_data)
    
    try:
        with open(DATA_FILE_PATH, "w") as file:
            json.dump(data, file, indent=2)
    except Exception as e:
        print(f"Error writing to data.json: {e}")

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=60
    ) as client:

        await client.post(
            "https://ccae-amucoe.com/result_display/loginmodalresultdisplaybyfacno.php",
            data={
                "uname": student.enrollment_no,
                "fno1": student.faculty_no,
                "fname": student.name,
                "login": ""
            }
        )

        r = await client.get(
            "https://ccae-amucoe.com/result_display/result_display_nonfyup_pdf.php"
        )

        if "application/pdf" not in r.headers.get(
            "content-type", ""
        ).lower():
            raise ValueError("Please try after sometime!")

        return r.content

