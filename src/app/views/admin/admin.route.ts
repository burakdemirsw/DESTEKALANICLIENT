import { Routes } from '@angular/router';
import { AiRequestLogsPage } from './ai-request-logs/ai-request-logs';
import { AiKnowledgePage } from './ai-knowledge/ai-knowledge';
import { AiKnowledgeTypesPage } from './ai-knowledge-types/ai-knowledge-types';
import { RolesPage } from './roles/roles';
import { MenusPage } from './menus/menus';
import { MailSettingsPage } from './mail-settings/mail-settings';
import { NetGsmSettingsPage } from './netgsm-settings/netgsm-settings';
import { CloudinarySettingsPage } from './cloudinary-settings/cloudinary-settings';
import { AwsS3SettingsPage } from './aws-s3-settings/aws-s3-settings';
import { CountriesPage } from './countries/countries';
import { CitiesPage } from './cities/cities';  
import { DistrictsPage } from './districts/districts';
import { IntegrationsPage } from './integrations/integrations';
import { IntegrationConnectionsPage } from './integration-connections/integration-connections';
import { IntegrationConnectionTypesPage } from './integration-connection-types/integration-connection-types';
import { RoleAssignmentsPage } from './role-assignments/role-assignments';
import { RoleMenusPage } from './role-menus/role-menus';
import { SocialMediaAccountsPage } from './social-media/accounts/accounts';
import { SocialMediaPropertiesPage } from './social-media/properties/properties';
import { UserSocialMediaAccountsPage } from './social-media/user-accounts/user-accounts';
import { CustomersPage } from './customers/customers';
import { UserIntegrationsPage } from './user-integrations/user-integrations';
import { IntegrationPropertiesPage } from './integration-properties/integration-properties';
import { AiProvidersPage } from './ai-assistants/ai-providers/ai-providers';
import { AiSettingsPage } from './ai-assistants/ai-settings/ai-settings';
import { AiModelsPage } from './ai-assistants/ai-models/ai-models';
import { AiProviderSettingsPage } from './ai-assistants/ai-provider-settings/ai-provider-settings';
import { AiAssistantsPage } from './ai-assistants/ai-assistants-list/ai-assistants';
import { RequestCategoriesPage } from './request-categories/request-categories';
import { RequestApplicationsPage } from './request-applications/request-applications';
import { RequestPrioritiesPage } from './request-priorities/request-priorities';
import { RequestStatusesPage } from './request-statuses/request-statuses';
import { UserRequestsPage } from './user-requests/user-requests';
import { UserRequestsAdminPage } from './user-requests-admin/user-requests-admin';
import { UserRequestDetailPage } from './user-requests/user-request-detail';
import { TeamsPage } from './teams/teams';
import { TeamInvitationsPage } from './teams/team-invitations/team-invitations';
import { TeamSettingsPage } from './teams/team-settings/team-settings';
import { TeamUsersPage } from './team-users/team-users';
import { ImageSearchPage } from './image-search/image-search';
import { ProductSyncPage } from './product-sync/product-sync';
import { IntegrationTypesPage } from './integration-types/integration-types';
import { UserIntegrationUserSocialMediaAccountsPage } from './user-integration-user-social-media-accounts/user-integration-user-social-media-accounts';
import { PromptsPage } from './prompts/prompts';
import { PromptAiAssistantsPage } from './prompt-ai-assistants/prompt-ai-assistants';
import { PromptTypesPage } from './prompt-types/prompt-types';
import { ProductsPage } from './products/products';
import { ChatPage } from './chat/chat';
import { ContactTypesPage } from './contact-types/contact-types';
import { AddressTypesPage } from './address-types/address-types';
import { CustomerTypesPage } from './customer-types/customer-types';
import { CustomerDescriptionsPage } from './customer-descriptions/customer-descriptions';
import { CustomerAddressesPage } from './customer-addresses/customer-addresses';
import { CustomerContactsPage } from './customer-contacts/customer-contacts';
import { TagsPage } from './tags/tags';
import { ConversationTagsPage } from './conversation-tags/conversation-tags';
import { ConversationNotesPage } from './conversation-notes/conversation-notes';
import { CompaniesPage } from './companies/companies';
import { CompanyDetailPage } from './companies/company-detail';
import { SegmentsPage } from './segments/segments';
import { ConversationSegmentsPage } from './conversation-segments/conversation-segments';
import { ConversationListDescriptionsPage } from './conversation-list-descriptions/conversation-list-descriptions';
import { ConversationListsPage } from './conversation-lists/conversation-lists';
import { ShortcutTypesPage } from './shortcut-types/shortcut-types';
import { ShortcutsPage } from './shortcuts/shortcuts';
import { OrderStatusesPage } from './order-statuses/order-statuses';
import { PaymentStatusesPage } from './payment-statuses/payment-statuses';
import { PaymentTypesPage } from './payment-types/payment-types';
import { AdminNotesPage } from './admin-notes/admin-notes';
import { UserTypesPage } from './user-types/user-types';
import { OrderCreatePage } from './order-create/order-create';
import { OrdersPage } from './orders/orders';
import { PlansPage } from './plans/plans';
import { PlanPurchasePage } from './plan-purchase/plan-purchase';
import { SubscriptionsPage } from './subscriptions/subscriptions';
import { SubscriptionPaymentsPage } from './subscription-payments/subscription-payments';
import { SubscriptionUsagesPage } from './subscription-usages/subscription-usages';
import { NeighbourhoodsPage } from './neighbourhoods/neighbourhoods';
import { AppsPage } from './apps/apps';
import { SetupWizardPage } from './setup-wizard/setup-wizard';
import { ConversationTypesPage } from './conversation-types/conversation-types';
import { TaxOfficesPage } from './tax-offices/tax-offices';
import { TrendyolTestPage } from './trendyol-test/trendyol-test';
import { Profile } from '@/app/views/apps/users/profile/profile';
import { AuthGuard } from '@/app/core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
    {
        path: 'admin/roles',
        component: RolesPage,
        data: { title: 'Roller' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/menus',
        component: MenusPage,
        data: { title: 'Menüler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/customers',
        component: CustomersPage,
        data: { title: 'Musteriler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/mail-settings',
        component: MailSettingsPage,
        data: { title: 'Mail Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/netgsm-settings',
        component: NetGsmSettingsPage,
        data: { title: 'NetGsm Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/countries',
        component: CountriesPage,
        data: { title: 'Ülkeler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/cities',
        component: CitiesPage,
        data: { title: 'İller' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/districts',
        component: DistrictsPage,
        data: { title: 'İlçeler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/integrations',
        component: IntegrationsPage,
        data: { title: 'Entegrasyonlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-integrations',
        component: UserIntegrationsPage,
        data: { title: 'Kullanıcı Entegrasyonları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/integration-properties',
        component: IntegrationPropertiesPage,
        data: { title: 'Entegrasyon Özellikleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/integration-connections',
        component: IntegrationConnectionsPage,
        data: { title: 'Entegrasyon Bağlantıları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/integration-connection-types',
        component: IntegrationConnectionTypesPage,
        data: { title: 'Entegrasyon Bağlantı Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-integration-user-social-media-accounts',
        component: UserIntegrationUserSocialMediaAccountsPage,
        data: { title: 'Kullanıcı Entegrasyon Sosyal Medya Hesapları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/role-assignments',
        component: RoleAssignmentsPage,
        data: { title: 'Rol Atamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/role-menus',
        component: RoleMenusPage,
        data: { title: 'Menü Atamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/social-media/accounts',
        component: SocialMediaAccountsPage,
        data: { title: 'Sosyal Medya Hesapları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/social-media/properties',
        component: SocialMediaPropertiesPage,
        data: { title: 'Hesap Özellikleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/social-media/user-accounts',
        component: UserSocialMediaAccountsPage,
        data: { title: 'Kullanıcı Sosyal Medya Hesapları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-provider-settings',
        component: AiProviderSettingsPage,
        data: { title: 'AI Sağlayıcı Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-models',
        component: AiModelsPage,
        data: { title: 'AI Modelleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-providers',
        component: AiProvidersPage,
        data: { title: 'AI Sağlayıcılar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-settings',
        component: AiSettingsPage,
        data: { title: 'AI Ayarlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-assistants',
        component: AiAssistantsPage,
        data: { title: 'AI Asistanlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-applications',
        component: RequestApplicationsPage,
        data: { title: 'Talep Uygulamalari' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-categories',
        component: RequestCategoriesPage,
        data: { title: 'Talep Kategorileri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-priorities',
        component: RequestPrioritiesPage,
        data: { title: 'Talep Öncelikleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/request-statuses',
        component: RequestStatusesPage,
        data: { title: 'Talep Durumları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-requests',
        component: UserRequestsPage,
        data: { title: 'Kullanıcı Talepleri' },
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
        path: 'admin/teams',
        component: TeamsPage,
        data: { title: 'Takımlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/team-invitations',
        component: TeamInvitationsPage,
        data: { title: 'Takım Davetleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/team-settings',
        component: TeamSettingsPage,
        data: { title: 'Takım Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/team-users',
        component: TeamUsersPage,
        data: { title: 'Takım Kullanıcıları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/image-search',
        component: ImageSearchPage,
        data: { title: 'Görsel Arama' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/product-sync',
        component: ProductSyncPage,
        data: { title: 'Ürün Senkronizasyonu' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/integration-types',
        component: IntegrationTypesPage,
        data: { title: 'Entegrasyon Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/prompts',
        component: PromptsPage,
        data: { title: 'Promptlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/prompt-ai-assistants',
        component: PromptAiAssistantsPage,
        data: { title: 'Prompt Asistan Atamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/prompt-types',
        component: PromptTypesPage,
        data: { title: 'Prompt Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/products',
        component: ProductsPage,
        data: { title: 'Ürünler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'chat',
        redirectTo: 'chat/messages',
        pathMatch: 'full',
    },
    {
        path: 'chat/:conversationType',
        component: ChatPage,
        data: { title: 'Chat Dashboard' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/contact-types',
        component: ContactTypesPage,
        data: { title: 'İletişim Türleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/address-types',
        component: AddressTypesPage,
        data: { title: 'Adres Türleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/customer-types',
        component: CustomerTypesPage,
        data: { title: 'Müşteri Türleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/customer-descriptions',
        component: CustomerDescriptionsPage,
        data: { title: 'Müşteri Açıklamaları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/customer-addresses',
        component: CustomerAddressesPage,
        data: { title: 'Müşteri Adresleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/customer-contacts',
        component: CustomerContactsPage,
        data: { title: 'Müşteri İletişim Bilgileri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/tags',
        component: TagsPage,
        data: { title: 'Etiketler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-tags',
        component: ConversationTagsPage,
        data: { title: 'Konuşma Etiketleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-notes',
        component: ConversationNotesPage,
        data: { title: 'Konuşma Notları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/companies',
        component: CompaniesPage,
        data: { title: 'Şirketler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/company-detail',
        component: CompanyDetailPage,
        data: { title: 'Şirket Detayı' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/segments',
        component: SegmentsPage,
        data: { title: 'Segmentler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-segments',
        component: ConversationSegmentsPage,
        data: { title: 'Konuşma Segmentleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-list-descriptions',
        component: ConversationListDescriptionsPage,
        data: { title: 'Konuşma Listeleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-lists',
        component: ConversationListsPage,
        data: { title: 'Konuşma Liste İçerikleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/shortcut-types',
        component: ShortcutTypesPage,
        data: { title: 'Kısayol Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/shortcuts',
        component: ShortcutsPage,
        data: { title: 'Kısayollar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/order-statuses',
        component: OrderStatusesPage,
        data: { title: 'Sipariş Durumları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/payment-statuses',
        component: PaymentStatusesPage,
        data: { title: 'Ödeme Durumları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/payment-types',
        component: PaymentTypesPage,
        data: { title: 'Ödeme Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/notes',
        component: AdminNotesPage,
        data: { title: 'Notlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/user-types',
        component: UserTypesPage,
        data: { title: 'Kullanıcı Türleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/orders',
        component: OrdersPage,
        data: { title: 'Siparişler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/orders/create',
        component: OrderCreatePage,
        data: { title: 'Sipariş Oluştur' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/orders/:id',
        component: OrderCreatePage,
        data: { title: 'Sipariş Detay' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-request-logs',
        component: AiRequestLogsPage,
        data: { title: 'AI İstek Logları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-knowledge',
        component: AiKnowledgePage,
        data: { title: 'AI Bilgi Bankası' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/ai-knowledge-types',
        component: AiKnowledgeTypesPage,
        data: { title: 'AI Bilgi Tipleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/plans',
        component: PlansPage,
        data: { title: 'Planlar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/plan-purchase',
        component: PlanPurchasePage,
        data: { title: 'Plan Satın Al' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/subscriptions',
        component: SubscriptionsPage,
        data: { title: 'Abonelikler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/subscription-payments',
        component: SubscriptionPaymentsPage,
        data: { title: 'Abonelik Ödemeleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/subscription-usages',
        component: SubscriptionUsagesPage,
        data: { title: 'Abonelik Kullanımları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/neighbourhoods',
        component: NeighbourhoodsPage,
        data: { title: 'Mahalleler' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/apps',
        component: AppsPage,
        data: { title: 'Uygulamalar' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/setup-wizard',
        component: SetupWizardPage,
        data: { title: 'Kurulum Sihirbazı' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/conversation-types',
        component: ConversationTypesPage,
        data: { title: 'Konuşma Türleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/tax-offices',
        component: TaxOfficesPage,
        data: { title: 'Vergi Daireleri' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/cloudinary-settings',
        component: CloudinarySettingsPage,
        data: { title: 'Cloudinary Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/aws-s3-settings',
        component: AwsS3SettingsPage,
        data: { title: 'AWS S3 Ayarları' },
        canActivate: [AuthGuard],
    },
    {
        path: 'admin/trendyol-test',
        component: TrendyolTestPage,
        data: { title: 'Trendyol Test Paneli' },
        canActivate: [AuthGuard],
    },
    {
        path: 'users/profile',
        component: Profile,
        data: { title: 'Profil' },
        canActivate: [AuthGuard],
    },
];
