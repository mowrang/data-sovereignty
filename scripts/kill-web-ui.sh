#!/bin/bash
# Kill Web UI server running on port 3001

PORT=3001

echo "Looking for process on port $PORT..."

# Find process ID using port
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
    echo "❌ No process found on port $PORT"
    exit 1
fi

echo "Found process: $PID"
echo "Killing process..."

kill $PID

# Wait a moment and check if it's still running
sleep 1
if ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Process still running, forcing kill..."
    kill -9 $PID
fi

echo "✅ Process killed"
