import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserTypesService } from '@/app/core/services/user-types.service';
import { UserType, CreateUserTypeRequest, UpdateUserTypeRequest } from '@/app/core/models/user/user-type.models';
import { AuthStateService } from '@core/services/auth-state.service';
import { RowActions } from '@app/components/row-actions/row-actions';
import { describeHttpError, showToast } from '@/app/utils/feedback';
import { ConfirmModal } from '@app/components/confirm-modal';

@Component({
    selector: 'app-user-types-page',
    imports: [CommonModule, FormsModule, RowActions, ConfirmModal],
    templateUrl: './user-types.html',
})
export class UserTypesPage implements OnInit {
    items: UserType[] = [];
    loading = false;

    // Server-side pagination
    searchTerm = '';
    currentPage = 1;
    pageSize = 10;
    totalCount = 0;
    totalPages = 1;
    totalPagesArray: number[] = [];

    // Modal
    showModal = false;
    editMode = false;
    selectedItem: UserType | null = null;
    form: any = { name: '', code: '' };

    constructor(private service: UserTypesService, private authStateService: AuthStateService) {}

    ngOnInit(): void {
        this.loadItems();
    }

    async loadItems(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.service.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: this.currentPage, pageSize: this.pageSize, searchTerm: this.searchTerm });
            const paged = response?.data;
            this.items = paged?.items ?? [];
            this.totalCount = paged?.totalCount ?? this.items.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } catch (err) {
            console.error('UserTypes load error:', err);
        } finally {
            this.loading = false;
        }
    }

    openCreate(): void {
        this.editMode = false;
        this.selectedItem = null;
        this.form = { name: '', code: '' };
        this.showModal = true;
    }

    openEdit(item: UserType): void {
        this.editMode = true;
        this.selectedItem = item;
        this.form = { name: item.name || '', code: item.code || '' };
        this.showModal = true;
    }

    async save(): Promise<void> {
        try {
            if (this.editMode && this.selectedItem) {
                const req: UpdateUserTypeRequest = { name: this.form.name, code: this.form.code };
                await this.service.update(this.selectedItem.id, req);
            } else {
                const req: CreateUserTypeRequest = { name: this.form.name, code: this.form.code };
                await this.service.create(req);
            }
            this.showModal = false;
            await this.loadItems();
        } catch (err: any) {
            console.error('Save error:', err);
            showToast('error', describeHttpError(err) || 'Kaydedilemedi.');
        }
    }

    closeModal(): void {
        this.showModal = false;
    }

    // Silme onayı sayfa içi modalda sorulur (tarayıcının confirm penceresi yerine)
    pendingDelete: UserType | null = null;
    deleting = false;

    deleteItem(item: UserType): void {
        this.pendingDelete = item;
    }

    cancelDelete(): void {
        if (!this.deleting) this.pendingDelete = null;
    }

    async confirmDelete(): Promise<void> {
        const item = this.pendingDelete;
        if (!item || this.deleting) return;

        this.deleting = true;
        try {
            await this.service.delete(item.id);
            this.pendingDelete = null;
            showToast('success', 'Kullanıcı tipi silindi.');
            await this.loadItems();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('error', describeHttpError(err) || 'Kullanıcı tipi silinemedi.');
        } finally {
            this.deleting = false;
        }
    }

    // ────── Server-side Pagination ──────
    onSearchChange(): void {
        this.currentPage = 1;
        this.loadItems();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadItems();
    }

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        return [];
    }
}
