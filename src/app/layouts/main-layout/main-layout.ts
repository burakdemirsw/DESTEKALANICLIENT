import {Component, OnDestroy, OnInit} from '@angular/core';
import {VerticalLayout} from '@layouts/vertical-layout/vertical-layout';
import {RouterOutlet} from '@angular/router';
import {HorizontalLayout} from '@layouts/horizontal-layout/horizontal-layout';
import {LayoutStoreService} from '@core/services/layout-store.service';
import {RequestActivityNotifierService} from '@core/services/request-activity-notifier.service';

@Component({
    selector: 'app-main-layout',
    imports: [
        VerticalLayout,
        RouterOutlet,
        HorizontalLayout,

    ],
    templateUrl: './main-layout.html',
})
export class MainLayout implements OnInit, OnDestroy {
    constructor(public layout: LayoutStoreService, private requestActivityNotifier: RequestActivityNotifierService) {
    }

    // Oturum açıkken talep olayları (yeni yanıt, yeni talep vb.) her sayfada bildirilir
    ngOnInit(): void {
        this.requestActivityNotifier.start();
    }

    ngOnDestroy(): void {
        this.requestActivityNotifier.stop();
    }
}
