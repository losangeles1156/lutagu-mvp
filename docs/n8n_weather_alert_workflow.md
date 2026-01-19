# JMA Weather Alert n8n Workflow Setup

This document describes how to configure an n8n workflow to periodically fetch weather alerts from JMA and sync them to Supabase.

## Prerequisites

1. **n8n instance** running (self-hosted or cloud)
2. **Supabase Service Key** (from `.env.local`)
3. **Network access** to JMA API

## Workflow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Schedule  │────▶│  HTTP GET   │────▶│   Parse     │────▶│  Supabase   │
│   (30min)   │     │   JMA API   │     │   Response  │     │   Upsert    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Step-by-Step Setup

### 1. Create Schedule Trigger
- **Node**: Schedule
- **Interval**: 30 minutes
- **Note**: Increase frequency during severe weather (e.g., every 10 min)

### 2. HTTP Request Node
- **Method**: GET
- **URL**: `https://www.jma.go.jp/bosai/warning/data/warning/130000.json`
- **Headers**: `Accept: application/json`
- **Response Format**: JSON

### 3. Code Node (Parse Alerts)
```javascript
const data = $input.first().json;
const alerts = [];

// Severity mapping
const severityMap = {
  '注意報': 'advisory',
  '警報': 'warning', 
  '特別警報': 'emergency'
};

// Alert type mapping
const alertTypeMap = {
  '大雪': 'heavy_snow',
  '暴風雪': 'blizzard',
  '大雨': 'heavy_rain',
  '暴風': 'storm',
  '洪水': 'flood',
  '地震': 'earthquake'
};

if (data?.areaTypes) {
  for (const areaType of data.areaTypes) {
    for (const area of (areaType.areas || [])) {
      for (const warning of (area.warnings || [])) {
        if (warning.status !== '発表') continue;
        
        const alertCode = warning.code || '';
        const alertType = alertTypeMap[alertCode] || 'other';
        const severity = severityMap[warning.kind?.name] || 'advisory';
        
        alerts.push({
          alert_type: alertType,
          severity: severity,
          affected_regions: [area.code, 'tokyo'],
          title: `${warning.kind?.name || '注意報'}: ${alertCode}`,
          subtitle: `${severity.toUpperCase()}: ${alertType.replace('_', ' ')}`,
          content: { ja: warning.text || '', en: '', zh: '' },
          region: 'tokyo',
          source: 'jma',
          valid_from: new Date().toISOString(),
          valid_until: null,
          data_type: 'jma_alert',
          timestamp: new Date().toISOString()
        });
      }
    }
  }
}

return alerts.map(a => ({ json: a }));
```

### 4. Supabase Node
- **Operation**: Upsert
- **Table**: `weather_alerts`
- **Conflict Columns**: `id` (or create unique constraint on `alert_type + region`)
- **Credentials**: Use `SUPABASE_SERVICE_KEY`

## Environment Variables Required

```
SUPABASE_URL=https://evubeqeaafdjnuocyhmb.supabase.co
SUPABASE_SERVICE_KEY=<your_service_key>
```

## Testing

1. Run workflow manually first
2. Check Supabase `weather_alerts` table for new rows
3. Test with simulated alert data during calm weather

## Monitoring

Set up n8n error notifications to alert when:
- JMA API returns non-200 status
- Supabase upsert fails
- Parse errors occur
