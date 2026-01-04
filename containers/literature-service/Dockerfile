FROM python:3.12-alpine

WORKDIR /app

COPY app.py .
COPY literature_database.py .

EXPOSE 3002

CMD ["python", "app.py"]