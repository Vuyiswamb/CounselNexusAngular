import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SiteLanguage = 'en' | 'af';

/** Runtime site language. English remains the source language for templates. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly storageKey = 'counselnexus-language';
  private readonly languageSubject = new BehaviorSubject<SiteLanguage>(this.readLanguage());
  readonly language$ = this.languageSubject.asObservable();
  private observer?: MutationObserver;
  private readonly originalText = new WeakMap<Text, string>();
  private readonly originalAttributes = new WeakMap<HTMLElement, Map<string, string>>();

  get language(): SiteLanguage { return this.languageSubject.value; }

  setLanguage(language: SiteLanguage): void {
    if (language === this.language) return;
    localStorage.setItem(this.storageKey, language);
    this.languageSubject.next(language);
    document.documentElement.lang = language;
    this.translateDocument();
  }

  start(): void {
    document.documentElement.lang = this.language;
    this.translateDocument();
    this.observer?.disconnect();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) this.translateNode(node);
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  stop(): void { this.observer?.disconnect(); }

  private readLanguage(): SiteLanguage {
    return localStorage.getItem(this.storageKey) === 'af' ? 'af' : 'en';
  }

  private translateDocument(): void { this.translateNode(document.body); }

  private translateNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateText(node as Text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.matches('script,style,noscript,[data-no-translate]')) return;
    this.translateAttributes(element);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    let current: Node | null;
    while ((current = walker.nextNode())) texts.push(current as Text);
    texts.forEach((text) => this.translateText(text));
  }

  private translateText(node: Text): void {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,noscript,input,textarea,select,option,[data-no-translate]')) return;
    const source = this.originalText.get(node) ?? node.nodeValue ?? '';
    this.originalText.set(node, source);
    const leading = source.match(/^\s*/)?.[0] ?? '';
    const trailing = source.match(/\s*$/)?.[0] ?? '';
    const core = source.trim();
    const translated = this.translate(core);
    if (translated !== core) node.nodeValue = `${leading}${translated}${trailing}`;
    else if (this.language === 'en') node.nodeValue = source;
  }

  private translateAttributes(element: HTMLElement): void {
    for (const attribute of ['placeholder', 'aria-label', 'title']) {
      if (!element.hasAttribute(attribute)) continue;
      const values = this.originalAttributes.get(element) ?? new Map<string, string>();
      const source = values.get(attribute) ?? element.getAttribute(attribute) ?? '';
      values.set(attribute, source);
      this.originalAttributes.set(element, values);
      element.setAttribute(attribute, this.translate(source));
    }
  }

  private translate(value: string): string {
    if (this.language === 'en') return value;
    return af[value] ?? value;
  }
}

const af: Record<string, string> = {
  'Home': 'Tuis', 'About': 'Oor ons', 'Services': 'Dienste', 'Legal Market Place': 'Regsmark',
  'Packages': 'Pakkette', 'Contact': 'Kontak', 'Log in': 'Meld aan', 'Register': 'Registreer',
  'Dashboard': 'Kontroleskerm', 'Search': 'Soek', 'Case Research': 'Regsnavorsing',
  'Contacts': 'Kontakte', 'Matters': 'Sake', 'Notes': 'Notas', 'Tasks': 'Take',
  'Legal Calendar & Court Diary': 'Regs- en hofkalender', 'RAF Claims': 'RAF-eise',
  'Debt Collections': 'Skuldinvordering', 'Evictions': 'Uitsettings', 'Summons Management': 'Dagvaardingsbestuur',
  'Fees & Time': 'Fooie en tyd', 'Billing': 'Fakturering', 'Trust Accounting': 'Trustrekeningkunde',
  'Reports': 'Verslae', "Driver's Appointment Report": 'Bestuurder-afspraakverslag',
  'Practice Setup': 'Praktykopstelling', 'Admin': 'Administrasie', 'Email Settings': 'E-posinstellings',
  'Email / SMTP': 'E-pos / SMTP', 'Subscription packages': 'Intekenpakkette',
  'Firm package assignments': 'Kantoor-pakkettoewysings', 'Subscription transactions': 'Intekeningstransaksies',
  'Users': 'Gebruikers', 'Payment Gateway': 'Betalingspoort', 'Sign out': 'Meld af',
  'My profile': 'My profiel', 'Security': 'Sekuriteit', 'Save changes': 'Stoor veranderinge',
  'Cancel': 'Kanselleer', 'Close': 'Sluit', 'Save': 'Stoor', 'Delete': 'Verwyder',
  'Edit': 'Wysig', 'Add': 'Voeg by', 'New User': 'Nuwe gebruiker', 'Permissions': 'Toestemmings',
  'Role': 'Rol', 'Description': 'Beskrywing', 'Status': 'Status', 'Active': 'Aktief',
  'Loading...': 'Laai tans...', 'No results found.': 'Geen resultate gevind nie.',
  'Search matters, contacts, documents...': 'Soek sake, kontakte, dokumente...',
  'Search users...': 'Soek gebruikers...', 'Email delivery': 'E-posaflewering',
  'SMTP server': 'SMTP-bediener', 'SMTP host': 'SMTP-gasheer', 'Username': 'Gebruikersnaam',
  'Password': 'Wagwoord', 'Sender name': 'Afsendernaam', 'Send test email': 'Stuur toets-e-pos',
  'Save SMTP settings': 'Stoor SMTP-instellings', 'New matter': 'Nuwe saak', 'New Matter': 'Nuwe saak',
  'Matter Information': 'Saakinligting', 'Client and Parties': 'Kliënt en partye',
  'Reference': 'Verwysing', 'Title': 'Titel', 'Practice Area': 'Regsgebied', 'Open Date': 'Openingsdatum',
  'Full name': 'Volle naam', 'Email address': 'E-posadres', 'Phone number': 'Telefoonnommer',
  'Login': 'Aanmelding', 'Forgot password?': 'Wagwoord vergeet?', 'Reset password': 'Stel wagwoord terug',
  'Welcome': 'Welkom', 'Submit': 'Dien in', 'Continue': 'Gaan voort', 'Back': 'Terug',
  'Find Legal Help': 'Vind regshulp', 'Post a legal request or browse requests from across South Africa': 'Plaas ’n regsversoek of blaai deur versoeke regoor Suid-Afrika',
  'Request legal help': 'Versoek regshulp', 'Request Legal Help': 'Versoek regshulp', 'Search legal requests...': 'Soek regsversoeke...',
  'Search Requests': 'Soek versoeke', 'All Provinces': 'Alle provinsies', 'All Cities': 'Alle stede',
  'All Statuses': 'Alle statusse', 'Any Consultation Type': 'Enige konsultasietipe', 'Newest First': 'Nuutste eerste',
  'Hide Map': 'Versteek kaart', 'Show Map': 'Wys kaart', 'Collapse Map': 'Vou kaart toe', 'View Request': 'Bekyk versoek',
  'Create an account or login.': 'Skep ’n rekening of meld aan.', 'Create free account': 'Skep gratis rekening',
  'I already have an account': 'Ek het reeds ’n rekening', 'Stay informed about your legal request': 'Bly ingelig oor jou regsversoek',
  'Create a free account to save your request and receive updates when lawyers respond.': 'Skep ’n gratis rekening om jou versoek te stoor en opdaterings te ontvang wanneer prokureurs reageer.',
  'Legal Requests': 'Regsversoeke', 'No legal requests match these filters': 'Geen regsversoeke pas by hierdie filters nie',
  'We could not load legal requests right now.': 'Ons kon nie tans regsversoeke laai nie.', 'Refresh': 'Verfris',
  'Let me Help': 'Laat ek help', 'Send offer': 'Stuur aanbod', 'Accept offer': 'Aanvaar aanbod', 'Reject': 'Verwerp',
  'Forgot your password?': 'Het jy jou wagwoord vergeet?', 'Send reset link': 'Stuur terugstelskakel',
  'Create account': 'Skep rekening', 'Welcome to CounselNexus': 'Welkom by CounselNexus',
  'Account information': 'Rekeninginligting', 'Change password': 'Verander wagwoord',
};
