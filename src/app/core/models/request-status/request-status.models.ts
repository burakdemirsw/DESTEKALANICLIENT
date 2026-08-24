export interface RequestStatusResponse {
    id: string;
    name: string;
    description: string;
    colorCode?: string | null;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
}

export interface CreateRequestStatusRequest {
    name: string;
    description: string;
    colorCode?: string | null;
}

export interface UpdateRequestStatusRequest {
    name: string;
    description: string;
    colorCode?: string | null;
    isBlocked: boolean;
}
