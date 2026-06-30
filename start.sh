#!/usr/bin/env bash
set -e

# Build React if node_modules exist
if [ -d "frontend/node_modules" ]; then
  echo "Building React..."
  npm --prefix frontend run build
fi

# Detect local IP for phone access
LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' \
  || ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)

echo ""
echo "=================================================="
echo "  ⚡ FactBlast is starting..."
echo "=================================================="
echo "  Browser:  http://localhost:8000"
if [ -n "$LOCAL_IP" ]; then
  echo "  Phone:    http://$LOCAL_IP:8000"
  echo "  (make sure your phone is on the same WiFi)"
fi
echo "=================================================="
echo ""

uvicorn app:app --host 0.0.0.0 --port 8000
