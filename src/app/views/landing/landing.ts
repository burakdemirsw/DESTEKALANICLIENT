import { Component } from '@angular/core';
import { Cta } from "./components/cta/cta";
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import {Hero} from '@/app/views/landing/components/hero/hero';
import {Contact} from '@/app/views/landing/components/contact/contact';

@Component({
  selector: 'app-landing',
  imports: [Header, Hero, Cta, Contact, Footer],
  templateUrl: './landing.html',
  styles: ``
})
export class Landing {

}
