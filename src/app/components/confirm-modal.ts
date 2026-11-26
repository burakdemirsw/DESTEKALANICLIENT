import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

// Onay penceresi (tarayıcının confirm'i yerine): başlık, ne olacağını söyleyen metin, Vazgeç ve işlemin adını taşıyan
// onay düğmesi. Geri alınması zor işlemde (silme, kapatma) [danger] ile onay düğmesi kırmızı olur. X ve Esc vazgeçer;
// onay düğmesi odakta açıldığı için Enter onaylar. İşlem sürerken [busy] ile düğmeler pasif olur.
@Component({
    selector: 'app-confirm-modal',
    template: `
        <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" style="background: rgba(9, 9, 11, 0.55)"
             (click)="cancel()">
            <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ title }}</h5>
                        <button type="button" class="btn-close" aria-label="Kapat" [disabled]="busy" (click)="cancel()"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0 text-break">{{ message }}</p>
                        <ng-content />
                    </div>
                    <div class="modal-footer flex-wrap">
                        <button type="button" class="btn btn-light" [disabled]="busy" (click)="cancel()">Vazgeç</button>
                        <button #confirmButton type="button" class="btn" [class.btn-danger]="danger" [class.btn-primary]="!danger"
                                [disabled]="busy || confirmDisabled" (click)="confirm()">
                            @if (busy) {
                                <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                            }
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class ConfirmModal implements AfterViewInit {
    @Input() title = 'Onay';
    @Input() message = '';
    @Input() confirmText = 'Onayla';
    @Input() danger = false;
    @Input() busy = false;
    @Input() confirmDisabled = false;
    @Output() confirmed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    @ViewChild('confirmButton') private confirmButton?: ElementRef<HTMLButtonElement>;

    ngAfterViewInit(): void {
        setTimeout(() => this.confirmButton?.nativeElement.focus());
    }

    @HostListener('document:keydown.escape')
    cancel(): void {
        if (!this.busy) this.cancelled.emit();
    }

    confirm(): void {
        if (!this.busy && !this.confirmDisabled) this.confirmed.emit();
    }
}
