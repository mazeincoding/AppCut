**[English](./README.md) | 中文 (繁體)**

<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="apps/web/public/logo.png" alt="OpenCut Logo" width="100" />
    </td>
    <td align="right">
      <h1>OpenCut <span style="font-size: 0.7em; font-weight: normal;">(原 AppCut)</span></h1>
      <h3 style="margin-top: -10px;">一款免費開源的網頁/桌面/移動端視頻編輯器</h3>
    </td>
  </tr>
</table>

## 為什麼要做這個項目？

- **隱私保護**：您的視頻始終保留在本地設備
- **免費功能**：如今剪映的所有基礎功能都需要付費訂閱
- **簡單易用**：用戶需要簡單好用的編輯器 - 剪映的成功證明了這一點

## 功能特色

- 時間軸式編輯界面
- 支持多軌道操作
- 實時預覽效果
- 無水印、無訂閱強制
- 分析服務由[Databuddy](https://www.databuddy.cc?utm_source=opencut)提供，100%匿名化且無侵入性

## 項目結構

- `apps/web/` – 主Next.js網頁應用
- `src/components/` – UI組件和編輯器組件
- `src/hooks/` – 自定義React鉤子
- `src/lib/` – 工具函數和API邏輯
- `src/stores/` – 狀態管理(Zustand等)
- `src/types/` – TypeScript類型定義

## 快速開始

### 環境準備

開始前請確保系統已安裝：

- [Bun](https://bun.sh/docs/installation)
- [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/) (備用npm方案)

### 安裝步驟

1. **克隆倉庫**

    ```bash
    git clone https://github.com/OpenCut-app/OpenCut.git
    cd OpenCut
    ```

2. **啟動後端服務**
   在項目根目錄下執行：

    ```bash
    docker-compose up -d
    ```

3. **配置環境變量**
   進入web應用目錄並創建環境文件：

    ```bash
    cd apps/web

    # Unix/Linux/Mac
    cp .env.example .env.local

    # Windows命令提示符
    copy .env.example .env.local

    # Windows PowerShell
    Copy-Item .env.example .env.local
    ```

    *`.env`文件中的默認值已適用於本地開發*

4. **安裝依賴包**
   推薦使用`bun`或備用`npm`：

    ```bash
    # 使用bun
    bun install

    # 或使用npm
    npm install
    ```

5. **數據庫遷移**
   執行數據庫結構遷移：

    ```bash
    # 使用bun
    bun run db:push:local

    # 或使用npm
    npm run db:push:local
    ```

6. **啟動開發服務器**

    ```bash
    # 使用bun
    bun run dev

    # 或使用npm
    npm run dev
    ```

應用將運行在 [http://localhost:3000](http://localhost:3000)

## 參與貢獻

**注意**：當前項目處於高速開發階段，代碼變動頻繁。雖然我們歡迎貢獻，但建議等待項目穩定後再參與，以避免衝突和重複勞動。

## 查看[貢獻指南](.github/CONTRIBUTING.md)

我們歡迎各類貢獻！詳情請參閱[貢獻指南](.github/CONTRIBUTING.md)

**貢獻者快速指引：**

- Fork倉庫並本地克隆
- 按照CONTRIBUTING.md中的說明配置環境
- 創建特性分支並提交PR

## 贊助方

感謝[Vercel](https://vercel.com?utm_source=github-opencut&utm_campaign=oss)對開源項目的支持。

[![Vercel部署按鈕](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOpenCut-app%2FOpenCut&project-name=opencut&repository-name=opencut)

## 許可協議

[MIT許可證](LICENSE)

---

[![項目星標歷史圖](https://api.star-history.com/svg?repos=opencut-app/opencut&type=Date)]