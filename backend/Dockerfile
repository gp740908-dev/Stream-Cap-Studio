FROM python:3.11-slim-bookworm

# Install system dependencies: FFmpeg, Xvfb, PulseAudio, Chrome deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    xvfb \
    pulseaudio \
    # Chrome/Chromium deps
    chromium \
    chromium-driver \
    # Utility
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only for size efficiency)
RUN playwright install chromium && playwright install-deps chromium

# Copy application source
COPY . .

# Create required directories
RUN mkdir -p /tmp/streamcap /app/outputs /app/uploads

# Expose port for FastAPI (only used by 'api' service)
EXPOSE 8000

# Entry point — overridden per service in docker-compose.yml
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
