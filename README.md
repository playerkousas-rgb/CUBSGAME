# ⚜️ 幼童軍歷險 · Cub Scout Quest

把香港童軍總會**幼童軍支部**的進度獎章，變成 **35 關可以玩的小遊戲**。
純前端、零依賴、一個網址誰都能開（不上架 App Store）。
**PWA：可以加到主畫面、離線照玩；Vercel 一鍵部署。**

- 5 個進度獎章：會員章 → 幼童軍獎章 → 幼童軍歷奇章 → 幼童軍高級歷奇章 → 金紫荊獎章
- 35 個項目，每項 = 一關小遊戲（全部已解鎖，方便試玩）
- 8 種玩法引擎：選擇題 / 配對 / 排序 / 記憶翻牌 / 分類 / 限時搵嘢 / 動作記憶 / 實作任務
- 每關再配 2 個備選玩法 → 共 105 個玩法提案（見 `docs/玩法總表.md`）
- **40 款活動徽章**（一級制 33 款＋三級制 7 款＝54 個徽章），依現行《幼童軍手冊》網上版
- XP、等級、連續紀錄（streak）、每日任務、激勵卡、活動徽章收藏
- 進度存 localStorage，可匯出成「進度碼」貼給團長（無需後台）
- **PWA**：manifest + service worker，加到主畫面後離線可玩，亦解決 iframe 封鎖 localStorage 的問題
- **CI**：每次 push／PR 自動驗證 35 關資料、並確認 `dist/` 與 `docs/` 冇同程式碼脫節

---

## 快速開始

**想即刻玩：**

```bash
open index.html          # macOS
start index.html         # Windows
```

直接用瀏覽器開 `index.html` 就行，不需要伺服器、不需要 npm install。
（注意：`file://` 下瀏覽器唔俾註冊 service worker，所以離線功能要經 http/https 先有。）

**想要本機開發伺服器（改完自動重載、PWA 離線可用）：**

```bash
npm run dev              # → http://localhost:3000
```

**想要「一個檔案可以傳給人」的版本：**

```bash
npm run build            # 產生 dist/index.html（單檔約 71 KB，離線可用）
```

**改完內容後檢查有沒有打錯：**

```bash
npm run check            # 驗證 35 關資料完整性、答案有沒有越界
```

**一次過跑晒發佈前檢查（check + 文件 + 單檔）：**

```bash
npm run verify           # = npm run check && npm run gen-docs && npm run build
```

**更新玩法總表文件：**

```bash
npm run gen-docs         # 由 js/data.js 重新產生 docs/玩法總表.md
```

---

## 部署上線

### Vercel（建議）

repo 已經附 `vercel.json`，**唔使改任何設定**：

1. 確認代碼已 push 去 GitHub（`main` branch）。
2. 去 [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → 揀呢個 repo。
3. Framework Preset 選 **Other**；import 畫面嘅 Build Command / Output Directory
   **維持原樣就得** —— `vercel.json` 已明確 pin 咗 `buildCommand: "node build.js"` 同
   `outputDirectory: "public"`，會覆蓋 UI 嘅預設值。
4. 按 **Deploy**。Build 會跑 `node build.js`（產生 `dist/` 單檔＋組裝 `public/`），
   然後 Vercel serve `public/`。幾秒後就有 `https://<你的project>.vercel.app`。
5. 之後每次 push 去 `main`，Vercel 會**自動重新部署**（Git integration）。

部署後：
- 網站根目錄 = `public/` 內容（`index.html` + `css/` + `js/` + `icons/` + PWA 資產嘅完整副本）。
- 單檔成品亦都上到線：`https://<project>.vercel.app/dist/`（俾團長直接下載一個檔案）。
- `vercel.json` 已設好：`sw.js` 永不快取（保證更新推得出去）、security headers、clean URLs。

**Troubleshooting：** 如果見到 `[STATIC_BUILD_NO_OUT_DIR] No Output Directory named "public" found`，
代表 build 緊嘅 commit **未有新 `vercel.json`／`build.js`**（例如 Vercel 嘅 production branch
仲係舊 `main`）。Merge 最新代碼去 `main`（或喺 Project Settings 改 production branch），再 Redeploy。

> 如果想用 GitHub Pages 多過 Vercel：開 repo Settings → Pages → Source 選 `main` / root 即可，
> 呢個站係純靜態，Pages 一樣跑得。但 Pages 冇 `vercel.json` 嘅 header 控制，SW 更新會較慢。

### PWA：加到主畫面

部署上線（https）之後，用手機瀏覽器開網址：

- **iOS Safari**：分享按鈕 →「加入主畫面」。
- **Android Chrome**：選單 →「加到主畫面」／「安裝應用程式」。

裝好之後係 **standalone** 視窗（唔係 iframe），所以 `localStorage` 正常運作，
而且 service worker 會快取成個 app shell —— **冇網絡都照玩**。

> 改完 `css/`／`js/`／內容之後，記得把 `sw.js` 入面 `CACHE` 嘅版本號 bump 一級
> （例如 `cubgame-v0.4.0` → `cubgame-v0.4.1`），舊 cache 先會喺 activate 時清走。

---

## 目錄結構

```
cub-scout-quest/
├── index.html          # 開發版：外連 css/js（改完直接重新載入即可）
├── css/
│   └── styles.css      # 全部樣式（無框架、無 CDN）
├── js/
│   ├── data.js         # ★ 所有內容都在這裡：35 關題目、40 款徽章、卡片、等級表
│   └── logic.js        # 狀態管理 + 畫面渲染 + 8 種遊戲引擎
├── icons/              # PWA icon（由 icons/icon-source.png 用 ImageMagick 切出）
│   ├── icon-source.png #   ★ 主檔案（AI 生成、人手揀選嘅小狼標誌）
│   ├── icon-192.png    #   manifest（any）
│   ├── icon-512.png    #   manifest（any）+ og:image
│   ├── maskable-512.png#   manifest（maskable，主體收喺 80% 安全區）
│   ├── apple-touch-icon.png
│   └── favicon-32.png
├── manifest.webmanifest# PWA manifest（名稱、顏色、icon、standalone）
├── sw.js               # service worker：導航 network-first、資源 stale-while-revalidate
├── vercel.json         # Vercel 部署設定（no-build + headers + clean URLs）
├── tools/
│   ├── check.js        # 資料驗證（npm run check）
│   └── gen-docs.js     # 由 data.js 產生 docs/玩法總表.md（npm run gen-docs）
├── docs/
│   ├── 玩法總表.md      # 自動產生：35 項 × 3 玩法的對照表
│   └── 設計原則.md      # 為什麼有些項目刻意不做成遊戲
├── .github/
│   └── workflows/
│       └── ci.yml      # CI：check + 確認 dist/docs 已同步 + 單檔大細 sanity
├── build.js            # 打包成單一 HTML + 組裝 public/（會剥除 PWA 區塊）
├── dist/
│   └── index.html      # ★ 單檔成品（要派給小朋友／團長就用這個）
├── public/             # Vercel 部署目錄（純 build 產物，已 gitignore）
├── .gitignore
└── package.json
```

**兩個檔案最重要：**

| 想做的事 | 改哪裡 |
|---|---|
| 改題目、加關卡、改徽章、改文案 | `js/data.js` |
| 改玩法規則、加新遊戲類型 | `js/logic.js` |
| 改顏色、版面 | `css/styles.css` |
| 改離線快取策略 / 快取版本 | `sw.js` |
| 改部署 header / 快取規則 | `vercel.json` |

---

## 如何加一關（最常見的操作）

打開 `js/data.js`，在 `GAMES` 裡加一個 key，格式是 `階段id-項目索引`：

```js
'cub-7': {
  type: 'quiz',                       // 用哪種引擎
  title: '繩結達人',                    // 關卡名
  icon: '🪢',
  intro: '一句話說明這個挑戰在做甚麼。',
  qs: [
    { q: '雙套結主要用來做甚麼？',
      opts: ['接駁兩條幼繩', '把繩固定在柱上', '做裝飾', '縮短繩長'],
      a: 1,                            // 正確答案索引（由 0 開始）
      why: '雙套結（Clove Hitch）最常用來把繩固定在柱或樹幹上。' }
  ],
  alts: [ ['另一玩法名','引擎','一句說明'], ['再一個','引擎','一句說明'] ]
}
```

> 加完之後跑 `npm run verify`（= check + gen-docs + build），然後 commit。CI 會幫你確認冇漏。

**注意：** `STAGES` 裡的項目索引是固定的。如果你在中間插入新項目，`GAMES` 的 key 會全部錯位。
安全做法：新項目加在該階段最後，或一次過重新編號並跑 `npm run check` 確認。

---

## 如何加一款活動徽章

打開 `js/data.js` 的 `BADGES`，加一行：

```js
{ id:'mybadge', name:'我的章', group:'興趣', emoji:'🎯', tiers:1 },
```

- `group` 只可以用 `戶外`／`技能`／`服務`／`興趣`（`logic.js` 硬編碼咗呢四組）。
- `tiers` 只可以用 `1`（一級制）或 `3`（三級制，紅初／黃中／綠高）—— `BADGE_XP` 只有呢兩個 key。
- **`id` 一經發佈不要改**：`localStorage` 嘅 `S.badges` 用 id 做 key，改咗會令玩家進度對唔返。

---

## 如何加一種新玩法引擎

1. 在 `js/logic.js` 的 `openQuest()` 裡加初始化（`if(g.type==='你的類型'){ ... }`）
2. 寫一個 `viewXxx()` 回傳 `[bodyHtml, footHtml]`
3. 在 `renderQuest()` 的分派裡加一行
4. 在 `$('qBody')` 的 click handler 裡處理點擊
5. 通關叫 `finishQuest()`、錯誤加 `Q.mistakes++` 並 `beep('no')`
6. 在 `js/data.js` 的 `TYPE_LABEL` / `TYPE_ICON` 補上名稱

---

## 技術決策（為什麼這樣做）

| 決定 | 原因 |
|---|---|
| **不用 React / 不用框架** | 這個專案的核心是「內容 + 遊戲規則」，不是複雜 UI。零依賴 → 一個 HTML 誰都能開、十年後還能開、GitHub Pages／Vercel 直接放。 |
| **不用後端** | 第一版要驗證的是「小朋友會唔會玩」，不是「資料庫要唔要 scale」。進度存 localStorage + 匯出碼，足夠一個團用。 |
| **PWA 而唔係原生 App** | 團長／家長唔想裝 App、學校平板唔想管上架。PWA 加到主畫面就有近似原生嘅體驗，兼且離線可用、自動更新。 |
| **部署目錄係 build 組裝嘅 `public/`，唔係 repo root** | Vercel 嘅 static builder 會自動跑 `package.json` 嘅 build script、並預設搵 output directory；與其賭預設行為，不如 build 明確組裝 `public/`＋`vercel.json` pin 死 `outputDirectory`，任何環境都咁樣行。順手把單檔版放喺 `/dist/`。 |
| **Service worker：導航 network-first、資源 SWR** | 團長改完題目，小朋友下次開 app 要即刻拿到新版（導航行網絡）；但載入要快、斷線要玩得（資源行快取＋背景更新）。 |
| **徽章依現行手冊（40 款）而唔係舊制（42 款）** | 舊制嘅「42 款／56 個」已過時：自然章 2020-04-01 取消、世界童軍環境章／維護自然世界章移出活動徽章、新增道路安全章。教一個已取消嘅徽章，團長審稿時會即時出事。 |
| **不是每個項目都做成遊戲** | 露營、服務、家庭章這些必須真實世界完成。硬做成點擊遊戲會失真，領袖也不會認。詳見 `docs/設計原則.md`。 |
| **資料與程式分離** | 所有中文內容集中在 `js/data.js`，方便你不懂程式也能改。 |

---

## 資料來源與免責聲明

- 獎章制度、項目名稱、活動徽章名單依**香港童軍總會 幼童軍支部《幼童軍訓練綱要》**及 [prog.scouting.org.hk](https://prog.scouting.org.hk/cub/) 公開資料整理；活動徽章以《幼童軍手冊》網上版（2025 年 8 月）為準：一級制 33 款＋三級制 7 款。
- **遊戲內容（題目、答案、情境）為本專案自行設計的示範教材，並非官方考核材料。** 實際考核細則一律以官方綱要及領袖指示為準。
- 本專案與香港童軍總會無隸屬關係。若要正式在團內使用，建議先交團長／區總監審閱內容。

---

## 已知限制

- `localStorage` 是**按瀏覽器、按裝置**儲存：換手機、清快取、用無痕模式都會失去進度。
- 沒有帳號系統，同一部機只有一份進度。
- 進度碼（base64）沒有加密，只是方便傳遞，不是防篡改機制。
- 在 iframe 預覽環境（例如部分 AI 對話預覽）會封鎖 localStorage，看起來像「不會儲存」。
  **解決方法：用 PWA 裝到主畫面（standalone 唔係 iframe），或者直接用瀏覽器開網址／檔案。**
- `file://` 直接開 `index.html` 時 service worker 唔會註冊（瀏覽器限制），離線快取要經 http/https。

---

## Roadmap

- [x] **M0** 進度地圖＋打勾（v1）
- [x] **M1** 每項目變成小遊戲，5 種引擎（v2）
- [x] **M2** 35 關全解鎖，8 種引擎，玩法總表（v3）
- [x] **M3** 活動徽章對齊現行《幼童軍手冊》：40 款／54 個（v0.4）
      — 尚餘：交團長審閱題目內容
- [x] **M5a** PWA：manifest + service worker + 全套 icon + 離線可玩（v0.4）
- [x] **M5b** Vercel 部署 config：`vercel.json` + CI（v0.4）
      — 尚餘：你喺 vercel.com/new import repo（見「部署上線」）
- [ ] **M4** 小隊對戰：兩隊同一條進度條比拼（純前端 + 分享連結）
- [ ] **M6** 領袖後台：一頁睇全團進度、簽核實作任務（Supabase）
- [ ] **M7** 金紫荊 BOSS 關：提交記錄 → 領袖評分 → 解鎖動畫

---

## Git 工作流建議

```
main            ← 永遠可玩、可派給人的版本
 └ dev          ← 日常開發
    ├ feat/badge-data      補齊活動徽章
    ├ feat/mini-game-xxx   加新遊戲引擎
    └ fix/xxx              修 bug
```

開 `dev` branch（一次性）：

```bash
git push origin main:dev
```

Issue 標籤：`content`（改題目）、`engine`（改玩法）、`design`（視覺）、`bug`、`idea`（新玩法提案）。

**CI（`.github/workflows/ci.yml`）** 每次 push／PR 去 `main` 會自動跑：

1. `npm run check` — 驗證 35 關資料。
2. 重新產生 `docs/` 與 `dist/`，然後 `git diff --exit-code` 確認你**已經 commit 咗**佢哋；
   冇 commit 會報錯，提醒你跑 `npm run verify`。
3. 單檔成品大細 sanity check（40 KB – 400 KB）。

發佈流程：改完 → `npm run verify` → commit（連 `dist/`、`docs/`）→ push → Vercel 自動部署。

---

## License

MIT（程式碼）。內容部分請依上述資料來源聲明使用。
