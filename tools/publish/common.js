// client.js (client yayını) ve api.js (API yayını) komutlarının ortak parçaları.
// Ayarlar publish.config.json'dadır (yollar client reposunun köküne göre); API adresi
// src/environments/environment.prod.ts'teki apiBaseUrl'dir.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline/promises');

const ROOT = path.resolve(__dirname, '..', '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'publish.config.json'), 'utf8'));

const fromRoot = (relativePath) => path.resolve(ROOT, relativePath);

function parseArgs(args) {
  const options = { yes: false, dryRun: false, from: null };
  for (const arg of args) {
    const from = arg.match(/^--from=(.+)$/i);
    if (from) options.from = from[1];
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else throw new Error(`Bilinmeyen seçenek: ${arg}  (seçenekler: --yes, --dry-run, --from=<klasör>)`);
  }
  return options;
}

// Client'ın kullandığı API adresi tek kaynaktan okunur
function getApiBaseUrl() {
  const file = path.join(ROOT, 'src', 'environments', 'environment.prod.ts');
  const url = fs.readFileSync(file, 'utf8').match(/apiBaseUrl:\s*['"]([^'"]+)['"]/)?.[1];
  if (!url) throw new Error(`API adresi okunamadı: ${file}`);
  return url.replace(/\/+$/, '');
}

// Anahtar sunucudaki appsettings.json'da Deploy:Key olarak durur; bu bilgisayarda deploy-key.json'dadır: { "key": "..." }
let deployKey = null;
function readDeployKey() {
  if (deployKey) return deployKey;
  const file = CONFIG.deployKeyFile.replace(/^~(?=$|[\\/])/, os.homedir());
  if (!fs.existsSync(file)) throw new Error(`Yayın anahtarı dosyası yok: ${file}`);
  deployKey = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')).key;
  if (!deployKey) throw new Error(`Yayın anahtarı dosyasında "key" boş: ${file}`);
  return deployKey;
}

// DeployController'a istek atar, ApiResponse'un data alanını döner. Hata gövdesi: ApiResponse { message }
async function callDeploy(action, init, failureLabel = 'İstek başarısız') {
  const url = `${getApiBaseUrl()}/Deploy/${action}`;
  let response;
  try {
    response = await fetch(url, { ...init, headers: { ...init.headers, 'X-Deploy-Key': readDeployKey() } });
  } catch (error) {
    throw new Error(`API'ye ulaşılamadı (${url}): ${error.cause?.code ?? error.message}`);
  }

  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // IIS hata sayfası JSON değildir
  }
  const iisError = text.match(/HTTP Error (\d{3}\.\d+)[^<]*/)?.[0]?.trim();
  if (response.status === 404 && iisError?.includes('404.13')) {
    throw new Error(`Paket sunucunun istek sınırını aşıyor (${iisError}). API web.config'inde maxAllowedContentLength yükseltilmeli.`);
  }
  if (response.status === 404) {
    throw new Error(`Uç nokta bulunamadı (${url}). Sunucudaki API'de yayın uçları yok: ilk kurulum yapıldı mı?`);
  }
  if (response.status >= 500 && iisError) {
    throw new Error(`API açılmıyor: ${iisError}. Sunucuda olay günlüğüne (Event Viewer > Application) bakın.`);
  }
  if (!response.ok) {
    const message = body?.message ?? body?.Message ?? body?.title ?? text.slice(0, 300);
    throw new Error(`${failureLabel} (HTTP ${response.status}): ${message}`);
  }
  return body?.data ?? body;
}

// Klasördeki dosyaları '/' ile göreli yol olarak listeler; isExcluded(yol, klasörMü) true dönen yol atlanır
function collectFiles(baseDir, isExcluded, dir = baseDir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');
    if (isExcluded(relativePath, entry.isDirectory())) return [];
    return entry.isDirectory() ? collectFiles(baseDir, isExcluded, fullPath) : [relativePath];
  });
}

// Bağımlılıksız zip (deflate, UTF-8 dosya adları). Paket 4 GB / 65535 dosyanın çok altında kaldığı için ZIP64 yok.
function createZip(baseDir, files) {
  if (files.length > 0xffff) throw new Error(`Pakette çok fazla dosya var (${files.length}).`);
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const fullPath = path.join(baseDir, file);
    const data = fs.readFileSync(fullPath);
    const deflated = zlib.deflateRawSync(data, { level: 6 });
    const isStored = deflated.length >= data.length;
    const content = isStored ? data : deflated;
    const method = isStored ? 0 : 8;
    const crc = zlib.crc32(data) >>> 0;
    const { time, date } = toDosDateTime(fs.statSync(fullPath).mtime);
    const name = Buffer.from(file, 'utf8');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // gereken sürüm
    local.writeUInt16LE(0x0800, 6); // dosya adı UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // oluşturan sürüm
    central.writeUInt16LE(20, 6); // gereken sürüm
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function toDosDateTime(value) {
  const year = Math.max(value.getFullYear(), 1980);
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
  };
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return /^(e|evet|y|yes)$/i.test((await rl.question(question)).trim());
  } finally {
    rl.close();
  }
}

const toMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (value) => String(value).padStart(2, '0');
const formatDate = (date) =>
  `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

function run(main) {
  main().catch((error) => {
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  ROOT,
  CONFIG,
  fromRoot,
  parseArgs,
  getApiBaseUrl,
  callDeploy,
  collectFiles,
  createZip,
  confirm,
  toMb,
  sleep,
  formatDate,
  run,
};
