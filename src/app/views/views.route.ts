import {Routes} from '@angular/router';

export const VIEWS_ROUTES: Routes = [
    {
        path: '',
        loadChildren: () => import('./dashboards/dashboards.routes').then((mod) => mod.DASHBOARDS_ROUTES)
    },
    {
        path: '',
        loadChildren: () => import('./admin/admin.route').then((mod) => mod.ADMIN_ROUTES)
    },
];
