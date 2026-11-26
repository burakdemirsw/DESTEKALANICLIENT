import {Routes} from '@angular/router';
import {MainLayout} from '@layouts/main-layout/main-layout';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
    },
    /** Herkese açık tanıtım sayfası — guard ve yan menü yok; panel /dashboard'dadır. */
    {
        path: 'home',
        loadComponent: () => import('./views/landing/landing').then((mod) => mod.LandingPage),
        data: {title: 'Destek Merkezi'},
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
