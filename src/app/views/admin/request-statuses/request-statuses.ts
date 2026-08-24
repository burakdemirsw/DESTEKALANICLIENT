import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitle } from '@app/components/page-title';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { RequestStatusResponse, CreateRequestStatusRequest, UpdateRequestStatusRequest } from '@/app/core/models/request-status/request-status.models';
import { AuthStateService } from '@core/services/auth-state.service';

@Component({
    selector: 'app-request-statuses-page',
    imports: [CommonModule, FormsModule, PageTitle],
    templateUrl: './request-statuses.html',
})
export class RequestStatusesPage implements OnInit {
    statuses: RequestStatusResponse[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedStatus: RequestStatusResponse | null = null;

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
        order: 0,
        colorCode: '#64748b',
        isBlocked: false,
    };

    constructor(private statusService: RequestStatusesService, private authStateService: AuthStateService) {}

    ngOnInit(): void {
        this.loadStatuses();
    }

    async loadStatuses(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.statusService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: this.currentPage, pageSize: this.pageSize, searchTerm: this.searchTerm });
            const paged = response?.data;
            this.statuses = (paged?.items ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            this.totalCount = paged?.totalCount ?? this.statuses.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } catch (err) {
            console.error('RequestStatuses load error:', err);
        } finally {
            this.loading = false;
        }
    }

    onSearchChange(): void {
        this.currentPage = 1;
        this.loadStatuses();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadStatuses();
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
        this.selectedStatus = null;
        this.form = { name: '', description: '', order: 0, colorCode: '#64748b', isBlocked: false };
        this.showModal = true;
    }

    openEdit(status: RequestStatusResponse): void {
        this.editMode = true;
        this.selectedStatus = status;
        this.form = {
            name: status.name,
            description: status.description,
            order: status.order ?? 0,
            colorCode: status.colorCode ?? '#64748b',
            isBlocked: status.isBlocked ?? false,
        };
        this.showModal = true;
    }

    async save(): Promise<void> {
        try {
            if (this.editMode && this.selectedStatus) {
                const req: UpdateRequestStatusRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    order: Number(this.form.order) || 0,
                    colorCode: this.form.colorCode,
                    isBlocked: this.form.isBlocked,
                };
                await this.statusService.update(this.selectedStatus.id, req);
            } else {
                const req: CreateRequestStatusRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    order: Number(this.form.order) || 0,
                    colorCode: this.form.colorCode,
                };
                await this.statusService.create(req);
            }
            this.showModal = false;
            await this.loadStatuses();
        } catch (err: any) {
            console.error('Save error:', err);
            if (err.status === 400 && JSON.stringify(err.error)?.includes('No route matches')) {
                this.showModal = false;
                await this.loadStatuses();
                return;
            }
            const msg = err.status === 0
                ? `Sunucuya bağlanılamadı.\nURL: ${err.url}\nMesaj: ${err.message}`
                : `Hata ${err.status}: ${err.error?.message || err.error?.title || JSON.stringify(err.error)}`;
            alert('İşlem hatası:\n' + msg);
        }
    }

    async deleteStatus(status: RequestStatusResponse): Promise<void> {
        if (confirm(`"${status.name}" durumunu silmek istediğinize emin misiniz?`)) {
            try {
                await this.statusService.delete(status.id);
                await this.loadStatuses();
            } catch (err) {
                console.error('Delete error:', err);
            }
        }
    }

    closeModal(): void {
        this.showModal = false;
    }
}
