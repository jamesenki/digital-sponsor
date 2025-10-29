#!/bin/bash

echo "🧪 Testing RAG System with Various Queries"
echo "=========================================="

# Test cases with expected outcomes
test_queries=(
    "step 1:Expected=✅"
    "step 4:Expected=✅" 
    "step 6:Expected=✅"
    "step 12:Expected=✅"
    "What is step 1?:Expected=✅"
    "Tell me about step 4:Expected=✅"
    "What is the sixth step?:Expected=✅"
    "powerless:Expected=✅"
    "character defects:Expected=✅"
    "resentments:Expected=✅"
    "promises:Expected=✅"
    "higher power:Expected=✅"
    "make amends:Expected=✅"
    "moral inventory:Expected=✅"
    "spiritual awakening:Expected=✅"
    "prayer and meditation:Expected=✅"
    "how do I work step 4?:Expected=✅"
    "I have resentments:Expected=✅"
    "tell me about step 6, the concepts and concrete actions to take:Expected=✅"
)

passed=0
failed=0

for query_test in "${test_queries[@]}"; do
    IFS=':' read -r query expected <<< "$query_test"
    
    echo ""
    echo "🔍 Testing: \"$query\""
    
    response=$(curl -s -X POST http://localhost:3004/api/chat \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$query\"}" | jq -r '.response.type')
    
    if [ "$response" = "literature_based" ]; then
        echo "✅ PASS - Found literature-based response"
        ((passed++))
    else
        echo "❌ FAIL - Got $response (expected literature_based)"
        ((failed++))
    fi
done

echo ""
echo "📊 TEST RESULTS:"
echo "=================="
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "📈 Success Rate: $(( passed * 100 / (passed + failed) ))%"

if [ $failed -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! RAG system is fully functional."
else
    echo "⚠️  Some tests failed. Needs improvement for natural language queries."
fi