FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy application files
COPY app.py .

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3004/health')" || exit 1

# Run the application
CMD ["python", "app.py"]
