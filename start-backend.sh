#!/bin/bash

echo "Starting GNDR Backend Server..."

# Navigate to backend directory
cd backend

# Install dependencies if requirements.txt exists
if [ -f requirements.txt ]; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
fi

# Start the backend server
echo "Starting FastAPI server on http://localhost:8000"
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000