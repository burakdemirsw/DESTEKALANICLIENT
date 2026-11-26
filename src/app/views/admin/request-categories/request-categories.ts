import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageTitle } from '@app/components/page-title';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestCategoryResponse, CreateRequestCategoryRequest, UpdateRequestCategoryRequest } from '@/app/core/models/request-category/request-category.models';
import { AuthStateService } from '@core/services/auth-state.service';
import { RequestApplicationsService } from '@/app/core/services/request-applications.service';
import { RequestApplicationResponse } from '@/app/core/models/request-application/request-application.models';

@Component({
    selector: 'app-request-categories-page',
    imports: [CommonModule, FormsModule, PageTitle],
    templateUrl: './request-categories.html',
})
export class RequestCategoriesPage implements OnInit {
    categories: RequestCategoryResponse[] = [];
    // Kategori bir uygulamaya bağlanırsa talep açarken yalnız o uygulamada seçilir
    applications: RequestApplicationResponse[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedCategory: RequestCategoryResponse | null = null;

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
        colorCode: '#64748b',
        order: 0,
        isBlocked: false,
        applicationId: '',
    };

    constructor(
        private categoryService: RequestCategoriesService,
        private authStateService: AuthStateService,
        private applicationsService: RequestApplicationsService,
    ) {}

    ngOnInit(): void {
        this.loadCategories();
        this.loadApplications();
    }

    private async loadApplications(): Promise<void> {
        try {
            const response = await this.applicationsService.getPaged({
                companyId: this.authStateService.profile?.companyId ?? '',
                pageNumber: 1,
                pageSize: 1000,
            });
            this.applications = response?.data?.items ?? [];
        } catch {
            this.applications = [];
        }
    }

    // Listede uygulama adı: API'den gelmezse yüklenen uygulamalardan bulunur
    getApplicationName(category: RequestCategoryResponse): string {
        if (!category.applicationId) return 'Tüm uygulamalar';
        return category.applicationName
            || this.applications.find(application => application.id === category.applicationId)?.applicationName
            || '-';
    }

    async loadCategories(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.categoryService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: this.currentPage, pageSize: this.pageSize, searchTerm: this.searchTerm });
            const paged = response?.data;
            this.categories = (paged?.items ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            this.totalCount = paged?.totalCount ?? this.categories.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } catch (err) {
            console.error('RequestCategories load error:', err);
        } finally {
            this.loading = false;
        }
    }

    onSearchChange(): void {
        this.currentPage = 1;
        this.loadCategories();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadCategories();
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
        this.selectedCategory = null;
        this.form = { name: '', description: '', colorCode: '#64748b', order: 0, isBlocked: false, applicationId: '' };
        this.showModal = true;
    }

    openEdit(category: RequestCategoryResponse): void {
        this.editMode = true;
        this.selectedCategory = category;
        this.form = {
            name: category.name,
            description: category.description,
            colorCode: category.colorCode ?? '#64748b',
            order: category.order ?? 0,
            isBlocked: category.isBlocked ?? false,
            applicationId: category.applicationId ?? '',
        };
        this.showModal = true;
    }

    async save(): Promise<void> {
        try {
            if (this.editMode && this.selectedCategory) {
                const req: UpdateRequestCategoryRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    colorCode: this.form.colorCode,
                    order: Number(this.form.order) || 0,
                    isBlocked: this.form.isBlocked,
                    applicationId: this.form.applicationId || null,
                };
                await this.categoryService.update(this.selectedCategory.id, req);
            } else {
                const req: CreateRequestCategoryRequest = {
                    name: this.form.name,
                    description: this.form.description,
                    colorCode: this.form.colorCode,
                    order: Number(this.form.order) || 0,
                    applicationId: this.form.applicationId || null,
                };
                await this.categoryService.create(req);
            }
            this.showModal = false;
            await this.loadCategories();
        } catch (err: any) {
            console.error('Save error:', err);
            if (err.status === 400 && JSON.stringify(err.error)?.includes('No route matches')) {
                this.showModal = false;
                await this.loadCategories();
                return;
            }
            const msg = err.status === 0
                ? `Sunucuya bağlanılamadı.\nURL: ${err.url}\nMesaj: ${err.message}`
                : `Hata ${err.status}: ${err.error?.message || err.error?.title || JSON.stringify(err.error)}`;
            alert('İşlem hatası:\n' + msg);
        }
    }

    async deleteCategory(category: RequestCategoryResponse): Promise<void> {
        if (confirm(`"${category.name}" kategorisini silmek istediğinize emin misiniz?`)) {
            try {
                await this.categoryService.delete(category.id);
                await this.loadCategories();
            } catch (err) {
                console.error('Delete error:', err);
            }
        }
    }

    closeModal(): void {
        this.showModal = false;
    }
}
