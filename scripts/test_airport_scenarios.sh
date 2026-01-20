#!/bin/bash

API_URL="https://api.lutagu.com/agent/chat"
OUTPUT_FILE="airport_test_results.txt"

echo "=== Airport Scenarios Test Run $(date) ===" > $OUTPUT_FILE

run_test() {
    id=$1
    title=$2
    prompt=$3
    
    echo "----------------------------------------" | tee -a $OUTPUT_FILE
    echo "Scenario #$id: $title" | tee -a $OUTPUT_FILE
    echo "User Prompt: $prompt" | tee -a $OUTPUT_FILE
    echo "Waiting for response..."
    
    response=$(curl -s -X POST $API_URL \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"$prompt\", \"locale\": \"zh-TW\", \"userId\": \"test-user-airport\"}")
    
    echo "AI Response:" | tee -a $OUTPUT_FILE
    # Extract content field using logic (assuming JSON response standard)
    # Simple extraction for now to avoid dependency on jq if not present, though jq is better.
    # We will just save the full response for analysis.
    echo "$response" >> $OUTPUT_FILE
    echo "" | tee -a $OUTPUT_FILE
    echo "Completed #$id"
    sleep 2 # Prevent rate limiting
}

# 1. Narita -> Shinjuku (Speed)
run_test 1 "Narita -> Shinjuku (Speed)" "我從成田機場要到新宿，想要最快的方式，錢不是問題。"

# 2. Narita -> Asakusa (Budget)
run_test 2 "Narita -> Asakusa (Budget)" "成田機場去淺草，想省錢，怎麼搭？"

# 3. Haneda -> Tokyo Station (Luggage)
run_test 3 "Haneda -> Tokyo Station (Luggage)" "我帶了兩個大行李箱，從羽田機場要去東京車站，不想轉車太累。"

# 4. Narita Late Arrival
run_test 4 "Narita Late Arrival" "我的飛機晚上 11 點才到成田機場，還能去市區嗎？"

# 5. Haneda Early Morning (Reverse)
run_test 5 "Haneda Early Morning" "明天早上 8 點的飛機在羽田，我住在上野，幾點要出發？"

# 6. Narita -> Disney
run_test 6 "Narita -> Disney" "直接從成田機場去迪士尼樂園，有巴士嗎？"

# 7. Haneda -> Yokohama
run_test 7 "Haneda -> Yokohama" "羽田機場去橫濱怎麼走最方便？"

# 8. NEX vs Skyliner (Ikebukuro)
run_test 8 "NEX vs Skyliner" "NEX 和 Skyliner 哪個比較好？我要去池袋。"

# 9. Buy Suica
run_test 9 "Buy Suica" "在成田機場哪裡可以買西瓜卡？"

# 10. JR Pass Exchange
run_test 10 "JR Pass Exchange" "我有買 JR Pass 全國版，在羽田機場可以換嗎？"

echo "All tests completed. Results saved to $OUTPUT_FILE"
