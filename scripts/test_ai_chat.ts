/**
 * AI 對話功能測試腳本
 * 根據修復報告驗證以下功能：
 * 1. 基本問候功能
 * 2. 路線規劃（包含「現在」關鍵字）
 * 3. 設施查詢
 * 4. 除錯訊息不洩漏
 */

const CHAT_API_URL = process.env.CHAT_API_URL || 'http://localhost:3000/api/agent/chat';

interface TestCase {
  name: string;
  input: string;
  expectedContains?: string[];
  notExpectedContains?: string[];
  locale?: string;
}

const testCases: TestCase[] = [
  {
    name: '測試 1: 基本問候',
    input: '你好',
    expectedContains: ['LUTAGU', '東京'],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning'],
  },
  {
    name: '測試 2: 路線規劃（包含「現在」關鍵字）',
    input: '我現在想從上野站到濱松町站',
    expectedContains: ['上野', '濱松町'],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning', '歡迎'],
  },
  {
    name: '測試 3: 路線規劃（另一案例）',
    input: '從淺草到東京車站最快的路線',
    expectedContains: ['淺草', '東京'],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning'],
  },
  {
    name: '測試 4: 時間查詢（回歸測試）',
    input: '現在幾點',
    expectedContains: [],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning'],
  },
  {
    name: '測試 5: 設施查詢',
    input: '上野站有寄物櫃嗎',
    expectedContains: ['上野'],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning'],
  },
  {
    name: '測試 6: 英文路線查詢',
    input: 'from Ueno to Tokyo Station',
    expectedContains: [],
    notExpectedContains: ['Matched high-frequency pattern', 'Debug', 'reasoning'],
    locale: 'en',
  },
];

async function testAIChat(testCase: TestCase): Promise<{
  success: boolean;
  response: string;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    console.log(`\n🧪 執行: ${testCase.name}`);
    console.log(`   輸入: "${testCase.input}"`);

    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/',
      },
      body: JSON.stringify({
        text: testCase.input,
        locale: testCase.locale || 'zh-TW',
        sessionId: `test-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      errors.push(`HTTP 錯誤: ${response.status} ${response.statusText}`);
      return { success: false, response: '', errors };
    }

    // 讀取 streaming 回應
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      errors.push('無法取得 response reader');
      return { success: false, response: '', errors };
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    console.log(`   回應長度: ${fullResponse.length} 字元`);
    console.log(`   回應預覽: ${fullResponse.substring(0, 100)}...`);

    // 驗證期望包含的內容
    if (testCase.expectedContains) {
      for (const expected of testCase.expectedContains) {
        if (!fullResponse.includes(expected)) {
          errors.push(`期望包含「${expected}」但未找到`);
        }
      }
    }

    // 驗證不應包含的內容（除錯訊息檢查）
    if (testCase.notExpectedContains) {
      for (const notExpected of testCase.notExpectedContains) {
        if (fullResponse.includes(notExpected)) {
          errors.push(`不應包含「${notExpected}」但卻找到了`);
        }
      }
    }

    const success = errors.length === 0;
    console.log(`   結果: ${success ? '✅ 通過' : '❌ 失敗'}`);

    if (errors.length > 0) {
      console.log(`   錯誤:`);
      errors.forEach(err => console.log(`      - ${err}`));
    }

    return { success, response: fullResponse, errors };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`測試執行錯誤: ${errorMsg}`);
    console.log(`   結果: ❌ 失敗`);
    console.log(`   錯誤: ${errorMsg}`);
    return { success: false, response: '', errors };
  }
}

async function runAllTests() {
  console.log('🚀 開始 AI 對話功能測試');
  console.log(`📡 目標 API: ${CHAT_API_URL}`);
  console.log('='*60);

  const results = [];

  for (const testCase of testCases) {
    const result = await testAIChat(testCase);
    results.push({
      name: testCase.name,
      ...result,
    });

    // 每個測試之間暫停 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='*60);
  console.log('📊 測試結果摘要');
  console.log('='*60);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n總測試數: ${results.length}`);
  console.log(`✅ 通過: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`成功率: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ 失敗的測試:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`\n  ${r.name}`);
        r.errors.forEach(err => console.log(`    - ${err}`));
      });
  }

  console.log('\n' + '='*60);

  // 產生詳細報告檔案
  const reportContent = generateReport(results);
  const reportPath = '/Users/zhuangzixian/Documents/LUTAGU_MVP/reports/ai_chat_test_' +
    new Date().toISOString().split('T')[0] + '.md';

  const fs = require('fs');
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n📄 詳細報告已產生: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

function generateReport(results: any[]): string {
  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  let report = `# LUTAGU AI 對話功能測試報告\n\n`;
  report += `**測試時間**: ${timestamp}\n`;
  report += `**測試環境**: ${process.env.NODE_ENV || 'development'}\n`;
  report += `**API 端點**: ${CHAT_API_URL}\n\n`;
  report += `---\n\n`;
  report += `## 測試摘要\n\n`;
  report += `- 總測試數: ${results.length}\n`;
  report += `- ✅ 通過: ${passed}\n`;
  report += `- ❌ 失敗: ${failed}\n`;
  report += `- 成功率: ${((passed / results.length) * 100).toFixed(1)}%\n\n`;
  report += `---\n\n`;
  report += `## 詳細測試結果\n\n`;

  results.forEach((result, index) => {
    report += `### ${result.name}\n\n`;
    report += `**狀態**: ${result.success ? '✅ 通過' : '❌ 失敗'}\n\n`;

    if (result.response) {
      report += `**回應長度**: ${result.response.length} 字元\n\n`;
      report += `**回應預覽**:\n\`\`\`\n${result.response.substring(0, 200)}...\n\`\`\`\n\n`;
    }

    if (result.errors.length > 0) {
      report += `**錯誤訊息**:\n`;
      result.errors.forEach(err => {
        report += `- ${err}\n`;
      });
      report += `\n`;
    }

    report += `---\n\n`;
  });

  report += `## 修復驗證清單\n\n`;
  report += `根據修復報告 (2026-01-19) 驗證以下修復項目：\n\n`;
  report += `- [ ] 路線規劃正則表達式優化（排除修飾詞）\n`;
  report += `- [ ] 「現在」關鍵字衝突修復（不誤判為問候）\n`;
  report += `- [ ] 除錯訊息洩漏修復（不出現 reasoning 欄位）\n`;
  report += `- [ ] AlgorithmMatch 信心度門檻調整（0.8 → 0.65）\n`;
  report += `- [ ] 錯誤處理優化（友善的 fallback 訊息）\n\n`;

  return report;
}

// 執行測試
runAllTests().catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
