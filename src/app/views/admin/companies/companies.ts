import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { CompaniesService } from '@/app/core/services/companies.service';
import { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/app/core/models/customer/company.models';
import { Country, City, District } from '@/app/core/models/address/address.models';
import { AddressesService } from '@/app/core/services/addresses.service';
import { PagedResult } from '@/app/core/models/pagination.model';
import { AuthStateService } from '@core/services/auth-state.service';
import { UrlQueryStateService } from '@core/services/url-query-state.service';
import { RowActions } from '@app/components/row-actions/row-actions';

type CompanyModalMode = 'create' | 'edit' | 'copy';

interface CompanyFormModel {
    name: string;
    taxNumber: string;
    taxOffice: string;
    tradeRegisterNo: string;
    mersisNo: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    countryId: string;
    cityId: string;
    districtId: string;
    // Modalda seçilmez; düzenlenen / kopyalanan şirketinki korunur, ilçe değişince boşalır
    neighbourhoodId: string;
    address: string;
    postalCode: string;
}

const SEARCH_DEBOUNCE_MS = 400;
const COPY_NAME_SUFFIX = ' (Kopya)';

const MODAL_TITLES: Record<CompanyModalMode, string> = {
    create: 'Yeni Şirket',
    edit: 'Şirket Düzenle',
    copy: 'Şirket Kopyala',
};

const SAVE_LABELS: Record<CompanyModalMode, string> = {
    create: 'Kaydet',
    edit: 'Güncelle',
    copy: 'Kopyala',
};

const SUCCESS_MESSAGES: Record<CompanyModalMode, string> = {
    create: 'Şirket eklendi.',
    edit: 'Şirket güncellendi.',
    copy: 'Şirket kopyalandı.',
};

function emptyForm(): CompanyFormModel {
    return {
        name: '', taxNumber: '', taxOffice: '', tradeRegisterNo: '', mersisNo: '',
        phone: '', email: '', website: '', logoUrl: '',
        countryId: '', cityId: '', districtId: '', neighbourhoodId: '', address: '', postalCode: '',
    };
}

function formFromCompany(item: Company): CompanyFormModel {
    return {
        name: item.name || '',
        taxNumber: item.taxNumber || '',
        taxOffice: item.taxOffice || '',
        tradeRegisterNo: item.tradeRegisterNo || '',
        mersisNo: item.mersisNo || '',
        phone: item.phone || '',
        email: item.email || '',
        website: item.website || '',
        logoUrl: item.logoUrl || '',
        countryId: item.countryId || '',
        cityId: item.cityId || '',
        districtId: item.districtId || '',
        neighbourhoodId: item.neighbourhoodId || '',
        address: item.address || '',
        postalCode: item.postalCode || '',
    };
}

// Destek yöneticisinin şirket listesi: ekleme, düzenleme, kopyalama, silme; şirketin bilgi / kullanıcı / ayar
// işlemleri detayında (/admin/companies/:id) yapılır.
@Component({
    selector: 'app-companies-page',
    imports: [CommonModule, FormsModule, RouterModule, RowActions],
    templateUrl: './companies.html',
    styleUrl: './companies.scss',
})
export class CompaniesPage implements OnInit, OnDestroy {
    countries: Country[] = [];
    cities: City[] = [];
    districts: District[] = [];
    filteredCities: City[] = [];
    filteredDistricts: District[] = [];
    loading = false;
    loadError = '';

    // DataTable (sunucu taraflı sayfalama)
    filterText = '';
    filteredItems: Company[] = [];
    pagedItems: Company[] = [];
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    totalCount = 0;
    totalPagesArray: number[] = [];
    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    // Ekle / düzenle / kopyala modalı
    showModal = false;
    modalMode: CompanyModalMode = 'create';
    selectedItem: Company | null = null;
    form: CompanyFormModel = emptyForm();
    saving = false;
    modalError = '';

    // Silme onayı
    deleteTarget: Company | null = null;
    deleting = false;

    constructor(
        private service: CompaniesService,
        private addressesService: AddressesService,
        private authStateService: AuthStateService,
        private urlState: UrlQueryStateService,
        private route: ActivatedRoute,
    ) {}

    async ngOnInit(): Promise<void> {
        this.readStateFromUrl();
        await this.loadLookups();
        await this.applyFilterAndPaging();
    }

    ngOnDestroy(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
    }

    get modalTitle(): string {
        return MODAL_TITLES[this.modalMode];
    }

    get saveLabel(): string {
        return SAVE_LABELS[this.modalMode];
    }

    get canSave(): boolean {
        return !this.saving && !!this.form.name.trim();
    }

    async loadLookups(): Promise<void> {
        try {
            const [countryRes, cityRes, districtRes] = await Promise.all([
                this.addressesService.getCountries(),
                this.addressesService.getCities(),
                this.addressesService.getDistricts(),
            ]);
            this.countries = this.extractArray<Country>(countryRes?.data);
            this.cities = this.extractArray<City>(cityRes?.data);
            this.districts = this.extractArray<District>(districtRes?.data);
        } catch {
            // Adres listeleri gelmezse liste yine açılır; modalda seçim listeleri boş kalır
            this.countries = [];
            this.cities = [];
            this.districts = [];
        }
    }

    /** Sunucudan geçerli arama ve sayfayı ister. */
    async applyFilterAndPaging(): Promise<void> {
        this.loading = true;
        this.loadError = '';
        this.writeStateToUrl();
        try {
            const response = await this.service.getPaged({
                companyId: this.authStateService.profile?.companyId ?? '',
                pageNumber: this.currentPage,
                pageSize: this.pageSize,
                searchTerm: this.filterText.trim() || undefined,
            });
            const paged = PagedResult.from<Company>(response);
            this.filteredItems = paged.items;
            this.pagedItems = paged.items;
            this.totalCount = paged.totalCount;
            this.totalPages = Math.max(1, paged.totalPages || Math.ceil(this.totalCount / this.pageSize));

            // Adresteki sayfa artık yoksa ilk sayfa açılır
            if (this.currentPage > this.totalPages && this.totalCount > 0) {
                this.currentPage = 1;
                return this.applyFilterAndPaging();
            }
            this.buildPagesArray();
        } catch (err) {
            this.filteredItems = [];
            this.pagedItems = [];
            this.totalCount = 0;
            this.totalPages = 1;
            this.totalPagesArray = [];
            this.loadError = this.describeError(err) || 'Şirketler yüklenemedi.';
        } finally {
            this.loading = false;
        }
    }

    getCityName(item: Company): string {
        return item.cityName || this.cities.find(x => x.id === item.cityId)?.name || '-';
    }

    onCountryChange(): void {
        this.filteredCities = this.cities.filter(c => c.countryId === this.form.countryId);
        this.form.cityId = '';
        this.form.districtId = '';
        this.form.neighbourhoodId = '';
        this.filteredDistricts = [];
    }

    onCityChange(): void {
        this.filteredDistricts = this.districts.filter(d => d.cityId === this.form.cityId);
        this.form.districtId = '';
        this.form.neighbourhoodId = '';
    }

    onDistrictChange(): void {
        this.form.neighbourhoodId = '';
    }

    openCreate(): void {
        this.openModal('create', null, emptyForm());
    }

    openEdit(item: Company): void {
        this.openModal('edit', item, formFromCompany(item));
    }

    // Bilgiler dolu gelir; ad "(Kopya)" ekiyle başlar, kaydetmeden önce değiştirilebilir. Ayarlar API'de kopyalanır.
    openCopy(item: Company): void {
        const form = formFromCompany(item);
        form.name = `${form.name}${COPY_NAME_SUFFIX}`;
        this.openModal('copy', item, form);
    }

    private openModal(mode: CompanyModalMode, item: Company | null, form: CompanyFormModel): void {
        this.modalMode = mode;
        this.selectedItem = item;
        this.form = form;
        this.filteredCities = this.cities.filter(c => c.countryId === form.countryId);
        this.filteredDistricts = this.districts.filter(d => d.cityId === form.cityId);
        this.modalError = '';
        this.showModal = true;
    }

    async save(): Promise<void> {
        if (!this.canSave) return;
        this.saving = true;
        this.modalError = '';
        const mode = this.modalMode;
        try {
            const request = this.toRequest();
            if (mode === 'edit' && this.selectedItem) {
                const update: UpdateCompanyRequest = { ...request, isBlocked: this.selectedItem.isBlocked || false };
                await this.service.update(this.selectedItem.id, update);
            } else if (mode === 'copy' && this.selectedItem) {
                await this.service.copy(this.selectedItem.id, request);
            } else {
                await this.service.create(request);
            }
            this.showModal = false;
            this.showToast('success', SUCCESS_MESSAGES[mode]);
            await this.applyFilterAndPaging();
        } catch (err) {
            this.modalError = this.describeError(err) || 'İşlem sırasında bir hata oluştu.';
        } finally {
            this.saving = false;
        }
    }

    // Boş alanlar null gider (boş metin GUID alanlarında API'de geçersizdir)
    private toRequest(): CreateCompanyRequest {
        const f = this.form;
        const value = (text: string) => text.trim() || null;
        return {
            name: f.name.trim(),
            taxNumber: value(f.taxNumber),
            taxOffice: value(f.taxOffice),
            tradeRegisterNo: value(f.tradeRegisterNo),
            mersisNo: value(f.mersisNo),
            phone: value(f.phone),
            email: value(f.email),
            website: value(f.website),
            logoUrl: value(f.logoUrl),
            countryId: f.countryId || null,
            cityId: f.cityId || null,
            districtId: f.districtId || null,
            neighbourhoodId: f.neighbourhoodId || null,
            address: value(f.address),
            postalCode: value(f.postalCode),
        };
    }

    fillTestData(): void {
        const firstCountry = this.countries[0];
        const citiesForCountry = firstCountry ? this.cities.filter(c => c.countryId === firstCountry.id) : [];
        const firstCity = citiesForCountry[0];
        const districtsForCity = firstCity ? this.districts.filter(d => d.cityId === firstCity.id) : [];
        const firstDistrict = districtsForCity[0];

        this.form = {
            name: 'Test Teknoloji A.Ş.',
            taxNumber: '1234567890',
            taxOffice: 'Kadıköy Vergi Dairesi',
            tradeRegisterNo: 'TSN-2024-00001',
            mersisNo: '0123456789012345',
            phone: '+90 216 555 00 01',
            email: 'info@testteknoloji.com',
            website: 'https://www.testteknoloji.com',
            logoUrl: 'https://www.testteknoloji.com/logo.png',
            countryId: firstCountry?.id || '',
            cityId: firstCity?.id || '',
            districtId: firstDistrict?.id || '',
            neighbourhoodId: '',
            address: 'Atatürk Mah. Teknoloji Cad. No:42 Kat:3',
            postalCode: '34700',
        };
        this.filteredCities = citiesForCountry;
        this.filteredDistricts = districtsForCity;
    }

    closeModal(): void {
        if (this.saving) return;
        this.showModal = false;
    }

    askDelete(item: Company): void {
        this.deleteTarget = item;
    }

    cancelDelete(): void {
        if (this.deleting) return;
        this.deleteTarget = null;
    }

    async confirmDelete(): Promise<void> {
        if (!this.deleteTarget || this.deleting) return;
        this.deleting = true;
        try {
            await this.service.delete(this.deleteTarget.id);
            this.deleteTarget = null;
            this.showToast('success', 'Şirket silindi.');
            await this.applyFilterAndPaging();
        } catch (err) {
            this.showToast('error', this.describeError(err) || 'Şirket silinemedi.');
        } finally {
            this.deleting = false;
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.deleteTarget) {
            this.cancelDelete();
        } else if (this.showModal) {
            this.closeModal();
        }
    }

    // ────── Server-side Pagination ──────
    /** Arama yazılırken 400 ms duraksamadan sonra arar. */
    onFilterChange(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.currentPage = 1;
            this.applyFilterAndPaging();
        }, SEARCH_DEBOUNCE_MS);
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.applyFilterAndPaging();
    }

    private buildPagesArray(): void {
        const maxVisible = 7;
        if (this.totalPages <= maxVisible) {
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        } else {
            const pages: number[] = [];
            let start = Math.max(1, this.currentPage - 3);
            let end = Math.min(this.totalPages, this.currentPage + 3);
            if (start === 1) end = Math.min(this.totalPages, maxVisible);
            if (end === this.totalPages) start = Math.max(1, this.totalPages - maxVisible + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            this.totalPagesArray = pages;
        }
    }

    private readStateFromUrl(): void {
        this.filterText = this.urlState.read(this.route, 'q');
        const page = Number(this.urlState.read(this.route, 'page'));
        this.currentPage = Number.isInteger(page) && page > 0 ? page : 1;
    }

    private writeStateToUrl(): void {
        this.urlState.write(this.route, {
            q: this.filterText,
            page: this.currentPage > 1 ? this.currentPage : null,
        });
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        if (httpError?.status === 403) return 'Bu işlem yalnız destek yöneticileri içindir.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }

    private showToast(icon: 'success' | 'error', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' ? 4000 : 2200 });
    }

    private extractArray<T>(response: unknown): T[] {
        if (Array.isArray(response)) return response as T[];

        if (response && typeof response === 'object') {
            const r = response as { $values?: unknown; data?: unknown; items?: unknown; result?: unknown };

            if (Array.isArray(r.$values)) return r.$values as T[];
            if (Array.isArray(r.data)) return r.data as T[];
            if (r.data !== undefined) return [r.data as T];
            if (Array.isArray(r.items)) return r.items as T[];
            if (Array.isArray(r.result)) return r.result as T[];
            if (r.result !== undefined) return [r.result as T];
        }

        return [];
    }
}
