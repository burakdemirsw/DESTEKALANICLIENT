import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserRequestsService } from '@/app/core/services/user-requests.service';
import { RequestCategoriesService } from '@/app/core/services/request-categories.service';
import { RequestPrioritiesService } from '@/app/core/services/request-priorities.service';
import { RequestStatusesService } from '@/app/core/services/request-statuses.service';
import { UsersService } from '@/app/core/services/users.service';
import { UserMenuService } from '@/app/core/services/user-menu.service';
import { RolesService } from '@/app/core/services/roles.service';
import {
    UserRequest,
    UserRequestMessage,
    UserRequestMessageResponse,
    CreateUserRequestMessageRequest,
} from '@/app/core/models/user-request/user-request.models';
import { RequestCategoryResponse } from '@/app/core/models/request-category/request-category.models';
import { RequestPriorityResponse } from '@/app/core/models/request-priority/request-priority.models';
import { RequestStatusResponse } from '@/app/core/models/request-status/request-status.models';
import { User } from '@/app/core/models/user/user.models';
import { RoleUserResponse } from '@/app/core/models/role/role.models';
import { AuthStateService } from '@core/services/auth-state.service';
import { isAllowedAttachment, recordAttachmentAccess, sanitizeAttachmentFileName } from '@/app/utils/file-security';
import { UserRequestSignalRService } from '@/app/core/services/user-request-signalr.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

interface MessageGroup {
    senderKey: string;
    dateKey: string;
    messages: UserRequestMessageResponse[];
}

interface GroupedMessageSection {
    dateKey: string;
    dateLabel: string;
    groups: MessageGroup[];
}

@Component({
    selector: 'app-user-request-detail-page',
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './user-request-detail.html',
    styleUrl: './user-request-detail.scss',
})
export class UserRequestDetailPage implements OnInit, AfterViewChecked {
    private static readonly MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
    private static readonly MIN_REPLY_MESSAGE_LENGTH = 10;
    private incomingMessageSound = new Audio('assets/sounds/incoming-message-sound.mp3');

    @ViewChild('chatBody') private chatBodyRef!: ElementRef<HTMLDivElement>;
    @ViewChild('messageFileInput') private messageFileInputRef?: ElementRef<HTMLInputElement>;
    @ViewChild('replyTextarea') private replyTextareaRef?: ElementRef<HTMLTextAreaElement>;
    private shouldScrollToBottom = false;
    private signalRSubscription: Subscription | null = null;
    private realtimeRefreshInProgress = false;
    private pendingRealtimeRefresh = false;
    requestId = '';
    request: UserRequest | null = null;
    messages: UserRequestMessageResponse[] = [];
    groupedMessageSections: GroupedMessageSection[] = [];
    categories: RequestCategoryResponse[] = [];
    priorities: RequestPriorityResponse[] = [];
    statuses: RequestStatusResponse[] = [];
    users: User[] = [];
    userRoles: RoleUserResponse[] = [];
    hasAdminRole = false;
    isCustomerRole = false;
    loading = false;
    messagesLoading = false;
    newMessage = '';
    attachmentFile: File | null = null;
    attachmentFileName: string | null = null;
    previewImageUrl: string | null = null;
    previewImageName: string | null = null;
    replyAttempted = false;
    showEditModal = false;
    showReplyModal = false;
    showDetailsSidebar = true;
    collapsedSections: Record<string, boolean> = {};
    editForm: any = {
        categoryId: '',
        statusId: '',
        priorityId: '',
        assignedUserId: '',
        subject: '',
        description: '',
        isBlocked: false,
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private requestService: UserRequestsService,
        private categoryService: RequestCategoriesService,
        private priorityService: RequestPrioritiesService,
        private statusService: RequestStatusesService,
        private usersService: UsersService,
        private userMenuService: UserMenuService,
        private rolesService: RolesService,
        private authStateService: AuthStateService,
        private userRequestSignalRService: UserRequestSignalRService,
    ) {}

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    private scrollToBottom(): void {
        try {
            const el = this.chatBodyRef?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        } catch (_) {}
    }

    ngOnInit(): void {
        this.requestId = this.route.snapshot.paramMap.get('id') ?? '';
        if (this.requestId) {
            this.loadCurrentUserRoles();
            this.loadRequest();
            this.loadMessages();    
            this.loadCategories();
            this.loadPriorities();
            this.loadStatuses();
            this.loadUsers();
            this.initializeSignalR();
        }
    }

    ngOnDestroy(): void {
        this.cleanupSignalR();
    }

    private async initializeSignalR(): Promise<void> {
        const currentRequestId = this.normalizeRequestId(this.requestId);
        if (!currentRequestId) return;

        await this.userRequestSignalRService.start();
        await this.userRequestSignalRService.joinRequestRoom(currentRequestId);

        this.signalRSubscription = this.userRequestSignalRService.newMessage$.subscribe(message => {
            const incomingRequestId = this.normalizeRequestId(message?.requestId || '');
            if (!incomingRequestId || incomingRequestId !== currentRequestId) return;

            this.showIncomingMessageToast(message);
            this.triggerRealtimeMessagesRefresh();
        });
    }

    private showIncomingMessageToast(message: UserRequestMessageResponse): void {
        const currentUserId = this.userMenuService.getUserIdFromToken();
        if (currentUserId && message.senderUserId === currentUserId) {
            return;
        }

        this.incomingMessageSound.currentTime = 0;
        this.incomingMessageSound.play().catch(() => {});

        const sender = message.senderUserName?.trim() || 'Yeni mesaj';
        const preview = message.message?.trim() || 'Mesaj içeriği yok';

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `${sender}`,
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
            await this.loadMessages();
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

    async loadRequest(): Promise<void> {
        this.loading = true;
        try {
            const response = await this.requestService.getById(this.requestId);
            this.request = response?.data ?? null;
        } catch (err) {
            console.error('Request load error:', err);
        } finally {
            this.loading = false;
        }
    }

    async loadMessages(): Promise<void> {
        this.messagesLoading = true;
        try {
            const response = await this.requestService.getMessages(this.requestId);
            this.messages = (this.extractArray(response?.data) as UserRequestMessageResponse[])
                .sort((left, right) => {
                    const leftTime = left.createdDate ? new Date(left.createdDate).getTime() : 0;
                    const rightTime = right.createdDate ? new Date(right.createdDate).getTime() : 0;
                    return rightTime - leftTime;
                });
            this.groupedMessageSections = this.buildGroupedMessageSections(this.messages);
            this.shouldScrollToBottom = true;
        } catch (err) {
            console.error('Messages load error:', err);
        } finally {
            this.messagesLoading = false;
        }
    }

    async loadCategories(): Promise<void> {
        try {
            const response = await this.categoryService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            const paged = response?.data;
            this.categories = paged?.items ?? [];
        } catch (err) {
            console.error('Categories load error:', err);
        }
    }

    async loadPriorities(): Promise<void> {
        try {
            const response = await this.priorityService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            const paged = response?.data;
            this.priorities = paged?.items ?? [];
        } catch (err) {
            console.error('Priorities load error:', err);
        }
    }

    async loadStatuses(): Promise<void> {
        try {
            const response = await this.statusService.getPaged({ companyId: this.authStateService.profile?.companyId ?? '', pageNumber: 1, pageSize: 1000 });
            const paged = response?.data;
            this.statuses = paged?.items ?? [];
        } catch (err) {
            console.error('Statuses load error:', err);
        }
    }

    async loadUsers(): Promise<void> {
        try {
            const response = await this.usersService.getAll();
            this.users = this.extractArray(response?.data);
        } catch (err) {
            console.error('Users load error:', err);
        }
    }

    async loadCurrentUserRoles(): Promise<void> {
        try {
            const userId = this.userMenuService.getUserIdFromToken();
            if (!userId) {
                this.userRoles = [];
                this.hasAdminRole = false;
                this.isCustomerRole = false;
                return;
            }

            const response = await this.rolesService.getRolesByUser(userId);
            this.userRoles = this.extractArray(response?.data) as RoleUserResponse[];
            this.hasAdminRole = this.userRoles.some(role => {
                const roleName = (role.roleDescription || '').toLowerCase();
                return roleName === 'admin' || roleName === 'destek alanı yönetici';
            });
            this.isCustomerRole = this.userRoles.some(role => {
                const roleName = (role.roleDescription || '').toLowerCase();
                return roleName === 'customer' || roleName === 'destek alanı';
            });
        } catch (err) {
            console.error('User roles load error:', err);
            this.userRoles = [];
            this.hasAdminRole = false;
            this.isCustomerRole = false;
        }
    }

    private extractArray(response: any): any[] {
        if (Array.isArray(response)) return response;
        if (response?.$values) return response.$values;
        if (response?.data) return Array.isArray(response.data) ? response.data : [response.data];
        if (response?.items) return response.items;
        if (response?.result) return Array.isArray(response.result) ? response.result : [response.result];
        // If a single object is passed directly (not wrapped in ApiResponse), wrap it into an array
        if (response && typeof response === 'object') return [response];
        return [];
    }

    // ── Yardımcı Fonksiyonlar ──
    getCategoryName(id?: string): string {
        if (!id) return '-';
        return this.categories.find(c => c.id === id)?.name ?? '-';
    }

    getPriorityName(id?: string): string {
        if (!id) return '-';
        return this.priorities.find(p => p.id === id)?.name ?? '-';
    }

    getStatusName(id?: string): string {
        if (!id) return '-';
        return this.statuses.find(s => s.id === id)?.name ?? '-';
    }

    getStatusBadgeBackground(colorCode?: string | null): string {
        return this.normalizeHexColor(colorCode) ?? '#dbeafe';
    }

    getStatusBadgeBorderColor(colorCode?: string | null): string {
        return this.adjustHexColor(this.normalizeHexColor(colorCode) ?? '#93c5fd', -18);
    }

    getStatusBadgeTextColor(colorCode?: string | null): string {
        const normalized = this.normalizeHexColor(colorCode);
        if (!normalized) return '#1e3a8a';

        const hex = normalized.slice(1);
        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);
        const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;

        return luminance > 0.68 ? '#10233f' : '#ffffff';
    }

    getUserFullName(id?: string): string {
        if (!id) return '-';
        const user = this.users.find(u => u.id === id);
        return user ? `${user.name} ${user.lastName}` : '-';
    }

    getCurrentUserRoleName(): string {
        if (this.hasAdminRole) return 'admin';
        if (this.isCustomerRole) return 'customer';
        return '';
    }

    private normalizeHexColor(colorCode?: string | null): string | null {
        if (!colorCode) return null;

        const value = colorCode.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;

        if (/^#[0-9a-fA-F]{3}$/.test(value)) {
            return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
        }

        return null;
    }

    private adjustHexColor(hexColor: string, amount: number): string {
        const hex = hexColor.replace('#', '');
        const channels = [0, 2, 4].map(index => {
            const channel = parseInt(hex.slice(index, index + 2), 16);
            return Math.max(0, Math.min(255, channel + amount));
        });

        return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
    }

    toggleSection(section: string): void {
        this.collapsedSections[section] = !this.collapsedSections[section];
    }

    isSectionOpen(section: string): boolean {
        return !this.collapsedSections[section];
    }

    canEditRequest(): boolean {
        return this.hasAdminRole;
    }

    canCloseRequest(): boolean {
        return this.hasAdminRole && !!this.request && !this.request.isBlocked;
    }

    private getLatestMessage(): UserRequestMessageResponse | null {
        if (!this.messages.length) return null;

        return [...this.messages].sort((left, right) => {
            const leftTime = left.createdDate ? new Date(left.createdDate).getTime() : 0;
            const rightTime = right.createdDate ? new Date(right.createdDate).getTime() : 0;
            return leftTime - rightTime;
        }).at(-1) ?? null;
    }

    canComposeMessage(): boolean {
        if (this.isRequestCompleted()) return false;

        const currentRole = this.getCurrentUserRoleName();

        if (currentRole === 'admin') {
            return true;
        }

        if (currentRole === 'customer') {
            return true;
        }

        return false;
    }

    isRequestCompleted(): boolean {
        if (!this.request) return false;
        const statusName = (this.request.statusName || this.getStatusName(this.request.statusId)).toLowerCase();
        return statusName === 'tamamlandı' || statusName === 'completed' || statusName === 'closed';
    }

    isOutgoingMessage(message: UserRequestMessageResponse): boolean {
        const currentUserId = this.userMenuService.getUserIdFromToken();

        if (currentUserId && message.senderUserId) {
            return message.senderUserId === currentUserId;
        }

        const messageRole = (message.from || '').toLowerCase();
        const currentRole = this.getCurrentUserRoleName();
        return !!messageRole && !!currentRole && messageRole === currentRole;
    }

    isRequestOwnerMessage(message: UserRequestMessageResponse): boolean {
        if (!this.request?.userId || !message?.senderUserId) return false;
        return this.request.userId === message.senderUserId;
    }

    getMessageAlignment(message: UserRequestMessageResponse): string {
        return this.isOutgoingMessage(message) ? 'justify-content-end' : 'justify-content-start';
    }

    getMessageBubbleClass(message: UserRequestMessageResponse): string {
        return this.isOutgoingMessage(message)
            ? 'bg-primary-subtle text-primary'
            : 'bg-light text-body';
    }

    getMessageSenderLabel(message: UserRequestMessageResponse): string {
        return message.senderUserName || this.getUserFullName(message.senderUserId);
    }

    getMessageGroupClass(group: MessageGroup): string {
        const firstMessage = group.messages[0];
        if (!firstMessage) return '';

        if ((firstMessage.from || '').toLowerCase() === 'admin') {
            return 'is-admin';
        }

        if (this.isRequestOwnerMessage(firstMessage)) {
            return 'is-owner';
        }

        return 'is-replier';
    }

    getGroupLatestDate(group: MessageGroup): string {
        if (!group.messages.length) return '-';

        const latestMessage = group.messages.reduce((latest, current) => {
            const latestTime = latest.createdDate ? new Date(latest.createdDate).getTime() : 0;
            const currentTime = current.createdDate ? new Date(current.createdDate).getTime() : 0;
            return currentTime > latestTime ? current : latest;
        });

        return this.formatDate(latestMessage.createdDate);
    }

    getGroupLatestRelativeDate(group: MessageGroup): string {
        if (!group.messages.length) return '';

        const latestMessage = group.messages.reduce((latest, current) => {
            const latestTime = latest.createdDate ? new Date(latest.createdDate).getTime() : 0;
            const currentTime = current.createdDate ? new Date(current.createdDate).getTime() : 0;
            return currentTime > latestTime ? current : latest;
        });

        return this.getRelativeTimeLabel(latestMessage.createdDate);
    }

    private buildGroupedMessageSections(messages: UserRequestMessageResponse[]): GroupedMessageSection[] {
        const sections: GroupedMessageSection[] = [];

        for (const message of messages) {
            const dateKey = this.getMessageDateKey(message.createdDate);
            const senderKey = this.getMessageSenderKey(message);

            const lastSection = sections.at(-1);
            if (!lastSection || lastSection.dateKey !== dateKey) {
                sections.push({
                    dateKey,
                    dateLabel: this.getMessageDateLabel(message.createdDate),
                    groups: [{ senderKey, dateKey, messages: [message] }],
                });
                continue;
            }

            const lastGroup = lastSection.groups.at(-1);
            if (lastGroup && lastGroup.senderKey === senderKey) {
                lastGroup.messages.push(message);
            } else {
                lastSection.groups.push({ senderKey, dateKey, messages: [message] });
            }
        }

        return sections;
    }

    getMessageDateKey(dateStr?: string): string {
        if (!dateStr) return 'unknown';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'unknown';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private getMessageDateLabel(dateStr?: string): string {
        if (!dateStr) return 'Tarih bilinmiyor';

        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'Tarih bilinmiyor';

        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    }

    getMessageSenderKey(message: UserRequestMessageResponse): string {
        return `${message.senderUserId || ''}|${(message.from || '').toLowerCase()}`;
    }

    canSendReply(): boolean {
        return this.hasMinReplyMessageLength();
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

    openReplyModal(): void {
        if (!this.canComposeMessage()) return;
        this.replyAttempted = false;
        this.showReplyModal = true;

        setTimeout(() => {
            this.replyTextareaRef?.nativeElement.focus();
        });
    }  
 
    closeReplyModal(): void {
        this.replyAttempted = false;
        this.showReplyModal = false;
    }

    onAttachmentSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            this.clearAttachment();
            return;
        }

        const sanitizedName = sanitizeAttachmentFileName(file.name);
        if (!isAllowedAttachment(file.type || '', sanitizedName)) {
            this.clearAttachment();
            alert('Sadece resim dosyaları ve zipli resim arşivi yüklenebilir. Desteklenen formatlar: JPG, PNG, WEBP, GIF, BMP, SVG, ZIP, RAR, 7Z.');
            return;
        }

        if (file.size > UserRequestDetailPage.MAX_ATTACHMENT_SIZE_BYTES) {
            this.clearAttachment();
            alert('Dosya boyutu 5 MB\'ı geçemez.');
            return;
        }

        const safeFile = new File([file], sanitizedName, {
            type: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
        });

        this.attachmentFile = safeFile;
        this.attachmentFileName = safeFile.name;
    }

    clearAttachment(): void {
        this.attachmentFile = null;
        this.attachmentFileName = null;

        if (this.messageFileInputRef?.nativeElement) {
            this.messageFileInputRef.nativeElement.value = '';
        }
    }

    hasMessageAttachment(message: UserRequestMessageResponse): boolean {
        return !!message.fileUrl;
    }

    isImageAttachment(message: UserRequestMessageResponse): boolean {
        const fileType = (message.fileType || '').toLowerCase();
        return fileType.startsWith('image/');
    }

    getAttachmentFileName(message: UserRequestMessageResponse): string {
        const fileUrl = message.fileUrl || '';
        if (!fileUrl) return 'Ek dosya';

        const normalized = fileUrl.replace(/\\/g, '/');
        const lastSlashIndex = normalized.lastIndexOf('/');
        const rawName = lastSlashIndex >= 0 ? normalized.slice(lastSlashIndex + 1) : normalized;
        return sanitizeAttachmentFileName(rawName || 'Ek dosya');
    }

    openAttachmentAccessLog(message: UserRequestMessageResponse, action: 'view' | 'download' = 'view'): void {
        const userId = this.userMenuService.getUserIdFromToken();
        if (!this.requestId || !userId) {
            return;
        }

        const accessLog = recordAttachmentAccess({
            requestId: this.requestId,
            fileName: this.getAttachmentFileName(message),
            userId,
            mimeType: message.fileType || 'application/octet-stream',
            action,
        });

        console.info('Attachment access logged', accessLog);
    }

    openImagePreview(message: UserRequestMessageResponse): void {
        if (!message.fileUrl) return;

        this.previewImageUrl = message.fileUrl;
        this.previewImageName = this.getAttachmentFileName(message);
        this.openAttachmentAccessLog(message, 'view');
    }

    closeImagePreview(): void {
        this.previewImageUrl = null;
        this.previewImageName = null;
    }

    getAttachmentTypeLabel(message: UserRequestMessageResponse): string {
        const fileType = (message.fileType || '').toLowerCase();
        if (fileType.startsWith('image/')) return 'Gorsel';
        if (fileType.includes('pdf')) return 'PDF';
        if (fileType.includes('word') || fileType.includes('officedocument.word')) return 'Word';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Excel';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return 'Arsiv';
        return 'Dosya';
    }

    openEditModal(): void {
        if (!this.request || !this.canEditRequest()) return;

        this.editForm = {
            categoryId: this.request.categoryId ?? '',
            statusId: this.request.statusId ?? '',
            priorityId: this.request.priorityId ?? '',
            assignedUserId: this.request.assignedUserId ?? '',
            subject: this.request.subject ?? '',
            description: this.request.description ?? '',
            isBlocked: this.request.isBlocked ?? false,
        };
        this.showEditModal = true;
    }

    closeEditModal(): void {
        this.showEditModal = false;
    }

    async saveEdit(): Promise<void> {
        if (!this.request || !this.canEditRequest()) return;

        try {
            const requestBody = {
                assignedUserId: this.editForm.assignedUserId || null,
                applicationId: this.request.applicationId || null,
                categoryId: this.editForm.categoryId,
                statusId: this.editForm.statusId,
                priorityId: this.editForm.priorityId,
                subject: this.editForm.subject,
                description: this.editForm.description,
                isBlocked: this.editForm.isBlocked,
            };

            await this.requestService.update(this.request.id, requestBody);
            this.showEditModal = false;
            await this.loadRequest();
        } catch (err) {
            console.error('Request update error:', err);
            alert('Talep güncellenemedi.');
        }
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    }

    getRelativeTimeLabel(dateStr?: string): string {
        if (!dateStr) return '';

        const date = new Date(dateStr);
        const time = date.getTime();
        if (Number.isNaN(time)) return '';

        const diffMs = Date.now() - time;
        if (diffMs < 0) return 'az once';

        const minuteMs = 60 * 1000;
        const hourMs = 60 * minuteMs;
        const dayMs = 24 * hourMs;

        const days = Math.floor(diffMs / dayMs);
        if (days > 0) {
            return `${days} gun once`;
        }

        const hours = Math.floor(diffMs / hourMs);
        if (hours > 0) {
            return `${hours} saat once`;
        }

        const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
        return `${minutes} dk once`;
    }

    // ── Mesaj Gönderme ──
    async sendMessage(): Promise<void> {
        this.replyAttempted = true;

        if (!this.canSendReply()) {
            return;
        }

        const userId = this.userMenuService.getUserIdFromToken();
        if (!userId) {
            alert('Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapın.');
            return;
        }

        try {
            if (this.attachmentFile) {
                await this.requestService.createMessageWithFile({
                    requestId: this.requestId,
                    senderUserId: userId,
                    message: this.newMessage.trim(),
                    file: this.attachmentFile,
                });
            } else {
                const req: CreateUserRequestMessageRequest = {
                    requestId: this.requestId,
                    senderUserId: userId,
                    message: this.newMessage.trim(),
                };
                await this.requestService.createMessage(req);
            }

            this.newMessage = '';
            this.clearAttachment();
            this.replyAttempted = false;
            this.showReplyModal = false;
            await this.loadRequest();
            await this.loadMessages();
            this.shouldScrollToBottom = true;
        } catch (err: any) {
            console.error('Message send error:', err);
            const msg = err.status === 0
                ? `Sunucuya bağlanılamadı.`
                : `Hata ${err.status}: ${err.error?.message || err.error?.title || JSON.stringify(err.error)}`;
            alert('Mesaj gönderilemedi:\n' + msg);
        }
    }

    onMessageKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    // ── Talebi Kapat ──
    async closeRequest(): Promise<void> {
        const request = this.request;
        if (!request || !this.canCloseRequest()) return;

        if (confirm(`"${request.subject}" talebini kapatmak istediğinize emin misiniz?`)) {
            try {
                await this.requestService.close(this.requestId);
                await this.loadRequest();
            } catch (err) {
                console.error('Close error:', err);
            }
        }
    }

    goBack(): void {
        this.router.navigate(['/admin/user-requests']);
    }
}
