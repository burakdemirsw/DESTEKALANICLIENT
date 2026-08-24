import {Routes} from '@angular/router';
import {MainLayout} from '@layouts/main-layout/main-layout';
import {Landing} from './views/landing/landing';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
    },
    {
        path: 'home',
        component: Landing,
        data: {title: 'WMSSupport â€” AI Destekli MÃ¼ÅŸteri Ä°letiÅŸim Platformu'}
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
    {
        path: '',
        loadChildren: () => import('./views/other-pages/other-pages.route').then((mod) => mod.OTHER_PAGES_ROUTES)
    },
    {
        path: 'landing',
        redirectTo: 'home',
        pathMatch: 'full'
    },
];

