#!/bin/bash

# Auto-reconnecting keep-alive tunnel for RakshakSetu Backend (Port 5002)

PORT="${PORT:-5002}"
LOG_FILE="/tmp/rakshaksetu_tunnel.log"

echo "🚀 Starting RakshakSetu persistent HTTPS tunnel on port ${PORT}..." > "$LOG_FILE"

while true; do
  echo "🔄 [$(date)] Connecting SSH tunnel to localhost.run..." >> "$LOG_FILE"
  
  # Run ssh tunnel
  ssh -tt -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=10 \
      -o ServerAliveCountMax=6 \
      -o ExitOnForwardFailure=yes \
      -R 80:localhost:${PORT} \
      nokey@localhost.run >> "$LOG_FILE" 2>&1 &
  
  SSH_PID=$!
  
  # Wait for tunnel URL to appear in log
  sleep 5
  TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.lhr\.life' "$LOG_FILE" | tail -n 1)
  
  if [ -n "$TUNNEL_URL" ]; then
    echo "✅ [$(date)] Active Tunnel URL: $TUNNEL_URL" >> "$LOG_FILE"
    echo "$TUNNEL_URL" > /tmp/rakshaksetu_tunnel_url.txt
  fi

  # Keep-alive loop while SSH process is alive
  while kill -0 "$SSH_PID" 2>/dev/null; do
    sleep 15
    if [ -n "$TUNNEL_URL" ]; then
      curl -s "${TUNNEL_URL}/api/health" > /dev/null 2>&1
    fi
  done

  echo "⚠️ [$(date)] Tunnel disconnected, reconnecting in 3 seconds..." >> "$LOG_FILE"
  sleep 3
done
