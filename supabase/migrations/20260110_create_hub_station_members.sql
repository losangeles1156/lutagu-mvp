-- 創建 hub_station_members 表
-- 用於存儲 Hub 及其成員車站的關係，解決 odpt:Station 與 odpt.Station 的映射問題
CREATE TABLE IF NOT EXISTS hub_station_members (
    hub_id TEXT NOT NULL,          -- Hub ID (通常是邏輯 ID，如 odpt:Station:JR-East.Ueno)
    member_id TEXT NOT NULL,       -- 成員車站 ID (物理 ID 或其他邏輯 ID)
    operator TEXT,                 -- 運營商
    line_name TEXT,                -- 路線名稱 (可選)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (hub_id, member_id)
);

-- 索引，優化雙向查詢
CREATE INDEX IF NOT EXISTS idx_hub_station_members_hub_id ON hub_station_members(hub_id);
CREATE INDEX IF NOT EXISTS idx_hub_station_members_member_id ON hub_station_members(member_id);

-- 添加 RLS 策略 (如果需要公開讀取)
ALTER TABLE hub_station_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
    ON hub_station_members FOR SELECT
    USING (true);
