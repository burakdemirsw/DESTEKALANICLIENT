// Sürüm notları: src/assets/release-notes/sonraki-surum.txt'deki maddeler her build'de v<sürüm>.txt dosyasına
// taşınır (örn. v2.0.0.5.txt). Bekleyen dosyada yalnız '#' ile başlayan açıklama satırları kalır.
// Sürüm Notları sayfası (/release-notes) notları HTTP ile okumaz: notu olan sürümler yeniden eskiye
// src/app/core/data/release-notes.data.ts'e yazılır ve JS paketine girer (yayında yalnız JS dosyaları
// atılsa da notlar görünür; assets klasörünün yayınlanması gerekmez).
const fs = require('fs');
const path = require('path');

const NOTES_DIR = path.join('src', 'assets', 'release-notes');
const DATA_FILE = path.join('src', 'app', 'core', 'data', 'release-notes.data.ts');
const PENDING_FILE = 'sonraki-surum.txt';
const EMPTY_NOTE = '- Bu sürüm için değişiklik notu yazılmadı.';

// Klasör her build'de baştan taranır: sonradan elle doldurulan eski bir not da listeye girer, boş notlar girmez
function readNotedVersions(dir) {
  return fs.readdirSync(dir)
    .map((name) => /^v(\d+(?:\.\d+)*)\.txt$/.exec(name))
    .filter(Boolean)
    .map((match) => ({ version: match[1], text: fs.readFileSync(path.join(dir, match[0]), 'utf8').replace(/^﻿/, '') }))
    .filter((note) => note.text.split(/\r?\n/).slice(1).join('\n').trim() !== EMPTY_NOTE)
    .sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }));
}

// Notları sayfanın okuduğu TS dosyasına yazar (elle düzenlenmez)
function writeNotesData(workspaceRoot) {
  const notes = readNotedVersions(path.join(workspaceRoot, NOTES_DIR));
  const rows = notes.map((note) => `    { version: '${note.version}', text: ${JSON.stringify(note.text.replace(/\r\n/g, '\n'))} },`);
  fs.writeFileSync(
    path.join(workspaceRoot, DATA_FILE),
    '// Bu dosya her build\'de tools/build-number/release-notes.js tarafından src/assets/release-notes/v<sürüm>.txt\r\n' +
    '// dosyalarından üretilir; elle düzenlenmez. Notu olan sürümler yeniden eskiye sıralıdır.\r\n' +
    'export const RELEASE_NOTE_FILES: { version: string; text: string }[] = [\r\n' +
    rows.map((row) => `${row}\r\n`).join('') +
    '];\r\n',
  );
}

// Build başarısız olursa revert() ile sürüm dosyası ve not verisi eski haline döner, bekleyen notlar geri yazılır
function writeReleaseNotes(workspaceRoot, version, buildDate) {
  const dir = path.join(workspaceRoot, NOTES_DIR);
  const pendingFile = path.join(dir, PENDING_FILE);
  const versionFile = path.join(dir, `v${version}.txt`);
  const dataFile = path.join(workspaceRoot, DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });

  const pending = fs.existsSync(pendingFile) ? fs.readFileSync(pendingFile, 'utf8') : '';
  const lines = pending.replace(/^﻿/, '').split(/\r?\n/);
  const comments = lines.filter((line) => line.startsWith('#'));
  const notes = lines.filter((line) => !line.startsWith('#')).join('\r\n').trim();
  const previous = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8') : null;
  const previousData = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, 'utf8') : null;

  fs.writeFileSync(versionFile, `Sürüm ${version} - ${buildDate}\r\n\r\n${notes || EMPTY_NOTE}\r\n`);
  fs.writeFileSync(pendingFile, comments.map((line) => `${line}\r\n`).join(''));
  writeNotesData(workspaceRoot);

  const restore = (file, content) => {
    if (content === null) {
      fs.rmSync(file, { force: true });
    } else {
      fs.writeFileSync(file, content);
    }
  };

  return {
    file: path.join(NOTES_DIR, `v${version}.txt`),
    isEmpty: !notes,
    revert: () => {
      fs.writeFileSync(pendingFile, pending);
      restore(versionFile, previous);
      restore(dataFile, previousData);
    },
  };
}

module.exports = { writeReleaseNotes, writeNotesData };
