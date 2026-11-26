import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConfirmModal } from '@app/components/confirm-modal';
import { RolesService } from '@/app/core/services/roles.service';
import { UsersService } from '@/app/core/services/users.service';
import { User } from '@/app/core/models/user/user.models';
import { Role } from '@/app/core/models/role/role.models';
import { RoleUser } from '@/app/core/models/role/role.models';

@Component({
    selector: 'app-role-assignments-page',
    imports: [CommonModule, FormsModule, ConfirmModal],
    templateUrl: './role-assignments.html',
})
export class RoleAssignmentsPage implements OnInit {
    users: User[] = [];
    roles: Role[] = [];
    roleUsers: RoleUser[] = [];
    loading = false;

    // DataTable variables
    filterText = '';
    filteredItems: User[] = [];
    pagedItems: User[] = [];
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    totalPagesArray: number[] = [];

    // Atama modalı
    showAssignModal = false;
    selectedUser: User | null = null;
    selectedUserRoles: RoleUser[] = [];
    selectedRoleIds: string[] = [];

    // Rol kaldırma onayı
    pendingRemoval: RoleUser | null = null;
    removing = false;
    assigning = false;

    constructor(
        private rolesService: RolesService,
        private usersService: UsersService,
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    async loadData(): Promise<void> {
        this.loading = true;
        try {
            // Tüm şirketlerin kullanıcıları: başka şirketteki bir kullanıcı da yönetici yapılabilsin
            const usersResp = await this.usersService.adminGetAll({ pageNumber: 1, pageSize: 1000 });
            this.users = usersResp?.data?.items ?? [];

            const rolesResp = await this.rolesService.getAll();
            this.roles = this.extractArray(rolesResp);

            const ruResp = await this.rolesService.getRoleUsers();
            this.roleUsers = this.extractArray(ruResp);

            this.applyFilterAndPaging();
        } catch (err) {
            console.error('LoadData error:', err);
            this.toast('error', this.describeError(err) || 'Kullanıcılar ve roller yüklenemedi.');
        } finally {
            this.loading = false;
        }
    }

    onFilterChange(): void {
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    setPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.applyFilterAndPaging();
        }
    }

    applyFilterAndPaging(): void {
        const text = this.filterText.toLowerCase().trim();
        this.filteredItems = this.users.filter(u =>
            (u.name && u.name.toLowerCase().includes(text)) ||
            (u.lastName && u.lastName.toLowerCase().includes(text)) ||
            (u.email && u.email.toLowerCase().includes(text)) ||
            (u.companyName && u.companyName.toLowerCase().includes(text))
        );

        this.totalPages = Math.ceil(this.filteredItems.length / this.pageSize) || 1;
        this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);

        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.pagedItems = this.filteredItems.slice(startIndex, startIndex + this.pageSize);
    }

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data?.items) return response.data.items;
        if (response?.data) return Array.isArray(response.data) ? response.data : (response.data.$values ? response.data.$values : [response.data]);
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        return [];
    }

    getUserRoles(userId: string): RoleUser[] {
        return this.roleUsers.filter(ru => ru.userId === userId);
    }

    getRoleName(roleId: string): string {
        return this.roles.find(r => r.id === roleId)?.roleDescription ?? '-';
    }

    getAvailableRoles(userId: string): Role[] {
        const assignedRoleIds = this.getUserRoles(userId).map(ru => ru.roleId);
        return this.roles.filter(r => !assignedRoleIds.includes(r.id));
    }

    openAssignModal(user: User): void {
        this.selectedUser = user;
        this.selectedUserRoles = this.getUserRoles(user.id);
        this.selectedRoleIds = [];
        this.showAssignModal = true;
    }

    toggleRoleSelection(roleId: string): void {
        const idx = this.selectedRoleIds.indexOf(roleId);
        if (idx > -1) {
            this.selectedRoleIds.splice(idx, 1);
        } else {
            this.selectedRoleIds.push(roleId);
        }
    }

    isRoleSelected(roleId: string): boolean {
        return this.selectedRoleIds.includes(roleId);
    }

    selectAllRoles(): void {
        if (!this.selectedUser) return;
        const available = this.getAvailableRoles(this.selectedUser.id);
        if (this.selectedRoleIds.length === available.length) {
            this.selectedRoleIds = [];
        } else {
            this.selectedRoleIds = available.map(r => r.id);
        }
    }

    async assignRoles(): Promise<void> {
        if (!this.selectedUser || this.selectedRoleIds.length === 0 || this.assigning) return;
        this.assigning = true;
        try {
            await this.rolesService.bulkAssignRoles({
                roleUsers: this.selectedRoleIds.map(roleId => ({
                    roleId,
                    userId: this.selectedUser!.id,
                })),
            });
            this.selectedRoleIds = [];
            await this.refreshRoleUsers();
            this.toast('success', 'Roller atandı.');
        } catch (err) {
            console.error('Assign error:', err);
            this.toast('error', this.describeError(err) || 'Rol atanamadı.');
        } finally {
            this.assigning = false;
        }
    }

    removeRole(roleUser: RoleUser): void {
        this.pendingRemoval = roleUser;
    }

    cancelRemoval(): void {
        if (!this.removing) this.pendingRemoval = null;
    }

    async confirmRemoval(): Promise<void> {
        const roleUser = this.pendingRemoval;
        if (!roleUser || this.removing) return;

        this.removing = true;
        try {
            await this.rolesService.removeRoleUser(roleUser.id);
            await this.refreshRoleUsers();
            this.pendingRemoval = null;
            this.toast('success', 'Rol kaldırıldı.');
        } catch (err) {
            console.error('Remove error:', err);
            this.toast('error', this.describeError(err) || 'Rol kaldırılamadı.');
        } finally {
            this.removing = false;
        }
    }

    /** Onay penceresinde gösterilecek kullanıcı ve rol adı. */
    get removalMessage(): string {
        if (!this.pendingRemoval || !this.selectedUser) return '';
        const name = `${this.selectedUser.name ?? ''} ${this.selectedUser.lastName ?? ''}`.trim();
        return `${name} kullanıcısından "${this.getRoleName(this.pendingRemoval.roleId)}" rolü kaldırılacak; bu role bağlı menüleri göremeyecek.`;
    }

    private async refreshRoleUsers(): Promise<void> {
        try {
            const resp = await this.rolesService.getRoleUsers();
            this.roleUsers = this.extractArray(resp);
            if (this.selectedUser) {
                this.selectedUserRoles = this.getUserRoles(this.selectedUser.id);
            }
        } catch (err) {
            console.error('Refresh error:', err);
        }
    }

    closeModal(): void {
        this.showAssignModal = false;
        this.selectedUser = null;
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
