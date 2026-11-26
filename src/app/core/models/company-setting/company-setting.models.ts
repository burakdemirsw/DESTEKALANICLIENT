export interface CompanySetting {
  id: string;
  companyId: string;
  isTwoFactorAuthEnabled: boolean;
  createdDate: string;
  updatedDate: string;
}

export interface CreateCompanySettingRequest {
  companyId: string;
  isTwoFactorAuthEnabled: boolean;
}

export interface UpdateCompanySettingRequest {
  isTwoFactorAuthEnabled: boolean;
}
