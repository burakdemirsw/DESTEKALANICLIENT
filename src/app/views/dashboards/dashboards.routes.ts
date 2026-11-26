import {Routes} from '@angular/router';
import {Dashboard1} from '@/app/views/dashboards/dashboard-1/dashboard-1';
import {AuthGuard} from '@/app/core/guards/auth.guard';

export const DASHBOARDS_ROUTES: Routes = [
    {
        path: 'dashboard',
        component: Dashboard1,
        data: {title: "Anasayfa"},
        canActivate: [AuthGuard],
    },
];
