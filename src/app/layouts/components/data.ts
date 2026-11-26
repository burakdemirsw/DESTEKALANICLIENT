// Yan menü ve üst menü API'den (Menus / RoleMenus) gelir: bkz. UserMenuService.
// Bu dosyada yalnız kullanıcı açılır menüsünün sabit öğeleri durur.

type UserDropdownItemType = {
    label?: string;
    icon?: string;
    url?: string;
    isDivider?: boolean;
    isHeader?: boolean;
    class?: string;
}

export const userDropdownItems: UserDropdownItemType[] = [
    {
        label: 'Tekrar hoş geldiniz!',
        isHeader: true,
    },
    {
        label: 'Profil',
        icon: 'tablerUserCircle',
        url: 'users/profile',
    },
    {
        label: 'Bildirimler',
        icon: 'tablerBellRinging',
        url: '',
    },
    {
        label: 'Destek Merkezi',
        icon: 'tablerHeadset',
        url: '/admin/user-requests',
    },
    {
        isDivider: true,
    },
    {
        label: 'Çıkış Yap',
        icon: 'tablerLogout2',
        url: '',
        class: 'text-danger fw-semibold',
    },
];
