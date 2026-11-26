export interface RequestPriorityResponse {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
    // Hedef çözüm süresi (saat); boşsa hedef yok
    targetHours?: number | null;
    order?: number;
}

export interface CreateRequestPriorityRequest {
    name: string;
    description: string;
    isDefault?: boolean;
    targetHours?: number | null;
    order?: number;
}

export interface UpdateRequestPriorityRequest {
    name: string;
    description: string;
    isDefault: boolean;
    isBlocked: boolean;
    targetHours?: number | null;
    // Gönderilmezse sunucuda sıra 0'a döner; mevcut sıra korunur
    order?: number;
}
