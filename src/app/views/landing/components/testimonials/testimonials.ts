import {Component} from '@angular/core';
import {TestimonialCard} from "../testimonial-card/testimonial-card";

@Component({
    selector: 'app-testimonials',
    imports: [ TestimonialCard],
    templateUrl: './testimonials.html',
    styles: ``
})
export class Testimonials {
    testimonials = [
        {
            avatar: 'assets/images/users/user-1.jpg',
            name: 'Ahmet YÄ±lmaz',
            title: 'MÃ¼ÅŸteri iletiÅŸimimiz tamamen deÄŸiÅŸti!',
            description: 'WMSSupport sayesinde mÃ¼ÅŸteri yanÄ±t sÃ¼remiz %80 dÃ¼ÅŸtÃ¼. AI chatbot gerÃ§ekten insan gibi konuÅŸuyor!',
            rating: 5
        },
        {
            avatar: 'assets/images/users/user-2.jpg',
            name: 'Elif Kara',
            title: 'Harika otomasyon araÃ§larÄ±',
            description: 'TÃ¼m kanallarÄ± tek panelden yÃ¶netmek inanÄ±lmaz kolaylÄ±k saÄŸlÄ±yor. Ekibimizin verimliliÄŸi 3 katÄ±na Ã§Ä±ktÄ±.',
            rating: 4.5
        },
        {
            avatar: 'assets/images/users/user-3.jpg',
            name: 'Mehmet Demir',
            title: 'Kurumsal dÃ¼zeyde gÃ¼venlik',
            description: 'KVKK uyumluluÄŸu ve uÃ§tan uca ÅŸifreleme ile verilerimiz gÃ¼vende. Teknik destek ekibi Ã§ok hÄ±zlÄ± yanÄ±t veriyor.',
            rating: 4
        },
    ];

    clients = [

        'assets/images/clients/01.svg',
        'assets/images/clients/02.svg',
        'assets/images/clients/03.svg',
        'assets/images/clients/04.svg',
        'assets/images/clients/05.svg',
        'assets/images/clients/06.svg',
        'assets/images/clients/07.svg'
    ];
}

