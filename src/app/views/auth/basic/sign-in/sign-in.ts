import { credits, currentYear } from '@/app/constants';
import { Component } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '@/app/core/services/user.service';
import { UserMenuService } from '@/app/core/services/user-menu.service';
import { AuthStateService } from '@/app/core/services/auth-state.service';
import { LoginRequest, AuthResponse } from '@/app/core/models/auth/auth.models';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-sign-in',
    imports: [RouterLink, FormsModule, CommonModule],
    templateUrl: './sign-in.html',
    styleUrl: './sign-in.scss'
})
export class SignIn {
    currentYear = currentYear;
    credits = credits;

    email = '';
    password = '';
    rememberMe = false;
    loading = false;
    errorMessage = '';
    showPassword = false;

    constructor(private userService: UserService, private userMenuService: UserMenuService, private authState: AuthStateService, private router: Router, private route: ActivatedRoute) {}

    onSubmit() {
        this.loading = true;
        this.errorMessage = '';

        const loginRequest: LoginRequest = {
            email: this.email,
            password: this.password
        };

        this.doLogin(loginRequest);
    }

    async doLogin(loginRequest: LoginRequest) {
        try {
            const apiResponse = await this.userService.login(loginRequest);
            this.loading = false;

            const data: AuthResponse | null = apiResponse?.data ?? null;

            if (!data || !data.accessToken) {
                this.errorMessage = 'Giriş başarısız. Geçersiz yanıt.';
                return;
            }

            // Token'ları kaydet
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }

            // Tüm auth verisini kaydet
            this.authState.setProfile(data);

            // Kullanıcı menülerini yükle
            await this.userMenuService.loadUserMenus();

            // returnUrl varsa oraya, yoksa dashboard'a yönlendir
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
            this.router.navigateByUrl(returnUrl);
        } catch (err: any) {
            this.loading = false;
            this.errorMessage = err?.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
        }
    }
}
