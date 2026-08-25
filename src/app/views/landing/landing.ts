import { Component } from '@angular/core';
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import {Hero} from '@/app/views/landing/components/hero/hero';

@Component({
  selector: 'app-landing',
  imports: [Header, Hero, Footer],
  templateUrl: './landing.html',
  styles: ``
})
export class Landing {

}
