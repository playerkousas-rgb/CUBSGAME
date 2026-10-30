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

/* 單檔版唔需要 PWA：用 file:// 開唔到 service worker，外連 manifest／icon
   只會留低 404。所以剥除 <!--PWA--> … <!--/PWA--> 之間嘅所有區塊，
   令 dist/index.html 保持真正「一個檔案乜都搞掂」。 */
const pwaBlocks = (html.match(/<!--PWA-->[\s\S]*?<!--\/PWA-->/g) || []).length;
html = html.replace(/<!--PWA-->[\s\S]*?<!--\/PWA-->\n?/g, '');

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
console.log('  已剥除 ' + pwaBlocks + ' 個 PWA 區塊（manifest／icon／service worker 註冊）');

/* ---- 組裝 Vercel 部署目錄 public/ ----
   Vercel 嘅 static builder 會跑 package.json 嘅 build script，然後 serve
   outputDirectory 指定嘅目錄（vercel.json 已 pin 做 public）。所以呢度把
   完整多檔站（含 PWA 資產）複製入 public/，順手放單檔版喺 public/dist/。
   public/ 係純 build 產物，已列入 .gitignore。 */
const pub = path.join(root, 'public');
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(pub, 'index.html'));
fs.copyFileSync(path.join(root, 'manifest.webmanifest'), path.join(pub, 'manifest.webmanifest'));
fs.copyFileSync(path.join(root, 'sw.js'), path.join(pub, 'sw.js'));
for (const dir of ['css', 'js', 'icons']) {
  fs.cpSync(path.join(root, dir), path.join(pub, dir), {
    recursive: true,
    filter: src => !src.endsWith('icon-source.png')   // 1.2 MB 主檔唔上部署
  });
}
fs.mkdirSync(path.join(pub, 'dist'), { recursive: true });
fs.copyFileSync(path.join(root, 'dist', 'index.html'), path.join(pub, 'dist', 'index.html'));
console.log('✓ public/ 已組裝（Vercel outputDirectory；含 dist/ 單檔版）');
