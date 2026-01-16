---
name: tokyo-expert-knowledge
description: >
  東京交通與旅遊的 L4 專家知識庫。
  涵蓋：轉乘技巧、最佳車廂、異常應對、地點性格、
  設施服務、防災避難、票務規則、醫療看診(急診/診所)。
  當用戶詢問「怎麼搭最快」、「票價多少」、「地震怎麼辦」、
  「發燒去哪看醫生」、「電車停駛怎麼辦」、「被困在車上」時觸發。
tags: [knowledge, l4, tokyo, transit, disaster, medical, fare, stranded, evacuation, suspension]
allowed-tools: [view_file, search_web]
---

# Tokyo Expert Knowledge Guide

本 Skill 匯集東京交通與生活的深度專家知識 (L4 Knowledge)。

## 📚 知識領域索引

| ID | 領域 | 內容摘要 | 連結 |
| :--- | :--- | :--- | :--- |
| **Transfer** | 轉乘判斷 | TPI 痛苦指數、最佳車廂、出口變換、直通運轉規則 | [Transfer Judgment](./reference/transfer-judgment.md) |
| **Anomaly** | 異常應對 | 連鎖延誤風險、替代路徑過載警示、惡化預測(假性復駛) | [Anomaly Response](./reference/anomaly-response.md) |
| **Location** | 地點特性 | DNA 標籤(#下町)、氛圍匹配、時段/季節擁擠度 | [Location DNA](./reference/location-dna.md) |
| **Facility** | 設施服務 | 無障礙動線、置物櫃攻略、廁所/充電站位置 | [Facility Services](./reference/facility-services.md) |
| **Disaster** | 防災避難 | 暴雨/地震/大雪應對、車廂受困 SOP、熱中症預防 | [Disaster Guide](./reference/disaster-guide.md) |
| **Fare** | 票務運賃 | 跨系統計價、Pass 適用範圍、IC 卡規則 | [Fare Rules](./reference/fare-rules.md) |
| **Medical** | 醫療看診 | 檢傷分類、選定療養費(大醫院懲罰金)、科別對照 | [Medical Guide](./reference/medical-guide.md) |

## 💡 使用原則

1.  **Context Injection (情境注入)**:
    - 回答前確認 User 當下情境：
        - *有行李嗎？* -> 優先查 **Facility (Coin Lockers)** 與 **Transfer (Elevator)**。
        - *趕時間嗎？* -> 優先查 **Transfer (Best Car)**。
        - *天氣不好？* -> 優先查 **Anomaly (Delay)** 與 **Disaster**規則。
        - *電車停駛/受困？* -> 優先查 **Anomaly (Escalation)** 與 **Disaster (Evacuation)**。

2.  **Safety First**:
    - 遇到災害相關關鍵字 (地震、大雨)，**絕對優先** 觸發 [Disaster Guide](./reference/disaster-guide.md)。
    - 禁止給出「冒險」建議 (如：強風中建議去景觀台)。

3.  **Accuracy (精確性)**:
    - 票價與時刻表若無即時資料，請保守回答或引導至官方連結，勿瞎掰。
    - 直通運轉規則請參考 **Transfer Judgment**，以免讓用戶誤下車。
