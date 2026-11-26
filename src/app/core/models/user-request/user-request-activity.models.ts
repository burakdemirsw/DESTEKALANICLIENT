// Talebin akış dışındaki hareketleri: değişiklik geçmişi, okundu işaretleme, çözüm onayı, yeniden açma ve anlık olaylar.

export interface UserRequestHistoryResponse {
    id: string;
    requestId: string;
    userId: string;
    userName: string;
    // Status, Priority, AssignedUser, Category, Application, Closed, Reopened, Rated
    fieldName: string;
    oldValue?: string | null;
    newValue?: string | null;
    createdDate: string;
}

export interface ConfirmResolutionRequest {
    rating: number;
    comment?: string | null;
}

export interface ReopenUserRequestRequest {
    message?: string | null;
}

export interface MarkMessagesReadResponse {
    markedCount: number;
}

// SignalR "RequestActivity" olayı: message, note (iç not), created, reopened, resolved
export interface UserRequestActivityEvent {
    eventId: string;
    type: 'message' | 'note' | 'created' | 'reopened' | 'resolved' | string;
    requestId: string;
    requestNo: string;
    subject: string;
    actorUserId: string;
    actorName: string;
    preview?: string | null;
    fromManager: boolean;
    date: string;
}
