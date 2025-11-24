#!/bin/bash

echo "Starting GNDR Order Management System..."

# Make scripts executable
chmod +x start-backend.sh
chmod +x start-frontend.sh

# Start backend in background
echo "Starting backend server..."
./start-backend.sh &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Start frontend
echo "Starting frontend server..."
./start-frontend.sh &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "GNDR Order Management System is running!"
echo "=========================================="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Login credentials:"
echo "Username: gndr_admin"
echo "Password: gndr1234!!"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID