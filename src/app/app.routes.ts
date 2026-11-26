import {Routes} from '@angular/router';
import {MainLayout} from '@layouts/main-layout/main-layout';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
    },
    {
        path: 'home',
        redirectTo: 'dashboard',
        pathMatch: 'full',
    },
    {
        path: '',
        component: MainLayout,
        loadChildren: () => import('./views/views.route').then((mod) => mod.VIEWS_ROUTES)
    },
    {
        path: '',
        loadChildren: () => import('./views/auth/auth.route').then((mod) => mod.AUTH_ROUTES)
    },
    {
        path: '',
        loadChildren: () => import('./views/error/error.route').then((mod) => mod.ERROR_PAGES_ROUTES)
    },
];
