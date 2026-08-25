import {credits, currentYear} from '@/app/constants';
import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {NgIcon} from '@ng-icons/core';

type footerLinksType = {
    title: string;
    links: {
        name: string;
        url: string;
        badge?: {
            title: string;
            variant: string;
        };
    }[];
}

type socialLinksType = {
    title: string;
    icon: string;
    url: string;
}

@Component({
    selector: 'app-footer',
    imports: [RouterLink, NgIcon],
    templateUrl: './footer.html',
    styles: ``
})
export class Footer {
    currentYear = currentYear
    credits = credits
    socialLinks: socialLinksType[] = [
        {title: 'Facebook', icon: 'tablerBrandFacebook', url: '',},
        {title: 'Twitter-x', icon: 'tablerBrandX', url: '',},
        {title: 'Instagram', icon: 'tablerBrandInstagram', url: '',},
        {title: 'LinkedIn', icon: 'tablerBrandLinkedin', url: '',},
    ];

    footerLinks: footerLinksType[] = [
        {
            title: 'Şirket',
            links: [
                {name: 'Hakkımızda', url: ''},
                {name: 'Ekibimiz', url: ''},
                {
                    name: 'Kariyer',
                    url: '',
                    badge: {title: 'Yeni Pozisyonlar', variant: 'warning'}
                },
                {name: 'Blog', url: ''},
            ],
        },
        {
            title: 'Ürün',
            links: [
                {name: 'AI Chatbot', url: ''},
                {name: 'Çok Kanallı Mesajlaşma', url: ''},
                {name: 'Otomasyon', url: ''},
                {name: 'Analitik', url: ''},
                {name: 'Entegrasyonlar', url: ''},
                {name: 'API Dokümantasyonu', url: ''},
            ],
        },
        {
            title: 'Destek',
            links: [
                {name: 'Yardım Merkezi', url: ''},
                {name: 'Başlangıç Kılavuzu', url: ''},
                {name: 'Durum Sayfası', url: ''},
                {name: 'Gizlilik Politikası', url: ''},
                {name: 'Kullanım Koşulları', url: ''},
                {name: 'KVKK', url: ''},
            ],
        }
    ];
}
