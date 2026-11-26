import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { ApiResponse } from '../models/api-response.model';
import {
  RequestResponsibleAssignment,
  RequestResponsibleTargetType,
  RequestResponsibleUser,
  SetRequestResponsiblesRequest,
} from '../models/request-responsible/request-responsible.models';

/**
 * Talep uygulamaları / kategorileri ile sorumlu (destek yöneticisi) kullanıcıların eşleştirilmesi.
 * Talep, uygulamasının veya kategorisinin sorumlularına düşer; sorumlusu olmayan talep tüm yöneticilere düşer.
 */
@Injectable({
  providedIn: 'root',
})
export class RequestResponsiblesService {
  constructor(private http: HttpClientService) {}

  /** Tüm uygulama ve kategori eşleşmeleri. */
  getAssignments(): Promise<ApiResponse<RequestResponsibleAssignment[]>> {
    return this.http.get<RequestResponsibleAssignment[]>({ controller: 'RequestResponsibles' });
  }

  /** Sorumlu olarak seçilebilecek kullanıcılar (destek yöneticileri). */
  getCandidates(): Promise<ApiResponse<RequestResponsibleUser[]>> {
    return this.http.get<RequestResponsibleUser[]>({ controller: 'RequestResponsibles', action: 'candidates' });
  }

  /** Uygulamanın ya da kategorinin sorumlu listesini verilen kullanıcılarla değiştirir. */
  set(type: RequestResponsibleTargetType, targetId: string, userIds: string[]): Promise<ApiResponse<object>> {
    const body: SetRequestResponsiblesRequest = { userIds };
    return this.http.post<object>({ controller: 'RequestResponsibles', action: `${type}/${targetId}` }, body);
  }
}
