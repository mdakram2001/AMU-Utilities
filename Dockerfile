# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependency definition files
COPY pyproject.toml README.md ./

# Install the dependencies and the project
RUN pip install --no-cache-dir .

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Run the server when the container starts
CMD ["python", "server.py"]
