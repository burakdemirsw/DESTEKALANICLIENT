import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { ApiResponse } from '../models/api-response.model';
import { PagedResult } from '../models/pagination.model';
import { AppLogDetailResponse, AppLogPagedRequest, AppLogResponse } from '../models/app-log/app-log.models';

/** Sistem logları (yalnız destek yöneticisi). */
@Injectable({
  providedIn: 'root',
})
export class AppLogsService {
  constructor(private http: HttpClientService) {}

  getPaged(request: AppLogPagedRequest): Promise<ApiResponse<PagedResult<AppLogResponse>>> {
    return this.http.post<PagedResult<AppLogResponse>>({ controller: 'AppLogs', action: 'paged' }, request);
  }

  getById(id: string): Promise<ApiResponse<AppLogDetailResponse>> {
    return this.http.get<AppLogDetailResponse>({ controller: 'AppLogs', action: id });
  }
}
