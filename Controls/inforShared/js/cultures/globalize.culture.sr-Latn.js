﻿/*
* Globalize Culture sr-Latn
*
* http://github.com/jquery/globalize
*
* Copyright Software Freedom Conservancy, Inc.
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
*
* This file was generated by the Globalize Culture Generator
* Translation: bugs found in this file need to be fixed in the generator
*/

(function( window, undefined ) {

var Globalize;

if ( typeof require !== "undefined"
	&& typeof exports !== "undefined"
	&& typeof module !== "undefined" ) {
	// Assume CommonJS
	Globalize = require( "globalize" );
} else {
	// Global variable
	Globalize = window.Globalize;
}

Globalize.addCultureInfo( "sr-Latn", "default", {
	name: "sr-Latn",
	englishName: "Serbian (Latin)",
	nativeName: "srpski",
	language: "sr-Latn",
	numberFormat: {
		",": ".",
		".": ",",
		negativeInfinity: "-beskonačnost",
		positiveInfinity: "+beskonačnost",
		percent: {
			pattern: ["-n%","n%"],
			",": ".",
			".": ","
		},
		currency: {
			pattern: ["-n $","n $"],
			",": ".",
			".": ",",
			symbol: "Din."
		}
	},
	calendars: {
		standard: {
			"/": ".",
			firstDay: 1,
			days: {
				names: ["nedelja","ponedeljak","utorak","sreda","četvrtak","petak","subota"],
				namesAbbr: ["ned","pon","uto","sre","čet","pet","sub"],
				namesShort: ["ne","po","ut","sr","če","pe","su"]
			},
			months: {
				names: ["januar","februar","mart","april","maj","jun","jul","avgust","septembar","oktobar","novembar","decembar",""],
				namesAbbr: ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec",""]
			},
			AM: null,
			PM: null,
			eras: [{"name":"n.e.","start":null,"offset":0}],
			patterns: {
				d: "d.M.yyyy",
				D: "d. MMMM yyyy",
				t: "H:mm",
				T: "H:mm:ss",
				f: "d. MMMM yyyy H:mm",
				F: "d. MMMM yyyy H:mm:ss",
				M: "d. MMMM",
				Y: "MMMM yyyy"
			}
		}
	},
	messages: {"AdditionalHelp":"Dodatna pomoć","AddNewTab":"Dodaj novu karticu","Alerts":"Obaveštenja","ApplyFilter":"Primeni filter","Approve":"Odobri","Attachments":"Prilozi","Back":"Nazad","Basic":"Osnovni","Between":"Između","Book":"Knjiga","Cancel":"Otkaži","Checked":"Potvrđeno","ClearFilter":"Obriši filter","Close":"Zatvori","CloseCancelChanges":"Zatvori i otkaži promene","CloseSaveChanges":"Zatvori i sačuvaj promene","CloseTab":"Zatvori karticu","ColumnPersonalization":"Personalizacija kolone","Comments":"Komentari","Confirmation":"Potvrda","Contains":"Sadrži","CreateTab":"Kreiraj novu karticu","Cut":"Iseci","Delete":"Izbriši","DiscardUndo":"Odbaci/opozovi","DisplayDropDownList":"Prikaz padajuće liste","Displaying":"Prikaz: ","DocWord":"Dokument","DoesNotContain":"Ne sadrži","DoesNotEndWith":"Ne završava se sa","DoesNotEqual":"Nije jednako","DoesNotStartWith":"Ne počinje sa","Download":"Preuzmi","Duplicate":"Duplikat","Edit":"Uredi","EitherSelectedorNotSelected":"Izabrano ili Nije izabrano","Email":"E-pošta","EndsWith":"Završava se sa","EqualsStr":"Jednako","ExpandCollapse":"Razvij/skupi","ExportFailed":"Izvoz nije izvršen","ExportToExcel":"Izvoz u Excel","FileInUse":"Navedena datoteka je u upotrebi","FileInUseDetail":"Zatvorite datoteku u aplikaciji u kojoj se koristi ili navedite drugo ime datoteke.","Filter":"Filter","FilterMenu":"Meni filtera","FilterOptions":"Opcije filtera","FilterWithinResults":"Filtriranje rezultata","First":"Prvo","FirstView":"Prvi prikaz","Folder":"Fascikla","ForgotPassword":"Zaboravili ste lozinku?","Forward":"Napred","GetMoreRows":"Preuzmi dodatne redove","GreaterThan":"Veće od","GreaterThanOrEquals":"Veće od ili jednako","GridSettings":"Postavke mreže","GroupSelection":"Izbor grupe","Help":"Pomoć","HideColumn":"Sakrij kolonu","IsEmpty":"Je prazno","IsNotEmpty":"Nije prazno","Last":"Poslednje","LastView":"Poslednji prikaz","LaunchActivate":"Pokreni/aktiviraj","LessThan":"Manje od","LessThanOrEquals":"Manje od ili jednako","Links":"Veze","ListTabs":"Lista svih kartica","LoadingItem":"Učitavanje stavke ","Maintenance":"Održavanje","Menu":"Meni","New":"Novo","Next":"Sledeće","NextView":"Sledeći prikaz","No":"Ne","NotChecked":"Nije potvrđeno","Notes":"Beleške","NotSelected":"Nije izabrano","Of":" od ","Ok":"U redu","Open":"Otvori","Password":"Lozinka","Paste":"Nalepi","Phone":"Telefon","PleaseWait":"Sačekajte","Previous":"Prethodno","PreviousView":"Prethodni prikaz","Print":"Odštampaj","Queries":"Upiti","Redo":"Ponovi radnju","Refresh":"Osveži","Reject":"Odbaci","RememberMe":"Zapamti me na ovom računaru","Reports":"Izveštaji","Reset":"Poništi","Review":"Pregled","RunFilter":"Pokreni filter","RunJob":"Pokreni posao","Save":"Sačuvaj","SaveBeforeClosing":"Sačuvaj pre zatvaranja","SavedFilters":"Sačuvani filteri","SaveSubmit":"Sačuvaj/prosledi","ScreenDesign":"Dizajn ekrana","Search":"Pretraga","SelectContents":"Izbor sadržaja","SelectDate":"Izbor datuma","SelectDeselect":"Izbor svega/Opoziv izbora","Selected":"Izabrano: ","ServerName":"Ime servera","Settings":"Postavke","ShowFilterRow":"Prikaži red sa filterima","SignIn":"Prijavljivanje","SortAscending":"Sortiraj po rastućem redosledu","SortDescending":"Sortiraj po opadajućem redosledu","Spreadsheet":"Unakrsna tabela","StartsWith":"Počinje sa","StatusIndicator":"Indikator statusa","Tasks":"Zadaci","Today":"Danas","Translate":"Prevedi","UserID":"ID korisnika","Utilities":"Uslužni programi","Yes":"Da","Page":"Stranica","Rows":"Redovi","ShowingAll":"Prikaz svih stavki","SessionNavigation":"Navigacija sesije","ListAllMenuItems":"Lista svih stavki menija","NoRecordsFound":"Nije pronađen nijedan zapis","SearchTree":"Pretraga stabla","Clear":"Obriši","DrillDown":"Dubinska analiza","Required":"Ovo polje je obavezno","Available":"Raspoloživo:","Add":"Dodaj","MoveDown":"Premesti nadole","MoveUp":"Premesti nagore","Remove":"Ukloni","LastYear":"Prošla godina","NextMonth":"Sledeći mesec","NextWeek":"Sledeća nedelja","NextYear":"Sledeća godina","OneMonthAgo":"Pre mesec dana","OneWeekAgo":"Pre nedelju dana","SixMonthsAgo":"Pre šest meseci","Time":"Vreme","CannotBeSelected":"Nije moguće izabrati ovaj red.","ResetToDefault":"Poništi na podrazumevani raspored","CloseOtherTabs":"Zatvori ostale kartice","EmailValidation":"Unesite važeću e-adresu","UrlValidation":"Unesite važeću URL adresu","EndofResults":"Kraj rezultata","More":"Još...","RecordsPerPage":"Zapisa po stranici","Maximize":"Макимизе","Minimize":"умањити"}
});

}( this ));
