// Destek yöneticilerinin ortak hazır yanıtları
export interface CannedReplyResponse {
    id: string;
    title: string;
    text: string;
    order: number;
    isBlocked: boolean;
    createdByUserId: string;
    createdByUserName: string;
    createdDate: string;
    updatedDate: string;
}

export interface CreateCannedReplyRequest {
    title: string;
    text: string;
    order?: number;
}

export interface UpdateCannedReplyRequest {
    title: string;
    text: string;
    order: number;
    isBlocked: boolean;
}
