import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitle } from '@app/components/page-title';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestPriorityResponse, CreateRequestPriorityRequest, UpdateRequestPriorityRequest } from '@/app/core/models/request-priority/request-priority.models';
import { AuthStateService } from '@core/services/auth-state.service';

@Component({
    selector: 'app-request-priorities-page',
    imports: [CommonModule, FormsModule, PageTitle],
    templateUrl: './request-priorities.html',
})
export class RequestPrioritiesPage implements OnInit {
    priorities: RequestPriorityResponse[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedPriority: RequestPriorityResponse | null = null;

    // Server-side pagination
    searchTerm = '';
    currentPage = 1;
    pageSize = 10;
    totalCount = 0;
    totalPages = 1;
    totalPagesArray: number[] = [];

    form: any = {
        name: '',
        description: '',
        isDefault: false,
        isBlocked: false,
        targetHours: null,
    };

    constructor(private priorityService: RequestPrioritiesService, private authStateService: AuthStateService) {}

    ngOnInit(): void {
        this.loadPriorities();
    }

    async loadPriorities(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.priorityService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: this.currentPage, pageSize: this.pageSize, searchTerm: this.searchTerm });
            const paged = response?.data;
            this.priorities = paged?.items ?? [];
            this.totalCount = paged?.totalCount ?? this.priorities.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } catch (err) {
            console.error('RequestPriorities load error:', err);
        } finally {
            this.loading = false;
        }
    }

    onSearchChange(): void {
        this.currentPage = 1;
        this.loadPriorities();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadPriorities();
    }

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        return [];
    }

    openCreate(): void {
        this.editMode = false;
        this.selectedPriority = null;
        this.form = { name: '', description: '', isDefault: false, isBlocked: false, targetHours: null };
        this.showModal = true;
    }

    openEdit(priority: RequestPriorityResponse): void {
        this.editMode = true;
        this.selectedPriority = priority;
        this.form = {
            name: priority.name,
            description: priority.description,
            isDefault: priority.isDefault ?? false,
            isBlocked: priority.isBlocked ?? false,
            targetHours: priority.targetHours ?? null,
        };
        this.showModal = true;
    }

    // Hedef süre: boş ya da geçersizse hedef yok; 1 ile 8760 saat arası kabul edilir
    private toTargetHours(value: unknown): number | null {
        const hours = Number(value);
        return Number.isInteger(hours) && hours >= 1 && hours <= 8760 ? hours : null;
    }

    get isTargetHoursInvalid(): boolean {
        const value = this.form?.targetHours;
        return value !== null && value !== undefined && value !== '' && this.toTargetHours(value) === null;
    }

    targetLabel(hours?: number | null): string {
        if (!hours) return '—';
        return hours % 24 === 0 ? `${hours / 24} gün` : `${hours} saat`;
    }

    async save(): Promise<void> {
        if (this.isTargetHoursInvalid) return;
        try {
            if (this.editMode && this.selectedPriority) {
                const req: UpdateRequestPriorityRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    isDefault: this.form.isDefault,
                    isBlocked: this.form.isBlocked,
                    targetHours: this.toTargetHours(this.form.targetHours),
                    order: this.selectedPriority.order,
                };
                await this.priorityService.update(this.selectedPriority.id, req);
            } else {
                const req: CreateRequestPriorityRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    isDefault: this.form.isDefault,
                    targetHours: this.toTargetHours(this.form.targetHours),
                };
                await this.priorityService.create(req);
            }
            this.showModal = false;
            await this.loadPriorities();
        } catch (err: any) {
            console.error('Save error:', err);
            if (err.status === 400 && JSON.stringify(err.error)?.includes('No route matches')) {
                this.showModal = false;
                await this.loadPriorities();
                return;
            }
            const msg = err.status === 0
                ? `Sunucuya bağlanılamadı.\nURL: ${err.url}\nMesaj: ${err.message}`
                : `Hata ${err.status}: ${err.error?.message || err.error?.title || JSON.stringify(err.error)}`;
            alert('İşlem hatası:\n' + msg);
        }
    }

    async deletePriority(priority: RequestPriorityResponse): Promise<void> {
        if (confirm(`"${priority.name}" önceliğini silmek istediğinize emin misiniz?`)) {
            try {
                await this.priorityService.delete(priority.id);
                await this.loadPriorities();
            } catch (err) {
                console.error('Delete error:', err);
            }
        }
    }

    closeModal(): void {
        this.showModal = false;
    }
}
