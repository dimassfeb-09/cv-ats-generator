# Use official Python lightweight image
FROM python:3.12-slim

# Install system dependencies and minimal TeX Live
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Set Host environment variable to bind to all interfaces
ENV HOST=0.0.0.0

# Start FastAPI server
CMD ["python", "app.py"]
