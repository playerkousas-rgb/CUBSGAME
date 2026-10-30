#!/usr/bin/env node
/**
 * 由 js/data.js 自動產生 docs/玩法總表.md（35 項 × 3 個玩法）。
 * 改完資料後跑：node tools/gen-docs.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') + ';globalThis.__x={STAGES,GAMES,gameOf,TYPE_LABEL};', ctx);
const { STAGES, gameOf, TYPE_LABEL } = ctx.__x;

let md = '# 玩法總表（自動產生，勿手改）\n\n';
md += '> 由 `tools/gen-docs.js` 從 `js/data.js` 產生。要改內容請改 `js/data.js`。\n\n';
md += '**★ = 現正可玩的關卡；① ② = 備選玩法（未實作，揀啱就開 issue）**\n\n';

STAGES.forEach(st => {
  md += '## ' + st.emoji + ' ' + st.name + '\n\n';
  md += '| # | 項目 | ★ 現正可玩 | 引擎 | 備選 ① | 備選 ② |\n|---|---|---|---|---|---|\n';
  st.items.forEach((name, i) => {
    const g = gameOf(st.id, i, name);
    const a0 = g.alts && g.alts[0] ? g.alts[0][0] : '—';
    const a1 = g.alts && g.alts[1] ? g.alts[1][0] : '—';
    md += '| ' + st.id + '-' + i + ' | ' + name + ' | **' + g.title + '** | ' + (TYPE_LABEL[g.type] || g.type) +
          ' | ' + a0 + ' | ' + a1 + ' |\n';
  });
  md += '\n';
});

md += '## 玩法引擎一覽\n\n| 引擎 | 說明 |\n|---|---|\n';
md += '| quiz | 選擇題，答錯會解釋原因 |\n';
md += '| match | 左右配對連線 |\n';
md += '| order | 順序重組（點選放入下一個空格） |\n';
md += '| memory | 記憶翻牌 |\n';
md += '| sort | 分類（把項目放進正確的桶） |\n';
md += '| find | 限時在畫面中找出所有目標 |\n';
md += '| simon | 動作記憶（看示範 → 順序重複） |\n';
md += '| action | 實作任務（真實世界完成，領袖／家長核對） |\n';

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/玩法總表.md'), md);
console.log('✓ docs/玩法總表.md 已產生');
