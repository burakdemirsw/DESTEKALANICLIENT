import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { ApiResponse } from '../models/api-response.model';
import { PaginationRequest, buildPaginationRequest, PagedResult } from '../models/pagination.model';
import {
  RequestApplicationResponse,
  CreateRequestApplicationRequest,
  UpdateRequestApplicationRequest,
} from '../models/request-application/request-application.models';

@Injectable({
  providedIn: 'root',
})
export class RequestApplicationsService {
  constructor(private http: HttpClientService) {}

  getPaged(req?: PaginationRequest): Promise<ApiResponse<PagedResult<RequestApplicationResponse>>> {
    return this.http.post<PagedResult<RequestApplicationResponse>>(
      { controller: 'RequestApplications', action: 'paged' },
      buildPaginationRequest(req),
    );
  }

  getById(id: string): Promise<ApiResponse<RequestApplicationResponse>> {
    return this.http.get<RequestApplicationResponse>({ controller: 'RequestApplications', action: id });
  }

  create(request: CreateRequestApplicationRequest): Promise<ApiResponse<RequestApplicationResponse>> {
    return this.http.post<RequestApplicationResponse>({ controller: 'RequestApplications' }, request);
  }

  update(id: string, request: UpdateRequestApplicationRequest): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'RequestApplications', action: `update/${id}` }, request);
  }

  delete(id: string): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'RequestApplications', action: `delete/${id}` }, {});
  }
}
