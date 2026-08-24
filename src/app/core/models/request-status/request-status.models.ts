export interface RequestStatusResponse {
    id: string;
    name: string;
    description: string;
    order: number;
    colorCode?: string | null;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
}

export interface CreateRequestStatusRequest {
    name: string;
    description: string;
    order: number;
    colorCode?: string | null;
}

export interface UpdateRequestStatusRequest {
    name: string;
    description: string;
    order: number;
    colorCode?: string | null;
    isBlocked: boolean;
}
