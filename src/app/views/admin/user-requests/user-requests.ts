import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { UserRequestsService } from '@/app/core/services/user-requests.service';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { RequestApplicationsService } from '@/app/core/services/request-applications.service';
import { UserMenuService } from '@/app/core/services/user-menu.service';
import { RequestDraftService } from '@/app/core/services/request-draft.service';
import { SupportRoleService } from '@/app/core/services/support-role.service';
import { RequestActivityNotifierService } from '@/app/core/services/request-activity-notifier.service';
import { Subscription } from 'rxjs';
import { UrlQueryStateService } from '@core/services/url-query-state.service';
import { AuthStateService } from '@core/services/auth-state.service';
import {
    UserRequest,
    UserRequestResponse,
    CreateUserRequestRequest,
    UserRequestPagedRequest,
} from '@/app/core/models/user-request/user-request.models';
import { RequestCategoryResponse } from '@/app/core/models/request-category/request-category.models';
import { RequestPriorityResponse } from '@/app/core/models/request-priority/request-priority.models';
import { RequestStatusResponse } from '@/app/core/models/request-status/request-status.models';
import { RequestApplicationResponse } from '@/app/core/models/request-application/request-application.models';
import {
    ATTACHMENT_ACCEPT,
    ATTACHMENT_RULES_TEXT,
    getClipboardFiles,
    getDroppedFiles,
    isFileDrag,
    MAX_REQUEST_ATTACHMENTS,
    prepareAttachment,
} from '@/app/utils/request-attachment';
import { formatDateTime, fullName, getRelativeTimeLabel, isRequestClosed } from '@/app/utils/support-request.utils';
import { csvDateStamp, downloadCsv } from '@/app/utils/csv-export';

type SortDirection = 'desc' | 'asc';

// Listenin adres çubuğundaki parametreleri (sayfa yenilenince / bağlantı paylaşılınca aynı liste açılır)
const LIST_QUERY = {
    search: 'q',
    application: 'uygulama',
    category: 'kategori',
    priority: 'oncelik',
    status: 'durum',
    page: 'sayfa',
    sort: 'siralama',
} as const;

// Yeni talep formunu dolu açan parametreler (Anasayfa, "Benzer yeni talep aç"); form açılınca adresten silinir.
const NEW_REQUEST_QUERY = {
    open: 'yeni',
    application: 'yeniUygulama',
    category: 'yeniKategori',
    subject: 'yeniKonu',
    related: 'ilgili',
} as const;

interface CreateForm {
    applicationId: string;
    categoryId: string;
    subject: string;
    description: string;
}

interface CreatePrefill {
    applicationId?: string;
    categoryId?: string;
    subject?: string;
    relatedRequestNo?: string;
}

@Component({
    selector: 'app-user-requests-page',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './user-requests.html',
    styleUrl: './user-requests.scss',
})
export class UserRequestsPage implements OnInit, OnDestroy {
    private static readonly MIN_DESCRIPTION_LENGTH = 20;
    private static readonly LIST_PAGE_SIZE = 20;
    private static readonly SEARCH_DELAY_MS = 400;
    private static readonly DRAFT_DELAY_MS = 600;
    private static readonly SIMILAR_DELAY_MS = 500;
    private static readonly CSV_MAX_ROWS = 5000;

    readonly attachmentAccept = ATTACHMENT_ACCEPT;
    readonly attachmentRulesText = ATTACHMENT_RULES_TEXT;
    readonly maxAttachments = MAX_REQUEST_ATTACHMENTS;
    readonly minDescriptionLength = UserRequestsPage.MIN_DESCRIPTION_LENGTH;

    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private draftTimer: ReturnType<typeof setTimeout> | null = null;
    private similarTimer: ReturnType<typeof setTimeout> | null = null;
    private similarRequestSeq = 0;
    private loadSeq = 0;
    private activitySubscription: Subscription | null = null;
    private activityRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    isAdmin = false;

    currentUserId = '';
    requests: UserRequest[] = [];
    categories: RequestCategoryResponse[] = [];
    applications: RequestApplicationResponse[] = [];
    priorities: RequestPriorityResponse[] = [];
    statuses: RequestStatusResponse[] = [];
    loading = true; // seçim listeleri yüklenirken "Talep bulunamadı" görünmesin
    loadError = false;
    exporting = false;
    showFilters = true;
    currentPage = 1;
    pageSize = UserRequestsPage.LIST_PAGE_SIZE;
    totalCount = 0;
    totalPages = 1;
    totalPagesArray: number[] = [];
    sortDirection: SortDirection = 'desc';
    filters = {
        searchTerm: '',
        applicationId: '',
        categoryId: '',
        priorityId: '',
        statusId: '',
    };

    // Yeni talep formu
    showModal = false;
    saveAttempted = false;
    saving = false;
    form: CreateForm = this.emptyForm();
    // Talep açanın seçtiği aciliyet (öncelik); varsayılan öncelikle açılır
    createPriorityId = '';
    attachmentFiles: File[] = [];
    attachmentErrors: string[] = [];
    dragActive = false;
    draftRestoredAt = '';
    similarRequests: UserRequestResponse[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private requestService: UserRequestsService,
        private categoryService: RequestCategoriesService,
        private priorityService: RequestPrioritiesService,
        private statusService: RequestStatusesService,
        private requestApplicationsService: RequestApplicationsService,
        private userMenuService: UserMenuService,
        private draftService: RequestDraftService,
        private urlQueryState: UrlQueryStateService,
        private authStateService: AuthStateService,
        private supportRoleService: SupportRoleService,
        private activityNotifier: RequestActivityNotifierService,
    ) {}

    async ngOnInit(): Promise<void> {
        this.currentUserId = this.userMenuService.getUserIdFromToken() ?? '';
        this.supportRoleService.getCurrentRoles().then(roles => (this.isAdmin = roles.isAdmin));

        // Başka biri yanıt yazınca / talep açınca liste sessizce yenilenir (art arda olaylar tek yenilemede toplanır)
        this.activitySubscription = this.activityNotifier.changes$.subscribe(() => {
            if (this.activityRefreshTimer) clearTimeout(this.activityRefreshTimer);
            this.activityRefreshTimer = setTimeout(() => {
                this.activityRefreshTimer = null;
                this.loadRequests(true);
            }, 1500);
        });

        await Promise.all([this.loadApplications(), this.loadCategories(), this.loadPriorities(), this.loadStatuses()]);

        this.readListQuery();
        const prefill = this.readNewRequestQuery();
        await this.loadRequests();

        if (prefill) {
            this.openCreate(prefill);
        }
    }

    ngOnDestroy(): void {
        this.activitySubscription?.unsubscribe();
        if (this.activityRefreshTimer) clearTimeout(this.activityRefreshTimer);
        this.clearTimer('searchTimer');
        this.clearTimer('similarTimer');
        if (this.draftTimer) {
            this.clearTimer('draftTimer');
            this.saveDraftNow();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.showModal && !this.saving) this.closeModal();
    }

    // ── Adres çubuğu ──
    // Adresten gelen değerler doğrulanır: seçim listesinde olmayan id, sayı olmayan sayfa yok sayılır.
    private readListQuery(): void {
        const read = (key: string) => this.urlQueryState.read(this.route, key);
        const pick = (value: string, list: { id: string }[]) => (list.some(item => item.id === value) ? value : '');

        this.filters = {
            searchTerm: read(LIST_QUERY.search),
            applicationId: pick(read(LIST_QUERY.application), this.applications),
            categoryId: pick(read(LIST_QUERY.category), this.categories),
            priorityId: pick(read(LIST_QUERY.priority), this.priorities),
            statusId: pick(read(LIST_QUERY.status), this.statuses),
        };

        const page = Number(read(LIST_QUERY.page));
        this.currentPage = Number.isInteger(page) && page > 1 ? page : 1;
        this.sortDirection = read(LIST_QUERY.sort) === 'eski' ? 'asc' : 'desc';
    }

    private readNewRequestQuery(): CreatePrefill | null {
        const read = (key: string) => this.urlQueryState.read(this.route, key);
        if (read(NEW_REQUEST_QUERY.open) !== '1') return null;

        const applicationId = read(NEW_REQUEST_QUERY.application);
        const categoryId = read(NEW_REQUEST_QUERY.category);
        return {
            applicationId: this.applications.some(item => item.id === applicationId) ? applicationId : '',
            categoryId: this.categories.some(item => item.id === categoryId) ? categoryId : '',
            subject: read(NEW_REQUEST_QUERY.subject).slice(0, 200),
            relatedRequestNo: read(NEW_REQUEST_QUERY.related).slice(0, 50),
        };
    }

    // Yalnız liste durumu yazılır; yeni talep parametreleri böylece adresten düşer.
    private writeListQuery(): void {
        this.urlQueryState.write(this.route, {
            [LIST_QUERY.search]: this.filters.searchTerm,
            [LIST_QUERY.application]: this.filters.applicationId,
            [LIST_QUERY.category]: this.filters.categoryId,
            [LIST_QUERY.priority]: this.filters.priorityId,
            [LIST_QUERY.status]: this.filters.statusId,
            [LIST_QUERY.page]: this.currentPage > 1 ? this.currentPage : null,
            [LIST_QUERY.sort]: this.sortDirection === 'asc' ? 'eski' : null,
        });
    }

    // ── Liste ──
    private buildListRequest(): UserRequestPagedRequest {
        return {
            userId: this.currentUserId,
            companyId: this.authStateService.profile?.companyId ?? '',
            pageNumber: this.currentPage,
            pageSize: this.pageSize,
            searchTerm: this.filters.searchTerm.trim() || undefined,
            applicationId: this.filters.applicationId || undefined,
            categoryId: this.filters.categoryId || undefined,
            priorityId: this.filters.priorityId || undefined,
            statusId: this.filters.statusId || undefined,
            sortBy: 'createdDate',
            sortDescending: this.sortDirection === 'desc',
        };
    }

    // silent: arka planda yenileme (yükleniyor yazısı gösterilmez, hata olursa eldeki liste kalır)
    async loadRequests(silent = false): Promise<void> {
        const seq = ++this.loadSeq;
        if (!silent) {
            this.loading = true;
            this.loadError = false;
        }
        try {
            const response = await this.requestService.getPaged(this.buildListRequest());
            if (seq !== this.loadSeq) return;

            const paged = response?.data;
            this.requests = paged?.items ?? [];
            this.totalCount = paged?.totalCount ?? this.requests.length;
            this.totalPages = Math.max(1, paged?.totalPages ?? Math.ceil(this.totalCount / this.pageSize));

            // Adresteki sayfa artık yoksa ilk sayfa açılır
            if (this.currentPage > this.totalPages) {
                this.currentPage = 1;
                await this.loadRequests();
                return;
            }
            this.buildPagesArray();
            this.writeListQuery();
        } catch {
            if (seq !== this.loadSeq || silent) return;
            this.requests = [];
            this.loadError = true;
        } finally {
            if (seq === this.loadSeq) this.loading = false;
        }
    }

    async onFilterChange(): Promise<void> {
        this.clearTimer('searchTimer');
        this.currentPage = 1;
        await this.loadRequests();
    }

    // Arama yazılırken 400 ms duraksamadan sonra aranır; Enter hemen arar.
    onSearchInput(): void {
        this.clearTimer('searchTimer');
        this.searchTimer = setTimeout(() => {
            this.searchTimer = null;
            this.onFilterChange();
        }, UserRequestsPage.SEARCH_DELAY_MS);
    }

    async setStatusFilter(statusId: string): Promise<void> {
        if (this.filters.statusId === statusId) return;
        this.filters.statusId = statusId;
        await this.onFilterChange();
    }

    async clearFilters(): Promise<void> {
        this.filters = { searchTerm: '', applicationId: '', categoryId: '', priorityId: '', statusId: '' };
        await this.onFilterChange();
    }

    get hasActiveFilters(): boolean {
        const f = this.filters;
        return !!(f.searchTerm.trim() || f.applicationId || f.categoryId || f.priorityId || f.statusId);
    }

    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    async toggleDateSort(): Promise<void> {
        this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        await this.onFilterChange();
    }

    setPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        this.currentPage = page;
        this.loadRequests();
    }

    private buildPagesArray(): void {
        const maxVisible = 7;
        if (this.totalPages <= maxVisible) {
            this.totalPagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
            return;
        }

        let start = Math.max(1, this.currentPage - 3);
        let end = Math.min(this.totalPages, this.currentPage + 3);
        if (start === 1) end = Math.min(this.totalPages, maxVisible);
        if (end === this.totalPages) start = Math.max(1, this.totalPages - maxVisible + 1);

        this.totalPagesArray = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    // ── CSV (Excel) ──
    // Süzülmüş listenin tamamı (en çok 5000 talep) indirilir.
    async exportCsv(): Promise<void> {
        if (this.exporting) return;
        this.exporting = true;
        try {
            const { items, totalCount } = await this.requestService.getAllPaged(
                { ...this.buildListRequest(), pageNumber: 1 },
                UserRequestsPage.CSV_MAX_ROWS,
            );
            if (!items.length) {
                this.toast('info', 'Aktarılacak talep yok.');
                return;
            }

            downloadCsv(
                `talepler-${csvDateStamp()}`,
                ['Talep No', 'Konu', 'Uygulama', 'Kategori', 'Öncelik', 'Durum', 'Talep Sahibi', 'Atanan Kişi', 'Oluşturma', 'Kapanış'],
                items.map(item => [
                    item.requestNo,
                    item.subject,
                    item.applicationName,
                    item.categoryName || this.getCategoryName(item.categoryId),
                    item.priorityName || this.getPriorityName(item.priorityId),
                    item.statusName || this.getStatusName(item.statusId),
                    this.getOwnerName(item),
                    item.assignedUserId ? this.getAssignedName(item) : '',
                    formatDateTime(item.createdDate),
                    item.closedDate ? formatDateTime(item.closedDate) : '',
                ]),
            );
            if (totalCount > items.length) {
                this.toast('info', `İlk ${items.length} talep aktarıldı (toplam ${totalCount}).`);
            }
        } catch {
            this.toast('error', 'Liste indirilemedi.');
        } finally {
            this.exporting = false;
        }
    }

    // ── Seçim listeleri ──
    private async loadCategories(): Promise<void> {
        try {
            const response = await this.categoryService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.categories = response?.data?.items ?? [];
        } catch {
            this.categories = [];
        }
    }

    private async loadPriorities(): Promise<void> {
        try {
            const response = await this.priorityService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.priorities = response?.data?.items ?? [];
        } catch {
            this.priorities = [];
        }
    }

    private async loadStatuses(): Promise<void> {
        try {
            const response = await this.statusService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.statuses = response?.data?.items ?? [];
        } catch {
            this.statuses = [];
        }
    }

    private async loadApplications(): Promise<void> {
        try {
            const response = await this.requestApplicationsService.getPaged({ companyId: this.companyId, pageNumber: 1, pageSize: 1000 });
            this.applications = response?.data?.items ?? [];
        } catch {
            this.applications = [];
        }
    }

    private get companyId(): string {
        return this.authStateService.profile?.companyId ?? '';
    }

    // ── Görünüm yardımcıları ──
    getCategoryName(id: string): string {
        return this.categories.find(c => c.id === id)?.name ?? '-';
    }

    getPriorityName(id: string): string {
        return this.priorities.find(p => p.id === id)?.name ?? '-';
    }

    getStatusName(id: string): string {
        return this.statuses.find(s => s.id === id)?.name ?? '-';
    }

    getOwnerName(item: UserRequest): string {
        return fullName(item.userName, item.userLastName) || '-';
    }

    getAssignedName(item: UserRequest): string {
        return fullName(item.assignedUserName, item.assignedUserLastName) || '-';
    }

    isClosed(item: UserRequest): boolean {
        return isRequestClosed(item);
    }

    formatDate(dateStr?: string | null): string {
        return formatDateTime(dateStr);
    }

    getRelativeTimeLabel(dateStr?: string | null): string {
        return getRelativeTimeLabel(dateStr);
    }

    // ── Yeni talep formu ──
    private emptyForm(): CreateForm {
        return { applicationId: '', categoryId: '', subject: '', description: '' };
    }

    openCreate(prefill?: CreatePrefill): void {
        this.saveAttempted = false;
        this.clearAttachments();
        this.similarRequests = [];
        this.draftRestoredAt = '';

        this.createPriorityId = this.defaultPriorityId;

        if (prefill) {
            this.form = {
                applicationId: prefill.applicationId ?? '',
                categoryId: prefill.applicationId ? (prefill.categoryId ?? '') : '',
                subject: prefill.subject ?? '',
                description: prefill.relatedRequestNo ? `İlgili talep: ${prefill.relatedRequestNo}\n\n` : '',
            };
        } else {
            const draft = this.draftService.load(this.currentUserId);
            this.form = draft
                ? {
                    applicationId: this.applications.some(a => a.id === draft.applicationId) ? draft.applicationId : '',
                    categoryId: this.categories.some(c => c.id === draft.categoryId) ? draft.categoryId : '',
                    subject: draft.subject,
                    description: draft.description,
                }
                : this.emptyForm();
            this.draftRestoredAt = draft ? formatDateTime(draft.savedAt) : '';
        }

        // Seçili kategori seçili uygulamaya ait değilse (bağı sonradan değişmiş) temizlenir
        if (this.form.categoryId && !this.isCategoryAllowed(this.form.categoryId)) {
            this.form.categoryId = '';
        }

        this.showModal = true;
        this.findSimilarRequests();
    }

    closeModal(): void {
        if (this.saving) return;
        this.clearTimer('draftTimer');
        this.clearTimer('similarTimer');
        this.saveDraftNow();
        this.showModal = false;
        this.saveAttempted = false;
        this.dragActive = false;
    }

    clearDraft(): void {
        this.draftService.clear(this.currentUserId);
        this.form = this.emptyForm();
        this.draftRestoredAt = '';
        this.similarRequests = [];
        this.saveAttempted = false;
    }

    // Formdaki her değişiklikte taslak kısa bir beklemeyle saklanır.
    onFormChange(): void {
        this.clearTimer('draftTimer');
        this.draftTimer = setTimeout(() => {
            this.draftTimer = null;
            this.saveDraftNow();
        }, UserRequestsPage.DRAFT_DELAY_MS);
    }

    onApplicationChange(): void {
        if (!this.form.applicationId || !this.isCategoryAllowed(this.form.categoryId)) this.form.categoryId = '';
        this.onFormChange();
    }

    // Uygulamaya bağlı kategori yalnız o uygulamada, bağı olmayan kategori her uygulamada seçilir
    private isCategoryAllowed(categoryId: string): boolean {
        const category = this.categories.find(c => c.id === categoryId);
        return !!category && (!category.applicationId || category.applicationId === this.form.applicationId);
    }

    onSubjectChange(): void {
        this.onFormChange();
        this.clearTimer('similarTimer');
        this.similarTimer = setTimeout(() => {
            this.similarTimer = null;
            this.findSimilarRequests();
        }, UserRequestsPage.SIMILAR_DELAY_MS);
    }

    private saveDraftNow(): void {
        if (!this.showModal) return;
        this.draftService.save(this.currentUserId, { ...this.form });
    }

    // Konu yazılırken aynı konuda açık talep varsa gösterilir (mükerrer talebi azaltmak için).
    private async findSimilarRequests(): Promise<void> {
        const subject = this.form.subject.trim();
        const seq = ++this.similarRequestSeq;
        if (subject.length < 4) {
            this.similarRequests = [];
            return;
        }
        try {
            const response = await this.requestService.getPaged({
                userId: this.currentUserId,
                companyId: this.companyId,
                pageNumber: 1,
                pageSize: 10,
                searchTerm: subject,
            });
            if (seq !== this.similarRequestSeq) return;
            this.similarRequests = (response?.data?.items ?? []).filter(item => !isRequestClosed(item)).slice(0, 3);
        } catch {
            if (seq === this.similarRequestSeq) this.similarRequests = [];
        }
    }

    get selectedCategoryHint(): string {
        return this.categories.find(c => c.id === this.form.categoryId)?.description?.trim() ?? '';
    }

    get activeCategories(): RequestCategoryResponse[] {
        return this.categories.filter(c =>
            (!c.isBlocked || c.id === this.form.categoryId) &&
            (!c.applicationId || c.applicationId === this.form.applicationId));
    }

    // Aciliyet seçimi: aktif öncelikler (önceliklerde hedef süre varsa yanında yazar)
    get activePriorities(): RequestPriorityResponse[] {
        return this.priorities.filter(p => !p.isBlocked || p.id === this.createPriorityId);
    }

    get defaultPriorityId(): string {
        return this.priorities.find(p => p.isDefault && !p.isBlocked)?.id ?? '';
    }

    priorityLabel(priority: RequestPriorityResponse): string {
        const hours = priority.targetHours;
        if (!hours) return priority.name;
        const target = hours % 24 === 0 ? `${hours / 24} gün` : `${hours} saat`;
        return `${priority.name} (hedef ${target})`;
    }

    // Listede sıradaki yanıtın kimden beklendiği (API son mesaj bilgisini göndermezse boş)
    waitingLabel(item: UserRequest): string {
        if (this.isClosed(item) || typeof item.lastMessageFromManager !== 'boolean') return '';
        if (this.isAdmin) return item.lastMessageFromManager ? '' : 'Yanıt bekliyor';
        return item.lastMessageFromManager ? 'Yanıtınız bekleniyor' : '';
    }

    get activeApplications(): RequestApplicationResponse[] {
        return this.applications.filter(a => !a.isBlocked || a.id === this.form.applicationId);
    }

    get descriptionLength(): number {
        return this.form.description.trim().length;
    }

    canSelectCategory(): boolean {
        return !!this.form.applicationId;
    }

    canEnterSubject(): boolean {
        return this.canSelectCategory() && !!this.form.categoryId;
    }

    canEnterDescription(): boolean {
        return this.canEnterSubject() && !!this.form.subject.trim();
    }

    isCreateFormValid(): boolean {
        return !!(
            this.currentUserId &&
            this.form.applicationId &&
            this.form.categoryId &&
            this.form.subject.trim() &&
            this.descriptionLength >= UserRequestsPage.MIN_DESCRIPTION_LENGTH
        );
    }

    shouldShowErrorFor(field: keyof CreateForm): boolean {
        if (!this.saveAttempted) return false;
        if (field === 'description') return this.descriptionLength < UserRequestsPage.MIN_DESCRIPTION_LENGTH;
        return !this.form[field].trim();
    }

    // ── Dosya eki ──
    onAttachmentSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.addAttachments(Array.from(input.files ?? []));
        input.value = '';
    }

    onPaste(event: ClipboardEvent): void {
        const files = getClipboardFiles(event);
        if (!files.length) return;
        event.preventDefault();
        this.addAttachments(files);
    }

    onDragOver(event: DragEvent): void {
        if (!isFileDrag(event) || this.saving) return;
        event.preventDefault();
        this.dragActive = true;
    }

    onDragLeave(event: DragEvent): void {
        const container = event.currentTarget as HTMLElement | null;
        if (container && event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
        this.dragActive = false;
    }

    onDrop(event: DragEvent): void {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        this.dragActive = false;
        const files = getDroppedFiles(event);
        if (files.length) this.addAttachments(files);
    }

    // Dosyaları denetleyip listeye ekler (en çok MAX_REQUEST_ATTACHMENTS). Geçersiz olanlar eklenmez, nedenleri alanın
    // altında dosya adıyla yazar; aynı dosya ikinci kez eklenmez.
    private addAttachments(files: File[]): void {
        const errors: string[] = [];
        const next = [...this.attachmentFiles];

        for (const file of files) {
            if (next.length >= MAX_REQUEST_ATTACHMENTS) {
                errors.push(`En çok ${MAX_REQUEST_ATTACHMENTS} dosya eklenebilir.`);
                break;
            }
            const result = prepareAttachment(file);
            if (result.error !== null) {
                errors.push(result.error);
                continue;
            }
            const isDuplicate = next.some(f => f.name === result.file.name && f.size === result.file.size);
            if (!isDuplicate) next.push(result.file);
        }

        this.attachmentFiles = next;
        this.attachmentErrors = errors;
    }

    removeAttachment(index: number): void {
        this.attachmentFiles = this.attachmentFiles.filter((_, i) => i !== index);
        this.attachmentErrors = [];
    }

    clearAttachments(): void {
        this.attachmentFiles = [];
        this.attachmentErrors = [];
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    }

    async save(): Promise<void> {
        if (this.saving) return;
        this.saveAttempted = true;
        if (!this.isCreateFormValid()) return;

        const req: CreateUserRequestRequest = {
            priorityId: this.createPriorityId || null,
            userId: this.currentUserId,
            applicationId: this.form.applicationId,
            categoryId: this.form.categoryId,
            subject: this.form.subject.trim(),
            description: this.form.description.trim(),
        };

        this.saving = true;
        try {
            const { id, failedFiles } = await this.requestService.createWithAttachments(req, this.attachmentFiles);
            this.clearTimer('draftTimer');
            this.draftService.clear(this.currentUserId);
            this.showModal = false;
            this.saveAttempted = false;
            this.clearAttachments();

            if (failedFiles.length) {
                this.toast('warning', `Talep açıldı ama şu dosyalar kaydedilemedi: ${failedFiles.join(', ')}. Detay sayfasından tekrar ekleyebilirsiniz.`);
            } else {
                this.toast('success', 'Talebiniz oluşturuldu.');
            }

            if (id) {
                await this.router.navigate(['/admin/user-requests', id]);
            } else {
                await this.loadRequests();
            }
        } catch (err) {
            this.toast('error', 'Talep oluşturulamadı. ' + this.describeError(err));
        } finally {
            this.saving = false;
        }
    }

    private clearTimer(name: 'searchTimer' | 'draftTimer' | 'similarTimer'): void {
        const timer = this[name];
        if (timer) clearTimeout(timer);
        this[name] = null;
    }

    private toast(icon: 'success' | 'error' | 'info' | 'warning', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' || icon === 'warning' ? 4500 : 2500 });
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }
}
