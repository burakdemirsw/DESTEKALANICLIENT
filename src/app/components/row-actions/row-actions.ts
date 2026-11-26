import { Component, Input } from '@angular/core';
import { NgbDropdown, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';

/**
 * Tablo satırının işlemler menüsü (⋮). Satırın ilk (en sol) kolonuna, `actions-col` sınıflı hücreye konur;
 * menü öğeleri içerik olarak verilir:
 *
 *   <td class="actions-col">
 *     <app-row-actions>
 *       <a class="dropdown-item" [routerLink]="[...]">Detay</a>
 *       <button type="button" class="dropdown-item" (click)="openEdit(item)">Düzenle</button>
 *       <div class="dropdown-divider"></div>
 *       <button type="button" class="dropdown-item text-danger" (click)="delete(item)">Sil</button>
 *     </app-row-actions>
 *   </td>
 *
 * Menü sayfa gövdesine taşınır; `table-responsive` ya da modal içinde kesilmez. Öğeye tıklanınca menü kapanır.
 */
@Component({
    selector: 'app-row-actions',
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu],
    templateUrl: './row-actions.html',
    styleUrl: './row-actions.scss',
})
export class RowActions {
    /** Açma düğmesinin ipucu / ekran okuyucu metni. */
    @Input() label = 'İşlemler';
}
