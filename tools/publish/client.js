#!/usr/bin/env node
// Client'ı (Angular build çıktısını) terminalden destek sunucusuna yayınlar.
//   node tools/publish/client.js [--yes] [--dry-run] [--from=<dist klasörü>]
// --yes: onay sorulmaz. --dry-run: paket hazırlanır, gönderilmez.
//
// - Build alınmaz: dist'teki son production build gönderilir (development build reddedilir).
// - web.config gönderilmez, sunucudaki kalır.
// - API (DeployController, publish-client) paketi sunucudaki appsettings.json'da yazılı Deploy:ClientFolderPath
//   klasörüne açar; index.html'i en son yazar, iki yayın önceki kullanılmayan dosyaları siler.
// - Sonunda client sitesinin index.html'i okunur, yeni build'in yayında olduğu kontrol edilir.
// API'yi yayınlayan komut: api.js.
'use strict';

const fs = require('fs');
const path = require('path');
const {
  ROOT, CONFIG, parseArgs, getApiBaseUrl, callDeploy, collectFiles, createZip, confirm, toMb, formatDate, run,
} = require('./common');

const EXCLUDED_PATHS = ['web.config']; // dist köküne göre
const MAX_ZIP_SIZE = 95 * 1024 * 1024; // API'nin web.config'indeki IIS sınırı 100 MB

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const distDir = options.from ? path.resolve(options.from) : getDistDir();
  const build = readBuild(distDir);
  const files = collectFiles(distDir, (relativePath) => EXCLUDED_PATHS.includes(relativePath.toLowerCase()));
  const rawSize = files.reduce((sum, file) => sum + fs.statSync(path.join(distDir, file)).size, 0);
  const zip = createZip(distDir, files);

  console.log(`Hedef : ${CONFIG.clientUrl}  (API: ${getApiBaseUrl()})`);
  console.log(`Build : v${build.version}  (${build.buildDate})`);
  console.log(`Paket : ${files.length} dosya, ${toMb(rawSize)} → zip ${toMb(zip.length)}  (web.config hariç)`);
  if (build.warning) console.warn(`! ${build.warning}`);

  if (zip.length > MAX_ZIP_SIZE) {
    throw new Error(`Paket ${toMb(zip.length)}, sunucunun istek sınırını (100 MB) aşıyor.`);
  }
  if (options.dryRun) {
    console.log('\n--dry-run: paket gönderilmedi. Dosyalar:');
    files.forEach((file) => console.log(`  ${file}`));
    return;
  }
  if (!options.yes && !(await confirm('\nClient yayınlansın mı? (e/h): '))) {
    console.log('Vazgeçildi.');
    return;
  }

  const result = await publish(zip, build.version);
  console.log(
    `\n✓ Yayınlandı: ${result.writtenFileCount} dosya yazıldı, ${result.deletedFileCount} eski dosya silindi` +
      ` (${(result.elapsedMilliseconds / 1000).toFixed(1)} sn)`
  );
  console.log(`  Klasör: ${result.clientFolderPath}`);
  await checkLive(build);
}

function getDistDir() {
  const angular = JSON.parse(fs.readFileSync(path.join(ROOT, 'angular.json'), 'utf8'));
  const project = Object.values(angular.projects)[0];
  const outputPath = project.architect.build.options.outputPath;
  // application builder: { base, browser } (browser boşsa dosyalar base'in kökündedir)
  const distDir = typeof outputPath === 'string'
    ? path.join(ROOT, outputPath, 'browser')
    : path.join(ROOT, outputPath.base, outputPath.browser ?? 'browser');
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`Build bulunamadı: ${distDir}. Önce ng build alın.`);
  }
  return distDir;
}

// Sürüm, build'in derlemeye başlarken yazdığı version.ts'ten okunur (build başarısız olursa geri alınır)
function readBuild(distDir) {
  const indexPath = path.join(distDir, 'index.html');
  const mainScript = fs.readFileSync(indexPath, 'utf8').match(/main[-.][A-Za-z0-9]{8,}\.js/)?.[0];
  if (!mainScript) {
    throw new Error("dist'teki build production değil (main.js hash'siz). Production build alın (ng build).");
  }

  const versionTs = fs.readFileSync(path.join(ROOT, 'src', 'environments', 'version.ts'), 'utf8');
  const read = (name) => versionTs.match(new RegExp(`export const ${name} = '?([^';]+)'?;`))?.[1];
  const version = `${read('APP_VERSION_BASE')}.${read('APP_BUILD_NUMBER')}`;
  const buildDate = read('APP_BUILD_DATE');

  // version.ts build başında, dist build sonunda yazılır: aralarında yarım saatten fazla fark varsa dist başka build'den
  let warning = null;
  const distDate = fs.statSync(indexPath).mtime;
  const [day, month, year, hour, minute] = (buildDate ?? '').split(/[.: ]/).map(Number);
  const versionDate = new Date(year, month - 1, day, hour, minute);
  const diffMinutes = (distDate - versionDate) / 60000;
  if (Number.isNaN(diffMinutes) || diffMinutes < -1 || diffMinutes > 30) {
    warning = `dist'in tarihi (${formatDate(distDate)}) version.ts'teki build tarihiyle (${buildDate}) uyuşmuyor; ` +
      'sürüm numarası yanlış görünebilir.';
  }
  return { version, buildDate, mainScript, warning };
}

function publish(zip, version) {
  const form = new FormData();
  form.append('file', new Blob([zip], { type: 'application/zip' }), `client-${version}.zip`);
  form.append('version', version);
  return callDeploy(
    'publish-client',
    { method: 'POST', body: form, signal: AbortSignal.timeout(5 * 60 * 1000) },
    'Yayın başarısız'
  );
}

async function checkLive(build) {
  const url = new URL('index.html', CONFIG.clientUrl.replace(/\/*$/, '/'));
  url.searchParams.set('v', String(Date.now())); // önbellekteki eski index.html gelmesin
  try {
    const html = await (await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })).text();
    if (html.includes(build.mainScript)) {
      console.log(`✓ ${url.origin} yeni build'i veriyor (v${build.version}).`);
    } else {
      console.warn(`! ${url.origin} hâlâ eski index.html'i veriyor. Deploy:ClientFolderPath sitenin klasörü mü?`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.warn(`! Yayın kontrol edilemedi (${url.origin}): ${error.message}`);
  }
}

run(main);
