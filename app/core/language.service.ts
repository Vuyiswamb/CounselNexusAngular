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
    // Lazy-loaded routes and bound placeholders can finish rendering after
    // the first router-outlet mutation. Re-scan once Angular has flushed them.
    window.setTimeout(() => this.translateDocument(), 0);
    window.setTimeout(() => this.translateDocument(), 250);
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
    return af[value] ?? afExtra[value] ?? value;
  }
}

const af: Record<string, string> = {
  'Home': 'Tuis', 'About': 'Oor ons', 'Services': 'Dienste', 'Legal Market Place': 'Regsmark',
  'Packages': 'Pakkette', 'Contact': 'Kontak', 'Log in': 'Meld aan', 'Register': 'Registreer',
  'Dashboard': 'Kontroleskerm', 'Search': 'Soek', 'Case Research': 'Regsnavorsing', 'AI Case Research': 'KI-regsnavorsing',
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

// Authenticated workspace copy. Keep this in one place because the runtime
// translator also handles text rendered later by lazy-loaded route components.
const afExtra: Record<string, string> = {
  'LEGAL PRACTICE PLATFORM': 'REGSPRAKTYKPLATFORM',
  'OVERVIEW': 'OORSIG', 'LEGAL RESEARCH': 'REGSNAVORSING', 'MARKETPLACE': 'MARKPLEK',
  'CLIENT INTAKE': 'KLIËNT-INNAME', 'MATTER WORK': 'SAAKWERK', 'TIME & FINANCE': 'TYD EN FINANSIES',
  'MANAGEMENT': 'BESTUUR', 'PLATFORM': 'PLATFORM', 'FINANCE': 'FINANSIES', 'ACCOUNT': 'REKENING',
  'PLATFORM CONTROL': 'PLATFORMBEHEER', 'PLATFORM REPORTS': 'PLATFORMVERSLAE',
  'Search menu...': 'Soek kieslys...', 'Website language': 'Webwerftaal', 'Lang': 'Taal',
  'English': 'Engels', 'Afrikaans': 'Afrikaans', 'Notifications': 'Kennisgewings',
  'Account options': 'Rekeningopsies', 'Not signed in': 'Nie aangemeld nie',
  'Close profile': 'Sluit profiel', 'User': 'Gebruiker', 'Active account': 'Aktiewe rekening',
  'Current password': 'Huidige wagwoord', 'New password': 'Nuwe wagwoord',
  'Enter your current password': 'Voer jou huidige wagwoord in',
  'Enter your new password': 'Voer jou nuwe wagwoord in',
  'Use at least 8 characters with uppercase, lowercase, a number, and a special character.': 'Gebruik minstens 8 karakters met hoofletters, kleinletters, ’n nommer en ’n spesiale karakter.',
  'Please enter your full name.': 'Voer asseblief jou volle naam in.',
  'Enter your current password and a new password.': 'Voer jou huidige wagwoord en ’n nuwe wagwoord in.',
  'Password changed successfully.': 'Wagwoord suksesvol verander.', 'Could not change your password.': 'Kon nie jou wagwoord verander nie.',
  'Profile updated.': 'Profiel opgedateer.', 'Could not update your profile.': 'Kon nie jou profiel opdateer nie.',
  'Search requests...': 'Soek regsversoeke...', 'Search matters, contacts, documents...': 'Soek sake, kontakte, dokumente...',
  'Book a demo': 'Bespreek ’n demonstrasie', 'Public navigation': 'Openbare navigasie',
  'Practice management': 'Praktykbestuur', 'for law firms.': 'vir regskantore.',
  'Manage matters, clients, time, billing and documents in one secure system.': 'Bestuur sake, kliënte, tyd, fakturering en dokumente in een veilige stelsel.',
  'Matter management': 'Saakbestuur', 'Client relationships': 'Kliëntverhoudings', 'Time and billing': 'Tyd en fakturering',
  'Secure documents': 'Veilige dokumente', 'CounselNexus legal practice management': 'CounselNexus-regspraktykbestuur',
  'Sign in to CounselNexus': 'Meld aan by CounselNexus', 'Welcome back': 'Welkom terug',
  'Sign in to access your workspace': 'Meld aan om toegang tot jou werkruimte te kry',
  'This is the firm account email used for your payment and cannot be changed here.': 'Dit is die kantoor se rekening-e-pos wat vir jou betaling gebruik word en kan nie hier verander word nie.',
  'Enter your password': 'Voer jou wagwoord in', 'Hide password': 'Versteek wagwoord', 'Show password': 'Wys wagwoord',
  'Authenticator code': 'Stawingskode', '6 digit code': '6-syferkode', 'Remember me': 'Onthou my',
  'Forgot your password?': 'Het jy jou wagwoord vergeet?', 'View paid packages and renew': 'Bekyk betaalde pakkette en hernu',
  'Signing in...': 'Meld tans aan...', 'Verify code': 'Verifieer kode', 'New to CounselNexus?': 'Nuut by CounselNexus?',
  'Create an account': 'Skep ’n rekening', 'Payment received. Sign in with the firm account email used for this subscription.': 'Betaling ontvang. Meld aan met die kantoor se rekening-e-pos wat vir hierdie intekening gebruik word.',
  'All rights reserved.': 'Alle regte voorbehou.',
  'Dashboard benefits': 'Kontroleskermvoordele', 'Stay organised': 'Bly georganiseerd', 'Work smarter': 'Werk slimmer', 'Better client service': 'Beter kliëntediens',
  'Here’s your firm’s workload and what needs attention.': 'Hier is jou kantoor se werkslading en wat aandag nodig het.',
  'Hereâ€™s your firmâ€™s workload and what needs attention.': 'Hier is jou kantoor se werkslading en wat aandag nodig het.',
  'Record time': 'Teken tyd aan', 'Across your firm': 'Regdeur jou kantoor', 'Diary events today': 'Dagboekgebeurtenisse vandag',
  'Next 14 days below': 'Volgende 14 dae hieronder', 'Unbilled work': 'Ongefactureerde werk', 'Fees + disbursements': 'Fooie + uitbetalings',
  'Ready for review': 'Gereed vir hersiening', 'Clients and other parties': 'Kliënte en ander partye', 'Firm overview': 'Kantoor-oorsig',
  'Practice analytics': 'Praktykanalise', 'TIME & PRODUCTIVITY': 'TYD EN PRODUKTIWITEIT', 'Hours recorded': 'Ure aangeteken',
  'This week compared with last week': 'Hierdie week vergelyk met verlede week', 'this week': 'hierdie week', 'Last week': 'Verlede week',
  'Bar chart comparing recorded hours by weekday for this week and last week': 'Staafgrafiek wat aangetekende ure per weeksdag vir hierdie week en verlede week vergelyk',
  'TEAM WORKLOAD': 'SPANWERKSLADING', 'Task status': 'Taakstatus', 'Current firm task distribution': 'Huidige kantoor-taakverspreiding',
  'View tasks': 'Bekyk take', 'tasks': 'take', 'YOUR CALENDAR': 'JOU KALENDER', 'Upcoming events': 'Komende gebeurtenisse',
  'Open diary': 'Maak dagboek oop', 'Firm calendar': 'Kantoorkalender', 'Your calendar is clear': 'Jou kalender is leeg',
  'No upcoming events in the next two weeks.': 'Geen komende gebeurtenisse in die volgende twee weke nie.',
  'NEXT ACTIONS': 'VOLGENDE AKSIES', 'Tasks to keep moving': 'Take om voort te gaan', 'All tasks': 'Alle take',
  'No dated tasks to show': 'Geen gedateerde take om te wys nie', 'Tasks with upcoming due dates will appear here.': 'Take met komende sperdatums sal hier verskyn.',
  'Work in progress': 'Werk aan die gang', 'Review unbilled fees and expenses before preparing invoices.': 'Hersien ongefaktureerde fooie en uitgawes voordat fakture voorberei word.',
  'Review billing': 'Hersien fakturering', 'Client and matter records': 'Kliënt- en saakrekords', 'Browse contacts': 'Blaai deur kontakte',
  'Loading your dashboard…': 'Laai jou kontroleskerm…', 'Loading your dashboardâ€¦': 'Laai jou kontroleskermâ€¦', 'Your account does not have permission to view dashboard information.': 'Jou rekening het nie toestemming om kontroleskerminligting te sien nie.',
  'Dashboard information could not be loaded. Please try again.': 'Kontroleskerminligting kon nie gelaai word nie. Probeer asseblief weer.',
  'Legal Research Assistant': 'Regsnavorsingsassistent', 'Ask questions about South African cases, legislation and legal practice.': 'Vra vrae oor Suid-Afrikaanse sake, wetgewing en regsbeoefening.',
  'Hello! I’m your South African legal research assistant.': 'Hallo! Ek is jou Suid-Afrikaanse regsnavorsingsassistent.',
  'Hello! I\'m your South African legal research assistant.': 'Hallo! Ek is jou Suid-Afrikaanse regsnavorsingsassistent.',
  'I can help you find and analyse South African cases, legislation, legal principles and more. You can ask questions, upload documents, or paste text for analysis.': 'Ek kan jou help om Suid-Afrikaanse sake, wetgewing, regsbeginsels en meer te vind en te ontleed. Jy kan vrae vra, dokumente oplaai of teks plak vir ontleding.',
  'How can I help you today?': 'Hoe kan ek jou vandag help?', 'Research shortcuts': 'Navorsingskortpaaie',
  'Find relevant cases': 'Vind relevante sake', 'Explain legislation': 'Verduidelik wetgewing',
  'Analyse a document': 'Ontleed ’n dokument', 'Compare legal principles': 'Vergelyk regsbeginsels', 'More...': 'Meer...',
  'You': 'Jy', 'Case documents': 'Sakeldokumente', 'Verified case records found in the South African research corpus.': 'Geverifieerde saakrekords wat in die Suid-Afrikaanse navorsingskorpus gevind is.',
  'Open source': 'Maak bron oop', 'Loading documentsâ€¦': 'Laai dokumenteâ€¦', 'No stored attachment': 'Geen gestoorde aanhegsel nie',
  'Type your legal research question here...': 'Tik jou regsnavorsingsvraag hier...', 'Attach files': 'Heg lêers aan',
  'Add source link': 'Voeg bronskakel by', 'Add cloud document': 'Voeg wolkdokument by', 'Browse documents': 'Blaai deur dokumente',
  'Ready': 'Gereed',
  'Researching...': 'Doen navorsing...', 'Send': 'Stuur', 'Tell me what happened in the case. Include the parties, important dates, agreements, notices, and the legal question you need researched.': 'Vertel my wat in die saak gebeur het. Sluit die partye, belangrike datums, ooreenkomste, kennisgewings en die regsprobleem wat nagevors moet word in.',
  'Add a case title, facts, or legal issues before researching.': 'Voeg ’n saaktitel, feite of regsprobleme by voordat jy navorsing doen.',
  'Client log in': 'Kliëntmeld aan', 'Main navigation': 'Hoofnavigasie', 'CounselNexus home': 'CounselNexus-tuisblad',
  'Search legal requests...': 'Soek regsversoeke...', 'Search Requests': 'Soek versoeke',
  'Online consultation': 'Aanlyn konsultasie', 'Office consultation': 'Kantoorkonsultasie', 'Home visit': 'Huisbesoek',
  'Business visit': 'Besigheidsbesoek', 'Police station': 'Polisiestasie', 'Court': 'Hof',
  'Legal Requests': 'Regsversoeke', 'Browse requests by province, city and consultation method': 'Blaai deur versoeke volgens provinsie, stad en konsultasiemetode',
  'Request legal help': 'Versoek regshulp', 'Request legal help →': 'Versoek regshulp →', 'Newest First': 'Nuutste eerste',
  'Loading legal requests...': 'Laai regsversoeke...', 'No legal requests match these filters': 'Geen regsversoeke pas by hierdie filters nie',
  'Try another province, city or consultation type.': 'Probeer ’n ander provinsie, stad of konsultasietipe.', 'Interactive legal request map': 'Interaktiewe regsversoekkaart',
  'List': 'Lys', 'Collapse Map': 'Vou kaart toe', 'Open Map': 'Maak kaart oop', 'Interactive request map': 'Interaktiewe versoekkaart',
  'Drag to pan and use + / − to zoom': 'Sleep om te skuif en gebruik + / − om te zoem', 'Request locations are approximate': 'Versoekliggings is by benadering',
  'View Request →': 'Bekyk versoek →', 'View Request': 'Bekyk versoek',
  'LEGAL REQUEST': 'REGSVERSOEK', 'Practice area': 'Regsgebied', 'Location': 'Ligging', 'Consultation': 'Konsultasie',
  'Budget': 'Begroting', 'Not specified': 'Nie gespesifiseer nie', 'Urgency': 'Dringendheid', 'Posted': 'Gepubliseer',
  'The client’s contact number is private and is not shown on public requests.': 'Die kliënt se kontaknommer is privaat en word nie op openbare versoeke vertoon nie.',
  'The clientâ€™s contact number is private and is not shown on public requests.': 'Die kliënt se kontaknommer is privaat en word nie op openbare versoeke vertoon nie.',
  'LEGAL FIRM OFFERS': 'REGSKANTOORAANBIEDINGE', 'Choose the help you want': 'Kies die hulp wat jy wil hê',
  'Loading offers...': 'Laai aanbiedinge...', 'No legal firms have sent an offer yet.': 'Geen regskantore het nog ’n aanbod gestuur nie.',
  'Accepts your stated budget': 'Aanvaar jou vermelde begroting', 'Proposed charge': 'Voorgestelde fooi',
  'Accept offer': 'Aanvaar aanbod', 'Your offer was sent to the requester.': 'Jou aanbod is aan die versoeker gestuur.',
  'They can review your proposed charge and accept or reject it.': 'Hulle kan jou voorgestelde fooi hersien en dit aanvaar of verwerp.',
  'REQUESTER CONTACT REVEALED': 'VERSOEKER SE KONTAK ONTHUL', 'You can now contact the requester': 'Jy kan nou die versoeker kontak',
  'Let me Help': 'Laat ek help', 'A legal firm account is required': '’n Regskantoorrekening word vereis',
  'This action is available to lawyers and legal-firm team members. Please sign in with a firm account or create one first.': 'Hierdie aksie is beskikbaar vir prokureurs en regskantoorspanlede. Meld asseblief met ’n kantoorrekening aan of skep eers een.',
  'Use firm login →': 'Gebruik kantoor-aanmelding →', 'Create a legal firm account': 'Skep ’n regskantoorrekening',
  'SEND YOUR OFFER': 'STUUR JOU AANBOD', 'Tell the requester how you can help': 'Vertel die versoeker hoe jy kan help',
  'Send your proposed charge and a short message. The requester will decide whether to accept or reject it.': 'Stuur jou voorgestelde fooi en ’n kort boodskap. Die versoeker sal besluit of dit aanvaar of verwerp word.',
  'What will you charge?': 'Wat sal jy vra?', 'Message to the requester': 'Boodskap aan die versoeker',
  'Explain what your charge includes and when you can start.': 'Verduidelik wat jou fooi insluit en wanneer jy kan begin.',
  'I accept the requester’s stated budget': 'Ek aanvaar die versoeker se vermelde begroting',
  'I accept the requesterâ€™s stated budget': 'Ek aanvaar die versoeker se vermelde begroting',
  'Sending offer...': 'Stuur aanbod...', 'Send offer': 'Stuur aanbod',
  'Your subscription has ended. Choose a package to renew your workspace.': 'Jou intekening het geëindig. Kies ’n pakket om jou werkruimte te hernu.',
  'Unable to sign in. Check your details and try again.': 'Kon nie aanmeld nie. Kontroleer jou besonderhede en probeer weer.',
  'Legal Market Place': 'Regsmark', 'Legal Accounting': 'Regsrekeningkunde',
  'Payment Requisitions': 'Betalingsversoeke', 'Subscription': 'Intekening',
  'Driver\'s Appointment Report': 'Bestuurder-afspraakverslag', 'Practice Setup': 'Praktykopstelling',
  'Legal Calendar & Court Diary': 'Regs- en hofkalender', 'Summons Management': 'Dagvaardingsbestuur',
  'Debt Collections': 'Skuldinvordering', 'Trust Accounting': 'Trustrekeningkunde',
  'Payment Gateway': 'Betalingspoort', 'Subscription transactions': 'Intekeningstransaksies',
  'Firm package assignments': 'Kantoor-pakkettoewysings',
  'Payment requisitions': 'Betalingsversoeke', 'New requisition': 'Nuwe betalingsversoek',
  'Pending verification': 'Hangende verifikasie', 'Needs finance review': 'Benodig finansiële hersiening',
  'Pending approval': 'Hangende goedkeuring', 'Needs authorised approval': 'Benodig gemagtigde goedkeuring',
  'Outstanding approved': 'Uitstaande goedgekeur', 'Not yet paid': 'Nog nie betaal nie', 'Paid': 'Betaal',
  'Search requisition, beneficiary or category': 'Soek betalingsversoek, begunstigde of kategorie',
  'Requisition': 'Betalingsversoek', 'Beneficiary': 'Begunstigde', 'Source': 'Bron', 'Amount': 'Bedrag',
  'Matter-linked': 'Aan saak gekoppel', 'General firm expense': 'Algemene kantooruitgawe',
  'No payment requisitions found.': 'Geen betalingsversoeke gevind nie', 'Loading requisitions...': 'Laai betalingsversoeke...',
  'Edit requisition': 'Wysig betalingsversoek', 'New payment requisition': 'Nuwe betalingsversoek',
  'Payment category': 'Betalingskategorie', 'Beneficiary name': 'Begunstigde se naam', 'Linked matter': 'Gekoppelde saak',
  'No matter selected': 'Geen saak gekies nie', 'Payment source': 'Betalingsbron', 'Cost centre': 'Kostesentrum',
  'Payment motivation': 'Betalingsmotivering', 'Expense line items': 'Uitgawelynitems', 'Add line': 'Voeg lyn by',
  'Total requested': 'Totale bedrag aangevra', 'Save draft': 'Stoor konsep', 'No comments': 'Geen opmerkings nie', 'Not set': 'Nie gestel nie',
  'Renew or change package': 'Hernu of verander pakket', 'CURRENT PLAN': 'HUIDIGE PLAN',
  'Subscription period': 'Intekeningstydperk', 'Monthly price': 'Maandelikse prys',
  'Renewal date': 'Hernuwingsdatum', 'Payment history': 'Betalingsgeskiedenis',
  'No subscription payments have been recorded yet.': 'Geen intekeningbetalings is nog aangeteken nie.',
  'No subscription found': 'Geen intekening gevind nie', 'Loading subscription details…': 'Laai intekeningbesonderhede…',
  'Subscription details unavailable': 'Intekeningbesonderhede nie beskikbaar nie', 'Try again': 'Probeer weer',
  'Ledger accounts': 'Grootboekrekeninge', 'Post journal': 'Boek joernaal', 'Chart of accounts': 'Rekeningskaart',
  'Trial balance': 'Proefbalans', 'Posted general ledger entries': 'Geboekte algemene grootboekinskrywings',
  'Total debits': 'Totale debiete', 'Total credits': 'Totale krediete', 'Entry date': 'Inskrywingsdatum',
  'Debit account': 'Debietrekening', 'Credit account': 'Kredietrekening', 'Select account': 'Kies rekening',
  'Line description (optional)': 'Lynbeskrywing (opsioneel)', 'Supporting detail': 'Ondersteunende besonderhede',
  'Post balanced journal': 'Boek gebalanseerde joernaal', 'No ledger accounts configured.': 'Geen grootboekrekeninge opgestel nie',
  'Click an account to view its posted ledger.': 'Klik ’n rekening om sy geboekte grootboek te sien', 'Code': 'Kode',
  'Account': 'Rekening', 'Debits': 'Debiete', 'Credits': 'Krediete', 'Balance': 'Balans', 'Totals': 'Totale', 'Reverse': 'Keer om',
  'Total requisitions': 'Totale betalingsversoeke', 'PAYMENT CONTROL': 'BETALINGSBEHEER',
  'All statuses': 'Alle statusse', 'Refresh': 'Verfris', 'Loading...': 'Laai tans...',
  'Loading records...': 'Laai rekords...', 'Loading reports…': 'Laai verslae…',
  'Loading firm reports…': 'Laai kantoorverslae…', 'Loading trust transactions…': 'Laai trusttransaksies…',
  'Loading invoices…': 'Laai fakture…', 'Loading documents…': 'Laai dokumente…',
  'Loading matter details…': 'Laai saakbesonderhede…', 'Loading time entries…': 'Laai tydinskrywings…',
  'Loading diary…': 'Laai dagboek…', 'Loading notes…': 'Laai notas…', 'Loading tasks…': 'Laai take…',
  'Workspace': 'Werkruimte', 'New matter': 'Nuwe saak', 'New task': 'Nuwe taak',
  'Add a note': 'Voeg ’n nota by', 'Schedule an event': 'Skeduleer ’n gebeurtenis',
  'Create draft invoice': 'Skep konsep-faktuur', 'Draft invoices': 'Konsep-fakture', 'Overdue invoices': 'Agterstallige fakture',
  'View': 'Bekyk', 'Download': 'Laai af', 'Print / Save PDF': 'Druk / Stoor PDF',
  'Save note': 'Stoor nota', 'Add Note': 'Voeg nota by', 'Add Diary Event': 'Voeg dagboekgebeurtenis by',
  'Add Document': 'Voeg dokument by', 'Create Invoice': 'Skep faktuur', 'Trust Transaction': 'Trusttransaksie',
  'New Contact': 'Nuwe kontak', 'New User': 'Nuwe gebruiker', 'New matter note': 'Nuwe saaknota',
  'Matter Information': 'Saakinligting', 'Client and Parties': 'Kliënt en partye', 'Contact Information': 'Kontakinligting',
  'Quick Actions': 'Vinnige aksies', 'Basic Information': 'Basiese inligting', 'Additional Information': 'Bykomende inligting',
  'Client': 'Kliënt', 'Clients': 'Kliënte', 'Type': 'Tipe', 'Address': 'Adres', 'Phone': 'Telefoon',
  'Description': 'Beskrywing', 'Subject': 'Onderwerp', 'Note': 'Nota', 'Note details': 'Notabesonderhede',
  'Date': 'Datum', 'Open Date': 'Openingsdatum', 'Due date': 'Sperdatum', 'Due date and time': 'Sperdatum en tyd',
  'Work date': 'Werkdatum', 'Hours': 'Ure', 'Fee Earner': 'Fooiverdiener', 'Assigned to': 'Toegewys aan',
  'Priority': 'Prioriteit', 'All assignees': 'Alle toegewysdes', 'Select a matter': 'Kies ’n saak',
  'Select a team member': 'Kies ’n spanlid', 'All matters': 'Alle sake', 'All Fee Earners': 'Alle fooiverdieners',
  'All Areas': 'Alle gebiede', 'All Types': 'Alle tipes', 'All billing states': 'Alle faktureringstatusse',
  'Include archived': 'Sluit geargiveerde in',
  'Active matters': 'Aktiewe sake', 'Open tasks': 'Oop take', 'Completed': 'Voltooi', 'Completed or cancelled': 'Voltooi of gekanselleer',
  'In progress': 'Aan die gang', 'Overdue': 'Agterstallig', 'Open': 'Oop', 'On Hold': 'Op wag', 'Closed': 'Gesluit',
  'No results found.': 'Geen resultate gevind nie.', 'No matching contacts.': 'Geen ooreenstemmende kontakte nie.',
  'No matching matters.': 'Geen ooreenstemmende sake nie.', 'No documents uploaded.': 'Geen dokumente opgelaai nie.',
  'No notes yet': 'Nog geen notas nie', 'No time recorded yet.': 'Geen tyd is nog aangeteken nie.',
  'No invoices have been created for this process.': 'Geen fakture is vir hierdie saak geskep nie.',
  'Select all': 'Kies alles', 'Modules': 'Modules', 'Module access': 'Moduletoegang', 'Administration': 'Administrasie',
  'Roles & Permissions': 'Rolle en toestemmings', 'Firm Settings': 'Kantoorinstellings', 'Email / SMTP': 'E-pos / SMTP',
  'Manage firm users, roles and access.': 'Bestuur kantoor se gebruikers, rolle en toegang.',
  'Email delivery': 'E-posaflewering', 'SMTP server': 'SMTP-bediener', 'Send test email': 'Stuur toets-e-pos',
  'Save SMTP settings': 'Stoor SMTP-instellings', 'Choose logo': 'Kies logo', 'Remove logo': 'Verwyder logo',
  'Company / firm name': 'Maatskappy- / kantoornaam', 'Company email': 'Maatskappy-e-pos', 'System theme & practice identity': 'Stelseltema en praktykidentiteit',
  'Save changes': 'Stoor veranderinge', 'Cancel': 'Kanselleer', 'Close': 'Sluit', 'Delete': 'Verwyder', 'Edit': 'Wysig',
  'Approve': 'Keur goed', 'Reject': 'Verwerp', 'Submit': 'Dien in', 'Return': 'Stuur terug', 'Verify': 'Verifieer',
  'Prepare payment': 'Berei betaling voor', 'Confirm paid': 'Bevestig betaling', 'Reconcile': 'Rekonsilieer',
  'Comments for the next workflow action': 'Opmerkings vir die volgende werkvloei-aksie', 'Approval history': 'Goedkeuringsgeskiedenis',
  'Status': 'Status', 'Active': 'Aktief', 'Inactive': 'Onaktief', 'Privileged': 'Bevoorreg', 'Archived': 'Geargiveer', 'Restore': 'Herstel', 'Archive': 'Argiveer',
};
