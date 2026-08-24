export interface RequestApplicationResponse {
  id: string;
  applicationName: string | null;
  description: string | null;
  photoUrl?: string | null;
  isBlocked: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface CreateRequestApplicationRequest {
  applicationName: string;
  description: string;
  photoUrl?: string | null;
}

export interface UpdateRequestApplicationRequest {
  applicationName: string;
  description: string;
  photoUrl?: string | null;
  isBlocked: boolean;
}
