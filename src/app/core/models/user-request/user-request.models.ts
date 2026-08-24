export interface UserRequest {
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
    // Expanded
    userName?: string | null;
    userLastName?: string | null;
    userEmail?: string | null;
    assignedUserName?: string | null;
    assignedUserLastName?: string | null;
    categoryName?: string | null;
    applicationName?: string | null;
    statusName?: string | null;
    priorityName?: string | null;
    priorityColorCode?: string | null;
}

export interface UserRequestResponse {
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
    priorityName: string;
    userName: string;
    assignedUserName: string;
}

export interface CreateUserRequestRequest {
    userId: string;
    applicationId: string;
    categoryId: string;
    subject: string;
    description: string;
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
    fileUrl?: string | null;
    fileType?: string | null;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
    senderUserName?: string | null;
    from?: string | null;
}

export interface CreateUserRequestMessageRequest {
    requestId: string;
    senderUserId: string;
    message: string;
    fileUrl?: string | null;
    fileType?: string | null;
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

export interface UserRequestPagedRequest {
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
