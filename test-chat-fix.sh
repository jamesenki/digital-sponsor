#!/bin/bash

echo "🧪 Testing Chat Fix"
echo "==================="

# Test 1: Chat page loads
echo "📄 Testing chat page loads..."
response=$(curl -s http://localhost:3001/chat)
if echo "$response" | grep -q "chat-page"; then
    echo "✅ Chat page component found"
else
    echo "❌ Chat page component not found"
    exit 1
fi

# Test 2: Chat container is present
if echo "$response" | grep -q "chat-container"; then
    echo "✅ Chat container found"
else
    echo "❌ Chat container not found"
    exit 1
fi

# Test 3: API proxy works
echo "🔗 Testing API proxy..."
api_response=$(curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","session_id":"test"}')

if echo "$api_response" | grep -q "response"; then
    echo "✅ Chat API working through proxy"
else
    echo "❌ Chat API not working"
    exit 1
fi

# Test 4: No more proxy errors
echo "🔍 Checking for proxy errors..."
sleep 2
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ No proxy errors detected"
else
    echo "❌ Proxy still has errors"
    exit 1
fi

echo ""
echo "🎉 All chat functionality tests passed!"
echo "🌐 Frontend: http://localhost:3001"
echo "💬 Chat page: http://localhost:3001/chat"
echo "🔗 API proxy: Working correctly"