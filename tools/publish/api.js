#!/usr/bin/env node
// API'yi (DESTEKALANIAPI'nin publish çıktısını) terminalden destek sunucusuna yayınlar.
//   node tools/publish/api.js [--yes] [--dry-run] [--from=<publish klasörü>]
// --yes: onay sorulmaz. --dry-run: sunucudan farklı dosyalar listelenir, gönderilmez.
//
// - Build / publish alınmaz: Visual Studio'da Release "Yayımla" ile oluşan publish klasörü gönderilir
//   (publish.config.json → apiPublishDir).
// - Publish klasöründeki dosyaların özeti (boyut + SHA-256) API'ye gönderilir (Deploy/api-diff). API, sunucuda olmayan
//   ya da farklı olan dosyaları döner; pakete yalnız bunlar girer.
// - Sunucuya özel dosyalar hiç gönderilmez: kökteki appsettings*.json, web.config, app_offline.htm; logs/, Files/,
//   wwwroot/uploads/, _deploy/ klasörleri (API'deki ApiPublishService ile aynı liste).
// - API eski dosyaları _deploy/api-backup/<tarih> altına taşır, yenilerini yazar ve yanıttan sonra kendini yeniden
//   başlatır. Komut API açılana kadar bekler, dosyaların sunucuyla aynı olduğunu kontrol eder.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  CONFIG, fromRoot, parseArgs, getApiBaseUrl, callDeploy, collectFiles, createZip, confirm, toMb, sleep, formatDate,
  run,
} = require('./common');

const PROTECTED_FILES = ['web.config', 'app_offline.htm'];
const PROTECTED_FOLDERS = ['logs', 'files', 'wwwroot/uploads', '_deploy'];
const SOURCE_EXTENSIONS = ['.cs', '.csproj', '.cshtml', '.html', '.sql'];

const MAX_ZIP_SIZE = 95 * 1024 * 1024; // API'nin web.config'indeki IIS sınırı 100 MB
const RESTART_TIMEOUT_MS = 2 * 60 * 1000;
const LISTED_FILE_COUNT = 40;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const publishDir = options.from ? path.resolve(options.from) : fromRoot(CONFIG.apiPublishDir);
  const build = readBuild(publishDir, !options.from);
  const files = collectFiles(publishDir, isProtected).map((file) => hashFile(publishDir, file));

  console.log(`Hedef  : ${getApiBaseUrl()}`);
  console.log(`Publish: ${publishDir}`);
  console.log(`         ${CONFIG.apiMainDll} ${formatDate(build.date)}`);
  if (build.warning) console.warn(`! ${build.warning}`);

  const before = await getDiff(files);
  const changedPaths = new Set(before.changedFiles);
  const changed = files.filter((file) => changedPaths.has(file.path));
  const changedSize = changed.reduce((sum, file) => sum + file.size, 0);
  const serverDate = before.mainAssemblyDate ? formatDate(new Date(before.mainAssemblyDate)) : '?';
  console.log(`Sunucu : ${CONFIG.apiMainDll} ${serverDate}`);
  console.log(`Fark   : ${changed.length} / ${files.length} dosya, ${toMb(changedSize)}`);
  changed.slice(0, LISTED_FILE_COUNT).forEach((file) => console.log(`  ${file.path}  (${toMb(file.size)})`));
  if (changed.length > LISTED_FILE_COUNT) console.log(`  … ve ${changed.length - LISTED_FILE_COUNT} dosya daha`);

  if (changed.length === 0) {
    console.log('\nSunucudaki dosyalar publish klasörüyle aynı, gönderilecek dosya yok.');
    return;
  }
  if (options.dryRun) {
    console.log('\n--dry-run: paket gönderilmedi.');
    return;
  }

  const zip = createZip(publishDir, changed.map((file) => file.path));
  console.log(`Paket  : zip ${toMb(zip.length)}`);
  if (zip.length > MAX_ZIP_SIZE) {
    throw new Error(
      `Paket ${toMb(zip.length)}, sunucunun istek sınırını (100 MB) aşıyor. Büyük dosyaları sunucuya bir kez elle ` +
        'kopyalayın, sonra komutu tekrar çalıştırın.'
    );
  }

  const question = '\nAPI güncellensin mi? API birkaç saniye yeniden başlayacak. (e/h): ';
  if (!options.yes && !(await confirm(question))) {
    console.log('Vazgeçildi.');
    return;
  }

  const result = await publish(zip);
  console.log(`\n✓ Yazıldı: ${result.writtenFileCount} dosya (${(result.elapsedMilliseconds / 1000).toFixed(1)} sn)`);
  console.log(`  Klasör: ${result.apiFolderPath}`);
  if (result.backupFolderPath) console.log(`  Eski dosyalar: ${result.backupFolderPath}`);
  await waitForRestart(changed, before.startedAt, result.backupFolderPath);
}

function isProtected(relativePath, isDirectory) {
  const lowerPath = relativePath.toLowerCase();
  if (isDirectory) return PROTECTED_FOLDERS.includes(lowerPath);
  return PROTECTED_FILES.includes(lowerPath) || /^appsettings[^/]*\.json$/.test(lowerPath);
}

// API'de sürüm numarası yok; publish'in güncel olduğu, kaynak kodun publish'ten sonra değişip değişmediğine bakılarak
// anlaşılır (paralel oturumlar kodu sürekli değiştirebildiği için yalnız uyarıdır)
function readBuild(publishDir, checkSource) {
  const dllPath = path.join(publishDir, CONFIG.apiMainDll);
  if (!fs.existsSync(dllPath)) {
    throw new Error(`Publish bulunamadı: ${dllPath}. Visual Studio'da Release "Yayımla" alın.`);
  }
  const date = fs.statSync(dllPath).mtime;

  let warning = null;
  const repoDir = fromRoot(CONFIG.apiRepoDir);
  if (checkSource && fs.existsSync(repoDir)) {
    const newer = collectFiles(repoDir, (relativePath, isDirectory) =>
      isDirectory
        ? /(^|\/)(bin|obj|\.git|\.vs|node_modules)$/i.test(relativePath)
        : !SOURCE_EXTENSIONS.includes(path.extname(relativePath).toLowerCase())
    ).filter((file) => fs.statSync(path.join(repoDir, file)).mtime > date);
    if (newer.length > 0) {
      warning =
        `Publish'ten sonra ${newer.length} kaynak dosya değişmiş (ör. ${newer.slice(0, 3).join(', ')}). ` +
        'Son değişiklikler yayına girmeyebilir; Visual Studio\'da "Yayımla" alındı mı?';
    }
  }
  return { date, warning };
}

function hashFile(baseDir, file) {
  const content = fs.readFileSync(path.join(baseDir, file));
  return { path: file, size: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex') };
}

function getDiff(files, timeoutMs = 2 * 60 * 1000) {
  return callDeploy(
    'api-diff',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
      signal: AbortSignal.timeout(timeoutMs),
    },
    'Karşılaştırma başarısız'
  );
}

function publish(zip) {
  const form = new FormData();
  form.append('file', new Blob([zip], { type: 'application/zip' }), 'api.zip');
  return callDeploy(
    'publish-api',
    { method: 'POST', body: form, signal: AbortSignal.timeout(5 * 60 * 1000) },
    'Yayın başarısız'
  );
}

// API yanıttan sonra kapanır ve ilk istekte yeni dosyalarla açılır; süreç başlama zamanı değişince yeniden başladığı
// anlaşılır. Gönderilen dosyalar yeniden karşılaştırılır, hepsi sunucuyla aynı olmalıdır.
async function waitForRestart(changed, previousStartedAt, backupFolderPath) {
  const deadline = Date.now() + RESTART_TIMEOUT_MS;
  let answeredFromOldProcess = false;
  let lastError = null;
  while (Date.now() < deadline) {
    await sleep(3000);
    let diff;
    try {
      diff = await getDiff(changed, 30 * 1000);
    } catch (error) {
      lastError = error;
      continue; // API yeniden başlarken istekler bir süre hata verir
    }
    if (diff.startedAt === previousStartedAt) {
      answeredFromOldProcess = true;
      continue;
    }

    if (diff.changedFiles.length > 0) {
      console.warn(`! API yeniden başladı ama ${diff.changedFiles.length} dosya sunucuda hâlâ farklı:`);
      diff.changedFiles.slice(0, 5).forEach((file) => console.warn(`  ${file}`));
      process.exitCode = 1;
    } else {
      console.log(`✓ API yeniden başladı, gönderilen ${changed.length} dosya yayında.`);
    }
    return;
  }

  process.exitCode = 1;
  const minutes = RESTART_TIMEOUT_MS / 60000;
  if (answeredFromOldProcess) {
    console.warn(
      `! API ${minutes} dakikadır eski süreçle çalışıyor, yeni dosyalar yüklenmedi. ` +
        "IIS'te API'nin uygulama havuzunu geri dönüştürün (Recycle)."
    );
  } else {
    console.warn(
      `! API ${minutes} dakikadır yanıt vermiyor${lastError ? ` (${lastError.message})` : ''}. Sunucuda olay ` +
        `günlüğüne bakın; geri dönmek için ${backupFolderPath ?? 'yedek klasöründeki'} dosyaları API klasörüne geri taşıyın.`
    );
  }
}

run(main);
