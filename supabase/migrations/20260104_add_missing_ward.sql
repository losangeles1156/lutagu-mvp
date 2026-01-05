-- Add missing ward:chiyoda (千代田區)
-- This ward was missing from the initial wards table population

INSERT INTO wards (id, name_i18n, prefecture, ward_code, priority_order, is_active, node_count, hub_count)
VALUES (
  'ward:chiyoda',
  '{"en": "Chiyoda", "ja": "千代田區", "zh-TW": "千代田區"}'::jsonb,
  'Tokyo',
  '13101',
  5,
  true,
  0,
  0
)
ON CONFLICT (id) DO NOTHING;

-- Verify the insertion
SELECT id, name_i18n FROM wards WHERE id = 'ward:chiyoda';
