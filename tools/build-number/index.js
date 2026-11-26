// angular.json'daki build hedefi bu builder'ı kullanır ("./tools/build-number:application").
// Her `ng build` (production ve development) öncesinde build numarası bir artırılır, ardından Angular'ın application
// builder'ı (esbuild) aynı seçeneklerle çalışır. Şema onunkinin kopyasıdır (application.schema.json); Architect paket
// dışındaki şema yollarını kabul etmediği için kopya sync-schema.js ile postinstall'da yenilenir.
// - ng serve bu builder'ı çalıştırmaz: serve hedefi "@angular/build:dev-server"dır, build seçeneklerini bu şemayla
//   doğrulayıp uygulamayı kendisi derler; numara artmaz. ("@angular-devkit/build-angular:dev-server" özel builder'ı
//   tanımadığı için webpack'e düşer; serve hedefinde kullanılmaz.)
// - --watch build'lerinde numara artmaz.
// - Numara artınca sürüm notu yazılır: src/assets/release-notes/sonraki-surum.txt → v<sürüm>.txt (release-notes.js);
//   Sürüm Notları sayfasının (/release-notes) okuduğu src/app/core/data/release-notes.data.ts de yenilenir.
//   Derlemeden önce yazıldığı için notlar JS paketine girer; yayında assets klasörünün atılması gerekmez.
// - Build başarısız olursa numara ve sürüm notu geri alınır.
const { createBuilder } = require('@angular-devkit/architect');
const { buildApplication } = require('@angular-devkit/build-angular');
const { bumpBuildNumber } = require('./build-number');
const { writeReleaseNotes } = require('./release-notes');

function bumpWithNotes(workspaceRoot) {
  const bump = bumpBuildNumber(workspaceRoot);
  try {
    const notes = writeReleaseNotes(workspaceRoot, bump.version, bump.buildDate);
    return { bump, notes };
  } catch (error) {
    bump.revert();
    throw error;
  }
}

async function* run(options, context) {
  const state = options.watch ? null : bumpWithNotes(context.workspaceRoot);
  if (state) {
    context.logger.info(`Sürüm: ${state.bump.version} (${state.bump.buildDate})`);
    if (state.notes.isEmpty) {
      context.logger.warn(`Sürüm notu boş: ${state.notes.file} (sonraki-surum.txt'ye madde yazılmamış)`);
    } else {
      context.logger.info(`Sürüm notu: ${state.notes.file}`);
    }
  }

  let reverted = false;
  const revertOnFailure = () => {
    if (state && !reverted) {
      reverted = true;
      state.bump.revert();
      state.notes.revert();
      context.logger.warn(`Build başarısız; sürüm ${state.bump.previousVersion} olarak geri alındı.`);
    }
  };

  try {
    for await (const output of buildApplication(options, context)) {
      if (!output.success) {
        revertOnFailure();
      }
      yield output;
    }
  } catch (error) {
    revertOnFailure();
    throw error;
  }
}

module.exports = createBuilder(run);
