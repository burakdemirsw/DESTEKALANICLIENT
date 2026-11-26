import { Component, OnInit, OnDestroy, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '@core/services/auth-state.service';

const SPLASH_SHOWN_KEY = 'welcomeSplashShownDate';
const AUTO_DISMISS_MS = 2800;

@Component({
  selector: 'app-welcome-splash',
  imports: [CommonModule],
  templateUrl: './welcome-splash.html',
  styleUrl: './welcome-splash.scss',
})
export class WelcomeSplash implements OnInit, OnDestroy {
  @Output() dismissed = new EventEmitter<void>();

  visible = false;
  fadingOut = false;
  fullName = '';
  lastLoginFormatted = '';

  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private authState: AuthStateService) {}

  ngOnInit(): void {
    // Don't show if already shown today
    if (this.wasShownToday()) {
      this.dismissed.emit();
      return;
    }

    const profile = this.authState.profile;
    if (!profile) {
      this.dismissed.emit();
      return;
    }

    // Populate data
    this.fullName = `${this.capitalize(profile.name)} ${this.capitalize(profile.surname)}`;
    this.lastLoginFormatted = this.formatDate(profile.lastLoginDate);

    // Show splash
    this.visible = true;

    // Kendiliğinden kapanır; tıklama ya da herhangi bir tuş beklemeden geçer
    this.dismissTimer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
  }

  @HostListener('document:keydown')
  onKeydown(): void {
    if (this.visible) this.dismiss();
  }

  skip(): void {
    this.dismiss();
  }

  ngOnDestroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  private dismiss(): void {
    if (this.fadingOut) return;
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.fadingOut = true;

    // Mark as shown today
    this.markShownToday();

    // Wait for fade-out animation then hide
    setTimeout(() => {
      this.visible = false;
      this.dismissed.emit();
    }, 600);
  }

  private wasShownToday(): boolean {
    const stored = localStorage.getItem(SPLASH_SHOWN_KEY);
    if (!stored) return false;
    return stored === this.todayKey();
  }

  private markShownToday(): void {
    localStorage.setItem(SPLASH_SHOWN_KEY, this.todayKey());
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1).toLocaleLowerCase('tr-TR');
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  }
}
