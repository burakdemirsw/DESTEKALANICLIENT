import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

export type QueryStateValue = string | number | boolean | Date | (string | number)[] | null | undefined;

// Liste / rapor sayfalarının arama ve filtrelerini adres çubuğunda query param olarak tutar: sayfa yenilenince ya da
// bağlantı paylaşılınca aynı arama ile açılır. Adres Location.replaceState ile yazılır; router.navigate kullanılmaz
// (tarayıcı geçmişi şişmesin, sayfa yeniden yüklenmesin).
@Injectable({ providedIn: 'root' })
export class UrlQueryStateService {
    constructor(private router: Router, private location: Location) {}

    // Adresteki değeri metin olarak okur; yoksa boş metin döner. Sayı / tarih / seçim değerleri çağıran sayfada
    // doğrulanmadan kullanılmaz.
    read(route: ActivatedRoute, key: string): string {
        return route.snapshot.queryParamMap.get(key)?.trim() ?? '';
    }

    // Sayfanın bütün durumunu yazar; boş değerler adrese girmez. Dizi virgülle birleşir, tarih yyyy-MM-dd olur.
    write(route: ActivatedRoute, values: Record<string, QueryStateValue>): void {
        const queryParams: Params = {};
        for (const [key, value] of Object.entries(values)) {
            const text = this.toText(value);
            if (text) {
                queryParams[key] = text;
            }
        }
        const url = this.router.serializeUrl(this.router.createUrlTree([], { relativeTo: route, queryParams }));
        this.location.replaceState(url);
    }

    private toText(value: QueryStateValue): string {
        if (value === null || value === undefined || value === false) {
            return '';
        }
        if (value instanceof Date) {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
        }
        if (Array.isArray(value)) {
            return value.map(item => String(item).trim()).filter(item => !!item).join(',');
        }
        return String(value).trim();
    }
}
