import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolesService } from '@/app/core/services/roles.service';
import { UsersService } from '@/app/core/services/users.service';
import { User } from '@/app/core/models/user/user.models';
import { Role } from '@/app/core/models/role/role.models';
import { RoleUser } from '@/app/core/models/role/role.models';
import { AuthStateService } from '@/app/core/services/auth-state.service';

@Component({
    selector: 'app-role-assignments-page',
    imports: [CommonModule, FormsModule],
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

    constructor(
        private rolesService: RolesService,
        private usersService: UsersService,
        private authStateService: AuthStateService,
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    async loadData(): Promise<void> {
        this.loading = true;
        try {
            const usersResp = await this.usersService.getAll({
                pageNumber: 1,   
                pageSize: 1000,
                companyId: this.authStateService.profile?.companyId ?? '',
            });
            this.users = usersResp?.data?.items ?? [];

            const rolesResp = await this.rolesService.getAll();
            this.roles = this.extractArray(rolesResp);

            const ruResp = await this.rolesService.getRoleUsers();
            this.roleUsers = this.extractArray(ruResp);

            this.applyFilterAndPaging();
        } catch (err) {
            console.error('LoadData error:', err);
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
            (u.email && u.email.toLowerCase().includes(text))
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
        if (!this.selectedUser || this.selectedRoleIds.length === 0) return;
        try {
            await this.rolesService.bulkAssignRoles({
                roleUsers: this.selectedRoleIds.map(roleId => ({
                    roleId,
                    userId: this.selectedUser!.id,
                })),
            });
            this.selectedRoleIds = [];
            await this.refreshRoleUsers();
        } catch (err) {
            console.error('Assign error:', err);
        }
    }

    async removeRole(roleUser: RoleUser): Promise<void> {
        if (confirm(`Bu rolü kaldırmak istediğinize emin misiniz?`)) {
            try {
                await this.rolesService.removeRoleUser(roleUser.id);
                await this.refreshRoleUsers();
            } catch (err) {
                console.error('Remove error:', err);
            }
        }
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
}
