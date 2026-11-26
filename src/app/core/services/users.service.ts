import { Injectable } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { CreateUserRequest, UpdateUserRequest, UserResponse } from '../models/user/user.models';
import { ApiResponse } from '../models/api-response.model';
import {
  AdminPaginationRequest,
  PaginationRequest,
  buildAdminPaginationRequest,
  buildPaginationRequest,
  PagedResult,
} from '../models/pagination.model';
import { RegisterWithCompanyRequest } from '../models/auth/auth.models';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  constructor(private http: HttpClientService) {}

  getAll(req?: PaginationRequest): Promise<ApiResponse<PagedResult<UserResponse>>> {
    return this.http.post<PagedResult<UserResponse>>(
      { controller: 'Users', action: 'paged' },
      buildPaginationRequest(req),
    );
  }

  /** Tüm şirketlerin kullanıcıları (şirket adıyla). Yalnız destek yöneticisi çağırabilir. */
  adminGetAll(req?: AdminPaginationRequest): Promise<ApiResponse<PagedResult<UserResponse>>> {
    return this.http.post<PagedResult<UserResponse>>(
      { controller: 'Users', action: 'admin-paged' },
      buildAdminPaginationRequest(req),
    );
  }

  getById(id: string): Promise<ApiResponse<UserResponse>> {
    return this.http.get<UserResponse>({ controller: 'Users' }, id);
  }

  /**
   * Kullanıcı ekler. companyId verilmezse isteği yapanın şirketine eklenir; verilirse o şirkete eklenir
   * (yalnız destek yöneticisi, Şirketler > şirket detayı).
   */
  create(request: CreateUserRequest, companyId?: string): Promise<ApiResponse<UserResponse>> {
    if (companyId) {
      return this.http.post<UserResponse>({ controller: 'Users', action: `company/${companyId}` }, request);
    }
    return this.http.post<UserResponse>({ controller: 'Users' }, request);
  }

  registerWithCompany(request: RegisterWithCompanyRequest): Promise<ApiResponse<UserResponse>> {
    return this.http.post<UserResponse>({ controller: 'Auth', action: 'register-with-company' }, request);
  }

  update(id: string, request: UpdateUserRequest): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'Users', action: `update/${id}` }, request);
  }

  delete(id: string): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'Users', action: `delete/${id}` }, {});
  }

  sendConfirmMail(id: string): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'Users', action: `send-confirm-mail/${id}` }, {});
  }

  confirmMail(id: string, token: string): Promise<ApiResponse<object>> {
    return this.http.post<object>({ controller: 'Users', action: `confirm-mail/${id}`, queryString: `token=${encodeURIComponent(token)}` }, {});
  }
}
