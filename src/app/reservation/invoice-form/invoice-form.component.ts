import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { I18nService } from 'src/app/shared/i18n.service';
import { Subscription } from 'rxjs';
import { LocalizedCountry } from 'src/app/model/localized-country';
import { PurchaseContext } from 'src/app/model/purchase-context';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html'
})
export class InvoiceFormComponent implements OnInit, OnDestroy {

  @Input()
  form: FormGroup;

  @Input()
  purchaseContext: PurchaseContext;

  private langChangeSub: Subscription;

  countries: LocalizedCountry[];

  taxIdIsRequired = true;

  constructor(private translate: TranslateService, private i18nService: I18nService) { }

  ngOnInit(): void {
    this.getCountries(this.translate.currentLang);
    this.langChangeSub = this.translate.onLangChange.subscribe(change => {
      this.getCountries(this.translate.currentLang);
    });

    this.updateItalyEInvoicingFields();

    this.form.get('italyEInvoicingReferenceType').valueChanges.subscribe(change => {
      this.updateItalyEInvoicingFields();
    });
    this.form.get('skipVatNr').valueChanges.subscribe(change => {
      this.taxIdIsRequired = !change;
    });
  }

  public ngOnDestroy(): void {
    if (this.langChangeSub) {
      this.langChangeSub.unsubscribe();
    }
  }


  updateItalyEInvoicingFields(): void {
    const refType = this.form.get('italyEInvoicingReferenceType').value;
    if (refType === 'ADDRESSEE_CODE') {
      this.form.get('italyEInvoicingReferencePEC').setValue(null);
    } else if (refType === 'PEC') {
      this.form.get('italyEInvoicingReferenceAddresseeCode').setValue(null);
    } else if (refType === 'NONE') {
      this.form.get('italyEInvoicingReferencePEC').setValue(null);
      this.form.get('italyEInvoicingReferenceAddresseeCode').setValue(null);
    }
  }

  get addresseeCodeSelected(): boolean {
    return this.form.get('italyEInvoicingReferenceType').value === 'ADDRESSEE_CODE';
  }

  get pecSelected(): boolean {
    return this.form.get('italyEInvoicingReferenceType').value === 'PEC';
  }

  getCountries(currentLang: string): void {
    this.i18nService.getVatCountries(currentLang).subscribe(countries => {
      this.countries = countries;
    });
  }

  get euVatCheckingEnabled(): boolean {
    return this.purchaseContext.invoicingConfiguration.euVatCheckingEnabled;
  }

  get customerReferenceEnabled(): boolean {
    return this.purchaseContext.invoicingConfiguration.customerReferenceEnabled;
  }

  get invoiceBusiness(): boolean {
    return this.form.value.addCompanyBillingDetails;
  }

  get vatNumberStrictlyRequired(): boolean {
    return this.purchaseContext.invoicingConfiguration.vatNumberStrictlyRequired;
  }

  get enabledItalyEInvoicing(): boolean {
    return this.purchaseContext.invoicingConfiguration.enabledItalyEInvoicing;
  }

  get italyEInvoicingFormDisplayed(): boolean {
    return this.enabledItalyEInvoicing && this.form.value.vatCountryCode === 'IT';
  }

  get countrySelected(): boolean {
    return this.form.value.vatCountryCode != null;
  }

  searchCountry(term: string, country: LocalizedCountry): boolean {
    if (term) {
      term = term.toLowerCase();
      return country.isoCode.toLowerCase().indexOf(term) > -1 || country.name.toLowerCase().indexOf(term) > -1;
    }
    return true;
  }

}
