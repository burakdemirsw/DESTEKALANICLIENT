import { Injectable } from '@angular/core';
import { RolesService } from './roles.service';
import { UserMenuService } from './user-menu.service';
import { Role, RoleUserResponse } from '../models/role/role.models';

// Rol adları API'de ve talep ekranlarında kullanılır, değiştirilmez (bkz. CLAUDE.md "Proje Kapsamı").
// Eski kayıtlarda geçen 'admin' / 'customer' adları da aynı rol sayılır.
const ADMIN_ROLE_NAMES = ['destek alanı yönetici', 'admin'];
const CUSTOMER_ROLE_NAMES = ['destek alanı', 'customer'];

export interface SupportRoleInfo {
    isAdmin: boolean;
    isCustomer: boolean;
}

// Giriş yapan kullanıcının destek rolünü (yönetici / talep açan) ve talep atanabilecek yönetici kullanıcıları verir.
// Sonuç oturum boyunca saklanır; hata olursa saklanmaz, sonraki çağrı yeniden dener.
@Injectable({ providedIn: 'root' })
export class SupportRoleService {
    private rolesCache: { userId: string; promise: Promise<SupportRoleInfo> } | null = null;
    private adminUserIdsCache: Promise<string[]> | null = null;

    constructor(private rolesService: RolesService, private userMenuService: UserMenuService) {}

    getCurrentRoles(): Promise<SupportRoleInfo> {
        const userId = this.userMenuService.getUserIdFromToken() ?? '';
        if (!userId) {
            return Promise.resolve({ isAdmin: false, isCustomer: false });
        }
        if (this.rolesCache?.userId !== userId) {
            this.rolesCache = { userId, promise: this.loadRoles(userId) };
        }
        return this.rolesCache.promise;
    }

    // "Destek Alanı Yönetici" rolündeki kullanıcıların id'leri; rol bulunamazsa boş liste döner
    // (çağıran sayfa o durumda tüm kullanıcıları gösterir).
    getAdminUserIds(): Promise<string[]> {
        if (!this.adminUserIdsCache) {
            this.adminUserIdsCache = this.loadAdminUserIds().catch(() => {
                this.adminUserIdsCache = null;
                return [];
            });
        }
        return this.adminUserIdsCache;
    }

    private async loadRoles(userId: string): Promise<SupportRoleInfo> {
        try {
            const response = await this.rolesService.getRolesByUser(userId);
            const names = toArray<RoleUserResponse>(response?.data).map(role => normalizeRoleName(role.roleDescription));
            return {
                isAdmin: names.some(name => ADMIN_ROLE_NAMES.includes(name)),
                isCustomer: names.some(name => CUSTOMER_ROLE_NAMES.includes(name)),
            };
        } catch {
            this.rolesCache = null;
            return { isAdmin: false, isCustomer: false };
        }
    }

    private async loadAdminUserIds(): Promise<string[]> {
        const rolesResponse = await this.rolesService.getAll();
        const adminRoles = toArray<Role>(rolesResponse?.data)
            .filter(role => ADMIN_ROLE_NAMES.includes(normalizeRoleName(role.roleDescription)));

        const userIds = new Set<string>();
        for (const role of adminRoles) {
            const response = await this.rolesService.getUsersByRole(role.id);
            toArray<RoleUserResponse>(response?.data).forEach(roleUser => userIds.add(roleUser.userId));
        }
        return [...userIds];
    }
}

function normalizeRoleName(name: string | null | undefined): string {
    return (name ?? '').trim().toLowerCase();
}

function toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    const wrapped = value as { $values?: T[]; items?: T[] } | null;
    return wrapped?.$values ?? wrapped?.items ?? [];
}
