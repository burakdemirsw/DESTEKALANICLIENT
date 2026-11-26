import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PageTitle } from '@app/components/page-title';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/app/constants';
import { AppLogsService } from '@core/services/app-logs.service';
import { UrlQueryStateService } from '@core/services/url-query-state.service';
import {
    AppLogDetailResponse,
    AppLogLevel,
    AppLogPagedRequest,
    AppLogResponse,
} from '@core/models/app-log/app-log.models';

interface LevelOption {
    value: AppLogLevel | '';
    label: string;
}

const LEVEL_OPTIONS: LevelOption[] = [
    { value: '', label: 'Tümü' },
    { value: 'Error', label: 'Hata' },
    { value: 'Warning', label: 'Uyarı' },
    { value: 'Information', label: 'Bilgi' },
    { value: 'Request', label: 'İstek' },
];

const SEARCH_DEBOUNCE_MS = 400;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Sistem Logları: API hataları ve istek kayıtları (yalnız destek yöneticisi).
 * Filtreler, arama ve sayfa adres çubuğunda tutulur; sorgu cümlesindeki token'lar sunucuda maskelenir.
 */
@Component({
    selector: 'app-app-logs-page',
    imports: [FormsModule, DatePipe, PageTitle],
    templateUrl: './app-logs.html',
    styleUrl: './app-logs.scss',
})
export class AppLogsPage implements OnInit, OnDestroy {
    readonly levelOptions = LEVEL_OPTIONS;
    readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

    // Filtreler
    filterText = '';
    level: AppLogLevel | '' = '';
    statusCode: number | null = null;
    startDate = '';
    endDate = '';
    showFilters = true;

    // DataTable (sunucu taraflı sayfalama)
    filteredItems: AppLogResponse[] = [];
    pagedItems: AppLogResponse[] = [];
    currentPage = 1;
    pageSize = DEFAULT_PAGE_SIZE;
    totalCount = 0;
    totalPages = 1;
    totalPagesArray: number[] = [];

    loading = false;
    loadError = '';

    // Ayrıntı
    detail: AppLogDetailResponse | null = null;
    detailLoading = false;
    detailError = '';

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private appLogsService: AppLogsService,
        private urlState: UrlQueryStateService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.readStateFromUrl();
        this.applyFilterAndPaging();
    }

    ngOnDestroy(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
    }

    get hasActiveFilters(): boolean {
        return !!(this.level || this.statusCode || this.startDate || this.endDate);
    }

    get dateRangeInvalid(): boolean {
        return !!this.startDate && !!this.endDate && this.startDate > this.endDate;
    }

    levelLabel(level: string): string {
        return LEVEL_OPTIONS.find(o => o.value === level)?.label ?? level;
    }

    /** Arama yazılırken 400 ms duraksamadan sonra arar. */
    onFilterChange(): void {
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.currentPage = 1;
            this.applyFilterAndPaging();
        }, SEARCH_DEBOUNCE_MS);
    }

    /** Filtre formundan arama: veri gelirse filtre alanı kapanır. */
    async search(): Promise<void> {
        if (this.dateRangeInvalid) return;
        this.currentPage = 1;
        const found = await this.applyFilterAndPaging();
        if (found) this.showFilters = false;
    }

    clearFilters(): void {
        this.level = '';
        this.statusCode = null;
        this.startDate = '';
        this.endDate = '';
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.applyFilterAndPaging();
    }

    onPageSizeChange(): void {
        this.currentPage = 1;
        this.applyFilterAndPaging();
    }

    /** Sunucudan geçerli filtre ve sayfayı ister; kayıt geldiyse true döner. */
    async applyFilterAndPaging(): Promise<boolean> {
        if (this.dateRangeInvalid) return false;

        this.loading = true;
        this.loadError = '';
        this.writeStateToUrl();

        const request: AppLogPagedRequest = {
            pageNumber: this.currentPage,
            pageSize: this.pageSize,
            searchTerm: this.filterText.trim() || null,
            level: this.level || null,
            statusCode: this.statusCode || null,
            startDate: this.startDate || null,
            endDate: this.endDate || null,
        };

        try {
            const paged = (await this.appLogsService.getPaged(request))?.data;
            this.filteredItems = paged?.items ?? [];
            this.pagedItems = this.filteredItems;
            this.totalCount = paged?.totalCount ?? 0;
            this.totalPages = Math.max(1, paged?.totalPages ?? 1);

            // Adresteki sayfa artık yoksa ilk sayfa açılır
            if (this.currentPage > this.totalPages && this.totalCount > 0) {
                this.currentPage = 1;
                return this.applyFilterAndPaging();
            }

            this.totalPagesArray = this.visiblePages();
            return this.totalCount > 0;
        } catch (err) {
            this.filteredItems = [];
            this.pagedItems = [];
            this.loadError = this.describeError(err) || 'Loglar yüklenemedi.';
            this.showFilters = true;
            return false;
        } finally {
            this.loading = false;
        }
    }

    async openDetail(item: AppLogResponse): Promise<void> {
        this.detail = { ...item, stackTrace: null };
        this.detailError = '';
        this.detailLoading = true;
        try {
            const data = (await this.appLogsService.getById(item.id))?.data;
            if (data && this.detail?.id === item.id) this.detail = data;
        } catch (err) {
            this.detailError = this.describeError(err) || 'Log ayrıntısı alınamadı.';
        } finally {
            this.detailLoading = false;
        }
    }

    @HostListener('document:keydown.escape')
    closeDetail(): void {
        this.detail = null;
    }

    /** Uzun sayfa listelerinde geçerli sayfanın çevresindeki en çok 7 sayfa gösterilir. */
    private visiblePages(): number[] {
        const span = 3;
        const start = Math.max(1, Math.min(this.currentPage - span, this.totalPages - span * 2));
        const end = Math.min(this.totalPages, start + span * 2);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    private readStateFromUrl(): void {
        this.filterText = this.urlState.read(this.route, 'q');

        const level = this.urlState.read(this.route, 'level');
        this.level = LEVEL_OPTIONS.some(o => o.value === level) ? (level as AppLogLevel | '') : '';

        const status = Number(this.urlState.read(this.route, 'status'));
        this.statusCode = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;

        const from = this.urlState.read(this.route, 'from');
        const to = this.urlState.read(this.route, 'to');
        this.startDate = DATE_PATTERN.test(from) ? from : '';
        this.endDate = DATE_PATTERN.test(to) ? to : '';

        const size = Number(this.urlState.read(this.route, 'size'));
        this.pageSize = PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;

        const page = Number(this.urlState.read(this.route, 'page'));
        this.currentPage = Number.isInteger(page) && page > 0 ? page : 1;

        if (this.hasActiveFilters) this.showFilters = false;
    }

    private writeStateToUrl(): void {
        this.urlState.write(this.route, {
            q: this.filterText,
            level: this.level,
            status: this.statusCode,
            from: this.startDate,
            to: this.endDate,
            size: this.pageSize === DEFAULT_PAGE_SIZE ? null : this.pageSize,
            page: this.currentPage > 1 ? this.currentPage : null,
        });
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        if (httpError?.status === 403) return 'Bu sayfa yalnız destek yöneticileri içindir.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }
}
