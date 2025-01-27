import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ReservationService } from '../../shared/reservation.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from 'src/app/shared/ticket.service';
import {BillingDetails, ItalianEInvoicing, ReservationInfo, ReservationSubscriptionInfo, TicketsByTicketCategory} from 'src/app/model/reservation-info';
import { Observable, of, Subject, zip } from 'rxjs';
import { handleServerSideValidationError } from 'src/app/shared/validation-helper';
import { I18nService } from 'src/app/shared/i18n.service';
import { Ticket } from 'src/app/model/ticket';
import { TranslateService } from '@ngx-translate/core';
import { AnalyticsService } from 'src/app/shared/analytics.service';
import { ErrorDescriptor } from 'src/app/model/validated-response';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReservationExpiredComponent } from '../expired-notification/reservation-expired.component';
import { CancelReservationComponent } from '../cancel-reservation/cancel-reservation.component';
import { PurchaseContextService, PurchaseContextType } from 'src/app/shared/purchase-context.service';
import { PurchaseContext } from 'src/app/model/purchase-context';
import {EventSearchParams} from '../../model/basic-event-info';
import {WarningModalComponent} from '../../shared/warning-modal/warning-modal.component';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html'
})
export class BookingComponent implements OnInit, AfterViewInit {

  reservationInfo: ReservationInfo;
  purchaseContext: PurchaseContext;
  contactAndTicketsForm: FormGroup;
  private publicIdentifier: string;
  reservationId: string;
  expired: boolean;
  globalErrors: ErrorDescriptor[];
  @ViewChild('invoiceAnchor')
  private invoiceElement: ElementRef<HTMLAnchorElement>;
  private doScroll = new Subject<boolean>();
  purchaseContextType: PurchaseContextType;

  ticketCounts: number;

  enableAttendeeAutocomplete: boolean;

  private static optionalGet<T>(billingDetails: BillingDetails, consumer: (b: ItalianEInvoicing) => T): T | null {
    const italianEInvoicing = billingDetails.invoicingAdditionalInfo.italianEInvoicing;
    if (italianEInvoicing != null) {
      return consumer(italianEInvoicing);
    }
    return null;
  }

  private static isUUID(v: string): boolean {
    const r = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
    return v.match(r) !== null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private ticketService: TicketService,
    private purchaseContextService: PurchaseContextService,
    private formBuilder: FormBuilder,
    private i18nService: I18nService,
    private translate: TranslateService,
    private analytics: AnalyticsService,
    private modalService: NgbModal) { }

  public ngOnInit(): void {
    zip(this.route.data, this.route.params).subscribe(([data, params]) => {

      this.publicIdentifier = params[data.publicIdentifierParameter];
      this.reservationId = params['reservationId'];
      this.purchaseContextType = data.type;

      zip(
        this.purchaseContextService.getContext(this.purchaseContextType, this.publicIdentifier),
        this.reservationService.getReservationInfo(this.reservationId)
      ).subscribe(([purchaseContext, reservationInfo]) => {
        this.purchaseContext = purchaseContext;
        this.reservationInfo = reservationInfo;

        this.i18nService.setPageTitle('reservation-page.header.title', purchaseContext);

        const invoiceRequested = purchaseContext.invoicingConfiguration.onlyInvoice ? true : reservationInfo.invoiceRequested;

        //
        this.ticketCounts = 0;
        this.reservationInfo.ticketsByCategory.forEach(t => {
          this.ticketCounts += t.tickets.length;
        });


        // auto complete (copy by default first/lastname + email to ticket) is enabled only if we have only
        // one ticket
        if (this.ticketCounts === 1 && this.purchaseContext.assignmentConfiguration.enableAttendeeAutocomplete) {
          this.enableAttendeeAutocomplete = true;
        }
        //

        //

        const billingDetails = this.reservationInfo.billingDetails;

        this.contactAndTicketsForm = this.formBuilder.group({
          firstName: this.formBuilder.control(this.reservationInfo.firstName, [Validators.required, Validators.maxLength(255)]),
          lastName: this.formBuilder.control(this.reservationInfo.lastName, [Validators.required, Validators.maxLength(255)]),
          email: this.formBuilder.control(this.reservationInfo.email, [Validators.required, Validators.maxLength(255)]),
          tickets: this.buildTicketsFormGroup(this.reservationInfo.ticketsByCategory),
          invoiceRequested: invoiceRequested,
          addCompanyBillingDetails: this.reservationInfo.addCompanyBillingDetails,
          billingAddressCompany: billingDetails.companyName,
          billingAddressLine1: billingDetails.addressLine1,
          billingAddressLine2: billingDetails.addressLine2,
          billingAddressZip: billingDetails.zip,
          billingAddressCity: billingDetails.city,
          billingAddressState: billingDetails.state,
          vatCountryCode: billingDetails.country,
          customerReference: this.reservationInfo.customerReference,
          vatNr: billingDetails.taxId,
          skipVatNr: this.reservationInfo.skipVatNr,
          italyEInvoicingFiscalCode: BookingComponent.optionalGet(billingDetails, (i) => i.fiscalCode),
          italyEInvoicingReferenceType: BookingComponent.optionalGet(billingDetails, (i) => i.referenceType),
          italyEInvoicingReferenceAddresseeCode: BookingComponent.optionalGet(billingDetails, (i) => i.addresseeCode),
          italyEInvoicingReferencePEC: BookingComponent.optionalGet(billingDetails, (i) => i.pec),
          italyEInvoicingSplitPayment: BookingComponent.optionalGet(billingDetails, (i) => i.splitPayment),
          postponeAssignment: false,
          differentSubscriptionOwner: false,
          subscriptionOwner: this.buildSubscriptionOwnerFormGroup(this.reservationInfo.subscriptionInfos)
        });

        setTimeout(() => this.doScroll.next(this.invoiceElement != null));

        this.analytics.pageView(purchaseContext.analyticsConfiguration);
      });
    });
  }

  ngAfterViewInit(): void {
    zip(this.route.queryParams, this.doScroll.asObservable())
      .subscribe(results => {
        const requestInvoice: boolean = !!results[0].requestInvoice;
        if (requestInvoice && results[1]) {
          this.contactAndTicketsForm.get('invoiceRequested').setValue(true);
          this.invoiceElement.nativeElement.scrollIntoView(true);
        }
      });
  }

  private buildSubscriptionOwnerFormGroup(subscriptionInfos: Array<ReservationSubscriptionInfo> | undefined): FormGroup {
    if (subscriptionInfos != null) {
      const subscriptionInfo = subscriptionInfos[0];
      return this.formBuilder.group({
        firstName: subscriptionInfo.owner?.firstName,
        lastName: subscriptionInfo.owner?.lastName,
        email: subscriptionInfo.owner?.email
      });
    } else {
      return null;
    }
  }

  private buildTicketsFormGroup(ticketsByCategory: TicketsByTicketCategory[]): FormGroup {
    const tickets = {};
    ticketsByCategory.forEach(t => {
      t.tickets.forEach((ticket) => {
        tickets[ticket.uuid] = this.ticketService.buildFormGroupForTicket(ticket);
      });
    });
    return this.formBuilder.group(tickets);
  }

  private removeUnnecessaryFields(): void {
    // check invoice data, remove company data if private invoice has been chosen
    if (this.contactAndTicketsForm.get('invoiceRequested').value && !this.contactAndTicketsForm.get('addCompanyBillingDetails').value) {
      ['billingAddressCompany', 'vatNr', 'skipVatNr'].forEach(n => this.contactAndTicketsForm.get(n).setValue(null));
    }
  }

  submitForm(): void {
    this.removeUnnecessaryFields();
    this.validateToOverview(false);
  }

  private validateToOverview(ignoreWarnings: boolean): void {
    this.reservationService.validateToOverview(this.reservationId, this.contactAndTicketsForm.value, this.translate.currentLang, ignoreWarnings).subscribe(res => {
      if (res.success && (!res.warnings || res.warnings.length === 0 || ignoreWarnings)) {
        let o: Observable<unknown> = of(true);
        if (this.route.snapshot.queryParamMap.has('subscription') && BookingComponent.isUUID(this.route.snapshot.queryParamMap.get('subscription'))) {
          // try to apply the subscription
          const subscriptionCode = this.route.snapshot.queryParamMap.get('subscription');
          o = this.reservationService.applySubscriptionCode(this.reservationId, subscriptionCode, this.reservationInfo.email);
        }
        o.subscribe(
          _ => this.proceedToOverview(),
          // if there is an error, we proceed anyway
          () => this.proceedToOverview()
        );
      } else if (res.success) {
        // display warnings
        const modalRef = this.modalService.open(WarningModalComponent, {centered: true, backdrop: 'static'});
        modalRef.componentInstance.message = res.warnings[0];
        modalRef.result.then(() => this.validateToOverview(true));
      }
    }, (err) => {
      this.globalErrors = handleServerSideValidationError(err, this.contactAndTicketsForm);
    });
  }

  private proceedToOverview(): Promise<boolean> {
    return this.router.navigate([this.purchaseContextType, this.publicIdentifier, 'reservation', this.reservationId, 'overview'], {
      queryParams: EventSearchParams.transformParams(this.route.snapshot.queryParams)
    });
  }

  cancelPendingReservation() {
    this.modalService.open(CancelReservationComponent, {centered: true}).result.then(res => {
      if (res === 'yes') {
        this.reservationService.cancelPendingReservation(this.reservationId).subscribe(() => {
          this.router.navigate([this.purchaseContextType, this.publicIdentifier], {replaceUrl: true});
        });
      }
    }, () => {});
  }

  handleExpired(expired: boolean) {
    setTimeout(() => {
      if (!this.expired) {
        this.expired = expired;
        this.modalService.open(ReservationExpiredComponent, {centered: true, backdrop: 'static'})
            .result.then(() => this.router.navigate([this.purchaseContextType, this.publicIdentifier], {replaceUrl: true}));
      }
    });
  }

  handleInvoiceRequestedChange() {
    // set addCompanyBillingDetails to false if it's null
    if (this.contactAndTicketsForm.value.addCompanyBillingDetails === null) {
      this.contactAndTicketsForm.get('addCompanyBillingDetails').setValue(false);
    }
  }

  handleAutocomplete(fieldName: string, value: string) {
    if (this.enableAttendeeAutocomplete) {
      const ticketUUID = Object.keys(this.contactAndTicketsForm.get('tickets').value)[0];
      const targetControl = this.contactAndTicketsForm.get(`tickets.${ticketUUID}.${fieldName}`);
      if (targetControl.pristine && (targetControl.value == null || targetControl.value === '')) {
        targetControl.setValue(value);
      }
    }
  }

  getTicketForm(ticket: Ticket): FormGroup {
    return this.contactAndTicketsForm.get('tickets.' + ticket.uuid) as FormGroup;
  }

  getSubscriptionForm(): FormGroup {
    return this.contactAndTicketsForm.get('subscriptionOwner') as FormGroup;
  }

  copyContactInfoTo(ticket: Ticket) {
    ['firstName', 'lastName', 'email'].forEach(field => {
      const val = this.contactAndTicketsForm.get(field).value;
      this.contactAndTicketsForm.get(`tickets.${ticket.uuid}.${field}`).setValue(val);
    });
  }

}
