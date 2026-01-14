# Facility Pathfinder (Vertical Navigation)

## 🎯 Goal
為攜帶大型行李、推嬰兒車或輪椅的用戶，規劃「最少階梯、必定有電梯」的垂直移動路徑。
重點在於解決「平面地圖無法顯示的垂直障礙」。

## ⚙️ Trigger
當用戶詢問包含以下意圖時觸發：
*   "推嬰兒車怎麼走"
*   "有行李箱，哪個出口有電梯？"
*   "輪椅路線"

## 🧠 Execution Steps

1.  **Identify Station Structure (識別車站結構)**:
    *   查詢 L4 Knowledge 中的 `accessibility` 欄位。
    *   確認由「月台 -> 改札口 (Ticket Gate)」與「改札口 -> 地面出口」的兩段式電梯路徑。

2.  **Select Best Exit (選擇最佳出口)**:
    *   **Rule 1**: 優先選擇「直結電梯」的出口。
    *   **Rule 2**: 若無直結，尋找車站共構大樓 (如百貨公司) 的聯通電梯。
    *   *Warning*: 避開雖然近但只有樓梯的出口。

3.  **Draft the Path (路徑描述)**:
    *   **Format**: "Step-by-Step" 指引。
    *   包含具體地標：改札口名稱（中央改札 vs 南改札）、電梯顏色/位置標識。

## 📝 Example Scenarios

### Case: 新宿站 (Shinjuku) 帶著大行李去歌舞伎町
*   **Problem**: 東口 (最接近) 只有樓梯或極少量電扶梯，人潮極多。
*   **Pathfinder Logic**:
    *   避開「東口」地下連通道的高低差。
    *   建議走「東南口 (South East Gate)」(有電梯/電扶梯直達地面)。
    *   雖然繞路，但路面平坦。

### Case: 大江戶線六本木站 (深達地下 40m)
*   **Problem**: 轉乘極遠，垂直移動久。
*   **Pathfinder Logic**:
    *   明確警告「預留 10 分鐘以上出站時間」。
    *   指引特定電梯塔位置。

## 🗣️ Response Template
"帶著 [行李/嬰兒車] 的話，請**絕對避開 [最近但只有樓梯的出口]**！
請依照以下無障礙路徑走：
1. 下車後，尋找 **[改札口名稱]** (往 [方向] 標示)。
2. 出改札後，找 **[出口編號]** 附近的電梯。
3. 電梯直達地面後，往 [方向] 走約 X 分鐘即可抵達。"
