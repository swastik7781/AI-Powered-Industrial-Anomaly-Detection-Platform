FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libgl1-mesa-glx libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Explicitly executes the isolated ML pipeline and securely exports mathematical models to the shared volumes array
CMD ["python", "train.py"]
