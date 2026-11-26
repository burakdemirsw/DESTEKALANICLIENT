import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { ApiResponse } from '../models/api-response.model';
import {
    SupportPerformanceReportRequest,
    SupportPerformanceReportResponse,
} from '../models/support-report/support-report.models';

// Destek raporları: yönetici tüm şirketleri, şirket kullanıcısı kendi şirketini görür.
@Injectable({ providedIn: 'root' })
export class SupportReportsService {
    constructor(private http: HttpClientService) {}

    getPerformance(request: SupportPerformanceReportRequest): Promise<ApiResponse<SupportPerformanceReportResponse>> {
        return this.http.post<SupportPerformanceReportResponse>({ controller: 'SupportReports', action: 'performance' }, request);
    }
}
