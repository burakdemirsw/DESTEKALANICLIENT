# Proje Kuralları — Destek Alanı Client

Angular 20 standalone (Ubold şablonu). Bileşen, servis, model, datatable, routing, auth ve UI temel kuralları
`.github/instructions/read_before_coding.instructions.md`'dedir; bu dosya onu tamamlar. Çakışma olursa o dosyadaki
projeye özel kural geçerlidir.

@.github/instructions/read_before_coding.instructions.md

Aşağıdaki kurallar yeni yazılan ve dokunulan koda uygulanır; dokunulmayan sayfalar yalnız bu yüzden, istenmeden
değiştirilmez.

## Proje Kapsamı (Destek Alanı)

- **Bu uygulamada yalnız sistemin temel alanları, şirket yapısı ve destek talebi (Destek Merkezi) yapısı vardır.**
  E-ticaret, yapay zeka, sohbet / mesajlaşma, sosyal medya, entegrasyon, abonelik / plan, takım, sipariş, ürün ve
  müşteri panelleri 26.11.2026'da client, API ve veritabanından kaldırıldı. Bunlara ait sayfa, servis, model, uç nokta ya
  da tablo yeniden eklenmez; gerekiyorsa önce kullanıcıya sorulur.
  - Kalan sayfalar: Anasayfa (`/dashboard`); Destek Merkezi (`/admin/user-requests`, `/admin/user-requests/all`,
    `/admin/user-requests/:id`, `/admin/request-applications`, `/admin/request-categories`,
    `/admin/request-responsibles`, `/admin/request-statuses`, `/admin/request-priorities`); Şirket Bilgileri
    (`/admin/company-detail`); Sistem Yönetimi (`/admin/companies`, `/admin/user-types`, `/admin/roles`,
    `/admin/role-assignments`, `/admin/menus`, `/admin/role-menus`, `/admin/mail-settings`, `/admin/aws-s3-settings`,
    `/admin/cloudinary-settings`, `/admin/app-logs`); profil (`/users/profile`), sürüm notları, auth ve hata sayfaları.
  - **Destek talebi yapısını bozacak hiçbir alan kaldırılmaz.** Talep, talep mesajı / dosya eki, talep uygulaması,
    kategori, durum, öncelik, mail ayarları (bildirim e-postası) ve dosya depolama ayarları (S3 / Cloudinary) bu yapının
    parçasıdır.
- **Roller iki tanedir; adları API'de ve talep ekranlarında kullanılır, değiştirilmez:** `Destek Alanı Yönetici` (tüm
  şirketlerin taleplerini görür, tanımları ve sistemi yönetir) ve `Destek Alanı` (talep açan şirket kullanıcısı; yalnız
  kendi şirketinin taleplerini görür, kayıt olana otomatik atanır).
  - **Yetkiyi API verir, menü yalnız gösterir.** Şirket kullanıcısının başka şirketin kaydını görmesi, tanım / ayar
    değiştirmesi API'de 403 ile engellenir; client'ta yalnız menüyü ya da düğmeyi gizlemek yetki sayılmaz. Yeni bir
    yönetim ekranının uçları API'de yönetici kontrolüyle yazılır (bkz. backend `CLAUDE.md`).
- **Talepler sorumlulara düşer:** Talep Sorumluları ekranında her talep uygulaması / kategorisi için sorumlu yöneticiler
  seçilir. Talep, uygulamasının ya da kategorisinin sorumlularına düşer (Tüm Talepler > "Bana Düşenler" ve e-posta);
  sorumlusu olmayan talep tüm yöneticilere düşer. Sorumlu yalnız `Destek Alanı Yönetici` rolündeki kullanıcı olabilir.
- **Yan menü yalnız destek alanını içerir:** Anasayfa, Destek Merkezi (Destek Taleplerim, Tüm Talepler, Talep
  Uygulamaları, Talep Kategorileri, Talep Sorumluları, Talep Durumları, Talep Öncelikleri), Şirket Bilgileri, Sistem
  Yönetimi (… Sistem Logları). Yeni sayfa bu gruplardan birine eklenir (bkz. "Yeni Sayfa / Menü"); `Destek Alanı`
  rolüne yalnız Anasayfa, Destek Taleplerim, Şirket Bilgileri, profil ve sürüm notları atanmıştır.

## Build ve Yerel Sunucu

- **`ng build` (ve diğer production build komutları) ASLA sormadan çalıştırılmaz.** Build uzun sürüyor ve makineyi
  meşgul ediyor. Değişikliği doğrulamak için build gerekiyorsa önce kullanıcıya sorulur ve onay beklenir.
- **Sayfaya bakmak / ekran görüntüsü almak için kullanıcının açık tuttuğu `ng serve` kullanılır (varsayılan
  `http://localhost:4200`); başka portta ikinci bir `ng serve` başlatılmaz.** Her `ng serve` 4-5 GB RAM tutuyor, makine
  aynı anda iki-üç tanesini kaldırmıyor.
  - Ana proje (rts-admin-panel) de 4200'ü kullanır: 4200'de açık olan uygulamanın bu proje (Destek Alanı) olduğu
    kontrol edilir; değilse kullanıcıya sorulur.
  - 4200 cevap vermiyorsa önce çalışan bir `ng serve` süreci var mı bakılır: varsa derleniyordur (ilk derleme birkaç
    dakika sürer), bitmesi beklenir.
  - Hiç `ng serve` yoksa sunucu kendiliğinden açılmaz, kullanıcıya sorulur. Kullanıcı onaylayıp açılan sunucu iş bitince
    kapatılır.

## Sürüm ve Sürüm Notları

- **Uygulama sürümü `src/environments/version.ts`'tedir: `APP_VERSION_BASE` + `.` + `APP_BUILD_NUMBER` (örn. 2.0.0.12).**
  Build numarası her `ng build`'de (production ve development; `--watch` hariç) `tools/build-number` builder'ı tarafından
  bir artırılır, build tarihi `APP_BUILD_DATE`'e yazılır; elle değiştirilmez. Ana sürüm atlatılacaksa yalnız
  `APP_VERSION_BASE` düzenlenir. Build başarısız olursa numara ve sürüm notu geri alınır.
  - `angular.json`'da build hedefi `./tools/build-number:application`, serve hedefi `@angular/build:dev-server` kalır.
    Serve `@angular-devkit/build-angular:dev-server`'a döndürülmez: özel build builder'ını tanımaz, webpack'e düşer ve
    `ng serve` bozulur. `ng serve` numara artırmaz.
  - Builder şeması `tools/build-number/application.schema.json`, `@angular/build`'in şemasının kopyasıdır; her
    `npm install` / `yarn` sonrasında (postinstall) yenilenir. Angular güncellenince `node tools/build-number/sync-schema.js`.
  - Commit mesajının başına sürüm eklenir (`.git/hooks/prepare-commit-msg`): `fix` → `[v2.0.0.12 - 26.11.2026 16:51] fix`.
    Hook repoya girmez; repo yeniden klonlanınca ana projedeki (`rts-admin-panel-live/admin-panel`) hook kopyalanır.
  - Sürüm alt bilgide (footer) görünür; tıklanınca /release-notes açılır.
- **Her build'in değişiklikleri `src/assets/release-notes/v<sürüm>.txt` dosyasında müşterinin anlayacağı dille
  yazılır** (örn. `v2.0.0.12.txt`). Kullanıcıya görünen bir değişiklik yapıldığında madde hemen
  `src/assets/release-notes/sonraki-surum.txt`'ye eklenir; build maddeleri o build'in numarasıyla `v<sürüm>.txt`'ye
  taşır ve bekleyen dosyayı boşaltır, build başarısız olursa geri alır.
  - Biçim: ekran adı başlık (menüdeki / sayfadaki adıyla), altında `- ` ile ne değiştiği; kod, tablo, dosya adı ve
    teknik terim yazılmaz. Yalnız iç değişiklikler (refactor, yorum, CLAUDE.md, build aracı) yazılmaz. Bir maddenin
    devamı girintili satıra yazılır.
  - Dosyaya eklemeden önce yeniden okunur (paralel oturumlar aynı dosyaya yazar); aynı ekranın başlığı varsa madde onun
    altına eklenir. `#` ile başlayan satırlar açıklamadır, taşınmaz.
  - Kullanıcı build aldığını söyleyip not isterse ya da not boş kaldıysa (`- Bu sürüm için değişiklik notu yazılmadı.`)
    ilgili `v<sürüm>.txt` doğrudan düzenlenir.
  - Notlar /release-notes (Sürüm Notları) sayfasında gösterilir. Sayfa notları HTTP ile okumaz: build, notu olan
    sürümleri `src/app/core/data/release-notes.data.ts`'e yazar (klasörü her build'de baştan tarar) ve notlar JS paketine
    girer; yayında assets klasörü atılmasa da görünür. Bu dosya elle düzenlenmez; elle doldurulan eski bir not sonraki
    build'de sayfaya girer.

## Backend (DESTEKALANIAPI)

- **Backend reposuna (`source/repos/DESTEKALANIAPI`) erişmeden önce kullanıcıya sorulur.** Backend dosyası okumak,
  aramak ya da değiştirmek (entity / servis / controller) gerekiyorsa önce neyin neden gerektiği söylenir ve onay
  beklenir; onay yalnız o iş için geçerlidir, sonraki işte yeniden sorulur.
  - İstek / yanıt şeması için önce `src/assets/api/` altındaki OpenAPI dosyasına (`v1 (10).yaml`) bakılır; bunun için
    onay gerekmez.
  - Onay gelmezse iş bu repo üzerinden yapılır; backend'de gereken değişiklik (uç nokta, DTO, entity) kullanıcıya liste
    olarak verilir.
- Backend reposunun tam yolu `C:\Users\ASUS\source\repos\DESTEKALANIAPI`'dir (çözüm `DestekAlanıApi.slnx`, API projesi
  `Presentation/Api`). "Proje Kapsamı" backend için de geçerlidir: orada da yalnız sistem, şirket ve destek talebi yapısı
  vardır.

## Veritabanı

- **Veritabanında işlem yapılacaksa (sorgu, SP / tablo scripti) ilk DB işleminden önce kullanıcıya hangi veritabanında
  çalışılacağı sorulur.** Tahminle bağlanılmaz. Seçim o konuşma ve o veritabanı içindir; başka bir veritabanına
  geçmeden önce yeniden sorulur. (Uygulamanın menü, rol ve talep tabloları `BgzSupport` veritabanındadır.)
- Uygulamanın veritabanı adresi: SQL Server `192.168.2.38,1433`, veritabanı `BgzSupport`. Bağlantı cümlesinin tamamı
  backend reposunda `Presentation/Api/appsettings.json` → `ConnectionStrings:DefaultConnection`'dadır; buraya yazılmaz.
  - 26.11.2026 temizliğinin scripti backend reposunda `Sql/DestekAlani_Temizlik_2026-11-26.sql`'dir; öncesinin tam
    yedeği SQL sunucusunun yedek klasöründedir (`BgzSupport_temizlik_oncesi_20261126.bak`).
- Şifre ve bağlantı cümlesi yanıta, commit'e ya da repo dosyasına yazılmaz.
- SP / view düzenlenirken canlıdaki güncel tanım (`OBJECT_DEFINITION`) okunur; repodaki `.sql` dosyasına bakılarak
  yazılmaz. Basmadan hemen önce tanım yeniden okunur (`modify_date`); arada değiştiyse yeni hâlinin üzerine kurulur.
- SQL scriptleri idempotent yazılır (`IF NOT EXISTS`, `CREATE OR ALTER`); tekrar çalıştırıldığında hata vermez, veri
  çoğaltmaz.

## Yeni Sayfa / Menü

- **Yeni bir sayfa (route) eklendiğinde menü kaydı ve rol eşleşmesi de eklenir.** Sidebar menüsü API'den gelir
  (`MenusService` → `Menus`, `RoleMenus`); repoda menü kodu yazılmaz. `AuthGuard` her girişte
  `isUserAuthorized(userId, url)` sorar: rolüne menüsü atanmamış sayfa 403'e düşer.
  1. Menü kaydı (/admin/menus): `name`, `url` (route'un adresi, `/admin/xxx`; guard `:param` kısımlarını atar),
     `icon` (Font Awesome sınıfı, örn. `fa-solid fa-code-branch`), `parentId` (ilgili menü grubu: Anasayfa, Destek
     Merkezi, Şirket Bilgileri, Sistem Yönetimi), `orderIndex`.
  2. Rol eşleşmesi (/admin/role-menus): sayfayı görecek rol(ler)e menü atanır (roller: "Destek Alanı Yönetici",
     "Destek Alanı").
  - Hangi gruba / role ekleneceği belli değilse kullanıcıya sorulur. Kayıt ekrandan eklenecekse kullanıcıya girilecek
    değerler liste olarak verilir; DB'ye doğrudan yazılacaksa "Veritabanı" kuralı geçerlidir ve script aynı `url` ya da
    aynı rol-menü eşleşmesi varsa tekrar eklemez.

## Detay Sayfası Yönlendirmeleri

- **Sayfada detay sayfası olan bir kayıt (destek talebi vb.) gösteriliyorsa ilgili detay sayfasına bağlantı verilir**;
  değer düz metin bırakılmaz. Kural yalnız listeler için değil; kart, başlık ve dialog için de geçerlidir.
  - Destek talebi → `/admin/user-requests/:id`. Yeni detay sayfası eklendikçe buraya yazılır.
  - `<a [routerLink]="[...]">` kullanılır; düz tık aynı sekmede açar, Ctrl/Cmd/Shift + tıkı tarayıcı yeni sekmede açar.
  - Bağlantı metni kaydın numarası / adıdır; ID metin olarak gösterilmez (bkz. "HTML'de ID gösterme yasağı"), yalnız
    route'ta kullanılır.
  - Değer boşsa bağlantı gösterilmez (`@if`). Satırdaki başka bir tıklamayla çakışıyorsa
    `(click)="$event.stopPropagation()"` eklenir. `<button>` / `<option>` içine bağlantı konmaz.

## Listeden Detay / İşlem Ekranı Açma

- **Satırın detay / işlem düğmesine ya da satır menüsü öğesine düz tıklanınca sayfa aynı sekmede açılır; Ctrl (Mac'te
  Cmd) ya da Shift + tık yeni sekmede açar.** Her tıklamada `window.open(url, '_blank')` ile yeni sekme açılmaz, Ctrl ile
  yeni sekme de engellenmez.
  - Mümkünse `routerLink`'li `<a class="btn ...">` kullanılır. `(click)` ile gidiliyorsa olay geçirilir
    (`openDetail(row, $event)`): `ctrlKey || metaKey || shiftKey` ise `window.open(router.serializeUrl(...), '_blank')`,
    değilse `router.navigate`. Birden çok sayfada gerekirse bu mantık ortak servise alınır.
  - Modal / panel açan düğmeler kapsam dışıdır.

## Filtre Formları

- **Filtre yazıları okunamıyorsa (etiket, placeholder, seçili değer ya da tarih kesiliyor / sığmıyorsa) filtreler alt
  satıra geçirilir; 5'ten fazla alanlı formlar baştan iki satıra bölünür.** Kontrol yalnız tam ekranda değil, yan menü
  açık ve küçük / orta ekranlarda da yapılır.
  - Alanlar mantıksal iki gruba ayrılır (örn. üstte tarihler + numara alanları, altta durum / tip seçimleri); her grup
    ayrı `<div class="row g-3">` olur, ikinci satır `mt-3` alır. Satırlar yaklaşık eşit alan taşır (9 → 5 + 4,
    8 → 4 + 4, 6 → 3 + 3).
- **Filtreyle arama yapılıp veri geldikten sonra filtre alanı kapatılır**; "Filtreleri Göster / Gizle" düğmesiyle
  tekrar açılır. Sonuç boşsa ya da istek hata verirse filtre açık kalır ki kullanıcı değiştirip tekrar arayabilsin.
- **Filtreli liste / rapor sayfalarında yapılan arama adres çubuğunda query param olarak tutulur.** Sayfa yenilenince ya
  da bağlantı paylaşılınca aynı filtreler, arama ve sayfa ile açılır; adreste param yoksa sayfa kendi varsayılanıyla
  açılır.
  - `Location.replaceState` kullanılır, `router.navigate` ile query param yazılmaz (tarayıcı geçmişi şişer). Boş ve
    varsayılan değerler yazılmaz; dizi virgülle birleşir, tarih `yyyy-MM-dd` olur.
  - Adresten gelen değer doğrulanmadan kullanılmaz (seçim listesinde var mı, sayı mı, geçerli tarih mi). Adresteki
    sayfa artık yoksa ilk sayfa açılır. Liste araması yazılırken 400 ms duraksamadan sonra yazılır, zamanlayıcı
    `ngOnDestroy`'da temizlenir.
  - Okuma / yazma ortak serviste (`src/app/core/services/`) durur; yoksa ilk ihtiyaçta yazılır, sonraki sayfalar onu
    kullanır.

## Tasarım

- **Sayfa tasarımları kurumsal ve sade olur: tek vurgu rengi (tema rengi), geri kalanı gri tonlar.** Kanal, platform,
  tip, kategori gibi bilgiler renkli çip / rozet yerine düz metin (gerekirse gri simgeyle) gösterilir; filtre grupları
  ince gri çerçeveli, başlıkları küçük ve gridir, renkli zemin / gradyan kullanılmaz.
  - Aktif / Pasif durum rozetleri `.github` kurallarındaki gibi kalır. Bunun dışında farklı renk yalnız iptal, silme
    gibi geri alınması zor ya da olumsuz alanlarda kullanılır (silme düğmesi, iptal edilen kayıt); bunlar renk yerine
    farklı biçimde de (soluk satır, küçük kırmızı nokta, çerçeveli düğme) gösterilebilir.

## Mobil Uyumluluk (Responsive)

- **Her yeni ya da değiştirilen ekran telefonda (375px), tablette (768px) ve masaüstünde düzgün çalışır; tasarım
  masaüstüyle birlikte telefon için de baştan düşünülür, sonradan yamanmaz.** Yan menü açık / kapalı da kontrol
  edilir. Sayfa yana kaymaz (yatay taşma olmaz).
  - Bootstrap grid ve kırılım sınıfları kullanılır (`col-12 col-md-6 col-xl-…`, `d-none d-md-block`, `flex-wrap`,
    `gap-*`); sabit `px` genişlik yerine `%`, `flex`, `max-width`. Özel kural gerekiyorsa Bootstrap kırılımlarıyla
    yazılır: `@media (max-width: 575.98px)` (telefon), `767.98px` (tablet).
  - Tablolar `table-responsive` içindedir. Telefonda çok kolonlu tabloda önemsiz kolonlar `d-none d-md-table-cell` ile
    gizlenir ya da satırlar kart görünümüne geçer; işlem düğmeleri alt alta sıkışmaz.
  - Başlık + düğme satırları (`card-header`, araç çubuğu) `flex-wrap gap-2` ile alt satıra geçebilir; telefonda arama
    alanı ve ana işlem düğmesi tam genişlik olabilir.
  - Dokunma alanları en az ~36px'tir; yalnız hover ile görünen işlem olmaz (telefonda hover yok).
  - Modallar telefonda ekrana sığar (`modal-dialog-scrollable`, gerekirse `modal-fullscreen-sm-down`); uzun içerik
    modalın içinde kayar.
  - Form alanlarının yazı boyutu telefonda 16px'ten küçük olmaz (iPhone Safari odaklanınca sayfayı yakınlaştırır).
  - Uzun metin, bağlantı ve kodlar satırı taşırmaz: `text-break` / `overflow-wrap: anywhere`, gerekirse `text-truncate`
    + `title`.
  - Ekran görüntüsüyle doğrulanırken masaüstüyle birlikte 375px genişlik de kontrol edilir.
  - Örnek: Sürüm Notları (`views/release-notes`): sürüm düğmesi, arama ve "Daha Eski Sürümler" telefonda tam genişlik.

## Onay ve Değer Sorma (Modal)

- **Onay istemek ya da kullanıcıdan değer (adet, açıklama, neden vb.) almak için tarayıcının `alert` / `confirm` /
  `prompt` pencereleri kullanılmaz; sayfanın içinde modal açılır** (projedeki `showModal` deseni:
  `@if (...) { <div class="modal fade show d-block"> ... }`). Silme, iptal gibi işlemlerin onayı bu modaldadır.
  - Modalda başlık (işlemin adı), ne olacağını söyleyen kısa metin, **Vazgeç** ve işlemin adını taşıyan onay düğmesi
    bulunur; silme / iptal gibi geri alınması zor işlemde onay düğmesi kırmızıdır. X ve Esc vazgeçmedir.
  - Değer soruluyorsa giriş alanı modalın içindedir; geçersiz değerde (aralık dışı, boş) onay düğmesi pasif olur ve
    neden geçersiz olduğu alanın altında yazar. Enter onaylar.
  - Bilgi / hata mesajı için `alert` yerine toast kullanılır: `Swal.fire({ toast: true, position: 'top-end', icon,
    title, showConfirmButton: false, timer })` (örnek: `user-request-detail.ts`).
  - Projede çok sayıda sayfada `confirm` / `alert` var: dokunulan sayfadakiler modala / toast'a çevrilir, dokunulmayan
    sayfalar yalnız bu yüzden değiştirilmez.

## Kullanım Kolaylıkları

- **Çalışılan sayfada kullanım kolaylığı yapılabilecek bir alan görülürse (kısayol, tek tıkla doldurma, otomatik odak,
  kaydırma hareketi vb.) kendiliğinden eklenmez, yanıtın sonunda kısa bir öneri listesi olarak sunulur.** Kullanıcı
  onaylarsa yapılır.
- **Hareketle (kaydırma vb.) tetiklenen ve sırayı / veriyi değiştiren işlem önce onay ister**; yalnız gösterilen kaydı
  değiştiren ya da liste açan hareket onaysız çalışır.
  - Kaydırma yakalanan alanda `touch-action: none` olur (Android'de aşağı çekince sayfa yenilenmesin); içinde kayan alan
    varsa o alan `touch-action: pan-y` + `overscroll-behavior: contain` alır.

## Kod Kalitesi (SQA)

Kod yazılırken dört kalite alanı gözetilir:

- **İşlevsel uygunluk: istenen özellik eksiksiz ve doğru çalışır.**
  - İstek tam karşılanır; istenmeyen özellik eklenmez, var olan davranış sessizce değiştirilmez.
  - Uç durumlar ele alınır: boş liste, boş / null değer, tek kayıt, son sayfa.
  - Ekran değişikliği mümkünse ekran görüntüsüyle doğrulanır (bkz. "Build ve Yerel Sunucu"). Doğrulanamayan kısım
    kullanıcıya açıkça söylenir.
- **Güvenilirlik ve güvenlik: sistem kararlı çalışır, veri korunur.**
  - HTTP çağrılarında hata yakalanır ve kullanıcıya anlaşılır mesaj gösterilir; işlem sürerken yükleniyor durumu
    gösterilir ve düğme pasif olur (çift tıklamayla iki kayıt oluşmaz).
  - `subscribe`, `setInterval`, SignalR gibi abonelikler `ngOnDestroy`'da kapatılır.
  - Silme, iptal gibi geri alınamaz işlemler onay ister. Şifre, token ve kişisel veri konsola / loga yazılmaz;
    kullanıcıdan ya da müşteri mesajından gelen ham metin `[innerHTML]` ile basılmaz.
- **Kullanılabilirlik ve uyumluluk: kolay kullanılır, her ortamda çalışır.**
  - Ekran mevcut sayfalarla tutarlıdır (`.github` UI kuralları, Tasarım, Filtre Formları); metinler Türkçe ve
    anlaşılırdır, boş sonuçta "Kayıt bulunamadı" gibi bir durum metni gösterilir.
  - Yan menü açık / kapalı, orta ekran ve telefon (375px) genişliğinde kontrol edilir; yatay taşma olmaz (bkz.
    "Mobil Uyumluluk").
  - Masaüstü Chrome / Edge ve iPhone Safari'de çalışmayan tarayıcı API'si kullanılmaz; kullanılacaksa yedek yol bırakılır.
- **Sürdürülebilirlik ve taşınabilirlik: kod kolay güncellenir, başka ortama uyarlanır.**
  - Kod çevresindeki koda benzer (isimlendirme, yapı, yorum yoğunluğu).
  - API adresi `environment`'tan, firma / kullanıcı bilgisi `AuthStateService`'ten gelir; sabit yazılmaz.
  - `any` yerine tip (interface / model) kullanılır; kullanılmayan import, ölü kod ve `console.log` bırakılmaz.

## SOLID

Yeni yazılan ve değiştirilen kod SOLID ilkelerine uyar; dokunulan bölge bu ilkelere göre yazılır.

- **S — Tek sorumluluk:** Bileşen yalnız ekranı yönetir; HTTP çağrısı servistedir (`src/app/core/services/*`,
  `HttpClientService` üzerinden), veri dönüştürme gibi işler servise ya da yardımcı fonksiyona (`src/app/utils`) alınır.
  Büyüyen ekran parçaları (modal, sekme, kart) alt bileşen olur.
- **O — Açık / kapalı:** Yeni tip / durum eklemek var olan kodu değiştirmeyi gerektirmemelidir: uzayan `if` / `switch`
  zinciri yerine eşleme tablosu (map) ya da API'deki tanım kullanılır. Ortak bileşen yeni ihtiyaç için `@Input` ile
  genişletilir, içine sayfaya özel `if` yazılmaz.
- **L — Yerine geçebilirlik:** Ortak arayüzü / temel sınıfı uygulayan sınıf onun sözleşmesini bozmaz. Var olan servis
  metodunun sözleşmesi (parametreler, dönen alanlar) değiştirilmez; gerekirse opsiyonel parametre eklenir, değiştirmek
  şartsa tüm çağıranlar bulunup güncellenir.
- **I — Arayüz ayrımı:** Model / interface ekranın ihtiyacı kadar alan taşır; her şeyi içeren tek dev model yerine
  küçük modeller yazılır. Ortak bileşenin kullanılmayan `@Input`'ları zorunlu tutulmaz.
- **D — Bağımlılığın tersine çevrilmesi:** Servisler injection ile alınır, `new` ile üretilmez; bileşenler
  `HttpClient`'ı doğrudan kullanmaz, servis üzerinden çalışır. Sabit değerler (URL, ayar) koda gömülmez.
