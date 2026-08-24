import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LayoutStoreService } from '@core/services/layout-store.service';
import { AuthStateService } from '@core/services/auth-state.service';
import { appName } from '@/app/constants';

@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  @Input() logoHeight: number = 28;
  readonly brandName = appName;

  constructor(
    public layout: LayoutStoreService,
    private authState: AuthStateService
  ) {}

  get homeRoute(): string {
    return this.authState.profile ? '/dashboard' : '/home';
  }

  toggleSidebar() {
    const html = document.documentElement;
    const currentSize = html.getAttribute('data-sidenav-size');
    
    if (currentSize === 'condensed') {
      this.layout.setSidenavSize('default');
    } else {
      this.layout.setSidenavSize('condensed');
    }
  }
}
