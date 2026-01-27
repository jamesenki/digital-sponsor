FROM python:3.12-alpine

WORKDIR /app

# Copy all service files
COPY app.py .
COPY literature_database.py .
COPY vector_search.py .

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3002/health')" || exit 1

CMD ["python", "app.py"]