// Destek performans raporu (POST SupportReports/performance). Süreler dakika cinsindendir.
export interface SupportPerformanceReportRequest {
    startDate: string; // yyyy-MM-dd
    endDate: string; // yyyy-MM-dd
}

export interface SupportPerformanceGroupItem {
    userId?: string | null;
    name: string;
    openCount: number;
    closedCount: number;
    averageResolutionMinutes?: number | null;
    averageSatisfaction?: number | null;
}

export interface SupportPerformanceReportResponse {
    startDate: string;
    endDate: string;
    openedCount: number;
    closedCount: number;
    answeredCount: number;
    averageFirstResponseMinutes?: number | null;
    medianFirstResponseMinutes?: number | null;
    averageResolutionMinutes?: number | null;
    openCount: number;
    awaitingManagerReplyCount: number;
    awaitingCustomerReplyCount: number;
    overdueOpenCount: number;
    closedWithinTargetCount: number;
    closedWithTargetCount: number;
    averageSatisfaction?: number | null;
    ratedCount: number;
    byManager: SupportPerformanceGroupItem[];
}
