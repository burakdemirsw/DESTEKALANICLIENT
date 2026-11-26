import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { CreateCompanyRequest, UpdateCompanyRequest, Company } from '../models/customer/company.models';
import { ApiResponse } from '../models/api-response.model';
import { PaginationRequest, PagedResult, buildPaginationRequest } from '../models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class CompaniesService {
    constructor(private http: HttpClientService) {}

    getPaged(
        req: PaginationRequest,
    ): Promise<ApiResponse<PagedResult<Company>>> {
        const body = buildPaginationRequest(req);
        return this.http.post<PagedResult<Company>>(
            { controller: 'Companies', action: 'paged' },
            body,
        );
    }

    getById(id: string): Promise<ApiResponse<Company>> {
        return this.http.get<Company>({
            controller: 'Companies',
            action: `${id}`,
        });
    }

    getByTaxNumber(taxNumber: string): Promise<ApiResponse<any>> {
        return this.http.get<any>({
            controller: 'Companies',
            action: `tax/${taxNumber}`,
        });
    }

    create(request: CreateCompanyRequest): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'Companies' }, request);
    }

    /** Kaynak şirketi kopyalar: yeni şirket istekteki bilgilerle açılır, kaynağın ayarları aktarılır. Yalnız destek yöneticisi. */
    copy(sourceId: string, request: CreateCompanyRequest): Promise<ApiResponse<Company>> {
        return this.http.post<Company>(
            { controller: 'Companies', action: `copy/${sourceId}` },
            request,
        );
    }

    update(
        id: string,
        request: UpdateCompanyRequest,
    ): Promise<ApiResponse<any>> {
        return this.http.post<any>(
            { controller: 'Companies', action: `update/${id}` },
            request,
        );
    }

    delete(id: string): Promise<ApiResponse<any>> {
        return this.http.post<any>(
            { controller: 'Companies', action: `delete/${id}` },
            {},
        );
    }
}
