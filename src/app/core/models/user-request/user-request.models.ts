// Talebin mesaj / değerlendirme özeti (liste, anasayfa ve detayda kullanılır; eski API'de gelmez)
export interface UserRequestActivityInfo {
    // Son (iç not olmayan) mesajın tarihi ve destek yöneticisinden gelip gelmediği
    lastMessageDate?: string | null;
    lastMessageFromManager?: boolean | null;
    // Giriş yapan kullanıcının okumadığı, karşı taraftan gelen mesaj sayısı
    unreadCount?: number;
    satisfactionRating?: number | null;
    satisfactionComment?: string | null;
    // Önceliğin hedef çözüm süresi (saat) ve talebin bu süreyi aşıp aşmadığı
    priorityTargetHours?: number | null;
    isOverdue?: boolean;
}

export interface UserRequest extends UserRequestActivityInfo {
    id: string;
    requestNo?: string | null;
    userId: string;
    assignedUserId?: string | null;
    applicationId?: string | null;
    categoryId: string;
    statusId: string;
    priorityId: string;
    subject?: string | null;
    description?: string | null;
    isBlocked: boolean;
    createdDate?: string;
    updatedDate?: string;
    closedDate?: string | null;
    isClosed?: boolean | null;
    // Expanded
    userName?: string | null;
    userLastName?: string | null;
    userEmail?: string | null;
    assignedUserName?: string | null;
    assignedUserLastName?: string | null;
    categoryName?: string | null;
    applicationName?: string | null;
    statusName?: string | null;
    statusColorCode?: string | null;
    colorCode?: string | null;
    priorityName?: string | null;
    companyDescription?: string | null;
    priorityColorCode?: string | null;
}

export interface UserRequestResponse extends UserRequestActivityInfo {
    id: string;
    userId: string;
    assignedUserId?: string | null;
    applicationId?: string | null;
    categoryId: string;
    statusId: string;
    priorityId: string;
    requestNo: string;
    subject: string;
    description: string;
    closedDate?: string | null;
    isClosed: boolean;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
    applicationName: string;
    categoryName: string;
    statusName: string;
    statusColorCode?: string | null;
    colorCode?: string | null;
    priorityName: string;
    companyDescription?: string | null;
    userName: string;
    userLastName?: string | null;
    assignedUserName: string;
    assignedUserLastName?: string | null;
}

export interface CreateUserRequestRequest {
    userId: string;
    applicationId: string;
    categoryId: string;
    subject: string;
    description: string;
    // Talep açanın seçtiği öncelik (aciliyet); boşsa varsayılan öncelik
    priorityId?: string | null;
}

// POST UserRequests/with-files yanıtı. failedFiles: denetimden geçip sunucuda kaydedilemeyen dosyaların adları.
export interface CreateUserRequestWithFilesResponse {
    request: UserRequestResponse;
    failedFiles: string[];
}

export interface UpdateUserRequestRequest {
    assignedUserId: string | null;
    applicationId: string | null;
    categoryId: string;
    statusId: string;
    priorityId: string;
    subject: string;
    description: string;
    isBlocked: boolean;
}

export interface UserRequestMessage {
    id: string;
    requestId: string;
    senderUserId: string;
    message: string;
    isRead?: boolean;
    fileUrl?: string | null;
    fileType?: string | null;
    from?: string;
    createdDate?: string;
    // Expanded
    senderUserName?: string;
    senderUserLastName?: string;
    senderUserEmail?: string;
}

export interface UserRequestMessageResponse {
    id: string;
    requestId: string;
    senderUserId: string;
    message: string;
    isRead: boolean;
    fileUrl?: string | null;
    fileType?: string | null;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
    senderUserName?: string | null;
    from?: string | null;
    // Gönderen destek yöneticisi mi; iç not mu (yalnız yöneticiye gelir)
    isFromManager?: boolean;
    isInternal?: boolean;
}

export interface CreateUserRequestMessageRequest {
    requestId: string;
    senderUserId: string;
    message: string;
    fileUrl?: string | null;
    fileType?: string | null;
    // İç not (yalnız destek yöneticisi gönderebilir)
    isInternal?: boolean;
}

export interface UserRequestStatusSummaryReportRequest {
    userId: string;
    dayCount: number;
}

export interface UserRequestStatusSummaryItemResponse {
    statusName: string;
    count: number;
    colorCode?: string | null;
}

export interface UserRequestStatusSummaryReportResponse {
    startDate: string;
    endDate: string;
    dayCount: number;
    totalCount: number;
    items: UserRequestStatusSummaryItemResponse[];
}

/**
 * Destek yöneticisinin talep listesi (UserRequests/admin-paged).
 * onlyMine: yalnız yöneticiye düşen talepler (sorumlusu olduğu uygulama / kategoridekiler, kendisine atananlar
 * ve hiç sorumlusu olmayanlar).
 */
export interface UserRequestAdminPagedRequest {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDescending?: boolean;
    onlyMine?: boolean;
}

export interface UserRequestPagedRequest {
    userId: string;
    companyId: string;
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDescending?: boolean;
    applicationId?: string;
    categoryId?: string;
    statusId?: string;
    priorityId?: string;
}
