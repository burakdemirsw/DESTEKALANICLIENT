import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RolesService } from '@/app/core/services/roles.service';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '@/app/core/models/role/role.models';
import { RowActions } from '@app/components/row-actions/row-actions';
import { describeHttpError, showToast } from '@/app/utils/feedback';
import { ConfirmModal } from '@app/components/confirm-modal';

@Component({
    selector: 'app-roles-page',
    imports: [CommonModule, FormsModule, RowActions, ConfirmModal],
    templateUrl: './roles.html',
})
export class RolesPage implements OnInit {
    roles: Role[] = [];
    loading = false;
    showModal = false;
    editMode = false;
    selectedRole: Role | null = null;

    form: any = {
        roleDescription: '',
    };

    constructor(private rolesService: RolesService) {}

    ngOnInit(): void {
        this.loadRoles();
    }

    async loadRoles(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.rolesService.getAll();
            //console.log('Roles response:', response);
            this.roles = this.extractArray(response);
        } catch (err) {
            console.error('Roles error:', err);
        } finally {
            this.loading = false;
        }
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
        this.selectedRole = null;
        this.form = { roleDescription: '' };
        this.showModal = true;
    }

    openEdit(role: Role): void {
        this.editMode = true;
        this.selectedRole = role;
        this.form = { roleDescription: role.roleDescription };
        this.showModal = true;
    }

    async save(): Promise<void> {
        try {
            if (this.editMode && this.selectedRole) {
                const req: UpdateRoleRequest = { roleDescription: this.form.roleDescription };
                await this.rolesService.update(this.selectedRole.id, req);
            } else {
                const req: CreateRoleRequest = { roleDescription: this.form.roleDescription };
                await this.rolesService.create(req);
            }
            this.showModal = false;
            await this.loadRoles();
        } catch (err) {
            console.error('Save error:', err);
        }
    }

    // Silme onayı sayfa içi modalda sorulur (tarayıcının confirm penceresi yerine)
    pendingDelete: Role | null = null;
    deleting = false;

    deleteRole(role: Role): void {
        this.pendingDelete = role;
    }

    cancelDelete(): void {
        if (!this.deleting) this.pendingDelete = null;
    }

    async confirmDelete(): Promise<void> {
        const role = this.pendingDelete;
        if (!role || this.deleting) return;

        this.deleting = true;
        try {
            await this.rolesService.delete(role.id);
            this.pendingDelete = null;
            showToast('success', 'Rol silindi.');
            await this.loadRoles();
        } catch (err) {
            console.error('Delete error:', err);
            showToast('error', describeHttpError(err) || 'Rol silinemedi.');
        } finally {
            this.deleting = false;
        }
    }

    closeModal(): void {
        this.showModal = false;
    }
}
