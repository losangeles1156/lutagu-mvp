-- 激活並更新豊島區與澀谷區
INSERT INTO wards (id, name_i18n, prefecture, ward_code, is_active, priority_order)
VALUES 
  ('ward:toshima', '{"ja": "豊島区", "en": "Toshima", "zh": "豊島區", "zh-TW": "豊島區"}'::jsonb, 'Tokyo', 'Toshima', true, 12),
  ('ward:shibuya', '{"ja": "渋谷区", "en": "Shibuya", "zh": "澀谷區", "zh-TW": "澀谷區"}'::jsonb, 'Tokyo', 'Shibuya', true, 13)
ON CONFLICT (id) DO UPDATE SET 
  is_active = true,
  name_i18n = EXCLUDED.name_i18n,
  priority_order = EXCLUDED.priority_order;

-- 確保文京區資料完整
UPDATE wards SET 
  is_active = true,
  name_i18n = jsonb_set(name_i18n, '{zh-TW}', '"文京區"')
WHERE id = 'ward:bunkyo';

-- 更新機場區域（如果存在於 wards 表中）
INSERT INTO wards (id, name_i18n, prefecture, ward_code, is_active, priority_order)
VALUES 
  ('ward:airport', '{"ja": "空港エリア", "en": "Airport Area", "zh": "機場區域", "zh-TW": "機場區域"}'::jsonb, 'Tokyo', 'Airport', true, 99)
ON CONFLICT (id) DO UPDATE SET 
  is_active = true,
  name_i18n = EXCLUDED.name_i18n;
