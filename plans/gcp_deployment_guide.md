# Google Cloud Run 部署操作手冊 (GCP Deployment Guide)

本手冊將引導您從零開始，完成 Google Cloud Platform (GCP) 的帳號設定、專案建立與 `chat-api` 服務的部署。

## 1. 前置準備：建立 GCP 專案 (Project Setup)

### Q: 是否需要新建專案？
**答：强烈建議新建一個專案。**
這能將 Lutagu 的資源（資料庫、運算、日誌）與您其他的實驗或工作分開，方便管理權限與監控成本。

### 步驟 A: 透過網頁主控台建立 (推薦新手)
1.  前往 [Google Cloud Console](https://console.cloud.google.com/)。
2.  點擊左上角的專案選單，選擇 **"New Project" (建立專案)**。
3.  **Project Name**: 輸入 `lutagu-mvp` (或您喜歡的名字)。
4.  **Billing**: 由於 Cloud Run 需要綁定帳單帳戶 (即使有免費額度)，請確保您已建立 Billing Account 並連結至此專案。
    *   *注意：Google通常提供 $300 贈金給新用戶，且 Cloud Run 每月有 200萬次免費請求額度。*
5.  記下您的 **Project ID** (例如 `lutagu-mvp-123456`)，稍後會用到。

---

## 2. 環境建置：安裝與登入工具 (Installation & Login)

由於您的電腦尚未安裝 Google Cloud CLI 工具，請先執行安裝。

### 步驟 B: 安裝 Google Cloud SDK
**macOS (使用 Homebrew)**:
```bash
brew install --cask google-cloud-sdk
```
*如果沒有 Homebrew，請下載 [安裝程式](https://cloud.google.com/sdk/docs/install#mac)。*

### 步驟 C: 登入與設定 (Login Operation)
安裝完成後，請在終端機 (Terminal) 依序執行：

1.  **登入 Google 帳號**
    ```bash
    gcloud auth login
    ```
    *系統會彈出瀏覽器視窗，請使用您的 Google 帳號授權。*

2.  **設定目標專案**
    把 `YOUR_PROJECT_ID` 換成剛剛網頁上看到的 ID：
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

3.  **啟用必要服務 API**
    Lutagu 部署需要以下服務：Cloud Run (執行)、Cloud Build (打包)、Artifact Registry (儲存映像檔)。
    ```bash
    gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
    ```

---

## 3. 執行部署 (Deployment Execution)

現在環境已準備就緒，我們可以開始部署 `chat-api`。

### 步驟 D: 提交建置與部署
請在專案根目錄執行以下指令：

```bash
# 1. 進入後端服務目錄
cd services/chat-api

# 2. 提交程式碼到雲端進行打包 (Cloud Build)
# 這會將您的程式碼上傳，並在 Google 的伺服器上執行 Docker build
# 成功後會產生映像檔：gcr.io/YOUR_PROJECT_ID/chat-api
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/chat-api

# 3. 部署到 Cloud Run (正式上線)
# 請將下面的 <SUPABASE_URL> 等換成實際的值
gcloud run deploy chat-api \
  --image gcr.io/$(gcloud config get-value project)/chat-api \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --max-instances 10 \
  --set-env-vars "SUPABASE_URL=您的Supabase網址,SUPABASE_SERVICE_KEY=您的ServiceKey"
```

### 步驟 E: 驗證
部署成功後，終端機最後會顯示一個網址：
`Service URL: https://chat-api-xxxxx-an.a.run.app`

請點擊該連結並加上 `/health` (例如 `https://.../health`)，如果看到 `{"status":"ok"}`，代表部署成功！

---

## 4. 常見問題 (Troubleshooting)

*   **Error: Billing not enabled**: 請到 GCP Console > Billing 確認專案是否已連結信用卡。
*   **Error: Permission denied**: 確保您登入的帳號是該專案的 Owner 或 Editor。
*   **Error: Docker not found**: 使用 `gcloud builds submit` 指令不需要本地安裝 Docker，它會使用雲端機器建置。
