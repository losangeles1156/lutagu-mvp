import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 嘗試加載 .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📄 已加載環境變數: ${envPath}`);
} else {
  console.warn('⚠️ 未找到 .env.local，嘗試使用系統環境變數');
}

async function runMigration() {
  const sqlFilePath = process.argv[2];
  if (!sqlFilePath) {
    console.error('❌ 請提供 SQL 檔案路徑作為參數');
    console.error('用法: npx tsx scripts/run_migration.ts <path/to/sql/file>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ 未找到 DATABASE_URL 環境變數。請確認 .env.local 存在或已設置環境變數。');
    process.exit(1);
  }

  // 遮蔽密碼以進行日誌記錄
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 正在連接資料庫: ${maskedUrl}...`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Supabase 需要 SSL
  });

  try {
    await client.connect();
    console.log('✅ 資料庫連接成功');

    const absoluteSqlPath = path.resolve(sqlFilePath);
    if (!fs.existsSync(absoluteSqlPath)) {
      throw new Error(`找不到 SQL 檔案: ${absoluteSqlPath}`);
    }

    console.log(`📖 正在讀取 SQL 檔案: ${absoluteSqlPath}...`);
    const sql = fs.readFileSync(absoluteSqlPath, 'utf8');

    console.log('🚀 開始執行 SQL 遷移...');
    console.log(`📊 SQL 長度: ${sql.length} 字元`);

    // 執行 SQL
    await client.query(sql);

    console.log('✅ SQL 遷移執行完成！所有 L4 知識已更新。');

  } catch (err: any) {
    console.error('❌ 遷移執行失敗:', err.message);
    if (err.position) {
      console.error(`   錯誤位置: ${err.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 資料庫連接已關閉');
  }
}

runMigration();
