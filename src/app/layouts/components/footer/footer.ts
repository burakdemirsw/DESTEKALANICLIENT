import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {appName, credits, currentYear} from '@/app/constants';
import {APP_VERSION} from '@/environments/version';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html'
})
export class Footer {
  currentYear = currentYear;
  appName = appName;
  credits = credits;
  appVersion = APP_VERSION;
}
