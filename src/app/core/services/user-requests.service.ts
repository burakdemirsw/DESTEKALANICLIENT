import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import {
    CreateUserRequestRequest,
    UpdateUserRequestRequest,
    CreateUserRequestMessageRequest,
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

    adminGetPaged(req?: AdminPaginationRequest): Promise<ApiResponse<PagedResult<UserRequestResponse>>> {
        return this.http.post<PagedResult<UserRequestResponse>>(
            { controller: 'UserRequests', action: 'admin-paged' },
            buildAdminPaginationRequest(req),
        );
    }

    getById(id: string): Promise<ApiResponse<UserRequestResponse>> {
        return this.http.get<UserRequestResponse>({ controller: 'UserRequests', action: id });
    }

    getByUser(userId: string): Promise<ApiResponse<any[]>> {
        return this.http.get<any[]>({ controller: 'UserRequests', action: `by-user/${userId}` });
    }

    getByAssignedUser(assignedUserId: string): Promise<ApiResponse<any[]>> {
        return this.http.get<any[]>({ controller: 'UserRequests', action: `by-assigned-user/${assignedUserId}` });
    }

    getByStatus(statusId: string): Promise<ApiResponse<any[]>> {
        return this.http.get<any[]>({ controller: 'UserRequests', action: `by-status/${statusId}` });
    }

    create(request: CreateUserRequestRequest): Promise<ApiResponse<any>> {
        return this.http.post<any>({ controller: 'UserRequests' }, request);
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
}
