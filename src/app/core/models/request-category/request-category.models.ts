export interface RequestCategoryResponse {
    id: string;
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
    isBlocked: boolean;
    createdDate: string;
    updatedDate: string;
    // Kategorinin bağlı olduğu talep uygulaması; boşsa her uygulamada seçilir
    applicationId?: string | null;
    applicationName?: string | null;
}

export interface CreateRequestCategoryRequest {
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
    applicationId?: string | null;
}

export interface UpdateRequestCategoryRequest {
    name: string;
    description: string;
    colorCode?: string | null;
    order: number;
    isBlocked: boolean;
    applicationId?: string | null;
}
