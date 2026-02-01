#!/bin/bash

# Configuration
URL="${ADK_SERVICE_URL:-https://adk-agent-y6r3wpax5q-an.a.run.app}"
echo "🚀 Starting Commercial Validation against: $URL"
echo "---------------------------------------------------"

# 1. Health Checks
echo "1️⃣  Health Check"
HEALTH_STATUS=$(curl -s "$URL/health" | jq -r '.status')
if [ "$HEALTH_STATUS" == "ok" ]; then
    echo "✅ /health passed"
else
    echo "❌ /health failed: $HEALTH_STATUS"
fi

READY_STATUS=$(curl -s "$URL/health/ready" | jq -r '.deps.openrouter')
if [ "$READY_STATUS" == "ok" ] || [ "$READY_STATUS" == "null" ]; then # nullable if lazy loaded
    echo "✅ /health/ready passed"
else
    echo "⚠️ /health/ready status: $READY_STATUS"
fi

echo "---------------------------------------------------"

# 2. Functional Tests (Chat)

test_chat() {
    local name="$1"
    local message="$2"
    local expected_keyword="$3"

    echo "Testing: $name"
    RESPONSE=$(curl -s -N -X POST "$URL/api/chat" \
        -H "Content-Type: application/json" \
        -d "{\"messages\":[{\"role\":\"user\",\"content\":\"$message\"}],\"locale\":\"en\"}")
    
    # Check if response contains expected keyword
    if echo "$RESPONSE" | grep -q "$expected_keyword"; then
        echo "✅ $name: Passed (Found '$expected_keyword')"
    else
        echo "❌ $name: Failed (Expected '$expected_keyword')"
        echo "Response snippet: ${RESPONSE:0:100}..."
    fi
}

# L1 Template Test
test_chat "L1 Template (Toilet)" "Where is the toilet?" "toilet"

# L2 Route Test (Mocking intent if LLM allows)
# Real L2 requires LLM to pick it up. We look for generic answer or specific format.
test_chat "L2 Intepreted Query" "How to go from Tokyo to Shinjuku?" "Shinjuku"

# L3 Skill Test
test_chat "L3 Fare Skill" "How much is the fare from Tokyo to Shinjuku?" "Fare"

# L5 LLM Fallback (Check for Tokyo info)
test_chat "L5 General Chat" "Tell me a joke about Tokyo" "Tokyo"


echo "---------------------------------------------------"

# 3. Performance Test (Latency)
echo "3️⃣  Simple Latency Check (L1)"
TIME_START=$(date +%s%N)
curl -s -o /dev/null -X POST "$URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"toilet"}],"locale":"en"}'
TIME_END=$(date +%s%N)
DURATION=$((($TIME_END - $TIME_START)/1000000))
echo "⏱️  L1 Response Time: ${DURATION}ms"

if [ $DURATION -lt 1000 ]; then
    echo "✅ Performance within commercial limits (<1000ms)"
else
    echo "⚠️ Performance warning (>1000ms)"
fi
