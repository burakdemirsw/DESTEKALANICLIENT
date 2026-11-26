// src/environments/version.ts içindeki APP_BUILD_NUMBER ve APP_BUILD_DATE'i okur ve günceller.
const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join('src', 'environments', 'version.ts');
const BUILD_NUMBER_PATTERN = /(const APP_BUILD_NUMBER\s*=\s*)(\d+)/;
const BUILD_DATE_PATTERN = /(const APP_BUILD_DATE\s*=\s*)['"][^'"]*['"]/;
const VERSION_BASE_PATTERN = /const APP_VERSION_BASE\s*=\s*['"]([^'"]+)['"]/;

// Yerel saatle "gg.aa.yyyy ss:dd" (örn. 22.10.2026 10:46)
function formatBuildDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function writeBuildInfo(file, buildNumber, buildDate) {
  const content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(
    file,
    content.replace(BUILD_NUMBER_PATTERN, `$1${buildNumber}`).replace(BUILD_DATE_PATTERN, `$1'${buildDate}'`),
  );
}

// Numarayı bir artırıp build tarihini yazar; build başarısız olursa revert() ile eski değerlere dönülür
function bumpBuildNumber(workspaceRoot) {
  const file = path.join(workspaceRoot, VERSION_FILE);
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(BUILD_NUMBER_PATTERN);
  if (!match) {
    throw new Error(`${VERSION_FILE} içinde APP_BUILD_NUMBER bulunamadı.`);
  }

  const previous = Number(match[2]);
  const next = previous + 1;
  const base = (content.match(VERSION_BASE_PATTERN) || [])[1] || '';
  const buildDate = formatBuildDate(new Date());
  writeBuildInfo(file, next, buildDate);

  return {
    version: base ? `${base}.${next}` : String(next),
    buildDate,
    previousVersion: base ? `${base}.${previous}` : String(previous),
    revert: () => fs.writeFileSync(file, content),
  };
}

module.exports = { bumpBuildNumber };
