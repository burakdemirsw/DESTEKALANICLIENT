import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { appName, currentYear } from '@/app/constants';
import { AuthStateService } from '@core/services/auth-state.service';

/** "Nasıl çalışır" bölümündeki adım */
interface SupportStep {
  title: string;
  description: string;
}

/**
 * Herkese açık tanıtım sayfası (/home): uygulamanın amacını ve talep sürecini anlatır.
 * BGZHUB anasayfasının (hub.raftakip.com/home) sade düzeni kullanılır: siyah zemin,
 * ince ayırıcı çizgiler, tek vurgu rengi. Guard ve yan menü yoktur.
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingPage {
  readonly appName = appName;
  readonly year = currentYear;
  /** Oturum açıksa üstteki düğme doğrudan panele götürür */
  readonly isSignedIn = !!inject(AuthStateService).profile;

  readonly steps: SupportStep[] = [
    {
      title: 'Talebinizi açın.',
      description: 'Uygulamayı, kategoriyi ve önceliği seçin; sorunu kısaca yazın, gerekirse ekran görüntüsü ya da dosya ekleyin.',
    },
    {
      title: 'Destek ekibine ulaşsın.',
      description: 'Talebiniz bir numara alır ve destek ekibine iletilir; gelişmeler size e-postayla bildirilir.',
    },
    {
      title: 'Yanıtları tek akışta görün.',
      description: 'Yazışmalar ve dosyalar talebin içinde toplanır; hiçbir yanıt e-posta trafiğinde kaybolmaz.',
    },
    {
      title: 'Durumu her an izleyin.',
      description: 'Talebin hangi aşamada olduğu her an görünür; şirketinizin bütün talepleri tek listede durur.',
    },
  ];

  /** Sıra numarası: 0 → "01" */
  no(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
