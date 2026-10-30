#!/usr/bin/env node
/**
 * 把 index.html（外連 css/js）打包成 dist/index.html（單一檔案，可離線／WhatsApp 傳）。
 * 用法：node build.js
 * 零依賴，不需要 npm install。
 */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
const css = read('css/styles.css');
const data = read('js/data.js');
const logic = read('js/logic.js');

const swaps = [
  ['<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>'],
  ['<script src="js/data.js"></script>', '<script>\n' + data + '\n</script>'],
  ['<script src="js/logic.js"></script>', '<script>\n' + logic + '\n</script>']
];

for (const [from, to] of swaps) {
  if (!html.includes(from)) {
    console.error('✗ 找不到要替換的標記：' + from);
    process.exit(1);
  }
  html = html.replace(from, () => to); // 用 function 避免 $ 被解讀
}

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('✓ dist/index.html 已產生（' + (html.length / 1024).toFixed(1) + ' KB，單一檔案）');
