import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WelcomeSplash } from '@app/components/welcome-splash/welcome-splash';
import { UserRequestsService } from '@core/services/user-requests.service';
import { UserMenuService } from '@core/services/user-menu.service';
import { UserRequestStatusSummaryItemResponse } from '@core/models/user-request/user-request.models';

interface SupportStatus {
  title: string;
  count: number;
  colorClass: string;
  colorCode?: string;
  isSolved?: boolean;
}

@Component({
  selector: 'app-dashboard-1',
  imports: [CommonModule, RouterLink, WelcomeSplash],
  templateUrl: './dashboard-1.html',
  styleUrl: './dashboard-1.scss',
})
export class Dashboard1 {
  supportStatuses: SupportStatus[] = [];
  loading = false;

  constructor(
    private readonly userRequestsService: UserRequestsService,
    private readonly userMenuService: UserMenuService,
  ) {
    this.loadStatusSummary();
  }

  private async loadStatusSummary(): Promise<void> {
    const userId = this.userMenuService.getUserIdFromToken();
    if (!userId) {
      this.supportStatuses = [];
      return;
    }

    this.loading = true;
    try {
      const response = await this.userRequestsService.getStatusSummaryReport({
        userId,
        dayCount: 30,
      });

      const items = response?.data?.items ?? [];
      this.supportStatuses = items.map(item => this.mapStatusItem(item));
    } catch (error) {
      console.error('Status summary load error:', error);
      this.supportStatuses = [];
    } finally {
      this.loading = false;
    }
  }

  private mapStatusItem(item: UserRequestStatusSummaryItemResponse): SupportStatus {
    const normalized = this.normalizeStatusName(item.statusName);
    const colorClass = this.getColorClassByStatus(normalized);
    const colorCode = this.normalizeColorCode(item.colorCode);
    const isSolved = normalized.includes('cozum') || normalized.includes('tamam');

    return {
      title: item.statusName,
      count: item.count,
      colorClass,
      colorCode,
      isSolved,
    };
  }

  private normalizeColorCode(colorCode?: string | null): string | undefined {
    if (!colorCode) return undefined;
    const trimmed = colorCode.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('#')) return trimmed;
    return `#${trimmed}`;
  }

  private normalizeStatusName(statusName: string): string {
    return (statusName || '')
      .toLowerCase()
      .replaceAll('ı', 'i')
      .replaceAll('ş', 's')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c');
  }

  private getColorClassByStatus(statusName: string): string {
    if (statusName.includes('cozum') || statusName.includes('tamam')) return 'status-cyan';
    if (statusName.includes('cevap')) return 'status-mint';
    if (statusName.includes('bekliyor') || statusName.includes('incele')) return 'status-blue';
    if (statusName.includes('islem')) return 'status-sky';
    return 'status-gray';
  }

}
