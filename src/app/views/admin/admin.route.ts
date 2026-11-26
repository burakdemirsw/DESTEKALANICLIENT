import { Routes } from '@angular/router';
import { RolesPage } from './roles/roles';
import { MenusPage } from './menus/menus';
import { MailSettingsPage } from './mail-settings/mail-settings';
import { CloudinarySettingsPage } from './cloudinary-settings/cloudinary-settings';
import { AwsS3SettingsPage } from './aws-s3-settings/aws-s3-settings';
import { RoleAssignmentsPage } from './role-assignments/role-assignments';
import { RoleMenusPage } from './role-menus/role-menus';
import { RequestCategoriesPage } from './request-categories/request-categories';
import { RequestApplicationsPage } from './request-applications/request-applications';
import { RequestPrioritiesPage } from './request-priorities/request-priorities';
import { RequestStatusesPage } from './request-statuses/request-statuses';
import { UserRequestsPage } from './user-requests/user-requests';
import { UserRequestsAdminPage } from './user-requests-admin/user-requests-admin';
import { UserRequestDetailPage } from './user-requests/user-request-detail';
import { CompaniesPage } from './companies/companies';
import { CompanyDetailPage } from './companies/company-detail';
import { UserTypesPage } from './user-types/user-types';
import { RequestResponsiblesPage } from './request-responsibles/request-responsibles';
import { AppLogsPage } from './app-logs/app-logs';
import { Profile } from '@/app/views/apps/users/profile/profile';
import { ReleaseNotesPage } from '@/app/views/release-notes/release-notes';
import { AuthGuard } from '@/app/core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
    // ── Destek Merkezi ──────────────────────────────────────────────────────
    {
        path: 'admin/user-requests',
        component: UserRequestsPage,
        data: { title: 'Destek Taleplerim' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-requests/all',
        component: UserRequestsAdminPage,
        data: { title: 'Tüm Talepler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-requests/:id',
        component: UserRequestDetailPage,
        data: { title: 'Talep Detayı' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-applications',
        component: RequestApplicationsPage,
        data: { title: 'Talep Uygulamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-categories',
        component: RequestCategoriesPage,
        data: { title: 'Talep Kategorileri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-responsibles',
        component: RequestResponsiblesPage,
        data: { title: 'Talep Sorumluları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-statuses',
        component: RequestStatusesPage,
        data: { title: 'Talep Durumları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-priorities',
        component: RequestPrioritiesPage,
        data: { title: 'Talep Öncelikleri' },
        canActivate: [AuthGuard],
    },

    // ── Şirket ──────────────────────────────────────────────────────────────
    {
        path: 'admin/company-detail',
        component: CompanyDetailPage,
        data: { title: 'Şirket Bilgileri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/companies',
        component: CompaniesPage,
        data: { title: 'Şirketler' },
        canActivate: [AuthGuard],
    },
    // Yöneticinin seçtiği şirketi yönettiği detay; guard :id'yi atar, yetki "Şirketler" menüsünden gelir
    {
        path: 'admin/companies/:id',
        component: CompanyDetailPage,
        data: { title: 'Şirket Detayı' },
        canActivate: [AuthGuard],
    },

    // ── Sistem Yönetimi ─────────────────────────────────────────────────────
    {
        path: 'admin/user-types',
        component: UserTypesPage,
        data: { title: 'Kullanıcı Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/roles',
        component: RolesPage,
        data: { title: 'Roller' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/role-assignments',
        component: RoleAssignmentsPage,
        data: { title: 'Rol Atamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/menus',
        component: MenusPage,
        data: { title: 'Menüler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/role-menus',
        component: RoleMenusPage,
        data: { title: 'Menü Atamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/mail-settings',
        component: MailSettingsPage,
        data: { title: 'Mail Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/aws-s3-settings',
        component: AwsS3SettingsPage,
        data: { title: 'AWS S3 Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/cloudinary-settings',
        component: CloudinarySettingsPage,
        data: { title: 'Cloudinary Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/app-logs',
        component: AppLogsPage,
        data: { title: 'Sistem Logları' },
        canActivate: [AuthGuard],
    },

    // ── Kullanıcı ───────────────────────────────────────────────────────────
    {
        path: 'users/profile',
        component: Profile,
        data: { title: 'Profil' },
        canActivate: [AuthGuard],
    },
    {
        path: 'release-notes',
        component: ReleaseNotesPage,
        data: { title: 'Sürüm Notları' },
        canActivate: [AuthGuard],
    },
];
