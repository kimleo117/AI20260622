# 🎨 DESIGN.md — AI智能工具站 & 幻境配樂 設計系統規範

本文件為 **AI智能工具站 & 幻境配樂** (`AI20260622-main`) 專案之核心視覺設計系統規範。
所有 AI Agent（小黑、小火、小怕）、Vibe Coding 工具（Cursor, Windsurf）及開發人員在新增、修改網頁元件或撰寫前端程式碼（HTML/CSS/JS）時，**必須嚴格遵守本文件規範**，以確保全站視覺一致性、回應性體驗與品牌質感。

---

## 1. Visual Theme & Atmosphere (視覺主題與氛圍)

- **核心定位**：專為 AI 工具探索與【幻境配樂】影音創作者打造的現代化智能門戶。
- **整體風格**：
  - **專業科技感 (Tech & Professional)**：以俐落的深藍 (Vivid Blue) 為主調，呈現信任與高品質質感。
  - **沉浸影音感 (Cinematic Immersion)**：融合【幻境配樂】電影級配樂意象，兼具現代感與舒適的視覺層次。
  - **極簡高效 (Minimal & Clean)**：大面積留白 (White Space)、流暢的卡片陰影與無壓力的條理閱讀。

---

## 2. Color Palette (色彩計畫與 CSS 變數)

本專案統一採用原原生 CSS 自訂變數，**嚴禁隨意使用寫死 (Hardcoded) 之雜亂色碼**：

```css
:root {
  /* 主色系 (Primary Brand Colors) */
  --primary: #2f6fed;          /* 主品牌藍 (Vivid Electric Blue) */
  --primary-dark: #1d4ed8;     /* 深藍 (Hover / Active 狀態) */
  --primary-light: #60a5fa;    /* 淺藍 (點綴 / 連結 Hover) */
  
  /* 中性色系 (Neutral Ink & Slate) */
  --ink: #172033;              /* 主標題與深色文字 (Deep Ink) */
  --muted: #64748b;            /* 次要文字與內文描述 (Slate Muted) */
  --line: #dbe3ef;             /* 輕微邊框與分隔線 (Light Border) */
  
  /* 背景色系 (Backgrounds) */
  --bg-body: #f8fbff;          /* 全站背景 (Soft Cool Blue White) */
  --bg-card: #ffffff;          /* 卡片背景 (Pure White) */
  --nav: rgba(12, 18, 33, 0.95);/* 頂部 fixed 導覽列 (Translucent Dark Nav) */
  --footer: #101827;           /* 頁尾背景 (Dark Navy) */

  /* 狀態與屬性標籤色 (Badges) */
  --tag-free: #10b981;         /* 免費標籤 (Emerald Green) */
  --tag-paid: #f59e0b;         /* 付費標籤 (Amber Gold) */
  --tag-zh: #3b82f6;           /* 中文標籤 (Sky Blue) */
  --tag-en: #6366f1;           /* 英文標籤 (Indigo) */
}
```

---

## 3. Typography (字型與排版系統)

- **首選字體**：`"Noto Sans TC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;`
- **標題階層規範**：
  - **H1 (Hero 主標題)**：`clamp(2.1rem, 5vw, 3.3rem)` | `font-weight: 900` | 行高 `1.12`
  - **H2 (Section 區塊標題)**：`clamp(1.75rem, 3vw, 2.25rem)` | `font-weight: 900` | 下邊距 `1rem`
  - **H3/H4 (卡片與子標題)**：`font-size: 1.15rem` ~ `1.25rem` | `font-weight: 700` | 顏色 `var(--ink)`
  - **Body (內文描述)**：`font-size: 0.875rem` ~ `0.95rem` | `line-height: 1.6` | 顏色 `var(--muted)`

---

## 4. Spacing & Layout (間距與網格版面)

- **網格系統**：基於 **Bootstrap 5 Grid (`container`, `row`, `col-lg-3`, `col-lg-9`)**。
- **導覽列固定間距**：全站 `<section>` 需配置 `scroll-margin-top: 76px`，防止 `fixed-top` 導覽列遮擋錨點。
- **邊距與留白**：
  - 區塊垂直間距 (`padding-y`)：預設使用 `py-5` (約 `3rem` / `48px`)。
  - 卡片內距 (`padding`)：`1.25rem` ~ `1.5rem` (`p-4` 或 `p-3`)。
  - 欄位間距 (`gap`)：`g-3` 或 `g-4` (`1rem` ~ `1.5rem`)。

---

## 5. Component Styles (核心元件樣式規範)

### 5.1 AI 工具卡片 (`.ai-card-explainthis`)
- **邊框與圓角**：`border: 1px solid #e2e8f0;` | `border-radius: 16px;`
- **背景與陰影**：純白背景 (`#ffffff`) | 預設微陰影 `box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);`
- **圖示規範**：`32px × 32px` (`object-fit: contain; border-radius: 6px;`)

### 5.2 側邊欄選單 (`.left-sidebar`)
- **定位**：`position: sticky; top: 96px;` (吸頂效果，提供最佳瀏覽體驗)
- **造型**：白色背景、`border-radius: 8px`、內距 `padding: 1rem`
- **項目互動**：`.cat-item:hover { background: rgba(47,111,237,0.06); }`

### 5.3 按鈕系統 (Buttons)
- **按鈕造型**：統一採用全圓角膠囊型 (`border-radius: 999px`) | `font-weight: 700`
- **主要按鈕 (`.btn-primary`)**：`background: var(--primary); border-color: var(--primary);`
  - **Hover 狀態**：`background: var(--primary-dark);`

---

## 6. Interaction & Motion (微互動與動畫)

- **平滑捲動**：`html { scroll-behavior: smooth; }`
- **卡片懸浮浮起效果 (Card Hover Effect)**：
  ```css
  .ai-card-explainthis {
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .ai-card-explainthis:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12) !important;
    border-color: #cbd5e1 !important;
  }
  ```
- **回到頂部按鈕 (`.back-to-top-btn`)**：
  - **外觀**：`50px × 50px` 圓形藍底 (`#2f6fed`) 白色向量箭頭 Icon，位在右下角 `bottom: 28px; right: 28px;`
  - **滾動觸發**：當頁面向下滾動超過 `300px` 時自動淡入顯現，Hover 時具備 `scale(1.1)` 放大與高亮反應。

---

## 7. Responsive Behavior (響應式斷點行為)

- **桌機端 (Desktop ≥ 992px)**：
  - 左側固定呈現 17+ 分類側邊欄 (`col-lg-3`)，右側呈現三欄式工具卡片網格 (`col-lg-4`)。
- **平板端 (Tablet 768px ~ 991px)**：
  - 卡片自動切換為雙欄展示 (`col-md-6`)。
- **手機端 (Mobile < 768px)**：
  - 側邊欄隱藏，工具列表轉為單欄堆疊。
  - Hero Carousel 輪播高度縮至 `min-height: 240px` ~ `360px`，字體自動降階以利閱讀。

---

## 8. Do's and Don'ts (設計原則守則與禁忌)

### ✅ Do's (必須做到)
1. **必須使用變數**：新增 CSS 時一律優先使用 `:root` 中定義的 `--primary`、`--ink` 等 CSS 變數。
2. **必須保持響應式**：所有新頁面與卡片必須在手機端 (Mobile 375px) 上驗證排版無溢出。
3. **必須保留圖片 fallback**：圖示標籤必須包含 `onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"` 確保無圖時退回文字圖示。
4. **必須保持內外距統一**：元件間距遵循 `8px` 倍數法則（`8px`, `16px`, `24px`, `32px`）。

### ❌ Don'ts (嚴禁行為)
1. **嚴禁內聯寫死雜色**：禁止在 HTML 中使用內聯 `style="background: #123456;"` 等非系統色碼。
2. **嚴禁破壞卡片圓角與邊框**：卡片圓角統一為 `16px` 或 `8px`，不可隨意混用非標準圓角。
3. **嚴禁使用過重字體**：內文描述統一使用 `font-weight: 400` 或 `500`，僅標題使用 `700` 或 `900`。
4. **嚴禁直接刪除 GA4 代碼**：修改 HTML `<head>` 時不可移除 GA4 (`G-NVRRXE1GQV`) 或 Google Ads 代碼。

---

## 9. Agent Prompt Guide (AI 協作開發指引)

當 AI Agent（小黑、小火、小怕或外部 LLM）需要為本專案編寫或修改網頁程式碼時，**請在 Prompt 中引用以下指引**：

```text
你現在是 AI智能工具站 & 幻境配樂 專案的前端開發專家。
請完全遵循 DESIGN.md 設計系統規範：
1. 顏色使用 `:root` 變數（--primary: #2f6fed, --ink: #172033, --muted: #64748b）。
2. 卡片使用 `.ai-card-explainthis` 類別，圓角 16px，包含 hover 浮起動畫。
3. 確保 Bootstrap 5 響應式網格完整，手機端單欄、平板雙欄、桌機三欄。
4. 保持代碼簡潔、標註繁體中文註解，不使用任何過時或非標準 CSS。
```


