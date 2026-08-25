import {Component, HostListener, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {LayoutStoreService} from '@core/services/layout-store.service';
import {ScrollService} from '@core/services/scroll.service';
import {NgbCollapseModule} from '@ng-bootstrap/ng-bootstrap';
import {NgIcon} from '@ng-icons/core';

@Component({
    selector: 'app-header',
    imports: [NgIcon, RouterLink, NgbCollapseModule],
    templateUrl: './header.html',
    styles: ``
})
export class Header {
    isCollapsed = true;
    isSticky = false;
    public scroll = inject(ScrollService)
    public layout = inject(LayoutStoreService)

    navItems = [];
    appName = 'Destek Alanı';

    @HostListener('window:scroll', [])
    onWindowScroll() {
        const scroll = window.scrollY || window.pageYOffset;
        this.isSticky = scroll > 100;
    }
}

