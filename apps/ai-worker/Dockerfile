# --- Stage 1: Base Environment ---
# Use an official slim Python image
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Install FFmpeg (for Librosa/Pydub) and ca-certificates (for SSL)
RUN apt-get update && \
    apt-get install -y ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set the *initial* working directory
WORKDIR /app

# --- Stage 2: Install Dependencies ---
# Copy requirements from its monorepo location
COPY apps/ai-worker/requirements.txt ./apps/ai-worker/requirements.txt
# Install dependencies
RUN pip install -r apps/ai-worker/requirements.txt

# --- Stage 3: Copy Application Code ---
# Copy all source code (respecting .dockerignore)
COPY . .

# --- Stage 4: Configure and Run ---
# Set the *final* working directory to the app's folder
WORKDIR /app/apps/ai-worker

# Set the default port
ENV PORT 8080
EXPOSE 8080

# Command to run the app from within its directory
# This avoids Python import issues with the hyphenated directory name
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]