import os
import httpx
from pydantic import BaseModel, Field
from typing import Annotated


class Student(BaseModel):
    enrollment_no: Annotated[
        str,
        Field(..., description="Enrollment Number of the Student")
    ]

    password: Annotated[
        str,
        Field(..., description="Password of the Student")
    ]


async def get_result(student: Student) -> bytes:
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=30.0
        ) as client:

            # 1. Login
            login_resp = await client.post(
                "https://ccae-amucoe.com/result_display/a1_login.php",
                data={
                    "login_input": student.enrollment_no.strip(),
                    "password": student.password
                }
            )

            # HTTP error
            if login_resp.status_code >= 400:
                raise ValueError(
                    "AMU Result portal returned an error. "
                    "Please try again later."
                )

            # 2. After the 302 redirect, the result endpoint
            # returns the PDF.
            content_type = login_resp.headers.get(
                "content-type", ""
            ).lower()

            if "application/pdf" in content_type:
                return login_resp.content

            # 3. In case the redirect does not directly return
            # the PDF, explicitly request the result endpoint.
            result_resp = await client.get(
                "https://ccae-amucoe.com/result_display/"
                "a1_resultdisplayforstudents.php"
            )

            if result_resp.status_code >= 400:
                raise ValueError(
                    "Unable to access the student result."
                )

            content_type = result_resp.headers.get(
                "content-type", ""
            ).lower()

            if "application/pdf" not in content_type:
                raise ValueError(
                    "Result not found. Please verify your "
                    "Enrollment No. and Password."
                )

            return result_resp.content

    except httpx.TimeoutException:
        raise ValueError(
            "Connection to AMU Result server timed out. "
            "The university server may be slow."
        )

    except httpx.RequestError as e:
        raise ValueError(
            f"Unable to connect to AMU Result portal: {e}"
        )