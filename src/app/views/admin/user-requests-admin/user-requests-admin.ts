import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { PageTitle } from '@app/components/page-title';
import { ConfirmModal } from '@app/components/confirm-modal';
import { RequestResponsiblesService } from '@/app/core/services/request-responsibles.service';
import { UrlQueryStateService } from '@/app/core/services/url-query-state.service';
import { RequestResponsibleUser } from '@/app/core/models/request-responsible/request-responsible.models';
import { UserRequestsService } from '@/app/core/services/user-requests.service';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestApplicationsService } from '@/app/core/services/request-applications.service';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { UserMenuService } from '@/app/core/services/user-menu.service';
import {
    UserRequestResponse,
    CreateUserRequestRequest,
    UpdateUserRequestRequest,
} from '@/app/core/models/user-request/user-request.models';
import { RequestCategoryResponse } from '@/app/core/models/request-category/request-category.models';
import { RequestApplicationResponse } from '@/app/core/models/request-application/request-application.models';
import { RequestPriorityResponse } from '@/app/core/models/request-priority/request-priority.models';
import { RequestStatusResponse } from '@/app/core/models/request-status/request-status.models';
import { AuthStateService } from '@core/services/auth-state.service';

@Component({
    selector: 'app-user-requests-admin-page',
    imports: [CommonModule, FormsModule, RouterModule, PageTitle, ConfirmModal],
    templateUrl: './user-requests-admin.html',
})
export class UserRequestsAdminPage implements OnInit, OnDestroy {
    /**
     * mine: giriş yapan yöneticiye düşen talepler (sorumlusu olduğu uygulama / kategoridekiler, kendisine atananlar ve
     * sorumlusu olmayanlar); all: tüm şirketlerin talepleri.
     */
    scope: 'mine' | 'all' = 'mine';
    requests: UserRequestResponse[] = [];
    filteredItems: UserRequestResponse[] = [];
    pagedItems: UserRequestResponse[] = [];
    applications: RequestApplicationResponse[] = [];
    categories: RequestCategoryResponse[] = [];
    priorities: RequestPriorityResponse[] = [];
    statuses: RequestStatusResponse[] = [];
    /** Talep atanabilecek kullanıcılar: destek yöneticileri. */
    managers: RequestResponsibleUser[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedRequest: UserRequestResponse | null = null;
    filterText = '';
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    totalPagesArray: number[] = [];
    totalCount = 0;

    // Kapatma / silme onayı
    pendingAction: { kind: 'close' | 'delete'; request: UserRequestResponse } | null = null;
    actionBusy = false;
    saving = false;

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    form: any = {
        userId: '',
        assignedUserId: '',
        applicationId: '',
        categoryId: '',
        statusId: '',
        priorityId: '',
        subject: '',
        description: '',
        isBlocked: false,
    };

    constructor(
        private requestService: UserRequestsService,
        private requestApplicationsService: RequestApplicationsService,
        private categoryService: RequestCategoriesService,
        private priorityService: RequestPrioritiesService,
        private statusService: RequestStatusesService,
        private responsiblesService: RequestResponsiblesService,
        private userMenuService: UserMenuService,
        private authStateService: AuthStateService,
        private urlState: UrlQueryStateService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.readStateFromUrl();
        this.loadRequests();
        this.loadApplications();
        this.loadCategories();
        this.loadPriorities();
        this.loadStatuses();
        this.loadManagers();
    }

    ngOnDestroy(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
    }

    setScope(scope: 'mine' | 'all'): void {
        if (this.scope === scope) return;
        this.scope = scope;
        this.currentPage = 1;
        this.loadRequests();
    }

    async loadRequests(): Promise<void> {
        this.loading = true;
        try {
            this.writeStateToUrl();
            const response = await this.requestService.adminGetPaged({
                pageNumber: this.currentPage,
                pageSize: this.pageSize,
                searchTerm: this.filterText,
                onlyMine: this.scope === 'mine',
            });
            const paged = response?.data;
            this.requests = paged?.items ?? [];
            this.pagedItems = [...this.requests];
            this.filteredItems = [...this.requests];
            this.totalCount = paged?.totalCount ?? this.pagedItems.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, index) => index + 1);

            // Adresteki sayfa artık yoksa ilk sayfa açılır
            if (this.currentPage > this.totalPages && this.totalCount > 0) {
                this.currentPage = 1;
                await this.loadRequests();
            }
        } catch (err) {
            console.error('Admin UserRequests load error:', err);
            this.toast('error', this.describeError(err) || 'Talepler yüklenemedi.');
        } finally {
            this.loading = false;
        }
    }

    async loadCategories(): Promise<void> {
        try {
            const response = await this.categoryService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            this.categories = response?.data?.items ?? [];
        } catch (err) {
            console.error('Categories load error:', err);
        }
    }

    async loadApplications(): Promise<void> {
        try {
            const response = await this.requestApplicationsService.getPaged({
                companyId: this.authStateService.profile?.companyId ?? '',
                pageNumber: 1,
                pageSize: 1000,
            });
            this.applications = response?.data?.items ?? [];
        } catch (err) {
            console.error('Applications load error:', err);
        }
    }

    async loadPriorities(): Promise<void> {
        try {
            const response = await this.priorityService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            this.priorities = response?.data?.items ?? [];
        } catch (err) {
            console.error('Priorities load error:', err);
        }
    }

    async loadStatuses(): Promise<void> {
        try {
            const response = await this.statusService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            this.statuses = response?.data?.items ?? [];
        } catch (err) {
            console.error('Statuses load error:', err);
        }
    }

    async loadManagers(): Promise<void> {
        try {
            const response = await this.responsiblesService.getCandidates();
            this.managers = response?.data ?? [];
        } catch (err) {
            console.error('Managers load error:', err);
        }
    }

    /** Arama yazılırken 400 ms duraksamadan sonra arar. */
    onFilterChange(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.currentPage = 1;
            this.loadRequests();
        }, 400);
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadRequests();
    }

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        return [];
    }

    getCategoryName(id: string): string {
        return this.categories.find(category => category.id === id)?.name ?? '-';
    }

    getPriorityName(id: string): string {
        return this.priorities.find(priority => priority.id === id)?.name ?? '-';
    }

    getStatusName(id: string): string {
        return this.statuses.find(status => status.id === id)?.name ?? '-';
    }

    getUserFullName(id: string): string {
        return this.managers.find(item => item.userId === id)?.fullName ?? '-';
    }

    openCreate(): void {
        this.editMode = false;
        this.selectedRequest = null;
        const userId = this.userMenuService.getUserIdFromToken();
        this.form = {
            userId: userId ?? '',
            assignedUserId: '',
            applicationId: '',
            categoryId: '',
            statusId: '',
            priorityId: '',
            subject: '',
            description: '',
            isBlocked: false,
        };
        this.showModal = true;
    }

    openEdit(request: UserRequestResponse): void {
        this.editMode = true;
        this.selectedRequest = request;
        this.form = {
            userId: request.userId ?? '',
            assignedUserId: request.assignedUserId ?? '',
            applicationId: request.applicationId ?? '',
            categoryId: request.categoryId ?? '',
            statusId: request.statusId ?? '',
            priorityId: request.priorityId ?? '',
            subject: request.subject ?? '',
            description: request.description ?? '',
            isBlocked: request.isBlocked ?? false,
        };
        this.showModal = true;
    }

    async save(): Promise<void> {
        if (this.saving) return;
        this.saving = true;
        try {
            if (this.editMode && this.selectedRequest) {
                const requestBody: UpdateUserRequestRequest = {
                    assignedUserId: this.form.assignedUserId || null,
                    applicationId: this.form.applicationId || null,
                    categoryId: this.form.categoryId,
                    statusId: this.form.statusId,
                    priorityId: this.form.priorityId,
                    subject: this.form.subject,
                    description: this.form.description,
                    isBlocked: this.form.isBlocked,
                };
                await this.requestService.update(this.selectedRequest.id, requestBody);
            } else {
                const requestBody: CreateUserRequestRequest = {
                    userId: this.form.userId,
                    applicationId: this.form.applicationId,
                    categoryId: this.form.categoryId,
                    subject: this.form.subject,
                    description: this.form.description,
                };
                await this.requestService.create(requestBody);
            }

            this.showModal = false;
            await this.loadRequests();
        } catch (err) {
            console.error('Save error:', err);
            this.toast('error', this.describeError(err) || 'Talep kaydedilemedi.');
        } finally {
            this.saving = false;
        }
    }

    closeRequest(request: UserRequestResponse): void {
        this.pendingAction = { kind: 'close', request };
    }

    deleteRequest(request: UserRequestResponse): void {
        this.pendingAction = { kind: 'delete', request };
    }

    cancelPendingAction(): void {
        if (!this.actionBusy) this.pendingAction = null;
    }

    async confirmPendingAction(): Promise<void> {
        const action = this.pendingAction;
        if (!action || this.actionBusy) return;

        this.actionBusy = true;
        try {
            if (action.kind === 'close') {
                await this.requestService.close(action.request.id);
                this.toast('success', 'Talep kapatıldı.');
            } else {
                await this.requestService.delete(action.request.id);
                this.toast('success', 'Talep silindi.');
            }
            this.pendingAction = null;
            await this.loadRequests();
        } catch (err) {
            console.error('Request action error:', err);
            this.toast('error', this.describeError(err) || 'İşlem yapılamadı.');
        } finally {
            this.actionBusy = false;
        }
    }

    closeModal(): void {
        this.showModal = false;
    }

    formatDate(dateStr?: string | null): string {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    }

    private readStateFromUrl(): void {
        this.scope = this.urlState.read(this.route, 'scope') === 'all' ? 'all' : 'mine';
        this.filterText = this.urlState.read(this.route, 'q');
        const page = Number(this.urlState.read(this.route, 'page'));
        this.currentPage = Number.isInteger(page) && page > 0 ? page : 1;
    }

    private writeStateToUrl(): void {
        this.urlState.write(this.route, {
            scope: this.scope === 'all' ? 'all' : null,
            q: this.filterText,
            page: this.currentPage > 1 ? this.currentPage : null,
        });
    }

    private toast(icon: 'success' | 'error', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' ? 4000 : 2200 });
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }
}
