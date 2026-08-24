export interface RequestCategoryResponse {
    id: string;
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
}

export interface CreateRequestCategoryRequest {
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
}

export interface UpdateRequestCategoryRequest {
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
    isBlocked: boolean;
}
