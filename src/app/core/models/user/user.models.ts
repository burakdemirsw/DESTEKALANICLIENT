export interface CreateUserRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  gender: string;
}

export interface UpdateUserRequest {
  name: string;
  lastName: string;
  gender: string;
  isBlocked: boolean;
  photoUrl?: string | null;
  phoneNumber?: string | null;
}

export interface UserResponse {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string | null;
  gender: string | null;
  lastLoginDate: string;
  isBlocked: boolean;
  isMailConfirmed: boolean | null;
  photoUrl: string | null;
  phoneNumber: string | null;
  createdDate: string;
  updatedDate: string;
  companyId?: string | null;
  companyName?: string | null;
}

/** @deprecated UserResponse kullanın */
export type User = UserResponse;
