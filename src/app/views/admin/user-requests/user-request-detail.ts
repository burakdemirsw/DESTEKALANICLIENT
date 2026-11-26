import { Component, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UserRequestsService } from '@/app/core/services/user-requests.service';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { UsersService } from '@/app/core/services/users.service';
import { UserMenuService } from '@/app/core/services/user-menu.service';
import { SupportRoleService } from '@/app/core/services/support-role.service';
import { CannedRepliesService, CannedReply } from '@/app/core/services/canned-replies.service';
import { ClipboardService } from '@/app/core/services/clipboard.service';
import { UserRequestSignalRService } from '@/app/core/services/user-request-signalr.service';
import { AuthStateService } from '@core/services/auth-state.service';
import {
    UserRequest,
    UserRequestMessageResponse,
    CreateUserRequestMessageRequest,
    UpdateUserRequestRequest,
} from '@/app/core/models/user-request/user-request.models';
import { UserRequestHistoryResponse } from '@/app/core/models/user-request/user-request-activity.models';
import { RequestCategoryResponse } from '@/app/core/models/request-category/request-category.models';
import { RequestPriorityResponse } from '@/app/core/models/request-priority/request-priority.models';
import { RequestStatusResponse } from '@/app/core/models/request-status/request-status.models';
import { User } from '@/app/core/models/user/user.models';
import { ConfirmModal } from '@app/components/confirm-modal';
import { sanitizeAttachmentFileName } from '@/app/utils/file-security';
import {
    ATTACHMENT_ACCEPT,
    ATTACHMENT_RULES_TEXT,
    describeAttachmentDownloadError,
    getClipboardFiles,
    getDroppedFiles,
    isFileDrag,
    prepareAttachment,
    saveAttachmentBlob,
} from '@/app/utils/request-attachment';
import { formatDateTime, fullName, getRelativeTimeLabel, isRequestClosed, toTime } from '@/app/utils/support-request.utils';

// Sağ panelden doğrudan değiştirilen alanlar (yalnız yönetici)
type QuickField = 'statusId' | 'priorityId' | 'assignedUserId';

const QUICK_FIELD_LABELS: Record<QuickField, string> = {
    statusId: 'Durum',
    priorityId: 'Öncelik',
    assignedUserId: 'Atanan kişi',
};

// Yanıt akışındaki kayıt: mesaj ya da değişiklik geçmişi satırı (tarihe göre birlikte sıralanır)
type ThreadItem =
    | { kind: 'message'; key: string; date: number; message: UserRequestMessageResponse }
    | { kind: 'history'; key: string; date: number; entry: UserRequestHistoryResponse };

const MAX_RATING_COMMENT_LENGTH = 1000;

@Component({
    selector: 'app-user-request-detail-page',
    imports: [CommonModule, FormsModule, RouterModule, ConfirmModal],
    templateUrl: './user-request-detail.html',
    styleUrl: './user-request-detail.scss',
})
export class UserRequestDetailPage implements OnInit, AfterViewChecked, OnDestroy {
    private static readonly MIN_REPLY_MESSAGE_LENGTH = 10;
    private incomingMessageSound = new Audio('assets/sounds/incoming-message-sound.mp3');

    @ViewChild('chatBody') private chatBodyRef?: ElementRef<HTMLDivElement>;
    @ViewChild('messageFileInput') private messageFileInputRef?: ElementRef<HTMLInputElement>;
    @ViewChild('replyTextarea') private replyTextareaRef?: ElementRef<HTMLTextAreaElement>;
    private shouldScrollToBottom = false;
    private signalRSubscription: Subscription | null = null;
    private realtimeRefreshInProgress = false;
    private pendingRealtimeRefresh = false;

    readonly attachmentAccept = ATTACHMENT_ACCEPT;
    readonly attachmentRulesText = ATTACHMENT_RULES_TEXT;

    requestId = '';
    currentUserId = '';
    request: UserRequest | null = null;
    messages: UserRequestMessageResponse[] = [];
    history: UserRequestHistoryResponse[] = [];
    threadItems: ThreadItem[] = [];
    categories: RequestCategoryResponse[] = [];
    priorities: RequestPriorityResponse[] = [];
    statuses: RequestStatusResponse[] = [];
    users: User[] = [];
    assigneeOptions: User[] = [];
    hasAdminRole = false;
    isCustomerRole = false;
    loading = false;
    messagesLoading = false;
    messagesLoaded = false;

    // Yanıt kutusu
    newMessage = '';
    attachmentFile: File | null = null;
    attachmentFileName: string | null = null;
    attachmentError = '';
    replyAttempted = false;
    sending = false;
    dragActive = false;
    // İç not: yalnız destek yöneticileri görür (her gönderimden sonra kapanır, yanlışlıkla iç not kalmasın)
    composeInternal = false;

    // Hazır yanıtlar (yönetici)
    cannedReplies: CannedReply[] = [];
    showCannedReplies = false;
    cannedReplyToDelete: CannedReply | null = null;
    cannedSaving = false;

    // Çözüm onayı ve puan (talep sahibi tarafı)
    showRatingModal = false;
    ratingValue = 0;
    ratingComment = '';
    ratingSaving = false;
    readonly ratingOptions = [1, 2, 3, 4, 5];
    readonly maxRatingCommentLength = MAX_RATING_COMMENT_LENGTH;

    // Yeniden açma
    showReopenModal = false;
    reopenMessage = '';
    reopening = false;

    // Sağ panelden hızlı değişiklik (yönetici)
    quickForm: Record<QuickField, string> = { statusId: '', priorityId: '', assignedUserId: '' };
    quickSaving: QuickField | null = null;

    // "Benzer yeni talep aç" bağlantısının adres parametreleri
    similarRequestQuery: Params = {};

    previewImageUrl: string | null = null;
    previewImageName: string | null = null;

    // Ekler herkese açık adreste durmaz; yetkili uçtan Blob olarak indirilir. Resimler blob: adresiyle gösterilir
    // (mesaj id → adres), sayfadan çıkılınca adresler bırakılır.
    attachmentImageUrls: Record<string, string> = {};
    failedAttachmentIds = new Set<string>();
    downloadingAttachmentId: string | null = null;
    private loadingAttachmentIds = new Set<string>();
    private destroyed = false;
    showEditModal = false;
    editSaving = false;
    editAttempted = false;
    editForm = {
        categoryId: '',
        subject: '',
        description: '',
        isBlocked: false,
    };
    showCloseConfirm = false;
    closing = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private requestService: UserRequestsService,
        private categoryService: RequestCategoriesService,
        private priorityService: RequestPrioritiesService,
        private statusService: RequestStatusesService,
        private usersService: UsersService,
        private userMenuService: UserMenuService,
        private supportRoleService: SupportRoleService,
        private cannedRepliesService: CannedRepliesService,
        private clipboardService: ClipboardService,
        private authStateService: AuthStateService,
        private userRequestSignalRService: UserRequestSignalRService,
    ) {}

    ngOnInit(): void {
        this.requestId = this.route.snapshot.paramMap.get('id') ?? '';
        this.currentUserId = this.userMenuService.getUserIdFromToken() ?? '';
        if (this.requestId) {
            this.loadCurrentUserRoles();
            this.loadRequest();
            this.loadMessages();
            this.loadHistory();
            this.loadCategories();
            this.loadPriorities();
            this.loadStatuses();
            this.initializeSignalR();
        }
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        this.cleanupSignalR();
        Object.values(this.attachmentImageUrls).forEach(url => URL.revokeObjectURL(url));
        this.attachmentImageUrls = {};
    }

    // Sekmeye dönülünce, bu arada gelen mesajlar okundu yapılır
    @HostListener('document:visibilitychange')
    onVisibilityChange(): void {
        if (!document.hidden && this.messagesLoaded) this.markMessagesRead();
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.previewImageUrl) {
            this.closeImagePreview();
        } else if (this.showRatingModal && !this.ratingSaving) {
            this.showRatingModal = false;
        } else if (this.showReopenModal && !this.reopening) {
            this.showReopenModal = false;
        } else if (this.showEditModal && !this.editSaving) {
            this.closeEditModal();
        } else if (this.showCannedReplies) {
            this.showCannedReplies = false;
        }
    }

    private scrollToBottom(): void {
        const el = this.chatBodyRef?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }

    // ── Anlık mesaj (SignalR) ──
    private async initializeSignalR(): Promise<void> {
        const currentRequestId = this.normalizeRequestId(this.requestId);
        if (!currentRequestId) return;

        await this.userRequestSignalRService.start();
        await this.userRequestSignalRService.joinRequestRoom(currentRequestId);

        this.signalRSubscription = this.userRequestSignalRService.newMessage$.subscribe(message => {
            const incomingRequestId = this.normalizeRequestId(message?.requestId || '');
            if (!incomingRequestId || incomingRequestId !== currentRequestId) return;

            this.notifyIncomingMessage(message);
            this.triggerRealtimeMessagesRefresh();
        });
    }

    private notifyIncomingMessage(message: UserRequestMessageResponse): void {
        if (this.currentUserId && message.senderUserId === this.currentUserId) return;

        this.incomingMessageSound.currentTime = 0;
        this.incomingMessageSound.play().catch(() => {});

        const sender = message.senderUserName?.trim() || 'Yeni mesaj';
        const preview = message.message?.trim() || 'Mesaj içeriği yok';
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: sender,
            text: preview.length > 90 ? `${preview.slice(0, 90)}...` : preview,
            showConfirmButton: false,
            timer: 2800,
            timerProgressBar: true,
        });
    }

    private async triggerRealtimeMessagesRefresh(): Promise<void> {
        if (this.realtimeRefreshInProgress) {
            this.pendingRealtimeRefresh = true;
            return;
        }

        this.realtimeRefreshInProgress = true;
        try {
            // Gelen mesaj durumu / atamayı değiştirmiş olabilir
            await Promise.all([this.loadMessages(), this.loadRequest(), this.loadHistory()]);
        } finally {
            this.realtimeRefreshInProgress = false;
            if (this.pendingRealtimeRefresh) {
                this.pendingRealtimeRefresh = false;
                await this.triggerRealtimeMessagesRefresh();
            }
        }
    }

    private cleanupSignalR(): void {
        this.signalRSubscription?.unsubscribe();
        this.signalRSubscription = null;

        const currentRequestId = this.normalizeRequestId(this.requestId);
        if (currentRequestId) {
            this.userRequestSignalRService.leaveRequestRoom(currentRequestId);
        }
        this.userRequestSignalRService.stop();
    }

    private normalizeRequestId(requestId: string): string {
        return (requestId || '').trim().toLowerCase();
    }

    // ── Veri yükleme ──
    async loadRequest(): Promise<void> {
        this.loading = !this.request;
        try {
            const response = await this.requestService.getById(this.requestId);
            this.request = response?.data ?? null;
            this.syncQuickForm();
            this.similarRequestQuery = this.buildSimilarRequestQuery();
        } catch {
            // İlk yüklemede hata olursa "Talep bulunamadı" görünür; yenilemede eldeki bilgi korunur.
        } finally {
            this.loading = false;
        }
    }

    // Mesajlar eskiden yeniye sıralanır, sayfa en yeni mesaja (en alta) kayar. Yenilemede liste yerinde kalır,
    // yükleniyor yazısı yalnız ilk yüklemede gösterilir.
    async loadMessages(): Promise<void> {
        this.messagesLoading = true;
        try {
            const response = await this.requestService.getMessages(this.requestId);
            this.messages = this.extractArray<UserRequestMessageResponse>(response?.data)
                .sort((left, right) => toTime(left.createdDate) - toTime(right.createdDate));
            this.messagesLoaded = true;
            this.buildThread();
            this.loadImageAttachments();
            this.shouldScrollToBottom = true;
            if (!document.hidden) this.markMessagesRead();
        } catch {
            if (!this.messagesLoaded) this.toast('error', 'Mesajlar yüklenemedi.');
        } finally {
            this.messagesLoading = false;
        }
    }

    // Değişiklik geçmişi (durum, öncelik, atama...) akışta mesajlarla birlikte gösterilir. Eski API'de uç yoksa boş kalır.
    async loadHistory(): Promise<void> {
        try {
            const response = await this.requestService.getHistory(this.requestId);
            this.history = this.extractArray<UserRequestHistoryResponse>(response?.data);
        } catch {
            this.history = [];
        }
        this.buildThread();
    }

    private buildThread(): void {
        const items: ThreadItem[] = [
            ...this.messages.map(message => ({ kind: 'message' as const, key: `m-${message.id}`, date: toTime(message.createdDate), message })),
            ...this.history.map(entry => ({ kind: 'history' as const, key: `h-${entry.id}`, date: toTime(entry.createdDate), entry })),
        ];
        this.threadItems = items.sort((left, right) => left.date - right.date);
    }

    // Karşı taraftan gelen okunmamış mesajlar okundu yapılır (hata kullanıcıya gösterilmez)
    private markMessagesRead(): void {
        this.requestService.markMessagesRead(this.requestId)
            .then(() => {
                if (this.request) this.request = { ...this.request, unreadCount: 0 };
            })
            .catch(() => {});
    }

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

    private async loadCurrentUserRoles(): Promise<void> {
        const roles = await this.supportRoleService.getCurrentRoles();
        this.hasAdminRole = roles.isAdmin;
        this.isCustomerRole = roles.isCustomer;

        // Kullanıcı listesi yalnız yöneticinin atama seçimi için gerekir; talep açan kullanıcıya yüklenmez.
        if (this.hasAdminRole) {
            await Promise.all([this.loadCannedReplies(), this.loadAssignees()]);
        }
    }

    private async loadCannedReplies(): Promise<void> {
        try {
            this.cannedReplies = await this.cannedRepliesService.getAll();
        } catch {
            this.cannedReplies = [];
        }
    }

    // Atanan kişi seçiminde yalnız "Destek Alanı Yönetici" rolündekiler listelenir; rol okunamazsa tüm kullanıcılar.
    private async loadAssignees(): Promise<void> {
        try {
            const [usersResponse, adminIds] = await Promise.all([
                this.usersService.getAll(),
                this.supportRoleService.getAdminUserIds(),
            ]);
            this.users = this.extractArray<User>(usersResponse?.data);
            const adminIdSet = new Set(adminIds);
            this.assigneeOptions = adminIdSet.size
                ? this.users.filter(user => adminIdSet.has(user.id))
                : [...this.users];
            this.assigneeOptions.sort((left, right) => this.userLabel(left).localeCompare(this.userLabel(right), 'tr'));
        } catch {
            this.users = [];
            this.assigneeOptions = [];
        }
    }

    private get companyId(): string {
        return this.authStateService.profile?.companyId ?? '';
    }

    private extractArray<T>(response: unknown): T[] {
        if (Array.isArray(response)) return response as T[];
        const wrapped = response as { $values?: T[]; items?: T[]; data?: T[] | T; result?: T[] | T } | null;
        if (wrapped?.$values) return wrapped.$values;
        if (wrapped?.items) return wrapped.items;
        if (wrapped?.data) return Array.isArray(wrapped.data) ? wrapped.data : [wrapped.data];
        if (wrapped?.result) return Array.isArray(wrapped.result) ? wrapped.result : [wrapped.result];
        return [];
    }

    // ── Görünüm yardımcıları ──
    getCategoryName(id?: string | null): string {
        if (!id) return '-';
        return this.categories.find(c => c.id === id)?.name ?? '-';
    }

    getPriorityName(id?: string | null): string {
        if (!id) return '-';
        return this.priorities.find(p => p.id === id)?.name ?? '-';
    }

    getStatusName(id?: string | null): string {
        if (!id) return '-';
        return this.statuses.find(s => s.id === id)?.name ?? '-';
    }

    userLabel(user: User): string {
        return fullName(user.name, user.lastName) || user.email || '-';
    }

    getUserFullName(id?: string | null): string {
        if (!id) return '-';
        const user = this.users.find(u => u.id === id);
        return user ? this.userLabel(user) : '-';
    }

    get ownerName(): string {
        if (!this.request) return '-';
        return fullName(this.request.userName, this.request.userLastName) || this.getUserFullName(this.request.userId);
    }

    get assignedName(): string {
        if (!this.request?.assignedUserId) return 'Atanmadı';
        return fullName(this.request.assignedUserName, this.request.assignedUserLastName)
            || this.getUserFullName(this.request.assignedUserId);
    }

    // Pasif durum / öncelik seçimde gösterilmez; talebin mevcut değeri pasif olsa da listede kalır.
    get statusOptions(): RequestStatusResponse[] {
        return this.statuses.filter(status => !status.isBlocked || status.id === this.request?.statusId);
    }

    get priorityOptions(): RequestPriorityResponse[] {
        return this.priorities.filter(priority => !priority.isBlocked || priority.id === this.request?.priorityId);
    }

    get isAssignedToMe(): boolean {
        return !!this.currentUserId && this.request?.assignedUserId === this.currentUserId;
    }

    // Talebe atanmış kişi yönetici listesinde yoksa (rolü değişmiş vb.) seçimde yine görünsün
    get isAssigneeMissingFromOptions(): boolean {
        const assignedUserId = this.request?.assignedUserId;
        return !!assignedUserId && !this.assigneeOptions.some(user => user.id === assignedUserId);
    }

    get closeConfirmMessage(): string {
        const name = this.request?.subject || this.request?.requestNo || 'Talep';
        return `"${name}" talebi kapatılacak. Kapanan talebe yanıt yazılamaz.`;
    }

    // Mesaj destek yöneticisinden mi; eski API isFromManager göndermezse eski "from" alanına bakılır
    isStaffMessage(message: UserRequestMessageResponse): boolean {
        if (typeof message.isFromManager === 'boolean') return message.isFromManager;
        return (message.from || '').toLowerCase() === 'admin';
    }

    // Açıklama sunucuda talebin ilk mesajı olarak da kaydedilir; o durumda ayrı kart gösterilmez (iki kez görünmesin)
    get showDescriptionCard(): boolean {
        const description = this.request?.description?.trim();
        if (!description || !this.messagesLoaded) return false;
        return !this.messages.some(message => message.message?.trim() === description);
    }

    // Geçmiş satırının metni: "durumu 'Cevaplandı' olarak değiştirdi"
    describeHistory(entry: UserRequestHistoryResponse): string {
        const value = entry.newValue?.trim();
        switch (entry.fieldName) {
            case 'Status':
                return `durumu "${value || '-'}" olarak değiştirdi`;
            case 'Priority':
                return `önceliği "${value || '-'}" olarak değiştirdi`;
            case 'Category':
                return `kategoriyi "${value || '-'}" olarak değiştirdi`;
            case 'Application':
                return value ? `uygulamayı "${value}" olarak değiştirdi` : 'uygulamayı kaldırdı';
            case 'AssignedUser':
                if (!value) return 'atamayı kaldırdı';
                return value === entry.userName?.trim() ? 'talebi üstlendi' : `talebi ${value} kişisine atadı`;
            case 'Closed':
                return 'talebi kapattı';
            case 'Reopened':
                return 'talebi yeniden açtı';
            case 'Rated':
                return `çözümü onayladı ve ${value || ''} puan verdi`;
            default:
                return `${entry.fieldName} alanını değiştirdi`;
        }
    }

    isRequestOwnerMessage(message: UserRequestMessageResponse): boolean {
        if (!this.request?.userId || !message?.senderUserId) return false;
        return this.request.userId === message.senderUserId;
    }

    getMessageSenderLabel(message: UserRequestMessageResponse): string {
        return message.senderUserName?.trim() || this.getUserFullName(message.senderUserId) || 'Kullanıcı';
    }

    getInitial(name: string): string {
        return (name || '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
    }

    // Sıradaki yanıtın kimden beklendiği; kapalı talepte gösterilmez.
    get waitingLabel(): string {
        if (!this.request || !this.messagesLoaded || this.isRequestCompleted()) return '';
        const supportRepliedLast = this.supportRepliedLast;
        if (this.hasAdminRole) {
            return supportRepliedLast ? 'Müşterinin yanıtı bekleniyor' : 'Yanıtınız bekleniyor';
        }
        return supportRepliedLast ? 'Yanıtınız bekleniyor' : 'Destek ekibinin yanıtı bekleniyor';
    }

    // Son (iç not olmayan) mesaj destek yöneticisinden mi
    get supportRepliedLast(): boolean {
        const lastMessage = [...this.messages].reverse().find(message => !message.isInternal);
        return !!lastMessage && this.isStaffMessage(lastMessage);
    }

    // Talep sahibi tarafı (yönetici değil): çözüm onayı, puan ve yeniden açma bu tarafa gösterilir
    get isRequesterSide(): boolean {
        return this.isCustomerRole && !this.hasAdminRole;
    }

    // Yönetici yanıtladıysa talep sahibine "Sorununuz çözüldü mü?" sorulur
    get canConfirmResolution(): boolean {
        return this.isRequesterSide && !!this.request && !this.isRequestCompleted() && this.messagesLoaded && this.supportRepliedLast;
    }

    // Kapanmış ama puanlanmamış talepte değerlendirme istenir
    get canRateClosedRequest(): boolean {
        return this.isRequesterSide && !!this.request && this.isRequestCompleted() && !this.request.satisfactionRating;
    }

    get canReopenRequest(): boolean {
        return !!this.request && this.isRequestCompleted() && (this.hasAdminRole || this.isCustomerRole);
    }

    get targetLabel(): string {
        const hours = this.request?.priorityTargetHours;
        if (!hours) return '';
        return hours % 24 === 0 ? `${hours / 24} gün` : `${hours} saat`;
    }

    isRequestCompleted(): boolean {
        if (!this.request) return false;
        return isRequestClosed(this.request, this.request.statusName || this.getStatusName(this.request.statusId));
    }

    canEditRequest(): boolean {
        return this.hasAdminRole;
    }

    canCloseRequest(): boolean {
        return this.hasAdminRole && !!this.request && !this.request.isBlocked && !this.isRequestCompleted();
    }

    canComposeMessage(): boolean {
        return !this.isRequestCompleted() && (this.hasAdminRole || this.isCustomerRole);
    }

    formatDate(dateStr?: string | null): string {
        return formatDateTime(dateStr);
    }

    getRelativeTimeLabel(dateStr?: string | null): string {
        return getRelativeTimeLabel(dateStr);
    }

    // ── Kopyalama ──
    async copyRequestNo(): Promise<void> {
        if (!this.request?.requestNo) return;
        await this.copy(this.request.requestNo, 'Talep numarası kopyalandı.');
    }

    async copyRequestLink(): Promise<void> {
        const url = window.location.origin + this.router.serializeUrl(this.router.createUrlTree(['/admin/user-requests', this.requestId]));
        await this.copy(url, 'Talep bağlantısı kopyalandı.');
    }

    private async copy(value: string, successText: string): Promise<void> {
        try {
            await this.clipboardService.copyText(value);
            this.toast('success', successText);
        } catch {
            this.toast('error', 'Kopyalanamadı.');
        }
    }

    // Kapalı talepte "Benzer yeni talep aç": yeni talep formu bu talebin uygulaması, kategorisi ve konusuyla açılır
    // (parametre adları Talepler sayfasındaki NEW_REQUEST_QUERY ile aynıdır).
    private buildSimilarRequestQuery(): Params {
        if (!this.request) return {};
        const query: Params = { yeni: 1 };
        if (this.request.applicationId) query['yeniUygulama'] = this.request.applicationId;
        if (this.request.categoryId) query['yeniKategori'] = this.request.categoryId;
        if (this.request.subject) query['yeniKonu'] = this.request.subject;
        if (this.request.requestNo) query['ilgili'] = this.request.requestNo;
        return query;
    }

    // ── Yanıt kutusu ──
    focusComposer(): void {
        const textarea = this.replyTextareaRef?.nativeElement;
        if (!textarea) return;
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textarea.focus({ preventScroll: true });
    }

    getReplyMessageLength(): number {
        return this.newMessage.trim().length;
    }

    hasMinReplyMessageLength(): boolean {
        return this.getReplyMessageLength() >= UserRequestDetailPage.MIN_REPLY_MESSAGE_LENGTH;
    }

    shouldShowReplyLengthWarning(): boolean {
        return this.replyAttempted && !this.hasMinReplyMessageLength();
    }

    onMessageKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    onAttachmentSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.setAttachment(file);
        }
        input.value = '';
    }

    // Ctrl+V ile ekran görüntüsü yapıştırma; panoda dosya yoksa metin normal yapıştırılır.
    onPaste(event: ClipboardEvent): void {
        const files = getClipboardFiles(event);
        if (!files.length) return;
        event.preventDefault();
        this.setAttachment(files[0]);
    }

    onDragOver(event: DragEvent): void {
        if (!isFileDrag(event) || this.sending) return;
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
        if (files.length) this.setAttachment(files[0]);
    }

    private setAttachment(file: File): void {
        const result = prepareAttachment(file);
        if (result.error !== null) {
            this.attachmentError = result.error;
            return;
        }
        this.attachmentError = '';
        this.attachmentFile = result.file;
        this.attachmentFileName = result.file.name;
    }

    clearAttachment(): void {
        this.attachmentFile = null;
        this.attachmentFileName = null;
        this.attachmentError = '';
        if (this.messageFileInputRef?.nativeElement) {
            this.messageFileInputRef.nativeElement.value = '';
        }
    }

    async sendMessage(): Promise<void> {
        if (this.sending || !this.canComposeMessage()) return;
        this.replyAttempted = true;
        if (!this.hasMinReplyMessageLength()) return;

        if (!this.currentUserId) {
            this.toast('error', 'Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        const isInternal = this.hasAdminRole && this.composeInternal;
        this.sending = true;
        try {
            if (this.attachmentFile) {
                await this.requestService.createMessageWithFile({
                    requestId: this.requestId,
                    senderUserId: this.currentUserId,
                    message: this.newMessage.trim(),
                    file: this.attachmentFile,
                    isInternal,
                });
            } else {
                const req: CreateUserRequestMessageRequest = {
                    requestId: this.requestId,
                    senderUserId: this.currentUserId,
                    message: this.newMessage.trim(),
                    isInternal,
                };
                await this.requestService.createMessage(req);
            }

            this.newMessage = '';
            this.clearAttachment();
            this.replyAttempted = false;
            this.showCannedReplies = false;
            this.composeInternal = false;
            await Promise.all([this.loadRequest(), this.loadMessages(), this.loadHistory()]);
        } catch (err) {
            this.toast('error', 'Mesaj gönderilemedi. ' + this.describeError(err));
        } finally {
            this.sending = false;
        }
    }

    // ── Hazır yanıtlar ──
    toggleCannedReplies(): void {
        this.showCannedReplies = !this.showCannedReplies;
    }

    insertCannedReply(reply: CannedReply): void {
        const current = this.newMessage.trimEnd();
        this.newMessage = current ? `${current}\n\n${reply.text}` : reply.text;
        this.showCannedReplies = false;
        setTimeout(() => this.replyTextareaRef?.nativeElement.focus());
    }

    // Yazılan metni ekibin ortak hazır yanıtlarına ekler
    async saveCannedReply(): Promise<void> {
        if (!this.newMessage.trim() || this.cannedSaving) return;
        this.cannedSaving = true;
        try {
            this.cannedReplies = await this.cannedRepliesService.add(this.newMessage, this.cannedReplies.length + 1);
            this.toast('success', 'Hazır yanıt kaydedildi.');
        } catch (err) {
            this.toast('error', 'Hazır yanıt kaydedilemedi. ' + this.describeError(err));
        } finally {
            this.cannedSaving = false;
        }
    }

    // Hazır yanıtlar ekipte ortaktır; silme onay ister
    removeCannedReply(reply: CannedReply): void {
        this.cannedReplyToDelete = reply;
    }

    async confirmRemoveCannedReply(): Promise<void> {
        const reply = this.cannedReplyToDelete;
        if (!reply || this.cannedSaving) return;
        this.cannedSaving = true;
        try {
            this.cannedReplies = await this.cannedRepliesService.remove(reply.id);
            this.cannedReplyToDelete = null;
            this.toast('success', 'Hazır yanıt silindi.');
        } catch (err) {
            this.toast('error', 'Hazır yanıt silinemedi. ' + this.describeError(err));
        } finally {
            this.cannedSaving = false;
        }
    }

    get cannedDeleteMessage(): string {
        return `"${this.cannedReplyToDelete?.title ?? ''}" hazır yanıtı ekipteki herkes için silinecek.`;
    }

    // ── Çözüm onayı ve puan ──
    openRatingModal(): void {
        this.ratingValue = 0;
        this.ratingComment = '';
        this.showRatingModal = true;
    }

    closeRatingModal(): void {
        if (!this.ratingSaving) this.showRatingModal = false;
    }

    async submitRating(): Promise<void> {
        if (!this.request || this.ratingSaving || this.ratingValue < 1) return;
        this.ratingSaving = true;
        try {
            await this.requestService.confirmResolution(this.requestId, {
                rating: this.ratingValue,
                comment: this.ratingComment.trim().slice(0, MAX_RATING_COMMENT_LENGTH) || null,
            });
            this.showRatingModal = false;
            await Promise.all([this.loadRequest(), this.loadHistory()]);
            this.toast('success', 'Değerlendirmeniz için teşekkürler.');
        } catch (err) {
            this.toast('error', 'Değerlendirme gönderilemedi. ' + this.describeError(err));
        } finally {
            this.ratingSaving = false;
        }
    }

    // ── Yeniden açma ──
    openReopenModal(): void {
        this.reopenMessage = '';
        this.showReopenModal = true;
    }

    closeReopenModal(): void {
        if (!this.reopening) this.showReopenModal = false;
    }

    async submitReopen(): Promise<void> {
        if (!this.request || this.reopening) return;
        this.reopening = true;
        try {
            await this.requestService.reopen(this.requestId, { message: this.reopenMessage.trim() || null });
            this.showReopenModal = false;
            await Promise.all([this.loadRequest(), this.loadMessages(), this.loadHistory()]);
            this.toast('success', 'Talep yeniden açıldı.');
        } catch (err) {
            this.toast('error', 'Talep yeniden açılamadı. ' + this.describeError(err));
        } finally {
            this.reopening = false;
        }
    }

    // ── Sağ panelden hızlı değişiklik (durum / öncelik / atanan) ──
    private syncQuickForm(): void {
        this.quickForm = {
            statusId: this.request?.statusId ?? '',
            priorityId: this.request?.priorityId ?? '',
            assignedUserId: this.request?.assignedUserId ?? '',
        };
    }

    async saveQuickField(field: QuickField, value: string): Promise<void> {
        if (!this.request || !this.hasAdminRole || this.quickSaving) return;
        const previous = this.quickForm[field];
        this.quickForm[field] = value;
        if ((field === 'statusId' || field === 'priorityId') && !value) {
            this.quickForm[field] = previous;
            return;
        }

        this.quickSaving = field;
        try {
            const override: Partial<UpdateUserRequestRequest> = field === 'assignedUserId'
                ? { assignedUserId: value || null }
                : { [field]: value };
            await this.requestService.update(this.request.id, this.buildUpdateBody(override));
            await Promise.all([this.loadRequest(), this.loadHistory()]);
            this.toast('success', `${QUICK_FIELD_LABELS[field]} güncellendi.`);
        } catch (err) {
            this.quickForm[field] = previous;
            this.toast('error', `${QUICK_FIELD_LABELS[field]} güncellenemedi. ${this.describeError(err)}`);
        } finally {
            this.quickSaving = null;
        }
    }

    // "Üstlen": talebi giriş yapan yöneticiye atar.
    async assignToMe(): Promise<void> {
        if (!this.currentUserId) return;
        await this.saveQuickField('assignedUserId', this.currentUserId);
    }

    private buildUpdateBody(override: Partial<UpdateUserRequestRequest>): UpdateUserRequestRequest {
        const request = this.request!;
        return {
            assignedUserId: request.assignedUserId || null,
            applicationId: request.applicationId || null,
            categoryId: request.categoryId,
            statusId: request.statusId,
            priorityId: request.priorityId,
            subject: request.subject ?? '',
            description: request.description ?? '',
            isBlocked: request.isBlocked ?? false,
            ...override,
        };
    }

    // ── Ekler ──
    hasMessageAttachment(message: UserRequestMessageResponse): boolean {
        return !!message.fileUrl;
    }

    // SVG resim olarak gösterilmez (içinde betik olabilir); dosya olarak indirilir.
    isImageAttachment(message: UserRequestMessageResponse): boolean {
        const fileType = (message.fileType || '').toLowerCase();
        return fileType.startsWith('image/') && !fileType.includes('svg');
    }

    // Dosya adı FileUrl'in son parçasıdır (yeni eklerde dosyanın asıl adı, eski eklerde sunucunun verdiği ad).
    getAttachmentFileName(message: UserRequestMessageResponse): string {
        const fileUrl = message.fileUrl || '';
        if (!fileUrl) return 'Ek dosya';

        const normalized = fileUrl.replace(/\\/g, '/').split(/[?#]/)[0];
        const rawName = normalized.slice(normalized.lastIndexOf('/') + 1);
        let decoded = rawName;
        try {
            decoded = decodeURIComponent(rawName);
        } catch {
            // Kodlaması bozuk adda olduğu gibi kullanılır.
        }
        return sanitizeAttachmentFileName(decoded || 'Ek dosya');
    }

    // Henüz yüklenmemiş resim eklerini indirir; hata alan ek dosya satırı olarak gösterilir (İndir ile nedeni görülür).
    private loadImageAttachments(): void {
        for (const message of this.messages) {
            const id = message.id;
            if (!this.hasMessageAttachment(message) || !this.isImageAttachment(message)) continue;
            if (this.attachmentImageUrls[id] || this.loadingAttachmentIds.has(id) || this.failedAttachmentIds.has(id)) continue;

            this.loadingAttachmentIds.add(id);
            this.requestService.downloadMessageFile(id)
                .then(blob => {
                    if (this.destroyed) return;
                    this.attachmentImageUrls = { ...this.attachmentImageUrls, [id]: URL.createObjectURL(blob) };
                })
                .catch(() => this.failedAttachmentIds.add(id))
                .finally(() => this.loadingAttachmentIds.delete(id));
        }
    }

    async downloadAttachment(message: UserRequestMessageResponse): Promise<void> {
        if (this.downloadingAttachmentId) return;
        this.downloadingAttachmentId = message.id;
        try {
            const blob = await this.requestService.downloadMessageFile(message.id);
            saveAttachmentBlob(blob, this.getAttachmentFileName(message));
        } catch (err) {
            this.toast('error', await describeAttachmentDownloadError(err));
        } finally {
            this.downloadingAttachmentId = null;
        }
    }

    openImagePreview(message: UserRequestMessageResponse): void {
        const url = this.attachmentImageUrls[message.id];
        if (!url) return;
        this.previewImageUrl = url;
        this.previewImageName = this.getAttachmentFileName(message);
    }

    closeImagePreview(): void {
        this.previewImageUrl = null;
        this.previewImageName = null;
    }

    getAttachmentTypeLabel(message: UserRequestMessageResponse): string {
        const fileType = (message.fileType || '').toLowerCase();
        if (fileType.startsWith('image/')) return 'Görsel';
        if (fileType.includes('pdf')) return 'PDF';
        if (fileType.includes('word') || fileType.includes('officedocument.word')) return 'Word';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Excel';
        if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PowerPoint';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'Arşiv';
        if (fileType.startsWith('text/')) return 'Metin';
        return 'Dosya';
    }

    // ── Düzenleme (konu, açıklama, kategori, aktiflik) ──
    openEditModal(): void {
        if (!this.request || !this.canEditRequest()) return;
        this.editAttempted = false;
        this.editForm = {
            categoryId: this.request.categoryId ?? '',
            subject: this.request.subject ?? '',
            description: this.request.description ?? '',
            isBlocked: this.request.isBlocked ?? false,
        };
        this.showEditModal = true;
    }

    closeEditModal(): void {
        if (this.editSaving) return;
        this.showEditModal = false;
    }

    isEditFormValid(): boolean {
        return !!(this.editForm.categoryId && this.editForm.subject.trim());
    }

    async saveEdit(): Promise<void> {
        if (!this.request || !this.canEditRequest() || this.editSaving) return;
        this.editAttempted = true;
        if (!this.isEditFormValid()) return;

        this.editSaving = true;
        try {
            await this.requestService.update(this.request.id, this.buildUpdateBody({
                categoryId: this.editForm.categoryId,
                subject: this.editForm.subject.trim(),
                description: this.editForm.description.trim(),
                isBlocked: this.editForm.isBlocked,
            }));
            this.showEditModal = false;
            await Promise.all([this.loadRequest(), this.loadHistory()]);
            this.toast('success', 'Talep güncellendi.');
        } catch (err) {
            this.toast('error', 'Talep güncellenemedi. ' + this.describeError(err));
        } finally {
            this.editSaving = false;
        }
    }

    // ── Talebi kapat ──
    openCloseConfirm(): void {
        if (this.canCloseRequest()) this.showCloseConfirm = true;
    }

    async confirmCloseRequest(): Promise<void> {
        if (!this.request || this.closing) return;
        this.closing = true;
        try {
            await this.requestService.close(this.requestId);
            this.showCloseConfirm = false;
            await Promise.all([this.loadRequest(), this.loadHistory()]);
            this.toast('success', 'Talep kapatıldı.');
        } catch (err) {
            this.toast('error', 'Talep kapatılamadı. ' + this.describeError(err));
        } finally {
            this.closing = false;
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/user-requests']);
    }

    private toast(icon: 'success' | 'error' | 'info' | 'warning', title: string): void {
        Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: icon === 'error' ? 4000 : 2200 });
    }

    private describeError(err: unknown): string {
        const httpError = err as { status?: number; error?: { message?: string; title?: string } } | null;
        if (httpError?.status === 0) return 'Sunucuya bağlanılamadı.';
        return httpError?.error?.message || httpError?.error?.title || '';
    }
}
