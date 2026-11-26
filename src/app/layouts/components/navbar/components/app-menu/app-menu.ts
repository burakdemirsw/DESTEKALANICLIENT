import {Component, inject, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {MenuItemType} from '@/app/types/layout';
import {CommonModule} from '@angular/common';
import {NgIcon} from '@ng-icons/core';
import {NgbDropdown, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {Router, RouterLink} from '@angular/router';
import {UserMenuService} from '@core/services/user-menu.service';
import {LucideAngularModule} from 'lucide-angular';

@Component({
    selector: 'app-menu-navbar',
    imports: [
        CommonModule,
        NgIcon,
        NgbDropdown,
        NgbDropdownToggle,
        RouterLink,
        NgbDropdownMenu,
        LucideAngularModule
    ],
    templateUrl: './app-menu.html'
})
export class AppMenu implements OnInit {

    userMenuService = inject(UserMenuService)

    constructor(public router: Router) {
    }

    @ViewChild('MenuItemWithChildren', {static: true})
    menuItemWithChildren!: TemplateRef<{ item: MenuItemType, wrapperClass?: string, togglerClass?: string }>;

    @ViewChild('MenuItem', {static: true})
    menuItem!: TemplateRef<{ item: MenuItemType, linkClass?: string }>;

    /** Yan menüyle aynı kaynak: kullanıcının rollerine atanmış menüler (API) */
    get menuItems(): MenuItemType[] {
        return this.userMenuService.userMenuItems;
    }

    async ngOnInit(): Promise<void> {
        // Sayfa yenilemede token varsa ve menüler yüklenmemişse yükle
        if (!this.userMenuService.loaded && localStorage.getItem('accessToken')) {
            await this.userMenuService.loadUserMenus();
        }
    }

    hasSubMenu(item: MenuItemType): boolean {
        return !!item.children;
    }

    isChildActive(item: MenuItemType): boolean {
        if (this.isActive(item)) return true;
        if (!item.children) return false;
        return item.children.some((child: MenuItemType) => this.isChildActive(child));
    }

    isActive(item: MenuItemType): boolean {
        if (!item.url) return false;
        return this.router.isActive(item.url, false);
    }
}
