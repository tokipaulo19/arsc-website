// Mechanical responsive-image build only. Originals/full-size links stay intact.
// Use the bundled sharp package via NODE_PATH; no runtime dependency is added.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../..');
const names = ['fitfocus', 'the-giving-table', 'saltsand', 'ampt-coaching', 'ont', 'melgreen', 'personalised-posing', 'koko-stagewear', 'posing-locker'];
(async () => {
  let original = 0, preview = 0;
  for (const name of names) {
    const source = path.join(root, 'assets/work', name + '.webp');
    const target = path.join(root, 'assets/work', name + '-mobile.webp');
    await sharp(source).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toFile(target);
    original += fs.statSync(source).size; preview += fs.statSync(target).size;
  }
  console.log(JSON.stringify({ images: names.length, originalBytes: original, mobileBytes: preview }));
})();
