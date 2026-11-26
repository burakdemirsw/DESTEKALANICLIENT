// Architect, builder şema yolunun paket dizini dışına (..) çıkmasına izin vermiyor. Bu yüzden
// @angular/build:application şemasının bir kopyası bu klasörde tutulur (application.schema.json).
// Kopya her `npm install` / `yarn` sonrasında (package.json "postinstall") buradan yenilenir; elle de çalıştırılabilir:
//   node tools/build-number/sync-schema.js
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', '..', 'node_modules', '@angular', 'build', 'src', 'builders', 'application', 'schema.json');
const TARGET = path.join(__dirname, 'application.schema.json');

if (!fs.existsSync(SOURCE)) {
  console.warn(`[build-number] Şema kaynağı bulunamadı, kopya değiştirilmedi: ${SOURCE}`);
  process.exit(0);
}

fs.copyFileSync(SOURCE, TARGET);
console.log(`[build-number] application.schema.json güncellendi (${path.relative(process.cwd(), SOURCE)})`);
