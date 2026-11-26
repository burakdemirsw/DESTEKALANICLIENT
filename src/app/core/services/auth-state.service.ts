import { Injectable } from '@angular/core';
import { AuthResponse } from '../models/auth/auth.models';

const AUTH_DATA_KEY = 'authData';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private _authData: AuthResponse | null = null;

  /** Tüm auth verisine erişim (backward-compatible: profile olarak da kullanılabilir) */
  get profile(): AuthResponse | null {
    if (!this._authData) {
      this.loadFromStorage();
    }
    return this._authData;
  }

  /** Kullanıcı adı soyadı birleşik */
  get fullName(): string {
    return this._authData ? `${this._authData.name} ${this._authData.surname}` : '';
  }

  /** Baş harfler (avatar yerine) */
  get initials(): string {
    if (!this._authData) return '';
    const n = this._authData.name?.charAt(0) ?? '';
    const s = this._authData.surname?.charAt(0) ?? '';
    return (n + s).toUpperCase();
  }

  /** Login sonrası tüm auth verisini kaydet */
  setProfile(data: AuthResponse): void {
    this._authData = data;
    localStorage.setItem(AUTH_DATA_KEY, JSON.stringify(data));
  }

  /** Logout'ta tüm auth verisini temizle */
  clearProfile(): void {
    this._authData = null;
    localStorage.removeItem(AUTH_DATA_KEY);
  }

  /** localStorage'dan yükle (sayfa yenileme) */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(AUTH_DATA_KEY);
      if (raw) {
        this._authData = JSON.parse(raw) as AuthResponse;
      }
    } catch {
      this._authData = null;
    }
  }
}
