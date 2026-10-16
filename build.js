const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');

const gameParts = [
  'src/js/g01_core.js',
  'src/js/g02_audio.js',
  'src/js/g03_dungeon.js',
  'src/js/g04_player.js',
  'src/js/g05_enemies.js',
  'src/js/g06_fx.js',
  'src/js/g07_items.js',
  'src/js/g08_hud.js',
  'src/js/g09_loop.js',
];

const gameCode = gameParts.map(read).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>Sanctum of Bones</title>
<style>
${read('src/style.css')}
</style>
</head>
<body>
${read('src/body.html')}
<script type="text/plain" id="three-core-b64">${b64('vendor/three.core.min.js')}</script>
<script type="text/plain" id="three-mod-b64">${b64('vendor/three.module.min.js')}</script>
<script>
${read('src/js/boot.js')}
</script>
<script type="module">
${gameCode}
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html written:', html.length, 'bytes');
