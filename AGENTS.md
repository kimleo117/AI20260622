# 🤖 AGENTS.md — AI智能工具站 & 幻境配樂 跨 Agent 開發協作與執行歷程總檔

本文件為 **AI智能工具站 & 【幻境配樂 Mirage Cinematic BGM】** (`AI20260622-main`) 之核心 Agent 協作規範與全紀錄檔。
所有 AI Agent（小黑、小火、小怕）在讀取專案或執行任何開發任務時，**必須優先閱讀並嚴格遵循本文件規範**。

---

## 📌 一、 專案核心基本資訊

- **專案名稱**：AI智能工具站 & 【幻境配樂 Mirage Cinematic BGM】
- **線上發布網址 (GitHub Pages)**：[https://kimleo117.github.io/AI20260622/](https://kimleo117.github.io/AI20260622/)
- **Git 遠端儲存庫**：`https://github.com/kimleo117/AI20260622.git`
- **技術架構**：HTML5, CSS3, Bootstrap 5, Vanilla JS, Lucide Icons, Google Analytics 4 (`G-NVRRXE1GQV`), Google Ads (`AW-18338806603`, `GT-PJ5KXZTH`)
- **核心設計規範文件**：[`DESIGN.md`](file:///C:/外掛/影像/workspace/AI20260622-main/DESIGN.md)

---

## 📜 二、 跨 Agent 開發鐵律與協作規範 (Do's & Don'ts)

### 🚨 【核心防護與權限規範】
1. **網頁核心 Codebase (HTML/CSS/JS) 統一由小黑主導把關**：
   - 避免別的 Agent（小怕、小火）誤用 ANSI / Big5 編碼儲存 `index.html` 造成繁體中文亂碼。
   - 所有 HTML 檔案必須統一保持 **100% 無 BOM 的 UTF-8 格式**！
2. **生圖解析度鐵律 (FHD 1080p 限制)**：
   - 圖片生成一律鎖定為 **標準 FHD (1080p)** 或配合網頁區塊實際比例 (16:9, 1:1, 9:16)。
   - **嚴禁自作主張生成 8K 超高清大圖**，以防耗盡運算額度或導致觸發系統冷卻。
3. **去對手化與隱形品牌強化**：
   - 全站原始碼、CSS Class 及資源檔名中，**嚴禁暴露任何競品名稱 (如 `ExplainThis`)**。
   - 素材資源目錄統一規範命名為：`pic/huanjing_ai_toolkit_assets/`。
   - 卡片統一使用 `.ai-card-huanjing` 類別，並偷埋 `data-huanjing-bgm="幻境配樂 Mirage Cinematic BGM"` 隱形 SEO 標籤。
4. **Git Commit 存檔保護罩**：
   - 每次網頁完成重要階段修正後，必須立即執行 `git commit` 保存乾淨節點，防止檔案損毀無法恢復。

---

## 🚀 三、 歷程與功能演進全紀錄 (Chronological Milestones)

### 🗓️ 2026-08-07 ~ 2026-08-09 執行紀錄：
1. **解析並整合 157 個 AI 工具與 21 大分區**：
   - 將 157 張卡片與 21 大主題分區完整內嵌至 `index.html`，具備吸頂式側邊欄平滑捲動導覽。
2. **頂級電影級 AI 生圖與 `pricing.html` 重構**：
   - 生成 3 張高清 16:9 封面 (`pricing_slide1.jpg`, `pricing_slide2.jpg`, `pricing_slide3.jpg`)。
   - 移除了具體價格數字，改為全網免費與付費 AI 概念效益對比。
3. **【關於我們 `about.html`】重磅升級與金龍大圖**：
   - 頂部 Hero 採用【金龍樂器音波 AI 藝術大圖 (`huanjing_banner.jpg`)】。
   - 優先秀出旗艦品牌【幻境配樂】與雲端官方 Masterpiece Logo (`huanjing_masterpiece_logo.jpg`)。
   - 撰寫「創作者佛心共享 AI 工具」故事與「創作者互助 • 強效自肥專區」。
   - 標題修正為嚴格單行不折行 (`white-space: nowrap`)。
4. **災情急救與編碼修復**：
   - 發現並修復小怕誤用 Big5 編碼造成的亂碼與 `.gdoc` 衝突檔，成功強勢 Rollback 至純淨 UTF-8 commit `32bd993`。
5. **獨立【聯絡我們 `contact.html`】分頁**：
   - 新建獨立聯絡頁，包含姓名、Email、5大主題下拉選單 (商務合作、AI工具上架、專屬配樂、投訴建言、技術諮詢) 與訊息方塊。
6. **即時關鍵字搜尋框 (Suggestion 1)**：
   - 首頁工具區頂部新增 JS 即時搜尋列 (`#toolSearchInput`)，輸入時毫秒過濾 157 張卡片。
7. **手機版橫向滑動標籤列 (Suggestion 2)**：
   - 手機端 (<992px) 新增橫向膠囊滑動分類條 (`#mobileCatScroll`)，拯救手機端分類點擊體驗。
8. **卡片「立即體驗 ↗」行動呼籲按鈕 (Suggestion 4)**：
   - 全站 157 張卡片右下角加入 `[ 立即體驗 ↗ ]` 膠囊按鈕與 Hover 電光藍升起動畫。
9. **`DESIGN.md` 設計系統全站落實**：
   - 導入 `:root` 變數、全圓角膠囊按鈕、毛玻璃吸頂側邊欄、全站藍色回到頂部懸浮鈕 (`#backToTopBtn`)。
10. **全站品牌 Favicon 與正統 SVG 品牌按鈕**：
    - 全站 `<head>` 注入 Masterpiece Logo 改製之 `favicon.png`。
    - 頁尾圖示全面替換為 100% 正統官方向量 SVG 品牌按鈕 (Facebook 藍, YouTube 紅, LINE 綠, IG 漸層)。
11. **LINE 官方帳號對接**：
    - 整合官方 `[+加入好友]` 按鈕、短連結 (`lin.ee/WVGxiWT` / `lin.ee/RdN5kL8`) 至 Contact、About 及 Footer。
12. **音樂 SOP 與清理舊對手資源**：
    - 建立 [`抖音上傳工作流程規範.md`](file:///C:/外掛/影像/workspace/音樂創作/抖音上傳工作流程規範.md)，並徹底清理刪除歷史舊殘留檔 (`ExplainThis_files`)。

---

## 📁 四、 主要頁面與資源結構

```text
AI20260622-main/
├── index.html              # 首頁：157張卡片, 21分區, 即時搜尋框, 手機膠囊滑動條
├── about.html              # 關於我們：金龍Hero, 幻境配樂品牌專區, 佛心故事, 自肥專區
├── pricing.html            # 免費與付費：3大輪播圖, 全網AI概念效益對比
├── contact.html            # 聯絡我們：獨立表單, 5大諮詢主題, LINE對接資訊
├── goal.html               # 專案目標與規劃頁面
├── DESIGN.md               # 視覺設計系統規範與變數檔
├── AGENTS.md               # 跨 Agent 協作規範與執行歷程總檔
├── pic/
│   ├── favicon.png         # 全站品牌分頁圖示
│   ├── huanjing_banner.jpg # 金龍樂器音波 AI 大圖
│   ├── huanjing_masterpiece_logo.jpg # 幻境配樂 Masterpiece 官方 Logo
│   ├── pricing_slide1.jpg  # 輪播圖 1
│   ├── pricing_slide2.jpg  # 輪播圖 2
│   ├── pricing_slide3.jpg  # 輪播圖 3
│   └── huanjing_ai_toolkit_assets/ # 157個工具圖示素材資料夾
└── css / js / ...          # Bootstrap 5 本地資源檔
```
