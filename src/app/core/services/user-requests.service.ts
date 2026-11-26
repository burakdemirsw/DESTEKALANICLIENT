import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import {
    CreateUserRequestRequest,
    CreateUserRequestWithFilesResponse,
    UpdateUserRequestRequest,
    CreateUserRequestMessageRequest,
    UserRequestAdminPagedRequest,
    UserRequestPagedRequest,
    UserRequestResponse,
    UserRequestMessageResponse,
    UserRequestStatusSummaryReportRequest,
    UserRequestStatusSummaryReportResponse,
} from '../models/user-request/user-request.models';
import { ApiResponse } from '../models/api-response.model';
import { AdminPaginationRequest, buildPaginationRequest, buildAdminPaginationRequest, PagedResult } from '../models/pagination.model';

@Injectable({
    providedIn: 'root',
})
export class UserRequestsService {
    constructor(private http: HttpClientService) {}

    // ── UserRequests ──
    getPaged(req?: UserRequestPagedRequest): Promise<ApiResponse<PagedResult<UserRequestResponse>>> {
        return this.http.post<PagedResult<UserRequestResponse>>(
            { controller: 'UserRequests', action: 'paged' },
            buildPaginationRequest(req),
        );
    }

    // onlyMine: true ise yalnız giriş yapan yöneticiye düşen talepler gelir ("Bana Düşenler").
    adminGetPaged(req?: AdminPaginationRequest & Pick<UserRequestAdminPagedRequest, 'onlyMine'>): Promise<ApiResponse<PagedResult<UserRequestResponse>>> {
        const body: UserRequestAdminPagedRequest = { ...buildAdminPaginationRequest(req), onlyMine: req?.onlyMine ?? false };
        return this.http.post<PagedResult<UserRequestResponse>>(
            { controller: 'UserRequests', action: 'admin-paged' },
            body,
        );
    }

    getById(id: string): Promise<ApiResponse<UserRequestResponse>> {
        return this.http.get<UserRequestResponse>({ controller: 'UserRequests', action: id });
    }

    getByUser(userId: string): Promise<ApiResponse<any[]>> {
        return this.http.get<any[]>({ controller: 'UserRequests', action: `by-user/${userId}` });
    }

    getByAssignedUser(assignedUserId: string): Promise<ApiResponse<UserRequestResponse[]>> {
        return this.http.get<UserRequestResponse[]>({ controller: 'UserRequests', action: `by-assigned-user/${assignedUserId}` });
    }

    // Sayfalı listeyi en çok maxItems kayda kadar sayfa sayfa toplar (CSV dışa aktarım, anasayfa özeti).
    // stopWhen verilirse her sayfadan sonra sorulur; true dönerse kalan sayfalar istenmez.
    getAllPaged(
        req: UserRequestPagedRequest,
        maxItems: number,
        stopWhen?: (items: UserRequestResponse[]) => boolean,
    ): Promise<{ items: UserRequestResponse[]; totalCount: number }> {
        return this.collectPages(page => this.getPaged({ ...req, ...page }), maxItems, stopWhen);
    }

    adminGetAllPaged(
        req: AdminPaginationRequest,
        maxItems: number,
        stopWhen?: (items: UserRequestResponse[]) => boolean,
    ): Promise<{ items: UserRequestResponse[]; totalCount: number }> {
        return this.collectPages(page => this.adminGetPaged({ ...req, ...page }), maxItems, stopWhen);
    }

    private async collectPages(
        fetchPage: (page: { pageNumber: number; pageSize: number }) => Promise<ApiResponse<PagedResult<UserRequestResponse>>>,
        maxItems: number,
        stopWhen?: (items: UserRequestResponse[]) => boolean,
    ): Promise<{ items: UserRequestResponse[]; totalCount: number }> {
        const pageSize = Math.min(200, maxItems);
        const items: UserRequestResponse[] = [];
        let totalCount = 0;

        for (let pageNumber = 1; items.length < maxItems; pageNumber++) {
            const paged = (await fetchPage({ pageNumber, pageSize }))?.data;
            const pageItems = paged?.items ?? [];
            totalCount = paged?.totalCount ?? items.length + pageItems.length;
            items.push(...pageItems);

            const lastPage = paged?.totalPages ?? pageNumber;
            if (!pageItems.length || pageNumber >= lastPage || items.length >= totalCount || stopWhen?.(items)) break;
        }
        return { items: items.slice(0, maxItems), totalCount };
    }

    getByStatus(statusId: string): Promise<ApiResponse<any[]>> {
        return this.http.get<any[]>({ controller: 'UserRequests', action: `by-status/${statusId}` });
    }

    create(request: CreateUserRequestRequest): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests' }, request);
    }

    // Talebi dosyalarıyla birlikte tek istekte açar. Sunucu dosyaları talebi açmadan önce denetler; biri geçersizse
    // (exe, içeriği uzantısıyla uyuşmayan dosya, 5 MB üstü) talep açılmaz ve istek hata döner. failedFiles yalnız
    // denetimden geçip sunucuda kaydedilemeyen dosyaları içerir (talep açılmıştır, dosya detaydan yeniden eklenebilir).
    async createWithAttachments(
        request: CreateUserRequestRequest,
        files: File[],
    ): Promise<{ id: string | null; failedFiles: string[] }> {
        if (!files.length) {
            const response = await this.create(request);
            return { id: response?.data?.id ?? response?.data?.Id ?? null, failedFiles: [] };
        }

        const formData = new FormData();
        if (request.applicationId) {
            formData.append('applicationId', request.applicationId);
        }
        formData.append('categoryId', request.categoryId);
        formData.append('subject', request.subject);
        formData.append('description', request.description);
        files.forEach(file => formData.append('files', file, file.name));

        const response = await this.http.post<CreateUserRequestWithFilesResponse>(
            { controller: 'UserRequests', action: 'with-files' },
            formData,
        );
        return { id: response?.data?.request?.id ?? null, failedFiles: response?.data?.failedFiles ?? [] };
    }

    update(id: string, request: UpdateUserRequestRequest): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests', action: `update/${id}` }, request);
    }

    close(id: string): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests', action: `close/${id}` }, {});
    }

    delete(id: string): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests', action: `delete/${id}` }, {});
    }

    getStatusSummaryReport(request: UserRequestStatusSummaryReportRequest): Promise<ApiResponse<UserRequestStatusSummaryReportResponse>> {
        return this.http.post<UserRequestStatusSummaryReportResponse>(
            { controller: 'UserRequests', action: 'status-summary-report' },
            request,
        );
    }

    // ── Messages ──
    getMessages(requestId: string): Promise<ApiResponse<UserRequestMessageResponse[]>> {
        return this.http.get<UserRequestMessageResponse[]>({ controller: 'UserRequests', action: `${requestId}/messages` });
    }

    createMessage(request: CreateUserRequestMessageRequest): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests', action: 'messages' }, request);
    }

    createMessageWithFile(request: {
        requestId: string;
        senderUserId: string;
        message?: string;
        file?: File;
    }): Promise<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('requestId', request.requestId);
        formData.append('senderUserId', request.senderUserId);

        if (request.message) {
            formData.append('message', request.message);
        }

        if (request.file) {
            formData.append('file', request.file, request.file.name);
        }

        return this.http.post<any>({ controller: 'UserRequests', action: 'messages/with-file' }, formData);
    }

    // Mesajın dosya ekini yetkili uçtan indirir; ekler herkese açık bir adreste durmaz, yalnız talebi görebilen
    // kullanıcı indirebilir.
    downloadMessageFile(messageId: string): Promise<Blob> {
        return this.http.getBlob({ controller: 'UserRequests', action: `messages/${messageId}/file` });
    }
}
