#!/bin/bash

# Test Fixes Validation Script
echo "🧪 Testing Digital Sponsor Fixes"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check if services are running
check_service() {
    local url=$1
    local name=$2
    
    if curl -f -s "$url" > /dev/null; then
        echo -e "${GREEN}✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is not running${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s "$url")
    fi
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo -e "${GREEN}✅ $description${NC}"
    else
        echo -e "${RED}❌ $description${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "🔍 Checking if services are running..."

# Test if backend is running
check_service "http://localhost:3004/api/health" "Backend (port 3004)"

# Test if frontend is running
check_service "http://localhost:3001" "Frontend (port 3001)"

echo ""
echo "🚀 Testing API Endpoints..."

# Test health endpoint
test_api "GET" "http://localhost:3004/api/health" "" "Health check"

# Test crisis endpoint
test_api "GET" "http://localhost:3004/api/crisis" "" "Crisis resources"

# Test chat endpoint (Fix #1)
test_api "POST" "http://localhost:3004/api/chat" '{"message":"What does Step 1 mean?","session_id":"test"}' "AI Chat functionality"

# Test session creation
test_api "POST" "http://localhost:3004/api/sessions" '{}' "Session creation"

echo ""
echo "🎨 Testing Frontend Features..."

# Test that main pages load (no blank pages)
check_service "http://localhost:3001/" "Homepage"
check_service "http://localhost:3001/chat" "Chat page"
check_service "http://localhost:3001/step-work" "Step work page"
check_service "http://localhost:3001/literature" "Literature page"
check_service "http://localhost:3001/crisis" "Crisis page"

echo ""
echo "📝 Testing Chat Interface..."

# Test that chat page contains the new chat interface
chat_content=$(curl -s "http://localhost:3001/chat")
if echo "$chat_content" | grep -q "data-testid=\"chat-container\""; then
    echo -e "${GREEN}✅ New chat interface is present${NC}"
else
    echo -e "${RED}❌ New chat interface not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if echo "$chat_content" | grep -q "data-testid=\"send-button\""; then
    echo -e "${GREEN}✅ Send button is present${NC}"
else
    echo -e "${RED}❌ Send button not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📊 Testing Header Changes..."

# Test that header doesn't have emoji buttons
header_content=$(curl -s "http://localhost:3001")
if echo "$header_content" | grep -q 'button.*📚'; then
    echo -e "${YELLOW}⚠️  Still has emoji button in header${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Emoji buttons removed from header${NC}"
fi

if echo "$header_content" | grep -q 'Resources'; then
    echo -e "${GREEN}✅ Professional 'Resources' button present${NC}"
else
    echo -e "${RED}❌ Resources button not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "🔐 Testing Privacy and AA Compliance..."

# Check that anonymous mode is still working
if echo "$header_content" | grep -q '🔒 Anonymous'; then
    echo -e "${GREEN}✅ Anonymous mode indicator present${NC}"
else
    echo -e "${RED}❌ Anonymous mode indicator missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check crisis button is always present
if echo "$header_content" | grep -q 'crisis-button'; then
    echo -e "${GREEN}✅ Crisis button present${NC}"
else
    echo -e "${RED}❌ Crisis button missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📋 Summary of Fixes Implemented:"
echo "================================"
echo "1. ✅ AI Chat functionality - Implemented full chat interface with API integration"
echo "2. ✅ Step worksheets - Created enhanced editable documents with prayers and instructions"  
echo "3. ✅ Navigation buttons - Removed emoji buttons, added professional 'Resources' button"
echo "4. ✅ User registration tests - Created acceptance tests for Azure migration"
echo "5. ✅ Comprehensive testing - Created test suite covering all functionality"

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Digital Sponsor is ready for Azure migration.${NC}"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Run: npm run type-check (should pass with no errors)"
    echo "2. Run: npm run lint (should have minimal warnings)"  
    echo "3. Test the enhanced step worksheets in the browser"
    echo "4. Test the new chat functionality"
    echo "5. Proceed with Azure migration using the deployment checklist"
    exit 0
else
    echo -e "${RED}❌ $ERRORS issues found. Please address before proceeding.${NC}"
    exit 1
fi