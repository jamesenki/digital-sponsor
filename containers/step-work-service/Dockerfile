FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy shared module
COPY shared/ ./shared/

# Copy step work service files
COPY step_work_data_model.py .
COPY step4_workbook.py .
COPY rag_integration.py .
COPY reflection_questions.py .
COPY app.py .

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3003/health')" || exit 1

# Run the application
CMD ["python", "app.py"]
