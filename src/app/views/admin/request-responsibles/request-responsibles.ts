import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageTitle } from '@app/components/page-title';
import { RequestResponsiblesModal } from '@app/components/request-responsibles-modal/request-responsibles-modal';
import { AuthStateService } from '@core/services/auth-state.service';
import { RequestApplicationsService } from '@core/services/request-applications.service';
import { RequestCategoriesService } from '@core/services/request-categories.service';
import { RequestResponsiblesService } from '@core/services/request-responsibles.service';
import {
    RequestResponsibleAssignment,
    RequestResponsibleTargetType,
    RequestResponsibleUser,
} from '@core/models/request-responsible/request-responsible.models';
import { RowActions } from '@app/components/row-actions/row-actions';

type ResponsibleTab = RequestResponsibleTargetType | 'manager';

/** Uygulama ya da kategori satırı ve sorumluları. */
interface TargetRow {
    id: string;
    name: string;
    description: string;
    isBlocked: boolean;
    responsibles: RequestResponsibleAssignment[];
}

/** Yönetici satırı: sorumlusu olduğu uygulama ve kategoriler. */
interface ManagerRow {
    userId: string;
    fullName: string;
    email: string;
    companyName: string;
    applications: string[];
    categories: string[];
}

/** Tanım listeleri az kayıt içerir; tamamı tek istekte alınır. */
const LOOKUP_PAGE_SIZE = 500;

/**
 * Talep Sorumluları: talep uygulamaları ve kategorileri ile destek yöneticilerini eşleştirir.
 * Talep, uygulamasının veya kategorisinin sorumlularına düşer; sorumlusu olmayan talep tüm yöneticilere düşer.
 */
@Component({
    selector: 'app-request-responsibles-page',
    imports: [FormsModule, PageTitle, RequestResponsiblesModal, RowActions],
    templateUrl: './request-responsibles.html',
    styleUrl: './request-responsibles.scss',
})
export class RequestResponsiblesPage implements OnInit {
    activeTab: ResponsibleTab = 'application';
    loading = false;
    loadError = '';

    applications: TargetRow[] = [];
    categories: TargetRow[] = [];
    managers: ManagerRow[] = [];
    candidates: RequestResponsibleUser[] = [];

    // DataTable
    filterText = '';
    filteredItems: TargetRow[] = [];
    pagedItems: TargetRow[] = [];
    filteredManagers: ManagerRow[] = [];
    pagedManagers: ManagerRow[] = [];
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    totalPagesArray: number[] = [];

    // Sorumlu seçim modalı
    editingTarget: TargetRow | null = null;

    constructor(
        private applicationsService: RequestApplicationsService,
        private categoriesService: RequestCategoriesService,
        private responsiblesService: RequestResponsiblesService,
        private authStateService: AuthStateService,
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    get editingType(): RequestResponsibleTargetType {
        return this.activeTab === 'category' ? 'category' : 'application';
    }

    get totalCount(): number {
        return this.activeTab === 'manager' ? this.filteredManagers.length : this.filteredItems.length;
    }

    /** Sorumlusu olmayan uygulama / kategori sayısı (talepleri tüm yöneticilere düşer). */
    get unassignedCount(): number {
        return this.currentTargets().filter(t => !t.isBlocked && t.responsibles.length === 0).length;
    }

    async loadData(): Promise<void> {
        this.loading = true;
        this.loadError = '';
        try {
            const companyId = this.authStateService.profile?.companyId ?? '';
            const [appsResponse, categoriesResponse, assignmentsResponse, candidatesResponse] = await Promise.all([
                this.applicationsService.getPaged({ companyId, pageNumber: 1, pageSize: LOOKUP_PAGE_SIZE }),
                this.categoriesService.getPaged({ companyId, pageNumber: 1, pageSize: LOOKUP_PAGE_SIZE }),
                this.responsiblesService.getAssignments(),
                this.responsiblesService.getCandidates(),
            ]);

            const assignments = this.extractArray<RequestResponsibleAssignment>(assignmentsResponse);
            this.candidates = this.extractArray<RequestResponsibleUser>(candidatesResponse);

            this.applications = (appsResponse?.data?.items ?? [])
                .map(a => this.toTargetRow(a.id, a.applicationName ?? '', a.description ?? '', a.isBlocked,
                    assignments.filter(x => x.applicationId === a.id)))
                .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

            this.categories = (categoriesResponse?.data?.items ?? [])
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'tr'))
                .map(c => this.toTargetRow(c.id, c.name, c.description ?? '', c.isBlocked,
                    assignments.filter(x => x.categoryId === c.id)));

            this.managers = this.candidates.map(m => ({
                userId: m.userId,
                fullName: m.fullName,
                email: m.email,
                companyName: m.companyName,
                applications: this.applications.filter(a => a.responsibles.some(r => r.userId === m.userId)).map(a => a.name),
                categories: this.categories.filter(c => c.responsibles.some(r => r.userId === m.userId)).map(c => c.name),
            }));

            this.applyFilterAndPaging();
        } catch (err) {
            this.loadError = this.describeError(err) || 'Eşleştirmeler yüklenemedi.';
        } finally {
            this.loading = false;
        }
    }

    setTab(tab: ResponsibleTab): void {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.applyFilterAndPaging();
    }

    applyFilterAndPaging(): void {
        const text = this.filterText.trim().toLocaleLowerCase('tr');
        const matches = (...values: string[]) => !text || values.some(v => (v ?? '').toLocaleLowerCase('tr').includes(text));

        if (this.activeTab === 'manager') {
            this.filteredManagers = this.managers.filter(m =>
                matches(m.fullName, m.email, m.companyName, ...m.applications, ...m.categories));
            this.filteredItems = [];
        } else {
            this.filteredItems = this.currentTargets().filter(t =>
                matches(t.name, t.description, ...t.responsibles.map(r => r.fullName)));
            this.filteredManagers = [];
        }

        this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
        this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

        const start = (this.currentPage - 1) * this.pageSize;
        this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
        this.pagedManagers = this.filteredManagers.slice(start, start + this.pageSize);
    }

    openEdit(target: TargetRow): void {
        this.editingTarget = target;
    }

    closeEdit(): void {
        this.editingTarget = null;
    }

    async onSaved(): Promise<void> {
        this.editingTarget = null;
        await this.loadData();
    }

    selectedIdsOf(target: TargetRow): string[] {
        return target.responsibles.map(r => r.userId);
    }

    responsibleNames(target: TargetRow): string {
        return target.responsibles.map(r => r.fullName).join(', ');
    }

    private currentTargets(): TargetRow[] {
        return this.activeTab === 'category' ? this.categories : this.applications;
    }

    private toTargetRow(id: string, name: string, description: string, isBlocked: boolean,
                        responsibles: RequestResponsibleAssignment[]): TargetRow {
        return { id, name, description, isBlocked, responsibles };
    }

    private extractArray<T>(response: unknown): T[] {
        if (Array.isArray(response)) return response as T[];

        if (response && typeof response === 'object') {
            const r = response as { $values?: unknown; data?: unknown; items?: unknown; result?: unknown };

            if (Array.isArray(r.$values)) return r.$values as T[];
            if (Array.isArray(r.data)) return r.data as T[];
            if (r.data !== undefined && r.data !== null) return [r.data as T];
            if (Array.isArray(r.items)) return r.items as T[];
            if (Array.isArray(r.result)) return r.result as T[];
            if (r.result !== undefined && r.result !== null) return [r.result as T];
        }

        return [];
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        if (httpError?.status === 403) return 'Bu sayfa yalnız destek yöneticileri içindir.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }
}
