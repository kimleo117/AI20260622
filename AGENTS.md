# AI智能工具站規格檔

## 專案名稱

AI智能工具站

## 專案目標

建立一個以 Bootstrap 5 為基礎的一頁式網站，用於介紹 AI 工具平台、免費與付費工具差異、工具列表與聯絡資訊。

## 技術規格

- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- Lucide Icons

## 本地端資源

- Bootstrap CSS：`css/bootstrap.min.css`
- Bootstrap JS：`js/bootstrap.bundle.min.js`
- 圖片資料夾：`PIC/`

## 圖片使用

- 輪播圖 1：`PIC/A-1.jpeg`
- 輪播圖 2：`PIC/A-2.JPG`
- 輪播圖 3：`PIC/A-3.jpg`
- 關於我們圖片：`PIC/A-4.jpg`
- 免費與付費文字參考圖：`PIC/A-6.jpg`

## 頁面結構

1. 導覽列
   - 關於我們
   - 免費與付費
   - AI工具
   - 聯絡我們

2. 輪播主視覺
   - 使用 Bootstrap Carousel
   - 共 3 張輪播圖片
   - 圖片上方加深色遮罩提升文字可讀性

3. 關於我們
   - 左側顯示 `A-4.jpg`
   - 右側顯示品牌介紹與數據

4. 免費與付費 AI 工具
   - 使用 2 張 Bootstrap Card
   - 左卡：免費 AI 工具
   - 右卡：付費 AI 工具
   - 文字內容依據 `A-6.jpg` 改寫

5. AI 工具列表
   - 使用 6 張 Bootstrap Card
   - 每張 Card 包含圖示、標題、說明
   - 每張 Card 底部顯示「免費」與「付費」標籤，左右排列

6. 聯絡我們
   - 姓名欄位
   - 電子信箱欄位
   - 訊息內容欄位
   - 送出後顯示成功提示

7. 頁尾
   - 品牌簡介
   - 聯絡資訊
   - 快速連結
   - 社群連結

## 互動功能

- Bootstrap 輪播功能
- 手機版導覽列收合功能
- 聯絡表單送出提示
- Card hover 浮起效果
- 平滑捲動錨點導覽

## 響應式設計

- 桌機版：主要內容使用 Bootstrap container 與 grid 排版
- 平板版：Card 以兩欄呈現
- 手機版：Card 改為單欄堆疊，輪播高度縮小

## 開啟方式

直接使用瀏覽器開啟根目錄下的 `index.html`。
