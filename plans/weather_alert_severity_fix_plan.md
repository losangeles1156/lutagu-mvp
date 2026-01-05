# 天氣警報分級與 UI 顯示修復計劃

## 問題描述

**現象**：截圖顯示天氣警報為「紅色警戒 - 強風警報」，但實際上只是「注意報」等級，導致用戶困惑。

**根因**：
1. `src/lib/weather/policy.ts` 中 `強風注意報` 被錯誤地放入 `warning` pattern
2. UI 沒有顯示警報類型（如：強風、大雨）和地區（如：東京地方）

---

## 新功能：警報類型與地區顯示

### 需求
- 顯示警報類型：強風、大雨、波浪等
- 顯示受影響區域：東京地方、神奈川等
- 繼續遵守：限制首都圈範圍，排除東京離島

### 實作方案

#### 1. 在 `src/lib/weather/policy.ts` 新增輔助函數

```typescript
/**
 * 從警報標題中提取警報類型
 */
extractAlertType: (title: string): string => {
    const patterns = [
        { regex: /強風/, label: '強風' },
        { regex: /大雨/, label: '大雨' },
        { regex: /波浪/, label: '波浪' },
        { regex: /高潮/, label: '高潮' },
        { regex: /大雪/, label: '大雪' },
        { regex: /洪水/, label: '洪水' },
        { regex: /土砂/, label: '土砂災害' },
        { regex: /乾燥/, label: '乾燥' },
        { regex: /雷/, label: '雷' },
        { regex: /濃霧/, label: '濃霧' },
        { regex: /特別警報/, label: '特別警報' },
    ];
    for (const p of patterns) {
        if (p.regex.test(title)) return p.label;
    }
    return '天氣';
},

/**
 * 從警報內容中提取受影響區域
 */
extractRegion: (title: string, summary: string): string => {
    const text = title + summary;
    const regionPatterns = [
        { regex: /東京地方|23区|多摩/, label: '東京' },
        { regex: /神奈川県/, label: '神奈川' },
        { regex: /千葉県/, label: '千葉' },
        { regex: /埼玉県/, label: '埼玉' },
        { regex: /群馬県/, label: '群馬' },
        { regex: /茨城県/, label: '茨城' },
        { regex: /栃木県/, label: '栃木' },
        { regex: /山梨県/, label: '山梨' },
    ];
    for (const p of regionPatterns) {
        if (p.regex.test(text)) return p.label;
    }
    return '';
}
```

#### 2. 在 API 路由新增欄位

**`src/app/api/weather/route.ts`** 第 151-160 行修改：

```typescript
entries.push({
    title,
    original_summary: cleanSummary,
    summary: polyglotSummary,
    updated,
    severity,
    severity_label: severityLabel,
    urgency: WEATHER_REGION_POLICY.severityToUrgency[severity],
    color: WEATHER_REGION_POLICY.severityToColor[severity],
    alert_type: WEATHER_REGION_POLICY.extractAlertType(title),  // 新增
    region: WEATHER_REGION_POLICY.extractRegion(title, cleanSummary)  // 新增
});
```

#### 3. 更新 UI 組件顯示

**`SmartWeatherCard.tsx`** 修改標題顯示：

```tsx
// 修改前
<span className="text-xs font-black uppercase tracking-widest opacity-80">
    {isCritical ? tL2('criticalAlert') : isEmergencyMode ? tL2('warningAlert') : 'TOKYO'}
</span>

// 修改後
<span className="text-xs font-black uppercase tracking-widest opacity-80">
    {alert?.alert_type ? `${alert.region} ${alert.alert_type}` 
        : isCritical ? tL2('criticalAlert') 
        : isEmergencyMode ? tL2('warningAlert') 
        : 'TOKYO'}
</span>
```

**`WeatherBanner.tsx`** 修改顯示：

```tsx
// 修改前
<span className="text-xs font-bold truncate max-w-[200px] drop-shadow-sm">{mainAlert.title}</span>

// 修改後
<div className="flex flex-col">
    <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-0.5">
        {mainAlert.region} {mainAlert.alert_type}
    </span>
    <span className="text-xs font-bold truncate max-w-[200px] drop-shadow-sm">{mainAlert.title}</span>
</div>
```

---

## 修復方案

### 1. 修復分級邏輯 (`src/lib/weather/policy.ts`)

**第 102-114 行** 修改前：
```typescript
patterns: {
    critical: /特別警報|大地震|巨大地震|津波警告|震度[6-7]|大火災警報|土砂災害特別警戒情報/,
    warning: /警報|強風警報|波浪警報|高潮警報|大雨警報|洪水警報|大雪警報|土砂災害警戒情報|強風注意報/,
    advisory: /注意報/,
    info: /気象情報|全般台風情報|天候情報/
},
```

修改後：
```typescript
patterns: {
    critical: /特別警報|大地震|巨大地震|津波警告|震度[6-7]|大火災警報|土砂災害特別警戒情報/,
    warning: /警報|波浪警報|高潮警報|大雨警報|洪水警報|大雪警報|土砂災害警戒情報|強風警報/,
    advisory: /注意報|強風注意報|大雨注意報|乾燥注意報|雷注意報|濃霧注意報/,
    info: /気象情報|全般台風情報|天候情報/
},
```

### 2. 更新測試腳本

#### `scripts/verify_weather_policy_fixed.ts`

**第 101 行** 修改：
```typescript
// 修改前
{ title: '強風注意報', expected: 'warning' },

// 修改後
{ title: '強風注意報', expected: 'advisory' },
```

#### `scripts/verify_weather_severity.ts`

**第 20-21 行** 修改：
```typescript
// 修改前
{ title: '強風注意報', expected: 'warning' }

// 修改後
{ title: '強風注意報', expected: 'advisory' }
```

---

## 修復後的正確分級

| 警報類型 | 分級 | 顯示顏色 |
|---------|------|---------|
| 特別警報 | critical | 🔴 紅色 |
| 大雨警報 | critical | 🔴 紅色 |
| 強風警報 | warning | 🟠 橙色 |
| 波浪警報 | warning | 🟠 橙色 |
| 強風注意報 | advisory | 🟡 黃色 |
| 大雨注意報 | advisory | 🟡 黃色 |
| 乾燥注意報 | advisory | 🟡 黃色 |
| 気象情報 | info | 🔵 藍色 |

---

## 執行步驟

### 步驟 1: 修復分級邏輯
- [ ] 修改 `src/lib/weather/policy.ts` 中的 patterns
- [ ] 從 `warning` pattern 移除 `強風注意報`
- [ ] 新增 `extractAlertType` 輔助函數
- [ ] 新增 `extractRegion` 輔助函數

### 步驟 2: 更新 API 路由
- [ ] 在 `src/app/api/weather/route.ts` 新增 `alert_type` 和 `region` 欄位

### 步驟 3: 更新 UI 組件
- [ ] 更新 `SmartWeatherCard.tsx` 顯示警報類型和地區
- [ ] 更新 `WeatherBanner.tsx` 顯示警報類型和地區

### 步驟 4: 更新測試腳本
- [ ] 更新 `scripts/verify_weather_policy_fixed.ts`
- [ ] 更新 `scripts/verify_weather_severity.ts`
- [ ] 執行測試確認修復

---

## 備註

### 用戶影響評估

- **輪椅用戶**：可能會看到 advisory 被升級為 warning，這部分邏輯在 `adjustSeverityForUser` 函數中，暫時不變
- **一般用戶**：將看到正確的注意報（黃色），而非錯誤的警告（橙色）

### 相關文件

1. `src/lib/weather/policy.ts` - 主要分級邏輯
2. `src/components/ui/SmartWeatherCard.tsx` - UI 顯示卡片
3. `src/components/ui/WeatherBanner.tsx` - UI 橫幅
4. `src/app/api/weather/route.ts` - API 路由
