#!/bin/bash

echo "Starting GNDR Frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start the development server
echo "Starting frontend server on http://localhost:3000"
npm run dev