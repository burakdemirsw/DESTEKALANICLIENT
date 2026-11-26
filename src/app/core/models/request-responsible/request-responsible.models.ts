/** Sorumlu olarak seçilebilen (destek yöneticisi) kullanıcı. */
export interface RequestResponsibleUser {
  userId: string;
  fullName: string;
  email: string;
  companyName: string;
}

/** Bir uygulama ya da kategori ile sorumlu kullanıcı eşleşmesi; applicationId ve categoryId'den yalnız biri doludur. */
export interface RequestResponsibleAssignment {
  applicationId: string | null;
  categoryId: string | null;
  userId: string;
  fullName: string;
  email: string;
}

/** Uygulamanın / kategorinin sorumlu listesini verilen kullanıcılarla değiştirir. */
export interface SetRequestResponsiblesRequest {
  userIds: string[];
}

/** Sorumlu seçimi yapılan kayıt: talep uygulaması ya da talep kategorisi. */
export type RequestResponsibleTargetType = 'application' | 'category';
