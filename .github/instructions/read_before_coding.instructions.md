---
applyTo: '**'
---

# WMSSupport â€” Angular Proje KurallarÄ±

## Mimari Genel BakÄ±ÅŸ

- **Angular 20+** standalone component mimarisi (NgModule KULLANILMAZ)
- Uygulama adÄ±: **WMSSupport** (eski adÄ±: YanÄ±tSende / WMSSupport â€” bunlarÄ± kullanma)
- API Base URL: `https://localhost:8991/api`
- TÃ¼m HTTP istekleri `HttpClientService` Ã¼zerinden `Promise` tabanlÄ± yapÄ±lÄ±r (Observable deÄŸil)

## Component KurallarÄ±

- SÄ±nÄ±f adÄ±: `XxxPage` (Ã¶r: `MenusPage`, `TeamsPage`)
- Dosya uzantÄ±sÄ±: `.ts` (`.component.ts` deÄŸil), ÅŸablon: `.html`, stil: `.scss`
- `@Component` dekoratÃ¶rÃ¼nde `imports: [...]` dizisi kullan (standalone)
- Angular 17+ kontrol akÄ±ÅŸÄ±: `@if`, `@else`, `@for`, `@empty` kullan (`*ngIf`/`*ngFor` deÄŸil)
- Ä°ki yÃ¶nlÃ¼ baÄŸlama: `[(ngModel)]` ile `FormsModule`
- Modal: `showModal` flag ile gÃ¶ster/gizle (Bootstrap modal yapÄ±sÄ±, kÃ¼tÃ¼phane kullanma)

## âš ï¸ ZORUNLU: Datatable YapÄ±sÄ±

**TÃ¼m tablo sayfalarÄ±nda aÅŸaÄŸÄ±daki yapÄ± zorunludur:**

1. **Arama filtresi** â€” Tablonun Ã¼stÃ¼nde `filterText` input'u
2. **Sayfalama (pagination)** â€” Tablonun altÄ±nda `currentPage`, `pageSize=10`, ileri/geri butonlar
3. **Gerekli property'ler:**
   ```
   filterText = '';
   filteredItems: T[] = [];
   pagedItems: T[] = [];
   currentPage = 1;
   pageSize = 10;
   totalPages = 1;
   totalPagesArray: number[] = [];
   ```
4. **Gerekli methodlar:** `onFilterChange()`, `setPage(page)`, `applyFilterAndPaging()`
5. Veri yÃ¼klendikten sonra mutlaka `this.applyFilterAndPaging()` Ã§aÄŸÄ±r
6. HTML'de `@for` dÃ¶ngÃ¼sÃ¼ `pagedItems` Ã¼zerinde dÃ¶ner, `filteredItems.length` toplam kayÄ±t gÃ¶sterir

**EÄŸer datatable yapÄ±sÄ± yoksa uyar ve ekle.**

## Servis KurallarÄ±

- `@Injectable({ providedIn: 'root' })`
- `HttpClientService` inject edilir, `get()` ve `post()` kullanÄ±lÄ±r
- URL yapÄ±sÄ±: `{ controller: 'XxxController', action: 'yyy' }` â†’ `{baseUrl}/XxxController/yyy`
- Update: `post({ controller, action: 'update/{id}' }, body)`
- Delete: `post({ controller, action: 'delete/{id}' }, {})`
- TÃ¼m methodlar `Promise<any>` dÃ¶ner

## âš ï¸ ZORUNLU: Tip GÃ¼venliÄŸi (any Kullanma!)

- API isteklerinde ve response'larda **`any` yerine mutlaka typed interface/class** kullan
- API'nin ne dÃ¶ndÃ¼ÄŸÃ¼nÃ¼ Ã¶ÄŸrenmek iÃ§in **`src/assets/api/v1.yaml`** dosyasÄ±na bak
- `v1.yaml` iÃ§inde ilgili endpoint'in request body ve response schema'sÄ±nÄ± bul, ona gÃ¶re model oluÅŸtur
- EÄŸer `v1.yaml`'de ilgili schema **bulunamazsa**, o zaman `any` kullanÄ±labilir â€” ama bu son Ã§are olmalÄ±
- Servis methodlarÄ±: `Promise<any>` yerine `Promise<XxxResponse>` veya `Promise<XxxResponse[]>` kullan
- Component'lerde deÄŸiÅŸken tipleri: `items: any[] = []` yerine `items: XxxResponse[] = []` kullan
- `extractArray` helper'Ä±n dÃ¶nÃ¼ÅŸ tipi de mÃ¼mkÃ¼nse typed olmalÄ±: `private extractArray(response: any): XxxResponse[]`

**Ã–rnek â€” DoÄŸru kullanÄ±m:**
```typescript
// Servis
async getIntegrations(): Promise<IntegrationResponse[]> { ... }

// Component
items: IntegrationResponse[] = [];
filteredItems: IntegrationResponse[] = [];
pagedItems: IntegrationResponse[] = [];
```

**Ã–rnek â€” YANLIÅ kullanÄ±m (YAPMA):**
```typescript
async getIntegrations(): Promise<any> { ... }
items: any[] = [];
```

## Model KurallarÄ±

- Konum: `src/app/core/models/{domain}/{domain}.models.ts`
- Her model dosyasÄ± export eder: entity interface + `CreateXxxRequest` + `UpdateXxxRequest`
- `id: string`, `isBlocked?: boolean`, `createdDate?: string`, `updatedDate?: string` standart alanlar
- **Model oluÅŸtururken `v1.yaml`'deki schema tanÄ±mlarÄ±nÄ± referans al** â€” property adlarÄ± ve tipleri birebir eÅŸleÅŸmeli

## API Response Ä°ÅŸleme

Her sayfada `extractArray` helper zorunludur (API farklÄ± yapÄ±larda dÃ¶nebilir):
```typescript
private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.$values) return response.$values;
    if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
    if (response?.items) return response.items;
    if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
    return [];
}
```

## Routing KurallarÄ±

- Admin route'lar: `src/app/views/admin/admin.route.ts` â†’ `ADMIN_ROUTES` dizisine ekle
- Her route: `{ path: 'admin/xxx', component: XxxPage, data: { title: 'BaÅŸlÄ±k' }, canActivate: [AuthGuard] }`
- Auth route'lar: `src/app/views/auth/` altÄ±nda, guard yok

## Path Alias'larÄ±

- `@/*` â†’ `src/*` (Ã¶r: `@/app/core/services/xxx.service`)
- `@app/components/*` â†’ `src/app/components/*`
- `@core/*` â†’ `src/app/core/*`
- `@layouts/*` â†’ `src/app/layouts/*`

## UI KurallarÄ±

- **Arka plan rengi:** Beyaz alanlarÄ± kÄ±rmak iÃ§in `#f7f7f9` (off-white) kullan â€” iÃ§erik alanlarÄ±, step paneller, form arka planlarÄ± gibi yerlerde saf beyaz (`#fff`) yerine bu renk tercih edilir
- Bootstrap 5 sÄ±nÄ±flarÄ± kullan (`card`, `table`, `btn`, `badge`, `form-control` vb.)
- Butonlar: `btn-soft-primary`, `btn-soft-danger` (dÃ¼zenle/sil)
- Durum badge: `bg-success-subtle text-success` (Aktif) / `bg-danger-subtle text-danger` (Engelli/Pasif)
- Ä°konlar: Font Awesome (`fa-solid`, `fa-regular`)
- Tablo: `table table-centered table-hover mb-0` sÄ±nÄ±flarÄ±, `table-responsive` wrapper
- Ä°nline CSS YAZMA â€” stil dosyasÄ±nÄ± (.scss) ayrÄ± tut (budget limiti: 4kB)
- âš ï¸ **HTML'de ID gÃ¶sterme yasaÄŸÄ±:** KullanÄ±cÄ±ya gÃ¶rÃ¼nen hiÃ§bir `.html` template'te `id`, `userId`, `companyId`, `contactTypeId`, `platformAccountId` vb. teknik kimlik deÄŸerlerini metin olarak gÃ¶sterme. ID'ler sadece teknik iÅŸlem/`track` amacÄ±yla kullanÄ±labilir, UI'de sunulmaz.

## âš ï¸ ZORUNLU: Formlarda companyId / userId Kullanma!

- Formlarda (create/update request body, form model, hidden input vb.) **asla `companyId` veya `userId` alanÄ± bulundurma**
- Bu deÄŸerler backend tarafÄ±ndan token'dan alÄ±nÄ±r veya frontend'de sadece `AuthStateService` Ã¼zerinden okunur
- Form modeline `companyId` / `userId` ekleme â€” API'ye gÃ¶nderilen request body'de de olmamalÄ±
- EÄŸer bir yerde `companyId` veya `userId` gerekiyorsa, `AuthStateService`'den al:
  ```typescript
  this.authStateService.profile?.companyId
  this.authStateService.profile?.userId
  ```
- HTML template'te `companyId` / `userId` iÃ§in `<input>` veya `[(ngModel)]` baÄŸlamasÄ± YAPMA

## Auth YapÄ±sÄ±

- JWT token `localStorage.getItem('accessToken')` ile alÄ±nÄ±r
- `authInterceptor` otomatik `Bearer` header ekler
- 401 hatasÄ± â†’ token sil, `/auth/sign-in`'e yÃ¶nlendir

## LocalStorage KullanÄ±cÄ± Bilgileri

**`localStorage.getItem('userProfile')`** iÃ§inde JSON olarak saklanÄ±r:
```typescript
interface UserProfile {
    userId: string;      // "0fec2e64-a8fe-430f-bddc-033885489d4f"
    companyId: string;   // "aca432f9-ec4b-41ad-87ef-22c946769bdf"
    name: string;        // "burak"
    surname: string;     // "demir"
    lastLoginDate: string;
}
```

**KullanÄ±m:**
```typescript
// companyId almak iÃ§in:
const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
const companyId = profile.companyId || '';

// veya AuthStateService kullan:
this.authStateService.profile?.companyId
this.authStateService.profile?.userId
```
- `AuthGuard` JWT expiry + menÃ¼ bazlÄ± yetki kontrolÃ¼ yapar

## Build & Deploy

- Build: `ng build --configuration production` â†’ Ã§Ä±ktÄ±: `dist/ubold-ng/`
- `Web.config` (IIS SPA fallback) otomatik kopyalanÄ±r
- Component style budget: 4kB warning, 8MB error â€” bÃ¼yÃ¼k stiller ayrÄ± `.scss` dosyasÄ±nda olmalÄ±
