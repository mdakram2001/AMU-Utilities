from pydantic import BaseModel, Field
from typing import Annotated
import httpx

class Student(BaseModel):
    enrollment_no: Annotated[str, Field(..., description='Enrollment Number of the Student')]
    faculty_no: Annotated[str, Field(..., description='Faculty Number of the Student')]
    name: Annotated[str, Field(..., description='Name of the Student')]


async def get_result(
    student:Student
) -> bytes:

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

