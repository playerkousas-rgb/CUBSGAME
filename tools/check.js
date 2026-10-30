#!/usr/bin/env node
/**
 * 內容驗證：改完 js/data.js 之後跑一次，確保每一關資料完整、答案沒有越界。
 * 用法：node tools/check.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') + ';globalThis.__x={STAGES,GAMES,gameOf};', ctx);
const { STAGES, GAMES, gameOf } = ctx.__x;

let total = 0;
const errors = [];
const types = {};

STAGES.forEach(st => st.items.forEach((name, i) => {
  total++;
  const key = st.id + '-' + i;
  if (!GAMES[key]) errors.push(key + ' 缺少關卡資料（' + name + '）');
  const g = gameOf(st.id, i, name);
  types[g.type] = (types[g.type] || 0) + 1;

  if (!g.type || !g.title || !g.icon) errors.push(key + ' 缺少 type/title/icon');
  if (!g.alts || g.alts.length < 2) errors.push(key + ' 備選玩法少於 2 個');

  if (g.type === 'quiz') {
    if (!g.qs || !g.qs.length) errors.push(key + ' quiz 沒有題目');
    (g.qs || []).forEach((q, qi) => {
      if (!q.why) errors.push(key + ' 第' + (qi + 1) + '題沒有解釋 why');
      if (q.flags) { if (q.a >= q.flags.length) errors.push(key + ' 第' + (qi + 1) + '題答案越界'); }
      else if (!q.opts || q.a >= q.opts.length) errors.push(key + ' 第' + (qi + 1) + '題選項有問題');
    });
  }
  if (g.type === 'match' && (!g.pairs || g.pairs.length < 4)) errors.push(key + ' 配對少於 4 對');
  if (g.type === 'order') {
    if (g.items.length !== g.correct.length) errors.push(key + ' 排序長度不一致');
    if (new Set(g.correct).size !== g.correct.length) errors.push(key + ' 排序有重複答案');
    g.correct.forEach(c => { if (!g.items.includes(c)) errors.push(key + ' 答案不在選項內：' + c); });
  }
  if (g.type === 'sort') {
    g.items.forEach(it => {
      if (it.b !== 0 && it.b !== 1) errors.push(key + ' 分類 bucket 只能是 0/1');
      if (!it.why) errors.push(key + ' 分類項目缺少 why：' + it.t);
    });
  }
  if (g.type === 'find') {
    if (g.count >= g.cells) errors.push(key + ' find 的 count 必須小於 cells');
    if (!g.decoys || !g.decoys.length) errors.push(key + ' find 沒有干擾物');
    if (!(g.time > 0)) errors.push(key + ' find 時間設定錯誤');
  }
  if (g.type === 'simon' && !g.symbols.length) errors.push(key + ' simon 沒有符號');
}));

console.log('項目總數：' + total + '｜已定義關卡：' + Object.keys(GAMES).length);
console.log('玩法分佈：' + JSON.stringify(types, null, 0));
if (errors.length) {
  console.error('\n✗ 發現 ' + errors.length + ' 個問題：');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log('\n✓ 全部檢查通過');
