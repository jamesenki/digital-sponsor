#!/bin/bash

echo "🔍 Digital Sponsor UI Diagnostic"
echo "================================"

# Check if services are running
echo "1. Service Status:"
if curl -f -s http://localhost:3004/api/health > /dev/null; then
    echo "   ✅ Backend (3004) - Running"
else
    echo "   ❌ Backend (3004) - Not responding"
fi

if curl -f -s http://localhost:3001 > /dev/null; then
    echo "   ✅ Frontend (3001) - Running"
else
    echo "   ❌ Frontend (3001) - Not responding"
fi

# Check proxy configuration
echo ""
echo "2. API Proxy Test:"
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo "   ✅ API proxy working"
else
    echo "   ❌ API proxy failed"
fi

# Check for TypeScript errors
echo ""
echo "3. TypeScript Status:"
cd /home/enki/projects/digital-sponsor-investor-demo/frontend
if npm run type-check 2>/dev/null | grep -q "error"; then
    echo "   ❌ TypeScript errors found"
else
    echo "   ✅ No TypeScript errors"
fi

# Check key files exist
echo ""
echo "4. Key Files Check:"
if [ -f "src/components/ChatPage.tsx" ]; then
    echo "   ✅ ChatPage.tsx exists"
else
    echo "   ❌ ChatPage.tsx missing"
fi

if [ -f "src/components/ChatPage.css" ]; then
    echo "   ✅ ChatPage.css exists"
else
    echo "   ❌ ChatPage.css missing"
fi

# Check main.tsx for imports
echo ""
echo "5. Component Import Check:"
if grep -q "ChatPage" src/App.tsx; then
    echo "   ✅ ChatPage imported in App.tsx"
else
    echo "   ❌ ChatPage not imported in App.tsx"
fi

echo ""
echo "🛠️ Troubleshooting Steps:"
echo "1. Hard refresh browser (Ctrl+F5)"
echo "2. Clear browser cache"
echo "3. Check browser console for errors"
echo "4. Try incognito/private mode"
echo ""
echo "📱 Direct Links:"
echo "• Homepage: http://localhost:3001"
echo "• Chat: http://localhost:3001/chat"
echo "• API Health: http://localhost:3001/api/health"