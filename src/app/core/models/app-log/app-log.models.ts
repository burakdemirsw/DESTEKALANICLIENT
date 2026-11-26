/** Log seviyesi: API hataları, uyarılar, bilgi kayıtları ve her HTTP isteğinin kaydı. */
export type AppLogLevel = 'Error' | 'Warning' | 'Information' | 'Request';

export interface AppLogPagedRequest {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string | null;
  level?: AppLogLevel | null;
  statusCode?: number | null;
  /** yyyy-MM-dd; bu günden itibaren (dahil). */
  startDate?: string | null;
  /** yyyy-MM-dd; bu güne kadar (dahil). */
  endDate?: string | null;
}

export interface AppLogResponse {
  id: string;
  level: string;
  message: string | null;
  source: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  /** Gizli değerler (token vb.) sunucuda *** ile maskelenir. */
  queryString: string | null;
  statusCode: number | null;
  userIp: string | null;
  createdDate: string;
}

export interface AppLogDetailResponse extends AppLogResponse {
  stackTrace: string | null;
}
