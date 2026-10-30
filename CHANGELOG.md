# Changelog

## v0.4.1 — 修 Vercel STATIC_BUILD_NO_OUT_DIR
- **Root cause**：Vercel 嘅 static builder 見到 `package.json` 有 `build` script 就會自動跑，
  然後預設搵 `public/` 做 output directory；舊 `vercel.json` 只寫 `buildCommand: ""` 而冇 pin
  output directory，部署舊 `main` 時更連 `vercel.json` 都未有
- `build.js` 而家會組裝 `public/`：完整多檔站（index.html + css/js/icons + manifest + sw.js）
  ＋單檔版放喺 `public/dist/`；`icon-source.png`（1.2 MB 主檔）唔上部署
- `vercel.json` 明確 pin `buildCommand: "node build.js"` + `outputDirectory: "public"`，
  覆蓋 import UI 預設，唔再依賴 static builder 嘅預設行為
- `public/` 加入 `.gitignore`（純 build 產物）
- `sw.js` CACHE bump 去 `cubgame-v0.4.1`

## v0.4.0 — PWA + Vercel 就緒 + 徽章對齊現行手冊
- **PWA**：新增 `manifest.webmanifest`、`sw.js`（導航 network-first、資源 stale-while-revalidate）、
  全套 icon（192／512／maskable／apple-touch／favicon），可加到主畫面、離線可玩
- **Vercel**：新增 `vercel.json`（no-build 靜態部署 + security headers + `sw.js` 永不快取）
- **CI**：新增 `.github/workflows/ci.yml` —— push／PR 自動跑 `npm run check`、
  並用 `git diff --exit-code` 確保 `dist/` 與 `docs/` 冇同程式碼脫節
- **徽章資料修正**：對齊現行《幼童軍手冊》網上版（2025-08）——
  一級制 33 款＋三級制 7 款＝40 款、合共 54 個徽章。
  舊制「42 款／56 個」已過時：移除已取消嘅自然章、同非幼童軍支部嘅通訊章／先鋒工程章；
  體適能章修正為三級制；新增道路安全章等 20 款
- **script 修正**：補回 README 一直提到但 `package.json` 缺失嘅 `npm run gen-docs`；
  新增 `npm run verify`（check + gen-docs + build 一次過）
- **build.js**：單檔版會剥除 `<!--PWA-->…<!--/PWA-->` 區塊，`dist/index.html` 保持真正單檔、零 404
- `.gitignore` 登場（`node_modules/`、`.vercel/`、`.env` 等；`dist/` 刻意保留 commit）
- `index.html` 補 PWA meta、OG tag、manifest／icon link、service worker 註冊（僅 secure context）

## v0.3.0 — 35 關全解鎖 + 玩法總表
- 移除所有階段鎖定，35 個項目即開即玩
- 每一項都配上可玩關卡（不再有「未設計」的項目）
- 新增 3 種玩法引擎：分類（sort）、限時搵嘢（find）、動作記憶（simon）
- 每一關加 2 個備選玩法，共 105 個玩法提案
- 新增「🎲 玩法」分頁與 `docs/玩法總表.md`
- 專案拆成 repo 結構：`index.html` + `css/` + `js/` + `tools/` + 單檔打包 `dist/`

## v0.2.0 — 每項目變成一關
- 由「打勾」改為「過關才拿到 tick」
- 5 種引擎：quiz / match / order / memory / action
- 通關 XP、三星評分、音效、升級提示

## v0.1.0 — 進度地圖原型
- 5 個進度獎章、活動徽章收藏、每日任務、連續紀錄、激勵卡
- localStorage 儲存 + 進度碼匯出／匯入
