import {Component, Input} from '@angular/core';
import {SubscriptionInfo, SubscriptionSummaryData} from '../model/subscription';
import {getLocalizedContent} from '../shared/subscription.service';
import {isDifferentTimeZone} from '../shared/event.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-subscription-summary',
  templateUrl: './subscription-summary.component.html'
})
export class SubscriptionSummaryComponent {

  @Input()
  subscription: SubscriptionSummaryData;

  constructor(private translateService: TranslateService) {
  }

  get hasOnSaleTo(): boolean {
    return this.subscription.formattedOnSaleTo != null;
  }

  /*
  get onSaleFrom(): string {
    return getLocalizedContent(this.subscription.formattedOnSaleFrom, this.translateService.currentLang);
  }

  get onSaleTo(): string {
    return getLocalizedContent(this.subscription.formattedOnSaleTo, this.translateService.currentLang);
  }
   */

  get displayTimeZoneInfo(): boolean {
    const datesWithOffset = this.subscription.salePeriod;
    return isDifferentTimeZone(datesWithOffset.startDateTime, datesWithOffset.startTimeZoneOffset)
      || (datesWithOffset.endDateTime > 0 && isDifferentTimeZone(datesWithOffset.endDateTime, datesWithOffset.endTimeZoneOffset));
  }

  get validFrom(): string {
    if (this.subscription.formattedValidFrom != null) {
      return getLocalizedContent(this.subscription.formattedValidFrom, this.translateService.currentLang);
    }
    return '';
  }

  get hasValidTo(): boolean {
    return this.subscription.formattedValidTo != null;
  }

  get validTo(): string {
    if (this.hasValidTo) {
      return getLocalizedContent(this.subscription.formattedValidTo, this.translateService.currentLang);
    }
    return '';
  }
}
