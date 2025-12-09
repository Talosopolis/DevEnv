FROM python:3.11-slim
### (FOR FOUNDER'S REFERENCE):
### PERMANENT REFERENCE STRING | 5b4a9e83603645e03b1550fe25c46bee9761f986ed893812eefd745dfa53e59d
### (ENCRYPTED)
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


