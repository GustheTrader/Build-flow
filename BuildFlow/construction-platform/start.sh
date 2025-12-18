#!/bin/bash

echo "Starting AI-Augmented Construction Management Platform..."
echo

# Start Docker services
echo "1. Starting Redis and Chroma..."
docker-compose up -d

# Wait for services to be ready
echo "2. Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker ps | grep -q buildflow-redis; then
    echo "   ✓ Redis is running"
else
    echo "   ✗ Redis failed to start"
    exit 1
fi

if docker ps | grep -q buildflow-chroma; then
    echo "   ✓ Chroma is running"
else
    echo "   ⚠ Chroma not running (will use mock mode)"
fi

# Install backend dependencies
echo
echo "3. Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start backend
echo
echo "4. Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Install frontend dependencies
echo
echo "5. Installing frontend dependencies..."
cd ../construction-platform-frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start frontend
echo
echo "6. Starting frontend application..."
npm run dev &
FRONTEND_PID=$!

echo
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Platform Started Successfully!                           ║"
echo "║                                                            ║"
echo "║   Backend:  http://localhost:3000                          ║"
echo "║   Frontend: http://localhost:5173                          ║"
echo "║                                                            ║"
echo "║   Redis:    localhost:6379                                 ║"
echo "║   Chroma:   localhost:8000                                 ║"
echo "║                                                            ║"
echo "║   Press Ctrl+C to stop all services                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait
