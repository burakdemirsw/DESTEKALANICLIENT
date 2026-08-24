import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PageTitle } from '@app/components/page-title';
import { UserRequestsService } from '@/app/core/services/user-requests.service';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestApplicationsService } from '@/app/core/services/request-applications.service';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { UsersService } from '@/app/core/services/users.service';
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
import { User } from '@/app/core/models/user/user.models';
import { AuthStateService } from '@core/services/auth-state.service';

@Component({
    selector: 'app-user-requests-admin-page',
    imports: [CommonModule, FormsModule, RouterModule, PageTitle],
    templateUrl: './user-requests-admin.html',
})
export class UserRequestsAdminPage implements OnInit {
    requests: UserRequestResponse[] = [];
    filteredItems: UserRequestResponse[] = [];
    pagedItems: UserRequestResponse[] = [];
    applications: RequestApplicationResponse[] = [];
    categories: RequestCategoryResponse[] = [];
    priorities: RequestPriorityResponse[] = [];
    statuses: RequestStatusResponse[] = [];
    users: User[] = [];
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
        private usersService: UsersService,
        private userMenuService: UserMenuService,
        private authStateService: AuthStateService,
    ) {}

    ngOnInit(): void {
        this.loadRequests();
        this.loadApplications();
        this.loadCategories();
        this.loadPriorities();
        this.loadStatuses();
        this.loadUsers();
    }

    async loadRequests(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.requestService.adminGetPaged({
                pageNumber: this.currentPage,
                pageSize: this.pageSize,
                searchTerm: this.filterText,
            });
            const paged = response?.data;
            this.requests = paged?.items ?? [];
            this.pagedItems = [...this.requests];
            this.filteredItems = [...this.requests];
            this.totalCount = paged?.totalCount ?? this.pagedItems.length;
            this.totalPages = paged?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, index) => index + 1);
        } catch (err) {
            console.error('Admin UserRequests load error:', err);
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

    async loadUsers(): Promise<void> {
        try {
            const response = await this.usersService.getAll();
            this.users = this.extractArray(response?.data);
        } catch (err) {
            console.error('Users load error:', err);
        }
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.loadRequests();
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
        const user = this.users.find(item => item.id === id);
        return user ? `${user.name} ${user.lastName}` : '-';
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
        } catch (err: any) {
            console.error('Save error:', err);
            const message = err.status === 0
                ? `Sunucuya bağlanılamadı.\nURL: ${err.url}\nMesaj: ${err.message}`
                : `Hata ${err.status}: ${err.error?.message || err.error?.title || JSON.stringify(err.error)}`;
            alert('İşlem hatası:\n' + message);
        }
    }

    async closeRequest(request: UserRequestResponse): Promise<void> {
        if (confirm(`"${request.subject}" talebini kapatmak istediğinize emin misiniz?`)) {
            try {
                await this.requestService.close(request.id);
                await this.loadRequests();
            } catch (err) {
                console.error('Close error:', err);
            }
        }
    }

    async deleteRequest(request: UserRequestResponse): Promise<void> {
        if (confirm(`"${request.subject}" talebini silmek istediğinize emin misiniz?`)) {
            try {
                await this.requestService.delete(request.id);
                await this.loadRequests();
            } catch (err) {
                console.error('Delete error:', err);
            }
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
}