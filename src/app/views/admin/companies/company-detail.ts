import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CompaniesService } from '@/app/core/services/companies.service';
import { AddressesService } from '@/app/core/services/addresses.service';
import { NeighbourhoodsService } from '@/app/core/services/neighbourhoods.service';
import { AuthStateService } from '@/app/core/services/auth-state.service';
import { UsersService } from '@/app/core/services/users.service';
import { CompanySettingsService } from '@/app/core/services/company-settings.service';
import { Company, UpdateCompanyRequest } from '@/app/core/models/customer/company.models';
import { CreateUserRequest, UserResponse, UpdateUserRequest } from '@/app/core/models/user/user.models';
import {
    CompanySetting,
    CreateCompanySettingRequest,
    UpdateCompanySettingRequest,
} from '@/app/core/models/company-setting/company-setting.models';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/app/constants';

interface AddressOption {
    id: string;
    name: string;
}

interface UserFormModel {
    name: string;
    lastName: string;
    email: string;
    password: string;
    gender: string;
    isBlocked: boolean;
}

@Component({
    selector: 'app-company-detail-page',
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './company-detail.html',
    styleUrls: ['./company-detail.scss'],
})
export class CompanyDetailPage implements OnInit {
    // Aktif sekme
    activeTab: 'company' | 'users' | 'settings' = 'company';

    // Şirket bilgileri
    company: Company | null = null;
    loading = false;
    saving = false;
    errorMessage = '';
    successMessage = '';
   
    // Edit mode
    editMode = false;
    editForm: UpdateCompanyRequest = {
        name: '',
        taxNumber: '',
        taxOffice: '',
        tradeRegisterNo: '',
        mersisNo: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        countryId: '',
        cityId: '',
        districtId: '',
        neighbourhoodId: '',
        address: '',
        postalCode: '',
        isBlocked: false,
    };

    // Address dropdowns
    countries: AddressOption[] = [];
    cities: AddressOption[] = [];
    districts: AddressOption[] = [];
    neighbourhoods: AddressOption[] = [];

    // ═══ USERS TAB ═══
    users: UserResponse[] = [];
    usersLoading = false;
    usersSaving = false;
    showUserModal = false;
    userModalMode: 'create' | 'edit' = 'create';
    selectedUser: UserResponse | null = null;
    userFilterText = '';
    filteredUsers: UserResponse[] = [];
    pagedUsers: UserResponse[] = [];
    usersCurrentPage = 1;
    usersPageSize = DEFAULT_PAGE_SIZE;
    usersPageSizeOptions = PAGE_SIZE_OPTIONS;
    usersTotalPages = 1;
    usersTotalPagesArray: number[] = [];
    usersTotalCount = 0;
    userForm: UserFormModel = {
        name: '',
        lastName: '',
        email: '',
        password: '',
        gender: 'Erkek',
        isBlocked: false,
    };

    // ═══ SETTINGS TAB ═══
    setting: CompanySetting | null = null;
    settingsLoading = false;
    settingsSaving = false;
    settingsSuccessMessage = '';
    settingsErrorMessage = '';
    settingsForm = {
        isTwoFactorAuthEnabled: false,
        isAutoReplyEnabled: false,
        isUseWorkHours: false,
        workHoursStart: '09:00' as string | null,
        workHoursEnd: '18:00' as string | null,
    };

    private companyId = '';

    constructor(
        private router: Router,
        private companiesService: CompaniesService,
        private addressesService: AddressesService,
        private neighbourhoodsService: NeighbourhoodsService,
        private authStateService: AuthStateService,
        private usersService: UsersService,
        private companySettingsService: CompanySettingsService,
    ) {}

    ngOnInit(): void {
        this.companyId = this.authStateService.profile?.companyId || '';
        if (this.companyId) {
            this.loadCompany(this.companyId);
            this.loadUsers();
            this.loadSettings();
        } else {
            this.errorMessage = 'Şirket bilgisi bulunamadı.';
        }
    }

    async loadCompany(id: string): Promise<void> {
        this.loading = true;
        try {
            const response = await this.companiesService.getById(id);
            const raw = response?.data ?? response;
            this.company = (raw as Company) ?? null;
            if (!this.company?.id) {
                this.errorMessage = 'Şirket bilgisi alınamadı.';
            }
        } catch (err) {
            console.error('Company detail load error:', err);
            this.errorMessage = 'Şirket bilgileri yüklenirken bir hata oluştu.';
        } finally {
            this.loading = false;
        }
    }

    // ---------- Edit Mode ----------

    async enterEditMode(): Promise<void> {
        if (!this.company) return;
        this.editForm = {
            name: this.company.name || '',
            taxNumber: this.company.taxNumber || '',
            taxOffice: this.company.taxOffice || '',
            tradeRegisterNo: this.company.tradeRegisterNo || '',
            mersisNo: this.company.mersisNo || '',
            phone: this.company.phone || '',
            email: this.company.email || '',
            website: this.company.website || '',
            logoUrl: this.company.logoUrl || '',
            countryId: this.company.countryId || '',
            cityId: this.company.cityId || '',
            districtId: this.company.districtId || '',
            neighbourhoodId: this.company.neighbourhoodId || '',
            address: this.company.address || '',
            postalCode: this.company.postalCode || '',
            isBlocked: this.company.isBlocked || false,
        };
        this.successMessage = '';
        this.errorMessage = '';
        this.editMode = true;
        await this.loadCountries();
        if (this.editForm.countryId) {
            await this.loadCities(this.editForm.countryId);
        }
        if (this.editForm.cityId) {
            await this.loadDistricts(this.editForm.cityId);
        }
        if (this.editForm.districtId) {
            await this.loadNeighbourhoods(this.editForm.districtId);
        }
    }

    cancelEdit(): void {
        this.editMode = false;
        this.successMessage = '';
        this.errorMessage = '';
    }

    async saveCompany(): Promise<void> {
        if (!this.company?.id) return;
        this.saving = true;
        this.errorMessage = '';
        this.successMessage = '';
        try {
            const body: UpdateCompanyRequest = {
                name: this.editForm.name,
                taxNumber: this.editForm.taxNumber || null,
                taxOffice: this.editForm.taxOffice || null,
                tradeRegisterNo: this.editForm.tradeRegisterNo || null,
                mersisNo: this.editForm.mersisNo || null,
                phone: this.editForm.phone || null,
                email: this.editForm.email || null,
                website: this.editForm.website || null,
                logoUrl: this.editForm.logoUrl || null,
                countryId: this.editForm.countryId || null,
                cityId: this.editForm.cityId || null,
                districtId: this.editForm.districtId || null,
                neighbourhoodId: this.editForm.neighbourhoodId || null,
                address: this.editForm.address || null,
                postalCode: this.editForm.postalCode || null,
                isBlocked: this.editForm.isBlocked,
            };
            console.log('Update body:', JSON.stringify(body));
            await this.companiesService.update(this.company.id, body);
            this.successMessage = 'Şirket bilgileri başarıyla güncellendi.';
            this.editMode = false;
            await this.loadCompany(this.company.id);
        } catch (err) {
            console.error('Company update error:', err);
            this.errorMessage = 'Şirket güncellenirken bir hata oluştu.';
        } finally {
            this.saving = false;
        }
    }

    // ---------- Address Dropdowns ----------

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.items) {
            const items = response.items;
            if (Array.isArray(items)) return items;
            if (items?.$values) return items.$values;
        }
        if (response?.data) {
            const d = response.data;
            if (Array.isArray(d)) return d;
            if (d?.$values) return d.$values;
            if (d?.items) {
                if (Array.isArray(d.items)) return d.items;
                if (d.items?.$values) return d.items.$values;
            }
        }
        if (response?.result) {
            const r = response.result;
            if (Array.isArray(r)) return r;
            if (r?.$values) return r.$values;
        }
        return [];
    }

    async loadCountries(): Promise<void> {
        try {
            const res = await this.addressesService.getCountries();
            this.countries = this.extractArray(res).map((c: any) => ({ id: c.id, name: c.name }));
        } catch (err) {
            console.error('Countries load error:', err);
            this.countries = [];
        }
    }

    async loadCities(countryId: string): Promise<void> {
        this.cities = [];
        this.districts = [];
        this.neighbourhoods = [];
        if (!countryId) return;
        try {
            const res = await this.addressesService.getCitiesByCountry(countryId);
            this.cities = this.extractArray(res).map((c: any) => ({ id: c.id, name: c.name }));
        } catch (err) {
            console.error('Cities load error:', err);
            this.cities = [];
        }
    }

    async loadDistricts(cityId: string): Promise<void> {
        this.districts = [];
        this.neighbourhoods = [];
        if (!cityId) return;
        try {
            const res = await this.addressesService.getDistrictsByCity(cityId);
            this.districts = this.extractArray(res).map((d: any) => ({ id: d.id, name: d.name }));
        } catch (err) {
            console.error('Districts load error:', err);
            this.districts = [];
        }
    }

    async loadNeighbourhoods(districtId: string): Promise<void> {
        this.neighbourhoods = [];
        if (!districtId) return;
        try {
            const res = await this.neighbourhoodsService.getByDistrict(districtId);
            this.neighbourhoods = this.extractArray(res).map((n: any) => ({ id: n.id, name: n.name }));
        } catch (err) {
            console.error('Neighbourhoods load error:', err);
            this.neighbourhoods = [];
        }
    }

    async onCountryChange(): Promise<void> {
        this.editForm.cityId = '';
        this.editForm.districtId = '';
        this.editForm.neighbourhoodId = '';
        this.districts = [];
        this.neighbourhoods = [];
        await this.loadCities(this.editForm.countryId || '');
    }

    async onCityChange(): Promise<void> {
        this.editForm.districtId = '';
        this.editForm.neighbourhoodId = '';
        this.neighbourhoods = [];
        await this.loadDistricts(this.editForm.cityId || '');
    }

    async onDistrictChange(): Promise<void> {
        this.editForm.neighbourhoodId = '';
        await this.loadNeighbourhoods(this.editForm.districtId || '');
    }

    // ---------- Helpers ----------

    get selectedCountryName(): string {
        return this.countries.find(c => c.id === this.editForm.countryId)?.name || '';
    }

    get selectedCityName(): string {
        return this.cities.find(c => c.id === this.editForm.cityId)?.name || '';
    }

    get selectedDistrictName(): string {
        return this.districts.find(d => d.id === this.editForm.districtId)?.name || '';
    }

    get selectedNeighbourhoodName(): string {
        return this.neighbourhoods.find(n => n.id === this.editForm.neighbourhoodId)?.name || '';
    }

    get statusText(): string {
        return this.company?.isBlocked ? 'Pasif' : 'Aktif';
    }

    get statusClass(): string {
        return this.company?.isBlocked ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success';
    }

    get fullAddress(): string {
        const parts: string[] = [];
        if (this.company?.address) parts.push(this.company.address);
        if (this.company?.neighbourhoodName) parts.push(this.company.neighbourhoodName);
        if (this.company?.districtName) parts.push(this.company.districtName);
        if (this.company?.cityName) parts.push(this.company.cityName);
        if (this.company?.countryName) parts.push(this.company.countryName);
        if (this.company?.postalCode) parts.push(this.company.postalCode);
        return parts.length ? parts.join(', ') : '-';
    }

    get initials(): string {
        const name = this.company?.name || '';
        return name
            .split(' ')
            .filter(w => w.length > 0)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');
    }

    formatDate(date?: string): string {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return date;
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/companies']);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // USERS TAB METHODS
    // ═══════════════════════════════════════════════════════════════════════

    onUserFilterChange(): void {
        this.usersCurrentPage = 1;
        this.applyUserFilterAndPaging();
    }

    onUsersPageSizeChange(): void {
        this.usersCurrentPage = 1;
        this.loadUsers();
    }

    setUsersPage(page: number): void {
        if (page < 1 || page > this.usersTotalPages) return;
        this.usersCurrentPage = page;
        this.loadUsers();
    }

    applyUserFilterAndPaging(): void {
        const q = (this.userFilterText || '').toLowerCase();
        if (q) {
            this.filteredUsers = this.users.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.lastName || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
            );
        } else {
            this.filteredUsers = [...this.users];
        }
        this.pagedUsers = this.filteredUsers;
    }

    async loadUsers(): Promise<void> {
        this.usersLoading = true;
        try {
            const response = await this.usersService.getAll({
                companyId: this.companyId,
                pageNumber: this.usersCurrentPage,
                pageSize: this.usersPageSize
            });
            const paged = response?.data;
            this.users = this.extractItems(paged);
            this.usersTotalPages = paged?.totalPages ?? 1;
            this.usersTotalCount = paged?.totalCount ?? this.users.length;
            this.usersTotalPagesArray = Array.from({ length: this.usersTotalPages }, (_, i) => i + 1);
            this.applyUserFilterAndPaging();
        } catch (err) {
            console.error('Users error:', err);
        } finally {
            this.usersLoading = false;
        }
    }

    private extractItems(data: any): UserResponse[] {
        if (Array.isArray(data)) return data;
        if (data?.items) return Array.isArray(data.items) ? data.items : [data.items];
        if (data?.$values) return data.$values;
        return [];
    }

    openCreateUser(): void {
        this.userModalMode = 'create';
        this.selectedUser = null;
        this.userForm = {
            name: '',
            lastName: '',
            email: '',
            password: '',
            gender: 'Erkek',
            isBlocked: false,
        };
        this.showUserModal = true;
    }

    openEditUser(user: UserResponse): void {
        this.userModalMode = 'edit';
        this.selectedUser = user;
        this.userForm = {
            name: user.name || '',
            lastName: user.lastName || '',
            email: user.email || '',
            password: '',
            gender: user.gender || 'Erkek',
            isBlocked: user.isBlocked,
        };
        this.showUserModal = true;
    }

    async saveUser(): Promise<void> {
        if (!this.userForm.name.trim() || !this.userForm.lastName.trim()) {
            this.errorMessage = 'Ad ve soyad zorunludur.';
            return;
        }

        if (this.userModalMode === 'create' && (!this.userForm.email.trim() || !this.userForm.password.trim())) {
            this.errorMessage = 'E-posta ve şifre zorunludur.';
            return;
        }

        this.usersSaving = true;
        this.errorMessage = '';

        try {
            if (this.userModalMode === 'create') {
                const req: CreateUserRequest = {
                    name: this.userForm.name.trim(),
                    lastName: this.userForm.lastName.trim(),
                    email: this.userForm.email.trim(),
                    password: this.userForm.password,
                    gender: this.userForm.gender,
                };
                await this.usersService.create(req);
                this.successMessage = 'Kullanıcı başarıyla oluşturuldu.';
            } else {
                if (!this.selectedUser) return;
                const req: UpdateUserRequest = {
                    name: this.userForm.name.trim(),
                    lastName: this.userForm.lastName.trim(),
                    gender: this.userForm.gender,
                    isBlocked: this.userForm.isBlocked ?? false,
                };
                await this.usersService.update(this.selectedUser.id, req);
                this.successMessage = 'Kullanıcı başarıyla güncellendi.';
            }
            this.showUserModal = false;
            await this.loadUsers();
        } catch (err) {
            console.error('Save user error:', err);
            this.errorMessage = 'Kullanıcı işlemi sırasında bir hata oluştu.';
        } finally {
            this.usersSaving = false;
        }
    }

    closeUserModal(): void {
        this.showUserModal = false;
        this.selectedUser = null;
        this.usersSaving = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SETTINGS TAB METHODS
    // ═══════════════════════════════════════════════════════════════════════

    async loadSettings(): Promise<void> {
        if (!this.companyId) {
            this.settingsErrorMessage = 'Şirket bilgisi bulunamadı.';
            return;
        }

        this.settingsLoading = true;
        this.settingsErrorMessage = '';
        try {
            const response = await this.companySettingsService.getByCompany(this.companyId);
            const data = this.extractData(response);
            if (data) {
                this.setting = data;
                this.settingsForm = {
                    isTwoFactorAuthEnabled: data.isTwoFactorAuthEnabled,
                    isAutoReplyEnabled: data.isAutoReplyEnabled,
                    isUseWorkHours: data.isUseWorkHours ?? false,
                    workHoursStart: data.workHoursStart ?? '09:00',
                    workHoursEnd: data.workHoursEnd ?? '18:00',
                };
            }
        } catch (err: any) {
            console.error('CompanySettings load error:', err);
            this.setting = null;
        } finally {
            this.settingsLoading = false;
        }
    }

    async saveSettings(): Promise<void> {
        this.settingsSaving = true;
        this.settingsSuccessMessage = '';
        this.settingsErrorMessage = '';

        try {
            if (this.setting) {
                const req: UpdateCompanySettingRequest = {
                    isTwoFactorAuthEnabled: this.settingsForm.isTwoFactorAuthEnabled,
                    isAutoReplyEnabled: this.settingsForm.isAutoReplyEnabled,
                    isUseWorkHours: this.settingsForm.isUseWorkHours,
                    workHoursStart: this.settingsForm.isUseWorkHours ? this.settingsForm.workHoursStart : null,
                    workHoursEnd: this.settingsForm.isUseWorkHours ? this.settingsForm.workHoursEnd : null,
                };
                await this.companySettingsService.update(this.setting.id, req);
                this.settingsSuccessMessage = 'Ayarlar başarıyla güncellendi.';
            } else {
                const req: CreateCompanySettingRequest = {
                    companyId: this.companyId,
                    isTwoFactorAuthEnabled: this.settingsForm.isTwoFactorAuthEnabled,
                    isAutoReplyEnabled: this.settingsForm.isAutoReplyEnabled,
                    isUseWorkHours: this.settingsForm.isUseWorkHours,
                    workHoursStart: this.settingsForm.isUseWorkHours ? this.settingsForm.workHoursStart : null,
                    workHoursEnd: this.settingsForm.isUseWorkHours ? this.settingsForm.workHoursEnd : null,
                };
                await this.companySettingsService.create(req);
                this.settingsSuccessMessage = 'Ayarlar başarıyla oluşturuldu.';
            }
            await this.loadSettings();
        } catch (err: any) {
            console.error('CompanySettings save error:', err);
            this.settingsErrorMessage = 'Ayarlar kaydedilirken hata oluştu.';
        } finally {
            this.settingsSaving = false;
        }
    }

    private extractData(response: any): CompanySetting | null {
        if (!response) return null;
        if (response.data) return response.data;
        if (response.result) return response.result;
        if (response.id) return response;
        return null;
    }

    // Tab switching
    switchTab(tab: 'company' | 'users' | 'settings'): void {
        this.activeTab = tab;
    }
}
