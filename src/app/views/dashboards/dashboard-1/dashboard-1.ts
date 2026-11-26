import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WelcomeSplash } from '@app/components/welcome-splash/welcome-splash';
import { UserRequestsService } from '@core/services/user-requests.service';
import { UserMenuService } from '@core/services/user-menu.service';
import { AuthStateService } from '@core/services/auth-state.service';
import { UserRequestStatusSummaryItemResponse } from '@core/models/user-request/user-request.models';
import { UserRequestResponse } from '@core/models/user-request/user-request.models';

interface SupportStatus {
  title: string;
  count: number;
  isSolved?: boolean;
}

interface DailyOpenedPoint {
  label: string;
  count: number;
}

interface BreakdownItem {
  label: string;
  count: number;
  percent: number;
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
  rangeLoading = false;
  selectedRange = 1;
  rangeOptions = [1, 3, 7];
  dailyOpenedSeries: DailyOpenedPoint[] = [];
  maxDailyOpenedCount = 1;
  recentRequests: UserRequestResponse[] = [];
  statusBreakdown: BreakdownItem[] = [];
  priorityBreakdown: BreakdownItem[] = [];

  constructor(
    private readonly userRequestsService: UserRequestsService,
    private readonly userMenuService: UserMenuService,
    private readonly authStateService: AuthStateService,
  ) {
    this.refreshDashboard();
  }

  async refreshDashboard(): Promise<void> {
    await Promise.all([this.loadStatusSummary(), this.loadRequestInsights()]);
  }

  async setDayRange(dayCount: number): Promise<void> {
    if (this.selectedRange === dayCount || this.rangeLoading) return;
    this.selectedRange = dayCount;
    await this.loadRequestInsights();
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

  private async loadRequestInsights(): Promise<void> {
    const userId = this.userMenuService.getUserIdFromToken();
    const companyId = this.authStateService.profile?.companyId ?? '';
    if (!userId || !companyId) {
      this.dailyOpenedSeries = [];
      this.recentRequests = [];
      this.statusBreakdown = [];
      this.priorityBreakdown = [];
      return;
    }

    this.rangeLoading = true;
    try {
      const response = await this.userRequestsService.getPaged({
        userId,
        companyId,
        pageNumber: 1,
        pageSize: 200,
        sortBy: 'createdDate',
        sortDescending: true,
      });

      const items = response?.data?.items ?? [];
      const sortedItems = [...items].sort((left, right) => this.toTime(right.createdDate) - this.toTime(left.createdDate));

      this.recentRequests = sortedItems.slice(0, 5);
      this.dailyOpenedSeries = this.buildDailyOpenedSeries(sortedItems, this.selectedRange);
      this.maxDailyOpenedCount = Math.max(1, ...this.dailyOpenedSeries.map((item) => item.count));
      this.statusBreakdown = this.buildBreakdown(sortedItems, 'statusName');
      this.priorityBreakdown = this.buildBreakdown(sortedItems, 'priorityName');
    } catch (error) {
      console.error('Request insights load error:', error);
      this.dailyOpenedSeries = [];
      this.recentRequests = [];
      this.statusBreakdown = [];
      this.priorityBreakdown = [];
    } finally {
      this.rangeLoading = false;
    }
  }

  private buildDailyOpenedSeries(items: UserRequestResponse[], dayCount: number): DailyOpenedPoint[] {
    const points: DailyOpenedPoint[] = [];
    const countsByDate = new Map<string, number>();

    for (const item of items) {
      const date = this.toDate(item.createdDate);
      if (!date) continue;
      const key = this.toDateKey(date);
      countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
    }

    for (let index = dayCount - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const key = this.toDateKey(date);
      points.push({
        label: `${`${date.getDate()}`.padStart(2, '0')}.${`${date.getMonth() + 1}`.padStart(2, '0')}`,
        count: countsByDate.get(key) ?? 0,
      });
    }

    return points;
  }

  private buildBreakdown(items: UserRequestResponse[], key: 'statusName' | 'priorityName'): BreakdownItem[] {
    const groups = new Map<string, number>();
    for (const item of items) {
      const label = (item[key] || 'Belirsiz').trim();
      groups.set(label, (groups.get(label) ?? 0) + 1);
    }

    const total = Math.max(1, items.length);
    return Array.from(groups.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }

  private toTime(dateString?: string): number {
    if (!dateString) return 0;
    const parsed = new Date(dateString).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDate(dateString?: string): Date | null {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Sütun yüksekliği (%); sayı etiketi sütunun üstünde durduğu için en çok %85. */
  getOpenedBarHeight(value: number): number {
    if (value <= 0) return 0;
    return Math.max(4, Math.round((value / this.maxDailyOpenedCount) * 85));
  }

  /** Bir durumun tüm talepler içindeki payı (%). */
  getStatusShare(count: number): number {
    const total = this.supportStatuses.reduce((sum, status) => sum + status.count, 0);
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '-';
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private mapStatusItem(item: UserRequestStatusSummaryItemResponse): SupportStatus {
    const normalized = this.normalizeStatusName(item.statusName);

    return {
      title: item.statusName,
      count: item.count,
      isSolved: normalized.includes('cozum') || normalized.includes('tamam'),
    };
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

}
