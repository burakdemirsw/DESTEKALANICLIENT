---
applyTo: '**'
---

# WMSSupport - Angular Proje Kurallari

## Mimari Genel Bakis

- Angular 20+ standalone component mimarisi kullanilir (NgModule kullanilmaz).
- Uygulama adi: WMSSupport. Eski adlari (YanitSende vb.) kullanma.
- API Base URL: `https://localhost:8991/api`
- Tum HTTP istekleri `HttpClientService` uzerinden Promise tabanli yapilir (Observable degil).

## Component Kurallari

- Sinif adi formati: `XxxPage` (ornek: `MenusPage`, `TeamsPage`).
- Dosya adlandirma: `.ts` ( `.component.ts` degil ), sablon `.html`, stil `.scss`.
- `@Component` icinde standalone `imports: [...]` dizisi kullan.
- Angular 17+ control flow kullan: `@if`, `@else`, `@for`, `@empty` (`*ngIf` / `*ngFor` kullanma).
- Iki yonlu baglama icin `[(ngModel)]` ve `FormsModule` kullan.
- Modal yonetimi `showModal` flag ile yapilir (Bootstrap modal yapisi, ek kutuphane yok).

## ZORUNLU: Datatable Yapisi

Tum tablo sayfalarinda asagidaki yapi zorunludur:

1. Tablonun ustunde `filterText` arama input'u bulunur.
2. Tablonun altinda sayfalama bulunur: `currentPage`, `pageSize=10`, ileri/geri butonlari.
3. Asagidaki property'ler tanimli olur:

```ts
filterText = '';
filteredItems: T[] = [];
pagedItems: T[] = [];
currentPage = 1;
pageSize = 10;
totalPages = 1;
totalPagesArray: number[] = [];
```

4. Asagidaki methodlar bulunur: `onFilterChange()`, `setPage(page)`, `applyFilterAndPaging()`.
5. Veri yuklendikten hemen sonra mutlaka `this.applyFilterAndPaging()` cagrilir.
6. HTML tarafinda `@for` dongusu `pagedItems` uzerinde doner, toplam kayit `filteredItems.length` ile gosterilir.

Datatable yapisi yoksa uyar ve ekle.

## Servis Kurallari

- `@Injectable({ providedIn: 'root' })` kullan.
- `HttpClientService` inject et, `get()` ve `post()` methodlarini kullan.
- URL yapisi: `{ controller: 'XxxController', action: 'yyy' }` -> `{baseUrl}/XxxController/yyy`
- Update cagrisi: `post({ controller, action: 'update/{id}' }, body)`
- Delete cagrisi: `post({ controller, action: 'delete/{id}' }, {})`
- Tum methodlar Promise doner.

## ZORUNLU: Tip Guvenligi (any Kullanma)

- API request/response tiplerinde `any` yerine typed interface/class kullan.
- API semalarini ogrenmek icin `src/assets/api/v1.yaml` dosyasina bak.
- Ilgili endpoint'in request body ve response schema tanimlarini bulup modele birebir uygula.
- Eger `v1.yaml` icinde schema bulunamazsa `any` son care olarak kullanilabilir.
- Servis donusleri `Promise<any>` yerine `Promise<XxxResponse>` veya `Promise<XxxResponse[]>` olmalidir.
- Component degiskenleri `items: any[] = []` yerine typed olmali (or. `items: XxxResponse[] = []`).
- `extractArray` helper donus tipi de mumkunse typed olmalidir (or. `private extractArray(response: unknown): XxxResponse[]`).

Dogru kullanim:

```ts
// Service
async getIntegrations(): Promise<IntegrationResponse[]> { ... }

// Component
items: IntegrationResponse[] = [];
filteredItems: IntegrationResponse[] = [];
pagedItems: IntegrationResponse[] = [];
```

Yanlis kullanim (yapma):

```ts
async getIntegrations(): Promise<any> { ... }
items: any[] = [];
```

## Model Kurallari

- Konum: `src/app/core/models/{domain}/{domain}.models.ts`
- Her model dosyasi su yapilari export eder:
  - Entity interface
  - `CreateXxxRequest`
  - `UpdateXxxRequest`
- Standart alanlar: `id: string`, `isBlocked?: boolean`, `createdDate?: string`, `updatedDate?: string`
- Model olustururken `v1.yaml` schema tanimlarini referans al; property adlari ve tipleri birebir eslesmeli.

## API Response Isleme

Her sayfada `extractArray` helper zorunludur (API farkli yapilarda donebilir):

```ts
private extractArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (response && typeof response === 'object') {
    const r = response as {
      $values?: unknown;
      data?: unknown;
      items?: unknown;
      result?: unknown;
    };

    if (Array.isArray(r.$values)) return r.$values as T[];
    if (Array.isArray(r.data)) return r.data as T[];
    if (r.data !== undefined) return [r.data as T];
    if (Array.isArray(r.items)) return r.items as T[];
    if (Array.isArray(r.result)) return r.result as T[];
    if (r.result !== undefined) return [r.result as T];
  }

  return [];
}
```

## Routing Kurallari

- Admin route'lari `src/app/views/admin/admin.route.ts` icindeki `ADMIN_ROUTES` dizisine ekle.
- Her route formati:
  `{ path: 'admin/xxx', component: XxxPage, data: { title: 'Baslik' }, canActivate: [AuthGuard] }`
- Auth route'lari `src/app/views/auth/` altindadir, guard kullanilmaz.

## Path Alias'lari

- `@/*` -> `src/*` (ornek: `@/app/core/services/xxx.service`)
- `@app/components/*` -> `src/app/components/*`
- `@core/*` -> `src/app/core/*`
- `@layouts/*` -> `src/app/layouts/*`

## UI Kurallari

- Arka plan rengi: Beyaz alanlari kirmak icin `#f7f7f9` (off-white) kullan. Icerik alanlari, step panelleri, form arka planlarinda saf beyaz (`#fff`) tercih etme.
- Bootstrap 5 siniflari kullan: `card`, `table`, `btn`, `badge`, `form-control` vb.
- Buton stilleri: `btn-soft-primary`, `btn-soft-danger` (duzenle/sil).
- Durum badge stilleri:
  - Aktif: `bg-success-subtle text-success`
  - Engelli/Pasif: `bg-danger-subtle text-danger`
- Ikonlar: Font Awesome (`fa-solid`, `fa-regular`).
- Tablo siniflari: `table table-centered table-hover mb-0`; wrapper: `table-responsive`.
- Inline CSS yazma. Stilleri ayri `.scss` dosyasinda tut (component style budget limiti: 4kB).
- HTML'de ID gosterme yasagi: Kullaniciya gorunen hicbir `.html` template'te `id`, `userId`, `companyId`, `contactTypeId`, `platformAccountId` gibi teknik kimlik degerlerini metin olarak gosterme. ID'ler sadece teknik islem/track amaciyla kullanilabilir.

## ZORUNLU: Formlarda companyId / userId Kullanma

- Formlarda (create/update request body, form model, hidden input vb.) asla `companyId` veya `userId` alani bulundurma.
- Bu degerler backend tarafinda token'dan alinir veya frontend'de sadece `AuthStateService` uzerinden okunur.
- Form modeline `companyId` / `userId` ekleme; API request body'sinde de gonderme.
- Gerekli oldugu yerde su sekilde oku:

```ts
this.authStateService.profile?.companyId;
this.authStateService.profile?.userId;
```

- HTML template'te `companyId` / `userId` icin `<input>` veya `[(ngModel)]` baglama yapma.

## Auth Yapisi

- JWT token `localStorage.getItem('accessToken')` ile alinir.
- `authInterceptor` otomatik `Bearer` header ekler.
- 401 hatasinda token silinir ve `/auth/sign-in` sayfasina yonlendirilir.

## LocalStorage Kullanici Bilgileri

`localStorage.getItem('userProfile')` icinde JSON olarak saklanir:

```ts
interface UserProfile {
  userId: string;      // "0fec2e64-a8fe-430f-bddc-033885489d4f"
  companyId: string;   // "aca432f9-ec4b-41ad-87ef-22c946769bdf"
  name: string;        // "burak"
  surname: string;     // "demir"
  lastLoginDate: string;
}
```

Kullanim:

```ts
const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
const companyId = profile.companyId || '';

// veya AuthStateService:
this.authStateService.profile?.companyId;
this.authStateService.profile?.userId;
```

- `AuthGuard` JWT expiry ve menu bazli yetki kontrolu yapar.

## Build ve Deploy

- Build komutu: `ng build --configuration production`
- Build cikti klasoru: `dist/ubold-ng/`
- `Web.config` (IIS SPA fallback) otomatik kopyalanir.
- Component style budget: 4kB warning, 8MB error. Buyuk stilleri ayri `.scss` dosyalarina bol.
