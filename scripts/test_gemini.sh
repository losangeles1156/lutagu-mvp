#!/bin/bash
source .env.local

echo "Testing Gemini API..." > gemini_test_result.txt

check_model() {
    MODEL=$1
    echo "Checking $MODEL..." >> gemini_test_result.txt
    response=$(curl -s -H 'Content-Type: application/json' \
         -d '{"contents":[{"parts":[{"text":"hello"}]}]}' \
         "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$GOOGLE_API_KEY")

    if echo "$response" | grep -q "candidates"; then
        echo "SUCCESS: $MODEL working" >> gemini_test_result.txt
        echo "$response" >> gemini_test_result.txt
    else
        echo "FAIL: $MODEL" >> gemini_test_result.txt
        echo "$response" | head -n 5 >> gemini_test_result.txt
    fi
    echo "--------------------------------" >> gemini_test_result.txt
}

check_model "gemini-2.0-flash-exp"
check_model "gemini-3-pro-preview"
check_model "gemini-1.5-flash"

echo "Done." >> gemini_test_result.txt
