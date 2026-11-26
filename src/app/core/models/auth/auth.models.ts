export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterWithCompanyRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  companyId?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  userId: string;
  companyId: string | null;
  accessToken: string;
  refreshToken: string;
  expiration: string;
  name: string;
  surname: string;
  lastLoginDate: string;
}
