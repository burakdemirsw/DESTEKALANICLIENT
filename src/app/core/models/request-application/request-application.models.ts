export interface RequestApplicationResponse {
  id: string;
  applicationName: string | null;
  description: string | null;
  isBlocked: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface CreateRequestApplicationRequest {
  applicationName: string;
  description: string;
}

export interface UpdateRequestApplicationRequest {
  applicationName: string;
  description: string;
  isBlocked: boolean;
}
