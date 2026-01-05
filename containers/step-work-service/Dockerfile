FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy step work service files
COPY step_work_data_model.py .
COPY step4_workbook.py .
COPY rag_integration.py .
COPY app.py .

# Install any needed packages
RUN pip install --no-cache-dir --upgrade pip

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3003/health')" || exit 1

# Run the application
CMD ["python", "app.py"]