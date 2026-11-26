import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { RequestResponsiblesService } from '@core/services/request-responsibles.service';
import {
    RequestResponsibleTargetType,
    RequestResponsibleUser,
} from '@core/models/request-responsible/request-responsible.models';

/**
 * Bir talep uygulamasının ya da kategorisinin sorumlu (destek yöneticisi) kullanıcılarını seçer ve kaydeder.
 * Talep, uygulamasının veya kategorisinin sorumlularına düşer ve onlara bildirim maili gider.
 */
@Component({
    selector: 'app-request-responsibles-modal',
    imports: [FormsModule],
    templateUrl: './request-responsibles-modal.html',
    styleUrl: './request-responsibles-modal.scss',
})
export class RequestResponsiblesModal implements OnInit, AfterViewInit {
    @Input({ required: true }) type!: RequestResponsibleTargetType;
    @Input({ required: true }) targetId!: string;
    @Input() targetName = '';
    /** Seçilebilecek kullanıcılar; verilmezse modal kendisi yükler. */
    @Input() candidates: RequestResponsibleUser[] | null = null;
    @Input() selectedUserIds: string[] = [];

    /** Kaydedildi: yeni sorumlu kullanıcı listesi. */
    @Output() saved = new EventEmitter<string[]>();
    @Output() cancelled = new EventEmitter<void>();

    @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

    loading = false;
    saving = false;
    loadError = '';
    searchText = '';
    users: RequestResponsibleUser[] = [];
    filteredUsers: RequestResponsibleUser[] = [];
    selected = new Set<string>();

    constructor(private responsiblesService: RequestResponsiblesService) {}

    get title(): string {
        return this.type === 'application' ? 'Uygulama Sorumluları' : 'Kategori Sorumluları';
    }

    get targetLabel(): string {
        return this.type === 'application' ? 'uygulamasında' : 'kategorisinde';
    }

    async ngOnInit(): Promise<void> {
        this.selected = new Set(this.selectedUserIds);

        if (this.candidates) {
            this.users = this.candidates;
            this.applyFilter();
            return;
        }

        this.loading = true;
        try {
            const response = await this.responsiblesService.getCandidates();
            this.users = response?.data ?? [];
        } catch {
            this.loadError = 'Yönetici listesi alınamadı. Sayfayı yenileyip tekrar deneyin.';
        } finally {
            this.loading = false;
            this.applyFilter();
        }
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.searchInput?.nativeElement.focus());
    }

    applyFilter(): void {
        const text = this.searchText.trim().toLocaleLowerCase('tr');
        this.filteredUsers = !text
            ? this.users
            : this.users.filter(u =>
                [u.fullName, u.email, u.companyName].some(value => (value ?? '').toLocaleLowerCase('tr').includes(text)));
    }

    isSelected(userId: string): boolean {
        return this.selected.has(userId);
    }

    toggle(userId: string): void {
        if (this.selected.has(userId)) {
            this.selected.delete(userId);
        } else {
            this.selected.add(userId);
        }
    }

    @HostListener('document:keydown.escape')
    cancel(): void {
        if (!this.saving) this.cancelled.emit();
    }

    async save(): Promise<void> {
        if (this.saving || this.loading) return;

        // Listede artık bulunmayan (rolü alınmış) kullanıcılar seçimden düşer
        const known = new Set(this.users.map(u => u.userId));
        const userIds = [...this.selected].filter(id => known.has(id));

        this.saving = true;
        try {
            await this.responsiblesService.set(this.type, this.targetId, userIds);
            this.toast('success', 'Sorumlular kaydedildi.');
            this.saved.emit(userIds);
        } catch (err) {
            const message = (err as { error?: { message?: string } } | null)?.error?.message;
            this.toast('error', message || 'Sorumlular kaydedilemedi.');
        } finally {
            this.saving = false;
        }
    }

    private toast(icon: 'success' | 'error', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' ? 4000 : 2200 });
    }
}
