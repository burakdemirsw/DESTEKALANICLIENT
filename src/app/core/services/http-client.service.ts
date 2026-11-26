import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RequestParameters } from '../models/parameters/requestParameters';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

const BASE_URL = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root',
})
export class HttpClientService {
  constructor(private httpClient: HttpClient) {}

  private url(requestParameter: Partial<RequestParameters>): string {
    return `${requestParameter.baseUrl ?? BASE_URL}/${requestParameter.controller}${
      requestParameter.action ? `/${requestParameter.action}` : ''
    }`;
  }

  /**
   * HTTP GET isteği gönderir.
   * Tüm API yanıtları ApiResponse<T> olarak döner.
   */
  async get<T>(
    requestParameter: Partial<RequestParameters>,
    id?: string
  ): Promise<ApiResponse<T>> {
    let url = '';
    if (requestParameter.fullEndPoint) url = requestParameter.fullEndPoint;
    else
      url = `${this.url(requestParameter)}${id ? `/${id}` : ''}${
        requestParameter.queryString ? `?${requestParameter.queryString}` : ''
      }`;

    const raw = await firstValueFrom(
      this.httpClient.get<any>(url, {
        headers: requestParameter.headers,
        responseType: requestParameter.responseType as 'json',
      })
    );
    return ApiResponse.from<T>(raw);
  }

  /**
   * Dosyayı Blob olarak indirir (yetki isteyen dosya uçları için; Bearer başlığını interceptor ekler).
   * Yanıt ApiResponse'a sarılmaz.
   */
  getBlob(requestParameter: Partial<RequestParameters>): Promise<Blob> {
    const url = requestParameter.fullEndPoint
      ?? `${this.url(requestParameter)}${requestParameter.queryString ? `?${requestParameter.queryString}` : ''}`;

    return firstValueFrom(
      this.httpClient.get(url, { headers: requestParameter.headers, responseType: 'blob' })
    );
  }

  /**
   * HTTP POST isteği gönderir.
   * Tüm API yanıtları ApiResponse<T> olarak döner.
   */
  async post<T>(
    requestParameter: Partial<RequestParameters>,
    body: Partial<any>
  ): Promise<ApiResponse<T>> {
    let url = '';
    if (requestParameter.fullEndPoint) url = requestParameter.fullEndPoint;
    else
      url = `${this.url(requestParameter)}${
        requestParameter.queryString ? `?${requestParameter.queryString}` : ''
      }`;

    const raw = await firstValueFrom(
      this.httpClient.post<any>(url, body, {
        headers: requestParameter.headers,
        responseType: requestParameter.responseType as 'json',
      })
    );
    return ApiResponse.from<T>(raw);
  }
}
