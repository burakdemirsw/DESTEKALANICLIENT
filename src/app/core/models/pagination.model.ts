/**
 * C# backend PagedResult<T> record'unun frontend karşılığı.
 * Sayfalama yapan tüm endpoint'lerden dönen yanıtı temsil eder.
 */
export class PagedResult<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;  
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;

    constructor(data?: Partial<PagedResult<T>>) {
        this.items = data?.items ?? [];
        this.pageNumber = data?.pageNumber ?? 1;
        this.pageSize = data?.pageSize ?? 10;
        this.totalCount = data?.totalCount ?? 0;
        this.totalPages = data?.totalPages ?? 0;
        this.hasPreviousPage = data?.hasPreviousPage ?? false;
        this.hasNextPage = data?.hasNextPage ?? false;
    }

    /**
     * API response'unu PagedResult'a dönüştürür.
     * Backend ApiResponse<PagedResult<T>> döner:
     *   { statusCode, data: { items, pageNumber, pageSize, totalCount, totalPages, hasPreviousPage, hasNextPage } }
     * Farklı wrapper formatları da desteklenir (data, result, $values).
     */
    static from<T>(response: any): PagedResult<T> {
        if (response instanceof PagedResult) return response;

        // ApiResponse<PagedResult<T>> → response.data = PagedResult nesnesi
        const raw = response?.data ?? response?.result ?? response ?? {};

        // raw zaten PagedResult ise (items varsa) doğrudan kullan
        // Yoksa raw da ApiResponse gibi iç içe sarmalanmış olabilir
        const paged = raw?.items !== undefined ? raw : (raw?.data ?? raw);

        return new PagedResult<T>({
            items: paged?.items ?? paged?.$values ?? [],
            pageNumber: paged?.pageNumber ?? 1,
            pageSize: paged?.pageSize ?? 10,
            totalCount: paged?.totalCount ?? 0,
            totalPages: paged?.totalPages ?? 0,
            hasPreviousPage: paged?.hasPreviousPage ?? false,
            hasNextPage: paged?.hasNextPage ?? false,
        } as Partial<PagedResult<T>>);
    }
}

/**
 * C# backend PaginationRequest record'unun frontend karşılığı.
 * Tüm sayfalama yapılan servislerde bu interface kullanılır.
 */
export interface PaginationRequest {
    companyId: string;
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDescending?: boolean;
}

/** Admin için companyId gerektirmeyen pagination request modeli. */
export interface AdminPaginationRequest {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    sortDescending?: boolean;
}

/** Varsayılan pagination değerleri */
export const DEFAULT_PAGINATION: Required<Pick<PaginationRequest, 'pageNumber' | 'pageSize' | 'sortDescending'>> = {
    pageNumber: 1,
    pageSize: 20,
    sortDescending: false,
};

/**
 * Partial parametreden tam PaginationRequest oluşturur.
 * companyId verilmediyse localStorage'dan otomatik doldurur.
 */
export function buildPaginationRequest(req?: Partial<PaginationRequest>): PaginationRequest {
    return {
        ...DEFAULT_PAGINATION,
        ...req,
        companyId: req?.companyId || getCompanyIdFromStorage(),
    };
}

/** Admin endpointleri için companyId eklemeden pagination request oluşturur. */
export function buildAdminPaginationRequest(req?: Partial<AdminPaginationRequest>): AdminPaginationRequest {
    const { pageNumber, pageSize, searchTerm, sortBy, sortDescending } = {
        ...DEFAULT_PAGINATION,
        ...req,
    };

    return {
        pageNumber,
        pageSize,
        searchTerm,
        sortBy,
        sortDescending,
    };
}

/**
 * PaginationRequest nesnesini query-string'e dönüştürür.
 * Boş / undefined alanlar eklenmez.
 *
 * @param req  PaginationRequest nesnesi
 * @param prefix  Query string başlangıcı: `?` veya `&` (varsayılan `?`)
 * @returns  `?PageNumber=1&PageSize=20&...` şeklinde string
 */
/**
 * localStorage'daki authData'dan companyId'yi okur.
 * AuthStateService ile aynı kaynağı (AUTH_DATA_KEY = 'authData') kullanır.
 */
function getCompanyIdFromStorage(): string {
    try {
        const profile = JSON.parse(localStorage.getItem('authData') || '{}');
        return profile.companyId || '';
    } catch {
        return '';
    }
}

export function buildPaginationQuery(req?: PaginationRequest, prefix: string = '?', includeCompanyId: boolean = true): string {
    const p = { ...DEFAULT_PAGINATION, ...req };
    const parts: string[] = [];

    // companyId verilmediyse AuthState (localStorage) üzerinden otomatik doldur
    if (includeCompanyId && !p.companyId) {
        p.companyId = getCompanyIdFromStorage();
    }

    parts.push(`PageNumber=${p.pageNumber}`);
    parts.push(`PageSize=${p.pageSize}`);

    if (p.searchTerm) parts.push(`SearchTerm=${encodeURIComponent(p.searchTerm)}`);
    if (p.sortBy) parts.push(`SortBy=${encodeURIComponent(p.sortBy)}`);
    if (p.sortDescending) parts.push(`SortDescending=${p.sortDescending}`);
    if (includeCompanyId && p.companyId) parts.push(`CompanyId=${encodeURIComponent(p.companyId)}`);

    return parts.length > 0 ? `${prefix}${parts.join('&')}` : '';
}
