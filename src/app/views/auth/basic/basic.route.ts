import { Routes } from '@angular/router';
import { SignIn } from './sign-in/sign-in';
import { SignUp } from './sign-up/sign-up';
import { ResetPw } from './reset-pw/reset-pw';
import { NewPw } from './new-pw/new-pw';
import { SuccessMail } from './success-mail/success-mail';
import { ConfirmMailPage } from './confirm-mail/confirm-mail';


export const BASIC_ROUTES: Routes = [
    {
        path: 'auth/sign-in',
        component: SignIn,
        data: { title: "Sign In" },
    },
    {
        path: 'auth/sign-up',
        component: SignUp,
        data: { title: "Create New Account" },
    },
    {
        path: 'auth/reset-pw',
        component: ResetPw,
        data: { title: "Reset Password" },
    },
    {
        path: 'auth/new-pw',
        component: NewPw,
        data: { title: "New Password" },
    },
    {
        path: 'auth/success-mail',
        component: SuccessMail,
        data: { title: "Success Mail" },
    },
    {
        path: 'auth/confirm-mail',
        component: ConfirmMailPage,
        data: { title: 'E-posta Onaylama' },
    },
];
