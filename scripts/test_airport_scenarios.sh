#!/bin/bash

API_URL="https://lutagu.com/api/agent/chat"
OUTPUT_FILE="airport_multiturn_test_results.txt"

echo "=== Airport Scenarios Test Run $(date) ===" > $OUTPUT_FILE

run_multiturn_test() {
    id=$1
    title=$2
    payload=$3

    echo "----------------------------------------" | tee -a $OUTPUT_FILE
    echo "Scenario #$id: $title" | tee -a $OUTPUT_FILE
    echo "Request Payload: $payload" | tee -a $OUTPUT_FILE
    echo "AI Response:" | tee -a $OUTPUT_FILE

    echo "$payload" | curl -sS -L -N --max-time 90 \
      -H "Content-Type: application/json" \
      -H "Accept: text/event-stream" \
      -d @- \
      "$API_URL" | tee -a $OUTPUT_FILE

    echo "" | tee -a $OUTPUT_FILE
    echo "Completed #$id" | tee -a $OUTPUT_FILE
    sleep 2
}

run_multiturn_test 1 "成田→新宿，追問省錢方案" '{"locale":"zh-TW","messages":[{"role":"user","content":"我從成田機場要到新宿，想要最快的方式，錢不是問題。"},{"role":"assistant","content":"好的，我會給你最快的方案。"},{"role":"user","content":"如果我想省錢呢？"}]}'

run_multiturn_test 2 "羽田→上野，追問末班車" '{"locale":"zh-TW","messages":[{"role":"user","content":"我晚上 11 點到羽田，還能去上野嗎？"},{"role":"assistant","content":"我先確認交通狀況。"},{"role":"user","content":"最晚可以搭到幾點的車？"}]}'

run_multiturn_test 3 "成田晚到市區，追問替代方案" '{"locale":"zh-TW","messages":[{"role":"user","content":"我的飛機晚上 11 點到成田，還能去市區嗎？"},{"role":"assistant","content":"我會建議適合的深夜方案。"},{"role":"user","content":"如果電車沒了，還有什麼選擇？"}]}'

run_multiturn_test 4 "羽田→東京站，大行李，追問無障礙" '{"locale":"zh-TW","messages":[{"role":"user","content":"我帶兩個大行李箱，從羽田機場到東京車站，不想轉車太累。"},{"role":"assistant","content":"我會推薦最省力的方案。"},{"role":"user","content":"有電梯或無障礙路線嗎？"}]}'

run_multiturn_test 5 "上野→羽田，早班機，追問出發時間" '{"locale":"zh-TW","messages":[{"role":"user","content":"我住在上野，明天早上 8 點的飛機在羽田，怎麼去比較穩？"},{"role":"assistant","content":"我會先給你最穩定的路線。"},{"role":"user","content":"大概幾點要出發？"}]}'

echo "All tests completed. Results saved to $OUTPUT_FILE"
