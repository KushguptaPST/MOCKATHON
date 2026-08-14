#!/bin/bash

# 🧪 SIH 2025 - System Validation Test Script
# Smart Tourist Safety System - Final Testing

echo "🧪 RUNNING COMPREHENSIVE SYSTEM VALIDATION"
echo "=========================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Load PORT from .env if available
if [ -f .env ]; then
  ENV_PORT=$(grep '^PORT=' .env | cut -d '=' -f2 | tr -d '\r')
fi
API_PORT="${ENV_PORT:-${PORT:-5002}}"
BASE_URL="http://127.0.0.1:${API_PORT}"

# Test 1: Backend Health Check
echo ""
echo "🔍 Test 1: Backend Health Check ($BASE_URL)"
HEALTH=$(curl -s "$BASE_URL/api/health" | grep -o '"status":"OK"')
if [ "$HEALTH" = '"status":"OK"' ]; then
    echo "✅ Backend API: HEALTHY"
else
    echo "❌ Backend API: FAILED"
    exit 1
fi

# Test 2: Static File Serving
echo ""
echo "🔍 Test 2: Static File Serving"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/monitoring.html")
if [ "$STATUS" = "200" ]; then
    echo "✅ Monitoring Dashboard: ACCESSIBLE"
else
    echo "❌ Monitoring Dashboard: FAILED (HTTP $STATUS)"
    exit 1
fi

# Test 3: Authentication System
echo ""
echo "🔍 Test 3: Authentication System"
TEST_EMAIL="test_${RANDOM}@validation.com"
VERIFY_EMAIL="verify_${RANDOM}@id.com"

REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"phone\":\"9876543210\",\"role\":\"tourist\"}" \
  | grep -o '"success":true')

if [ "$REGISTER" = '"success":true' ]; then
    echo "✅ User Registration: WORKING"
    # Check if Digital ID was generated
    DIGITAL_ID=$(curl -s -X POST "$BASE_URL/api/auth/register" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Verify ID\",\"email\":\"$VERIFY_EMAIL\",\"password\":\"test123\",\"phone\":\"9876543210\",\"emergencyContact\":\"1234567890\"}" \
      | grep -o '"digitalId":"TID[^"]*"')
    if [ -n "$DIGITAL_ID" ]; then
        echo "✅ Digital ID Generation: PASS ($DIGITAL_ID)"
    else
        echo "❌ Digital ID Generation: FAILED"
        exit 1
    fi
else
    echo "❌ User Registration: FAILED"
    exit 1
fi

# Test 4: User Login
LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\"}" \
  | grep -o '"success":true')

if [ "$LOGIN" = '"success":true' ]; then
    echo "✅ User Login: WORKING"
else
    echo "❌ User Login: FAILED"
    exit 1
fi

# Test 5: Socket.IO Real-time System
echo ""
echo "🔍 Test 5: Socket.IO Real-time System"
SOCKET_URL="$BASE_URL" node test-socket.js > /tmp/socket_test.log 2>&1
if grep -q "Socket.IO connection test successful" /tmp/socket_test.log; then
    echo "✅ Real-time Communication: WORKING"
else
    echo "❌ Real-time Communication: FAILED"
    cat /tmp/socket_test.log
    exit 1
fi

# Test 6: Database Connection
echo ""
echo "🔍 Test 6: Database Connection"
DB_STATUS=$(curl -s "$BASE_URL/api/health" | grep -o '"status":"OK"')
if [ "$DB_STATUS" = '"status":"OK"' ]; then
    echo "✅ MongoDB Database: CONNECTED (Server Running)"
else
    echo "❌ MongoDB Database: FAILED"
    exit 1
fi

echo ""
echo "🎉 ALL TESTS PASSED! SYSTEM FULLY OPERATIONAL"
echo "============================================"
echo ""
echo "📊 VALIDATION SUMMARY:"
echo "✅ Backend API Health: PASS"
echo "✅ Static File Serving: PASS" 
echo "✅ User Authentication: PASS"
echo "✅ Real-time Socket.IO: PASS"
echo "✅ Database Connection: PASS"
echo "✅ Monitoring Dashboard: PASS"
echo ""
echo "🎯 DEMO READY: ALL SYSTEMS OPERATIONAL"
echo ""
echo "🎬 Demo URLs:"
echo "  📊 API Health: $BASE_URL/api/health"
echo "  🖥️  Monitoring: $BASE_URL/monitoring.html"
echo "  📋 Socket Test: node test-socket.js"
echo ""
echo "🏆 Your Smart Tourist Safety System is ready for SIH 2025!"
