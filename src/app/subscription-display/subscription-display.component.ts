import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Language } from '../model/event';
import { SubscriptionInfo } from '../model/subscription';
import { AnalyticsService } from '../shared/analytics.service';
import { I18nService } from '../shared/i18n.service';
import { InfoService } from '../shared/info.service';
import { SubscriptionService } from '../shared/subscription.service';
import { zip } from 'rxjs';

@Component({
  selector: 'app-subscription-display',
  templateUrl: './subscription-display.component.html',
  styleUrls: ['./subscription-display.component.scss']
})
export class SubscriptionDisplayComponent implements OnInit {


  subscription: SubscriptionInfo;
  subscriptionId: string;
  languages: Language[];

  constructor(private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private i18nService: I18nService,
    private info: InfoService,
    private analytics: AnalyticsService) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.subscriptionId = params['id'];
      zip(this.subscriptionService.getSubscriptionById(this.subscriptionId), this.info.getInfo()).subscribe(([subscription, info]) => {
        this.subscription = subscription;
        this.analytics.pageView(info.analyticsConfiguration);
      });
    });

    this.i18nService.getAvailableLanguages().subscribe(res => {
      this.languages = res;
    });
  }


  submitForm() {
    this.subscriptionService.reserve(this.subscriptionId).subscribe(res => {
      this.router.navigate(['subscription', this.subscriptionId, 'reservation', res.value, 'book']);
    });
  }

}