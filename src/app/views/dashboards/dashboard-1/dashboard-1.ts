import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { WelcomeSplash } from '@app/components/welcome-splash/welcome-splash';
import { UserRequestsService } from '@core/services/user-requests.service';
import { UserMenuService } from '@core/services/user-menu.service';
import { AuthStateService } from '@core/services/auth-state.service';
import { SupportRoleService } from '@core/services/support-role.service';
import { RequestStatusesService } from '@core/services/request-statuses.service';
import { RequestApplicationsService } from '@core/services/request-applications.service';
import { ReleaseNotesService } from '@core/services/release-notes.service';
import { UrlQueryStateService } from '@core/services/url-query-state.service';
import { SupportReportsService } from '@core/services/support-reports.service';
import { RequestActivityNotifierService } from '@core/services/request-activity-notifier.service';
import { SupportPerformanceReportResponse } from '@core/models/support-report/support-report.models';
import { Subscription } from 'rxjs';
import { UserRequestResponse } from '@core/models/user-request/user-request.models';
import { RequestStatusResponse } from '@core/models/request-status/request-status.models';
import { RequestApplicationResponse } from '@core/models/request-application/request-application.models';
import { ReleaseNote } from '@core/models/release-note/release-note.models';
import {
    formatDateTime,
    fullName,
    getDurationLabel,
    getRelativeTimeLabel,
    isRequestClosed,
    parseDateKey,
    toDateKey,
    toTime,
} from '@/app/utils/support-request.utils';
import {
    BreakdownItem,
    ChartBucket,
    DateRange,
    MAX_CUSTOM_RANGE_DAYS,
    PRESET_RANGES,
    RangeKey,
    buildBreakdown,
    buildChartBuckets,
    customRange,
    greetingFor,
    isInRange,
    oldestOpenRequests,
    openRequests,
    presetRange,
    previousRange,
} from './dashboard-stats';

interface StatusCard {
    title: string;
    count: number;
    share: number;
    isSolved: boolean;
    statusId: string | null;
}

interface WorkCard {
    label: string;
    value: number | null;
    note?: string;
    link?: string[];
    query?: Params;
}

interface BreakdownPanel {
    title: string;
    items: BreakdownItem[];
    // Satıra tıklanınca Talepler listesi bu parametreyle süzülür; yoksa satır bağlantı değildir
    queryKey?: string;
}

const DEFAULT_RANGE: RangeKey = '7';
const MAX_LOADED_REQUESTS = 1000;
const AUTO_REFRESH_MS = 2 * 60 * 1000;
// API'nin durum özeti en çok 62 günü kapsar
const SUMMARY_API_MAX_DAYS = 62;
const LIST_URL = ['/admin/user-requests'];

@Component({
    selector: 'app-dashboard-1',
    imports: [CommonModule, FormsModule, RouterLink, WelcomeSplash],
    templateUrl: './dashboard-1.html',
    styleUrl: './dashboard-1.scss',
})
export class Dashboard1 implements OnInit, OnDestroy {
    readonly presetRanges = PRESET_RANGES;
    readonly listUrl = LIST_URL;
    readonly todayKey = toDateKey(new Date());

    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private activitySubscription: Subscription | null = null;
    private activityRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    // Dönemin performans raporu (ilk yanıt / çözüm süresi, hedef süre, memnuniyet); eski API'de boş kalır
    performance: SupportPerformanceReportResponse | null = null;
    performanceLoading = false;
    private currentUserId = '';

    isAdmin = false;
    rolesLoaded = false;
    greeting = '';
    lastLoginText = '';

    // Dönem
    range: DateRange = presetRange('7');
    customStart = '';
    customEnd = '';
    showCustomRange = false;
    customRangeError = '';

    // Veri
    items: UserRequestResponse[] = [];
    totalRequestCount = 0;
    statuses: RequestStatusResponse[] = [];
    applications: RequestApplicationResponse[] = [];
    myAssignedOpenCount: number | null = null;
    loading = false;
    itemsLoaded = false;
    itemsError = false;
    summaryLoading = false;
    summaryError = false;
    lastUpdated: Date | null = null;

    // Ekranda gösterilen hesaplar
    statusCards: StatusCard[] = [];
    periodTotal = 0;
    previousPeriodTotal: number | null = null;
    workCards: WorkCard[] = [];
    chartBuckets: ChartBucket[] = [];
    chartMax = 1;
    breakdownPanels: BreakdownPanel[] = [];
    adminPanels: BreakdownPanel[] = [];
    oldestOpen: UserRequestResponse[] = [];
    recentRequests: UserRequestResponse[] = [];
    latestReleaseNote: { version: string; date: string; items: string[] } | null = null;

    // Hızlı talep (talep açan kullanıcı)
    quickApplicationId = '';
    quickSubject = '';

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly userRequestsService: UserRequestsService,
        private readonly userMenuService: UserMenuService,
        private readonly authStateService: AuthStateService,
        private readonly supportRoleService: SupportRoleService,
        private readonly statusService: RequestStatusesService,
        private readonly applicationsService: RequestApplicationsService,
        private readonly releaseNotesService: ReleaseNotesService,
        private readonly urlQueryState: UrlQueryStateService,
        private readonly supportReportsService: SupportReportsService,
        private readonly activityNotifier: RequestActivityNotifierService,
    ) {}

    async ngOnInit(): Promise<void> {
        this.currentUserId = this.userMenuService.getUserIdFromToken() ?? '';
        this.buildGreeting();
        this.readRangeQuery();
        this.loadLatestReleaseNote();

        const roles = await this.supportRoleService.getCurrentRoles();
        this.isAdmin = roles.isAdmin;
        this.rolesLoaded = true;

        await Promise.all([this.loadStatuses(), this.loadApplications(), this.refreshDashboard()]);
        this.refreshTimer = setInterval(() => {
            if (!document.hidden && !this.loading) this.refreshDashboard(true);
        }, AUTO_REFRESH_MS);

        // Yeni talep / yanıt gelince sayılar sessizce yenilenir (art arda olaylar tek yenilemede toplanır)
        this.activitySubscription = this.activityNotifier.changes$.subscribe(() => {
            if (this.activityRefreshTimer) clearTimeout(this.activityRefreshTimer);
            this.activityRefreshTimer = setTimeout(() => {
                this.activityRefreshTimer = null;
                if (!this.loading) this.refreshDashboard(true);
            }, 2000);
        });
    }

    ngOnDestroy(): void {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = null;
        this.activitySubscription?.unsubscribe();
        if (this.activityRefreshTimer) clearTimeout(this.activityRefreshTimer);
    }

    get pageTitle(): string {
        return this.isAdmin ? 'Destek Yönetimi' : 'Destek Merkezi';
    }

    get allLoaded(): boolean {
        return this.items.length >= this.totalRequestCount;
    }

    // ── Dönem ──
    private readRangeQuery(): void {
        const key = this.urlQueryState.read(this.route, 'donem');
        if (key === 'ozel') {
            const start = parseDateKey(this.urlQueryState.read(this.route, 'baslangic'));
            const end = parseDateKey(this.urlQueryState.read(this.route, 'bitis'));
            const range = start && end ? customRange(start, end) : null;
            if (range) {
                this.range = range;
                this.customStart = toDateKey(range.start);
                this.customEnd = toDateKey(range.end);
                this.showCustomRange = true;
                return;
            }
        }
        const preset = PRESET_RANGES.find(item => item.key === key)?.key ?? DEFAULT_RANGE;
        this.range = presetRange(preset as Exclude<RangeKey, 'ozel'>);
    }

    private writeRangeQuery(): void {
        const isCustom = this.range.key === 'ozel';
        this.urlQueryState.write(this.route, {
            donem: this.range.key === DEFAULT_RANGE ? null : this.range.key,
            baslangic: isCustom ? this.range.start : null,
            bitis: isCustom ? this.range.end : null,
        });
    }

    async selectPreset(key: Exclude<RangeKey, 'ozel'>): Promise<void> {
        if (this.range.key === key && !this.showCustomRange) return;
        this.showCustomRange = false;
        this.customRangeError = '';
        this.range = presetRange(key);
        await this.onRangeChanged();
    }

    toggleCustomRange(): void {
        this.showCustomRange = !this.showCustomRange;
        if (this.showCustomRange && !this.customStart) {
            this.customStart = toDateKey(this.range.start);
            this.customEnd = toDateKey(this.range.end);
        }
    }

    async applyCustomRange(): Promise<void> {
        const start = parseDateKey(this.customStart);
        const end = parseDateKey(this.customEnd);
        const range = start && end ? customRange(start, end) : null;
        if (!range) {
            this.customRangeError = `Geçerli bir aralık seçin: başlangıç bitişten önce, bitiş en geç bugün, en çok ${MAX_CUSTOM_RANGE_DAYS} gün.`;
            return;
        }
        this.customRangeError = '';
        this.range = range;
        await this.onRangeChanged();
    }

    private async onRangeChanged(): Promise<void> {
        this.writeRangeQuery();
        this.recompute();
        await this.loadPerformance();
    }

    get rangeLabel(): string {
        if (this.range.key === 'ozel') {
            const format = (date: Date) => date.toLocaleDateString('tr-TR');
            return `${format(this.range.start)} - ${format(this.range.end)}`;
        }
        return this.range.key === 'bugun' ? 'Bugün' : `Son ${this.range.days} gün`;
    }

    // ── Veri yükleme ──
    async refreshDashboard(silent = false): Promise<void> {
        await Promise.all([this.loadItems(silent), this.loadMyAssigned(), this.loadPerformance(silent)]);
        this.lastUpdated = new Date();
    }

    private async loadPerformance(silent = false): Promise<void> {
        const range = this.range;
        if (!silent) this.performanceLoading = true;
        try {
            const response = await this.supportReportsService.getPerformance({
                startDate: toDateKey(range.start),
                endDate: toDateKey(range.end),
            });
            if (range === this.range) this.performance = response?.data ?? null;
        } catch {
            if (range === this.range && !silent) this.performance = null;
        } finally {
            this.performanceLoading = false;
        }
    }

    // Yönetici tüm şirketlerin taleplerini, şirket kullanıcısı kendi şirketinin taleplerini görür (kapsamı API token'daki
    // kullanıcıya göre belirler; istekteki userId / companyId dikkate alınmaz). Hesaplar en yeni
    // 1000 talep üzerinden yapılır; daha fazla talep varsa ekranda belirtilir.
    private async loadItems(silent = false): Promise<void> {
        if (!this.currentUserId) return;
        if (!silent) this.loading = true;
        try {
            const sort = { sortBy: 'createdDate', sortDescending: true };
            const result = this.isAdmin
                ? await this.userRequestsService.adminGetAllPaged({ pageNumber: 1, ...sort }, MAX_LOADED_REQUESTS)
                : await this.userRequestsService.getAllPaged({
                    userId: this.currentUserId,
                    companyId: this.authStateService.profile?.companyId ?? '',
                    pageNumber: 1,
                    ...sort,
                }, MAX_LOADED_REQUESTS);
            this.items = [...result.items].sort((left, right) => toTime(right.createdDate) - toTime(left.createdDate));
            this.totalRequestCount = Math.max(result.totalCount, this.items.length);
            this.itemsLoaded = true;
            this.itemsError = false;
            this.recompute();
        } catch {
            if (!silent) this.itemsError = true;
        } finally {
            this.loading = false;
        }
    }

    // Yüklenen talepler dönemi kapsamıyorsa (1000'den fazla talep) durum özeti API'den alınır; önceki dönemle
    // karşılaştırma için iki katı süre de istenir. Özel aralıkta API kullanılamaz, yüklenen talepler sayılır.
    private async loadSummaryFromApi(): Promise<void> {
        const range = this.range;
        this.summaryLoading = true;
        try {
            const [current, doubled] = await Promise.all([
                this.userRequestsService.getStatusSummaryReport({ userId: this.currentUserId, dayCount: range.days }),
                range.days * 2 <= SUMMARY_API_MAX_DAYS
                    ? this.userRequestsService.getStatusSummaryReport({ userId: this.currentUserId, dayCount: range.days * 2 })
                    : Promise.resolve(null),
            ]);
            if (range !== this.range) return;

            const items = current?.data?.items ?? [];
            this.periodTotal = current?.data?.totalCount ?? items.reduce((sum, item) => sum + item.count, 0);
            const doubledTotal = doubled?.data?.totalCount;
            this.previousPeriodTotal = typeof doubledTotal === 'number' ? Math.max(0, doubledTotal - this.periodTotal) : null;
            this.statusCards = this.sortStatusCards(items.map(item => this.toStatusCard(item.statusName, item.count, this.periodTotal)));
            this.summaryError = false;
        } catch {
            if (range !== this.range) return;
            this.summaryError = true;
            this.statusCards = [];
        } finally {
            this.summaryLoading = false;
        }
    }

    private async loadMyAssigned(): Promise<void> {
        if (!this.isAdmin || !this.currentUserId) return;
        try {
            const response = await this.userRequestsService.getByAssignedUser(this.currentUserId);
            const items = Array.isArray(response?.data) ? response.data : [];
            this.myAssignedOpenCount = items.filter(item => !isRequestClosed(item)).length;
        } catch {
            this.myAssignedOpenCount = null;
        }
        this.buildWorkCards();
    }

    private async loadStatuses(): Promise<void> {
        try {
            const response = await this.statusService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.statuses = response?.data?.items ?? [];
            this.statusCards = this.sortStatusCards(this.statusCards.map(card => ({ ...card, statusId: this.findStatusId(card.title) })));
        } catch {
            this.statuses = [];
        }
    }

    private async loadApplications(): Promise<void> {
        if (this.isAdmin) return;
        try {
            const response = await this.applicationsService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.applications = (response?.data?.items ?? []).filter(item => !item.isBlocked);
        } catch {
            this.applications = [];
        }
    }

    private async loadLatestReleaseNote(): Promise<void> {
        const versions = await this.releaseNotesService.getVersions();
        if (!versions.length) return;
        const [note] = await this.releaseNotesService.getNotes([versions[0]]);
        this.latestReleaseNote = note ? this.toReleaseSummary(note) : null;
    }

    private toReleaseSummary(note: ReleaseNote): { version: string; date: string; items: string[] } | null {
        const items = note.sections
            .flatMap(section => section.items.map(item => (section.title ? `${section.title}: ${item}` : item)))
            .slice(0, 4);
        return items.length ? { version: note.version, date: note.date, items } : null;
    }

    private get companyId(): string {
        return this.authStateService.profile?.companyId ?? '';
    }

    // ── Hesaplar ──
    private recompute(): void {
        const inRange = this.items.filter(item => isInRange(item.createdDate, this.range));

        this.chartBuckets = buildChartBuckets(this.items, this.range);
        this.chartMax = Math.max(1, ...this.chartBuckets.map(bucket => Math.max(bucket.opened, bucket.closed)));

        this.breakdownPanels = [
            {
                title: 'Önceliğe Göre',
                items: buildBreakdown(inRange, item => item.priorityId, item => item.priorityName),
                queryKey: 'oncelik',
            },
            {
                title: 'Uygulamaya Göre',
                items: buildBreakdown(inRange, item => item.applicationId, item => item.applicationName),
                queryKey: 'uygulama',
            },
            {
                title: 'Kategoriye Göre',
                items: buildBreakdown(inRange, item => item.categoryId, item => item.categoryName),
                queryKey: 'kategori',
            },
        ];

        const open = openRequests(this.items);
        this.adminPanels = this.isAdmin
            ? [
                {
                    title: 'Şirkete Göre (dönemde açılan)',
                    items: buildBreakdown(inRange, item => item.companyDescription, item => item.companyDescription, 8),
                },
                {
                    title: 'Temsilci Yükü (açık talepler)',
                    items: buildBreakdown(
                        open,
                        item => item.assignedUserId,
                        item => (item.assignedUserId ? fullName(item.assignedUserName, item.assignedUserLastName) : 'Atanmadı'),
                        8,
                    ),
                },
            ]
            : [];

        this.oldestOpen = oldestOpenRequests(this.items);
        this.recentRequests = this.items.slice(0, 5);

        this.updateStatusCards();
        this.buildWorkCards();
    }

    // Durum kartları grafik ve dağılımlarla aynı taleplerden sayılır (sayılar birbirini tutsun).
    private updateStatusCards(): void {
        if (!this.itemsLoaded) return;
        if (!this.coversRange(this.range) && this.range.key !== 'ozel' && this.range.days <= SUMMARY_API_MAX_DAYS) {
            this.loadSummaryFromApi();
            return;
        }

        const inRange = this.items.filter(item => isInRange(item.createdDate, this.range));
        this.summaryError = false;
        this.periodTotal = inRange.length;
        this.statusCards = this.sortStatusCards(
            buildBreakdown(inRange, item => item.statusName, item => item.statusName, 50)
                .map(item => this.toStatusCard(item.label, item.count, inRange.length)),
        );

        const previous = previousRange(this.range);
        this.previousPeriodTotal = this.coversRange(previous)
            ? this.items.filter(item => isInRange(item.createdDate, previous)).length
            : null;
    }

    // Yüklenen talepler bu dönemin tamamını içeriyor mu
    private coversRange(range: DateRange): boolean {
        if (this.allLoaded) return true;
        const oldest = this.items.at(-1);
        return !!oldest && toTime(oldest.createdDate) <= range.start.getTime();
    }

    // Kartlar durum tanımındaki sıraya göre dizilir; tanımda olmayanlar sona
    private sortStatusCards(cards: StatusCard[]): StatusCard[] {
        const orderOf = (card: StatusCard) => this.statuses.find(status => status.id === card.statusId)?.order ?? Number.MAX_SAFE_INTEGER;
        return [...cards].sort((left, right) => orderOf(left) - orderOf(right) || right.count - left.count);
    }

    private buildWorkCards(): void {
        const open = openRequests(this.items);
        const today = presetRange('bugun');
        const openedToday = this.items.filter(item => isInRange(item.createdDate, today)).length;
        const closedToday = this.items.filter(item => isInRange(item.closedDate, today)).length;

        // Son mesajın kimden geldiği yeni API'de gelir; gelmiyorsa "yanıt bekleyen" kartı gösterilmez
        const hasReplyInfo = open.some(item => typeof item.lastMessageFromManager === 'boolean');
        const awaitingManager = open.filter(item => item.lastMessageFromManager === false).length;
        const awaitingCustomer = open.filter(item => item.lastMessageFromManager === true).length;

        if (this.isAdmin) {
            this.workCards = [
                ...(hasReplyInfo ? [{ label: 'Yanıt bekleyen talep', value: awaitingManager, note: 'Son mesaj müşteriden' }] : []),
                { label: 'Atanmamış açık talep', value: open.filter(item => !item.assignedUserId).length },
                { label: 'Bana atanan açık talep', value: this.myAssignedOpenCount, link: ['/admin/user-requests/all'] },
                { label: 'Bugün açılan', value: openedToday },
                { label: 'Bugün kapanan', value: closedToday },
            ];
            return;
        }

        this.workCards = [
            ...(hasReplyInfo ? [{ label: 'Sizden yanıt bekleyen', value: awaitingCustomer, note: 'Destek ekibi yanıtladı' }] : []),
            { label: 'Açık taleplerim', value: open.length },
            { label: 'Bu dönemde açılan', value: this.items.filter(item => isInRange(item.createdDate, this.range)).length, note: this.rangeLabel },
            { label: 'Bu dönemde kapanan', value: this.items.filter(item => isInRange(item.closedDate, this.range)).length, note: this.rangeLabel },
        ];
    }

    // ── Performans ──
    // Dakika cinsinden süreyi okunur yazar: "45 dk", "3,5 saat", "2,1 gün"
    formatMinutes(minutes?: number | null): string {
        if (minutes === null || minutes === undefined) return '-';
        if (minutes < 60) return `${Math.max(1, Math.round(minutes))} dk`;
        const hours = minutes / 60;
        if (hours < 24) return `${hours.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} saat`;
        return `${(hours / 24).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`;
    }

    formatRating(value?: number | null): string {
        return value === null || value === undefined ? '-' : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
    }

    get withinTargetPercent(): number | null {
        const report = this.performance;
        if (!report?.closedWithTargetCount) return null;
        return Math.round((report.closedWithinTargetCount / report.closedWithTargetCount) * 100);
    }

    private toStatusCard(title: string, count: number, total: number): StatusCard {
        const normalized = this.normalizeText(title);
        return {
            title,
            count,
            share: total > 0 ? Math.round((count / total) * 100) : 0,
            isSolved: normalized.includes('cozul') || normalized.includes('tamam'),
            statusId: this.findStatusId(title),
        };
    }

    private findStatusId(name: string): string | null {
        const normalized = this.normalizeText(name);
        return this.statuses.find(status => this.normalizeText(status.name) === normalized)?.id ?? null;
    }

    private normalizeText(value: string | null | undefined): string {
        return (value || '')
            .trim()
            .toLocaleLowerCase('tr-TR')
            .replaceAll('ı', 'i')
            .replaceAll('ş', 's')
            .replaceAll('ğ', 'g')
            .replaceAll('ü', 'u')
            .replaceAll('ö', 'o')
            .replaceAll('ç', 'c');
    }

    // ── Görünüm yardımcıları ──
    get periodDiff(): number | null {
        return this.previousPeriodTotal === null ? null : this.periodTotal - this.previousPeriodTotal;
    }

    get hasChartData(): boolean {
        return this.chartBuckets.some(bucket => bucket.opened > 0 || bucket.closed > 0);
    }

    get chartDense(): boolean {
        return this.chartBuckets.length > 14;
    }

    barHeight(value: number): number {
        if (value <= 0) return 0;
        return Math.max(3, Math.round((value / this.chartMax) * 85));
    }

    breakdownQuery(panel: BreakdownPanel, item: BreakdownItem): Params | null {
        return panel.queryKey && item.key ? { [panel.queryKey]: item.key } : null;
    }

    statusQuery(card: StatusCard): Params | null {
        return card.statusId ? { durum: card.statusId } : null;
    }

    ownerName(item: UserRequestResponse): string {
        return fullName(item.userName, item.userLastName) || '-';
    }

    formatDate(value?: string | null): string {
        return formatDateTime(value);
    }

    relativeTime(value?: string | null): string {
        return getRelativeTimeLabel(value);
    }

    age(value?: string | null): string {
        const duration = getDurationLabel(value);
        return duration === 'az' ? 'şimdi' : duration;
    }

    get lastUpdatedText(): string {
        return this.lastUpdated
            ? this.lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            : '';
    }

    private buildGreeting(): void {
        const profile = this.authStateService.profile;
        const name = (profile?.name ?? '').trim();
        const firstName = name ? name.charAt(0).toLocaleUpperCase('tr-TR') + name.slice(1).toLocaleLowerCase('tr-TR') : '';
        this.greeting = firstName ? `${greetingFor()}, ${firstName}` : greetingFor();
        this.lastLoginText = profile?.lastLoginDate ? formatDateTime(profile.lastLoginDate) : '';
    }

    // ── Hızlı talep ──
    startQuickRequest(): void {
        const queryParams: Params = { yeni: 1 };
        if (this.quickApplicationId) queryParams['yeniUygulama'] = this.quickApplicationId;
        if (this.quickSubject.trim()) queryParams['yeniKonu'] = this.quickSubject.trim();
        this.router.navigate(LIST_URL, { queryParams });
    }
}
