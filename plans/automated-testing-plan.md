# LUTAGU_MVP 自動化測試實作計劃

## 📋 測試策略總覽

### 測試金字塔
```
        ┌─────────────┐
        │   E2E 測試   │  (5-10%)  Playwright
       ┌┴─────────────┴┐
       │  整合測試      │  (20-30%) React Testing Library
      ┌┴───────────────┴┐
      │    單元測試      │  (60-70%) Jest + Vitest
     └──────────────────┘
```

---

## 🎯 測試目標

1. **國際化(i18n)測試**: 驗證所有語系正確渲染
2. **元件互動測試**: 按钮、表單、導航功能
3. **頁面渲染測試**: 各 route 正確載入
4. **錯誤處理測試**: ErrorBoundary 正常運作

---

## 🛠️ 技術堆疊

| 類型 | 工具 | 用途 |
|------|------|------|
| 單元測試 | Jest / Vitest | 元件邏輯測試 |
| 整合測試 | React Testing Library | DOM 互動測試 |
| E2E 測試 | Playwright | 完整瀏覽器測試 |
| 視覺回歸 | Chromatic | UI 變更檢測 |
| 型別檢查 | TypeScript | 編譯時錯誤 |

---

## 📦 依賴安裝

```bash
# 安裝測試依賴
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  @playwright/test \
  ts-jest

# 安裝類型定義
npm install --save-dev \
  @types/jest \
  @types/testing-library__jest-dom
```

---

## ⚙️ Jest 配置文件

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  testMatch: ['**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};

export default config;
```

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// 每個測試後清理
afterEach(() => {
  cleanup();
});

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    return (key: string) => key;
  },
  useLocale: () => 'zh-TW',
}));
```

---

## 📝 測試範例

### 1. 元件國際化測試

```typescript
// src/components/ui/LanguageSwitcher.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('renders language options in Traditional Chinese', () => {
    render(<LanguageSwitcher />);
    
    // 檢查下拉選單包含繁體中文選項
    expect(screen.getByText('繁體中文')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', () => {
    render(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /切換語言/i });
    fireEvent.click(button);
    
    expect(screen.getByText('繁體中文')).toBeVisible();
  });

  it('calls router.replace when language is selected', () => {
    const mockReplace = jest.fn();
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ replace: mockReplace }),
      usePathname: () => '/',
    }));
    
    render(<LanguageSwitcher />);
    
    fireEvent.click(screen.getByText('English'));
    expect(mockReplace).toHaveBeenCalledWith('/', expect.any(Object));
  });
});
```

### 2. MainLayout 互動測試

```typescript
// src/components/layout/MainLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MainLayout } from './MainLayout';

describe('MainLayout', () => {
  const mockMapPanel = <div data-testid="map-panel">Map</div>;
  const mockChatPanel = <div data-testid="chat-panel">Chat</div>;

  it('renders AI assistant button with translated text', () => {
    render(
      <MainLayout 
        mapPanel={mockMapPanel} 
        chatPanel={mockChatPanel} 
      />
    );
    
    // 檢查 AI 助手按鈕存在
    expect(screen.getByText('AI 助手')).toBeInTheDocument();
  });

  it('expands chat panel when button is clicked', () => {
    render(
      <MainLayout 
        mapPanel={mockMapPanel} 
        chatPanel={mockChatPanel} 
      />
    );
    
    const aiButton = screen.getByText('AI 助手');
    fireEvent.click(aiButton);
    
    // 驗證展開後的行為
    // 實際行為取決於 UI 狀態管理
  });
});
```

### 3. ErrorBoundary 測試

```typescript
// src/components/ui/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="content">Test Content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('糟了！系統發生錯誤')).toBeInTheDocument();
    expect(screen.getByText('重新整理')).toBeInTheDocument();
  });

  it('shows inline variant for component errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary variant="inline">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('元件載入失敗')).toBeInTheDocument();
  });
});
```

### 4. i18n 完整測試

```typescript
// tests/i18n.test.ts
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/zh-TW.json';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

describe('i18n - 繁體中文 (zh-TW)', () => {
  it('all common translations are present', () => {
    const requiredKeys = [
      'common.close',
      'common.cancel', 
      'common.confirm',
      'common.loading',
      'common.error',
    ];

    requiredKeys.forEach(key => {
      const path = key.split('.');
      let value = messages;
      for (const p of path) {
        value = value?.[p];
      }
      expect(value).toBeDefined();
    });
  });

  it('language switcher displays correct labels', () => {
    render(
      <NextIntlClientProvider locale="zh-TW" messages={messages}>
        <LanguageSwitcher />
      </NextIntlClientProvider>
    );
    
    expect(screen.getByText('繁體中文')).toBeInTheDocument();
  });
});
```

---

## 🎭 Playwright E2E 測試

```typescript
// tests/e2e/i18n.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  test('switches to Traditional Chinese', async ({ page }) => {
    await page.goto('http://localhost:3000/en');
    
    // 打開語言切換器
    await page.click('[aria-label="Change language"]');
    
    // 選擇繁體中文
    await page.click('text=繁體中文');
    
    // 驗證導航已變為中文
    await expect(page.locator('text=探索')).toBeVisible();
    await expect(page.locator('text=行程')).toBeVisible();
  });

  test('all navigation items are translated', async ({ page }) => {
    await page.goto('http://localhost:3000/zh-TW');
    
    const navItems = ['探索', '行程', '守護', '我的'];
    
    for (const item of navItems) {
      await expect(page.locator(`text=${item}`)).toBeVisible();
    }
  });

  test('error messages are in correct language', async ({ page }) => {
    // 觸發錯誤場景
    await page.goto('http://localhost:3000/zh-TW');
    
    // 驗證錯誤訊息為中文
    await expect(page.locator('text=糟了！系統發生錯誤')).toBeVisible();
  });
});

test.describe('Interactive Elements', () => {
  test('AI assistant button click expands chat', async ({ page }) => {
    await page.goto('http://localhost:3000/zh-TW');
    
    // 點擊 AI 助手按鈕
    await page.click('text=AI 助手');
    
    // 驗證對話面板展開
    await expect(page.locator('text=問 LUTAGU...')).toBeVisible();
  });

  test('tab switching works correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/zh-TW');
    
    // 點擊不同標籤
    await page.click('text=附近');
    await expect(page.locator('text=生活機能')).toBeVisible();
    
    await page.click('text=狀態');
    await expect(page.locator('text=運行情報')).toBeVisible();
  });
});
```

---

## 📊 測試覆蓋率目標

| 元件 | 覆蓋率目標 |
|------|------------|
| 國際化(i18n) | 100% |
| 互動元件 | 80% |
| ErrorBoundary | 100% |
| API 路由 | 70% |

---

## ⏱️ 實施工時估算

| 工作項目 | 工時 |
|----------|------|
| Jest/Playwright 環境建置 | 4 小時 |
| 單元測試 (50+ 測試) | 8 小時 |
| 整合測試 (20+ 測試) | 6 小時 |
| E2E 測試 (10+ 測試) | 4 小時 |
| CI/CD 整合 | 2 小時 |
| **總計** | **24 小時** |

---

## 🔄 CI/CD 整合

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm test -- --coverage
      
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW: 1
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            coverage/
            playwright-report/
```

---

## ✅ 驗收標準

- [ ] 所有翻譯鍵值都有對應測試
- [ ] 主要互動流程有 E2E 測試覆蓋
- [ ] 測試覆蓋率 > 70%
- [ ] CI pipeline 綠燈
- [ ] 測試執行時間 < 5 分鐘
