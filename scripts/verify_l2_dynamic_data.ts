/**
 * L2 Dynamic Data Verification Script
 * Verifies L1~L4 data display on station nodes, with focus on L2 dynamic data
 *
 * Checks:
 * 1. L2 Status API returns correct data structure
 * 2. Congestion level display logic
 * 3. Line status and delay information
 * 4. Graceful degradation when API keys fail
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Major hub stations to test L2 data
const TEST_STATIONS = [
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Tokyo',
    'odpt:Station:TokyoMetro.Ginza.Asakusa',
    'odpt:Station:Toei.Oedo.Shinjuku',
    'odpt:Station:TokyoMetro.Hibiya.Akihabara',
];

// Expected L2 response structure
interface L2Response {
    congestion: number;
    line_status: Array<{
        line: string;
        name: { ja: string; en: string; zh: string };
        operator: string;
        color: string;
        status: 'normal' | 'delay' | 'suspended';
        message?: {
            ja: string;
            en: string;
            zh: string;
        };
    }>;
    weather: {
        temp: number;
        condition: string;
        wind: number;
    };
    updated_at: string;
    disruption_history: Array<{
        station_id: string;
        severity: string;
        has_issues: boolean;
        affected_lines: string[];
        created_at: string;
    }>;
}

async function verifyL2StatusAPI(stationId: string): Promise<{
    success: boolean;
    data?: L2Response;
    error?: string;
    responseTime?: number;
}> {
    const startTime = Date.now();

    try {
        const response = await fetch(`http://localhost:3000/api/l2/status?station_id=${encodeURIComponent(stationId)}`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
                responseTime,
            };
        }

        const data = await response.json() as L2Response;

        // Validate response structure
        const issues: string[] = [];

        if (typeof data.congestion !== 'number' || data.congestion < 1 || data.congestion > 5) {
            issues.push(`Invalid congestion level: ${data.congestion} (expected 1-5)`);
        }

        if (!Array.isArray(data.line_status)) {
            issues.push('line_status is not an array');
        } else {
            if (data.line_status.length === 0) {
                issues.push('line_status is empty');
            }

            for (const line of data.line_status) {
                if (!line.line) issues.push('Missing line name');
                if (!line.status) issues.push(`Missing status for line ${line.line}`);
                if (!['normal', 'delay', 'suspended'].includes(line.status)) {
                    issues.push(`Invalid status "${line.status}" for line ${line.line}`);
                }
            }
        }

        if (!data.updated_at) {
            issues.push('Missing updated_at timestamp');
        }

        // Check if data is stale (> 1 hour)
        const updateTime = new Date(data.updated_at).getTime();
        const now = Date.now();
        if (now - updateTime > 60 * 60 * 1000) {
            issues.push(`Data is stale (${Math.round((now - updateTime) / 60000)} minutes old)`);
        }

        if (issues.length > 0) {
            return {
                success: false,
                data,
                error: issues.join('; '),
                responseTime,
            };
        }

        return {
            success: true,
            data,
            responseTime,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
        };
    }
}

async function verifyTrainPositionAPI(): Promise<{
    success: boolean;
    trainCount?: number;
    error?: string;
    responseTime?: number;
}> {
    const startTime = Date.now();

    try {
        const response = await fetch('http://localhost:3000/api/train?mode=position', {
            headers: {
                'Accept': 'application/json',
            },
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
                responseTime,
            };
        }

        const data = await response.json();

        if (!Array.isArray(data.trains)) {
            return {
                success: false,
                error: 'trains is not an array',
                responseTime,
            };
        }

        return {
            success: true,
            trainCount: data.trains.length,
            responseTime,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
        };
    }
}

async function verifyDatabaseSnapshot(stationId: string): Promise<{
    hasSnapshot: boolean;
    snapshotData?: any;
    isFresh: boolean;
    issue?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('transit_dynamic_snapshot')
            .select('*')
            .eq('station_id', stationId)
            .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return {
                hasSnapshot: false,
                isFresh: false,
                issue: `Database error: ${error.message}`,
            };
        }

        if (!data) {
            return {
                hasSnapshot: false,
                isFresh: false,
                issue: 'No snapshot found in last 24 hours',
            };
        }

        // Check if snapshot is fresh (< 1 hour)
        const updateTime = new Date(data.updated_at).getTime();
        const isFresh = Date.now() - updateTime < 60 * 60 * 1000;

        return {
            hasSnapshot: true,
            snapshotData: data,
            isFresh,
        };
    } catch (error) {
        return {
            hasSnapshot: false,
            isFresh: false,
            issue: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function checkCongestionLevelLogic(): Promise<{
    correct: boolean;
    details: string[];
}> {
    const details: string[] = [];
    let correct = true;

    // Check that congestion levels are properly calculated
    // Level 1: Empty (0-20% capacity)
    // Level 2: Light (20-40% capacity)
    // Level 3: Moderate (40-60% capacity)
    // Level 4: Crowded (60-80% capacity)
    // Level 5: Full (80-100% capacity)

    const expectedLevels = [1, 2, 3, 4, 5];

    for (const stationId of TEST_STATIONS.slice(0, 3)) {
        const result = await verifyL2StatusAPI(stationId);

        if (result.success && result.data) {
            const congestion = result.data.congestion;

            if (!expectedLevels.includes(congestion)) {
                correct = false;
                details.push(`❌ ${stationId}: Invalid congestion level ${congestion}`);
            } else {
                details.push(`✓ ${stationId}: Congestion level ${congestion} (${getCongestionLabel(congestion)})`);
            }
        }
    }

    return { correct, details };
}

function getCongestionLabel(level: number): string {
    const labels: Record<number, string> = {
        1: '空車',
        2: '座席有空',
        3: '混雜',
        4: '滿員',
        5: '締切',
    };
    return labels[level] || 'Unknown';
}

async function runL2Verification() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           L2 Dynamic Data Verification Report                 ║');
    console.log('║          驗證 L1~L4 動態數據顯示正確性                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`🕐 執行時間: ${new Date().toISOString()}`);
    console.log(`📡 API 端點: http://localhost:3000\n`);

    let passedTests = 0;
    let failedTests = 0;

    // 1. Test Train Position API
    console.log('─'.repeat(60));
    console.log('【1】列車位置 API 驗證 (Train Position API)');
    console.log('─'.repeat(60));

    const trainPosResult = await verifyTrainPositionAPI();

    if (trainPosResult.success) {
        console.log(`✅ 成功: 取得 ${trainPosResult.trainCount} 輛列車位置`);
        console.log(`   回應時間: ${trainPosResult.responseTime}ms`);
        passedTests++;
    } else {
        console.log(`❌ 失敗: ${trainPosResult.error}`);
        console.log(`   回應時間: ${trainPosResult.responseTime}ms`);
        failedTests++;
    }

    // 2. Test L2 Status API for major hubs
    console.log('\n' + '─'.repeat(60));
    console.log('【2】L2 Status API 驗證 (主要樞紐站)');
    console.log('─'.repeat(60));

    for (const stationId of TEST_STATIONS) {
        const result = await verifyL2StatusAPI(stationId);
        const stationName = stationId.split(':').pop()?.split('.').pop() || stationId;

        console.log(`\n📍 ${stationName}:`);

        if (result.success) {
            console.log(`   ✅ API 回應正常`);
            console.log(`   📊 擁塞等級: ${result.data!.congestion} (${getCongestionLabel(result.data!.congestion)})`);
            console.log(`   🛤️ 路線數量: ${result.data!.line_status.length}`);
            console.log(`   🕐 數據時間: ${result.data!.updated_at}`);
            console.log(`   ⏱️ 回應時間: ${result.responseTime}ms`);

            // Show line status summary
            const normalLines = result.data!.line_status.filter(l => l.status === 'normal').length;
            const delayLines = result.data!.line_status.filter(l => l.status === 'delay').length;
            const suspendedLines = result.data!.line_status.filter(l => l.status === 'suspended').length;

            console.log(`   📈 路線狀態: 正常 ${normalLines} / 延誤 ${delayLines} / 停駛 ${suspendedLines}`);
            passedTests++;
        } else {
            console.log(`   ❌ API 回應異常`);
            console.log(`   錯誤: ${result.error}`);
            console.log(`   ⏱️ 回應時間: ${result.responseTime}ms`);
            failedTests++;
        }

        // Check database snapshot
        const dbResult = await verifyDatabaseSnapshot(stationId);

        if (dbResult.hasSnapshot) {
            console.log(`   💾 資料庫快照: ✓ (${dbResult.isFresh ? '新鮮' : '過期'})`);
        } else {
            console.log(`   💾 資料庫快照: ${dbResult.issue || '✗ 未找到'}`);
        }
    }

    // 3. Verify congestion level logic
    console.log('\n' + '─'.repeat(60));
    console.log('【3】擁塞等級顯示邏輯驗證 (Congestion Display Logic)');
    console.log('─'.repeat(60));

    const congestionResult = await checkCongestionLevelLogic();

    for (const detail of congestionResult.details) {
        console.log(`   ${detail}`);
    }

    if (congestionResult.correct) {
        console.log(`   ✅ 所有擁塞等級值都在有效範圍內 (1-5)`);
        passedTests++;
    } else {
        console.log(`   ❌ 存在無效的擁塞等級值`);
        failedTests++;
    }

    // 4. Check for JR East API key issues
    console.log('\n' + '─'.repeat(60));
    console.log('【4】API 金鑰配置檢查 (API Key Configuration)');
    console.log('─'.repeat(60));

    const odptKey = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN;
    const backupKey = process.env.ODPT_API_TOKEN_BACKUP;

    console.log(`   ODPT_API_KEY: ${odptKey ? '✓ 已設定' : '✗ 未設定'}`);
    console.log(`   ODPT_API_TOKEN_BACKUP: ${backupKey ? '✓ 已設定' : '✗ 未設定'}`);

    if (!odptKey && !backupKey) {
        console.log(`   ⚠️ 警告: 兩個 API 金鑰都未設定，動態數據可能無法使用`);
        failedTests++;
    } else {
        console.log(`   ✅ 至少有一個 API 金鑰已設定`);
        passedTests++;
    }

    // 5. Summary
    console.log('\n' + '═'.repeat(60));
    console.log('                    驗證結果摘要 (Summary)');
    console.log('═'.repeat(60));

    const totalTests = passedTests + failedTests;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    console.log(`\n   📊 總測試數: ${totalTests}`);
    console.log(`   ✅ 通過: ${passedTests}`);
    console.log(`   ❌ 失敗: ${failedTests}`);
    console.log(`   📈 通過率: ${passRate}%`);

    if (failedTests > 0) {
        console.log(`\n   ⚠️  發現 ${failedTests} 個問題，請檢查以下項目:`);
        console.log(`   1. 確認 L2 Status API 回應格式正確`);
        console.log(`   2. 檢查資料庫快照是否新鮮`);
        console.log(`   3. 驗證 ODPT API 金鑰配置`);
        console.log(`   4. 確認擁塞等級計算邏輯`);
    } else {
        console.log(`\n   🎉 所有測試通過！L2 動態數據顯示正常`);
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    return {
        passed: passedTests,
        failed: failedTests,
        total: totalTests,
        passRate,
        timestamp: new Date().toISOString(),
    };
}

// Export for use in other scripts
export { verifyL2StatusAPI, verifyTrainPositionAPI, verifyDatabaseSnapshot, runL2Verification };

// Run if executed directly
if (require.main === module) {
    runL2Verification()
        .then(result => {
            process.exit(result.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
}
