# Phase 13: 用戶認證整合 (LINE Login)

**Status**: DRAFT (Pending User Confirmation)
**Goal**: 整合 LINE Login 以降低日本用戶註冊門檻，並確保使用者資料正確同步至系統。

## 0. Socratic Gate (需確認事項)
在開始實作前，請確認以下規格：
1. **Scope**: 僅需實作「登入 (Login)」？還是包含「官方帳號加好友 (Add Friend)」或「訊息推播 (Messaging API)」？
   - *預設建議*：MVP 僅實作 **Login**。
2. **Data Sync**: 是否需要將 LINE 頭貼、暱稱同步至 App 內部的 User Profile？
   - *預設建議*：**是**，同步至 `public.profiles` 或 `auth.users.metadata`。
3. **Email Policy**: 若使用者在 LINE 側未授權 Email，我們是否強制要求補填？
   - *預設建議*：Supabase 預設需 Email，若 LINE 未回傳，需實作「補填 Email」流程或允許無 Email 登入（視 Supabase 設定而定）。

---

## Task Breakdown

### [ ] 13.1 Supabase Auth 設定 (Infrastructure)
- **Action**:
  - 在 LINE Developers Console 申請 Channel (Login)。
  - 設定 Callback URL (`https://<project>.supabase.co/auth/v1/callback`).
  - 在 Supabase Dashboard 啟用 LINE Provider (`Channel ID`, `Channel Secret`).
- **Deliverable**: Supabase 專案支援 LINE 登入。

### [ ] 13.2 前端認證整合 (Frontend)
- **Action**:
  - 建立 `LoginWithLINE` 按鈕組件 (遵循 LINE Design Guidelines)。
  - 實作 `supabase.auth.signInWithOAuth({ provider: 'line' })`。
  - 處理 Redirect 與 Callback 狀態 (`/auth/callback` 路由)。
- **Deliverable**: 用戶可點擊按鈕並跳轉至 LINE 授權頁面。

### [ ] 13.3 使用者資料同步 (Data Sync)
- **Action**:
  - 實作 Post-Login Trigger 或在 Callback 頁面處理資料同步。
  - 將 LINE `pictureUrl` -> App Avatar。
  - 將 LINE `displayName` -> App Display Name。
- **Deliverable**: 登入後，App 顯示使用者的 LINE 頭像與名稱。

### [ ] 13.4 錯誤處理與驗證 (QA)
- **Action**:
  - 測試無 Email 帳號的登入狀況。
  - 測試「拒絕授權」後的 UI 處理。
  - 驗證 Mobile PWA 環境下的跳轉行為 (LIFF vs Web Redirect)。
- **Deliverable**: 完整的登入錯誤處理機制。

## Agent Assignments
- **Configuration**: User (Admin) + Backend Specialist
- **Frontend**: Frontend Specialist
- **QA/Verification**: Automated Tests (Playwright) + Manual

## Verification Checklist
- [ ] 點擊 LINE 登入按鈕可跳轉。
- [ ] 授權後成功導回 App 並顯示「已登入」。
- [ ] 使用者頭像與名稱正確顯示。
- [ ] Supabase Auth Logs 顯示 `line` provider 登入紀錄。
