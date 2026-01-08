# LUTAGU MVP 開發日誌 - 2026-01-04

## Phase 3 & 4 進度：後台管理 UI 與前端整合

### 今日完成工作

#### 1. API 路由修復
- **檔案**: `src/app/api/wards/[wardId]/route.ts`
- **修復內容**:
  - 修正 `includeHubs` 參數邏輯（`!== '1'` → `=== '1'`）
  - 新增詳細錯誤日誌，便於除錯

#### 2. 行政區資料修復
- **檔案**: `supabase/migrations/20260104_add_missing_ward.sql`
- **問題**: `ward:chiyoda`（千代田區）不存在於 `wards` 表格
- **修復**: 新增缺少的行政區記錄

### 遇到的錯誤與解決

#### 錯誤 1：includeHubs 邏輯反轉
```
GET /api/wards/ward:chiyoda?include_nodes=1&include_hubs=1&limit=200 404
```
**原因**: `const includeHubs = url.searchParams.get('include_hubs') !== '1';` 邏輯錯誤
**解決**: 改為 `const includeHubs = url.searchParams.get('include_hubs') === '1';`

#### 錯誤 2：ward:chiyoda 404
```
Ward error: { code: 'PGRST116', details: 'The result contains 0 rows' }
```
**原因**: `ward:chiyoda` 不存在於 `wards` 表格
**解決**: 新增 migration `20260104_add_missing_ward.sql`

#### 錯誤 3：公車站未過濾
**問題**: 前端地圖仍顯示公車站（bus_stop）
**原因**: `nearby_nodes_v2` 函數的 Supabase 查詢未正確套用 `not('node_type', 'eq', 'bus_stop')`
**狀態**: 待修復

#### 錯誤 4：車站重複顯示
**問題**: 部分車站（如稻荷町、田原町）顯示重複
**原因**: 尚未確認是 odpt 還是 osm 資料重複
**狀態**: 待調查

### 待處理任務

1. **[已完成] 執行 migration**: 執行 `20260104_add_missing_ward.sql` 新增千代田區 (已修正 ward_code 衝突)
2. **[已完成] 修復公車站過濾**: 確認 `nearby_nodes_v2` 查詢正確過濾 bus_stop
3. **[已完成] 調查車站重複**: 檢查 `nodes` 表格中是否有重複的車站 ID (已刪除無效重複項目)
   - 額外執行：批量清理無參照且無路線資訊的 `odpt:Station:%` 節點。
   - 額外執行：移除所有都營巴士站點 (`odpt.BusStopPole:Toei.%`)，共 3695 筆。
4. **[已完成] 更新 TODO**: 記錄開發日誌到 `docs/DEVELOPMENT_LOG_20260104.md`




### 參考文件
- 設計文件: `plans/node_admin_design.md`
- 資料庫結構: `LUTAGU_Database_Schema_v4.1.md.pdf`
