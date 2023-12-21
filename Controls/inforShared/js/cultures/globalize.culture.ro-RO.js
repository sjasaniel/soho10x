﻿/*
* Globalize Culture ro-RO
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

Globalize.addCultureInfo( "ro-RO", "default", {
	name: "ro-RO",
	englishName: "Romanian (Romania)",
	nativeName: "română (România)",
	language: "ro",
	numberFormat: {
		",": ".",
		".": ",",
		percent: {
			pattern: ["-n%","n%"],
			",": ".",
			".": ","
		},
		currency: {
			pattern: ["-n $","n $"],
			",": ".",
			".": ",",
			symbol: "lei"
		}
	},
	calendars: {
		standard: {
			"/": ".",
			firstDay: 1,
			days: {
				names: ["duminică","luni","marţi","miercuri","joi","vineri","sâmbătă"],
				namesAbbr: ["D","L","Ma","Mi","J","V","S"],
				namesShort: ["D","L","Ma","Mi","J","V","S"]
			},
			months: {
				names: ["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie",""],
				namesAbbr: ["ian.","feb.","mar.","apr.","mai.","iun.","iul.","aug.","sep.","oct.","nov.","dec.",""]
			},
			AM: null,
			PM: null,
			patterns: {
				d: "dd.MM.yyyy",
				D: "d MMMM yyyy",
				t: "HH:mm",
				T: "HH:mm:ss",
				f: "d MMMM yyyy HH:mm",
				F: "d MMMM yyyy HH:mm:ss",
				M: "d MMMM",
				Y: "MMMM yyyy"
			}
		}
	},
	messages: {"AdditionalHelp":"Ajutor suplimentar","AddNewTab":"Adăugare filă nouă","Alerts":"Alerte","ApplyFilter":"Aplicare filtru","Approve":"Aprobare","Attachments":"Ataşamente","Back":"Înapoi","Basic":"De bază","Between":"Între","Book":"Rezervare","Cancel":"Revocare","Checked":"Bifat","ClearFilter":"Golire filtru","Close":"Închidere","CloseCancelChanges":"Închidere şi revocare modificări","CloseSaveChanges":"Închidere şi salvare modificări","CloseTab":"Închidere filă","ColumnPersonalization":"Personalizare coloană","Comments":"Comentarii","Confirmation":"Confirmare","Contains":"Conţine","CreateTab":"Creare filă nouă","Cut":"Decupare","Delete":"Ştergere","DiscardUndo":"Renunţare/Anulare","DisplayDropDownList":"Afişare listă verticală","Displaying":"Se afişează: ","DocWord":"Document","DoesNotContain":"Nu conţine","DoesNotEndWith":"Nu se termină cu","DoesNotEqual":"Nu este egal cu","DoesNotStartWith":"Nu începe cu","Download":"Descărcare","Duplicate":"Dublare","Edit":"Editare","EitherSelectedorNotSelected":"Selectat sau neselectat","Email":"E-mail","EndsWith":"Se termină cu","EqualsStr":"Este egal cu","ExpandCollapse":"Extindere/Restrângere","ExportFailed":"Export eşuat","ExportToExcel":"Export în Excel","FileInUse":"Fişierul specificat este utilizat","FileInUseDetail":"Închideţi fişierul din aplicaţia în care este utilizat sau specificaţi un nume de fişier diferit.","Filter":"Filtru","FilterMenu":"Meniu filtru","FilterOptions":"Opţiuni filtru","FilterWithinResults":"Filtru în rezultate","First":"Primul","FirstView":"Prima vizualizare","Folder":"Folder","ForgotPassword":"Aţi uitat parola?","Forward":"Înainte","GetMoreRows":"Obţinere mai multe rânduri","GreaterThan":"Mai mare ca","GreaterThanOrEquals":"Mai mare sau egal cu","GridSettings":"Setări grilă","GroupSelection":"Selecţie grup","Help":"Ajutor","HideColumn":"Ascundere coloană","IsEmpty":"Este gol","IsNotEmpty":"Nu este gol","Last":"Ultimul","LastView":"Ultima vizualizare","LaunchActivate":"Lansare/Activare","LessThan":"Mai mic decât","LessThanOrEquals":"Mai mic sau egal cu","Links":"Legături","ListTabs":"Listare toate filele","LoadingItem":"Încărcare element ","Maintenance":"Întreţinere","Menu":"Meniu","New":"Nou","Next":"Următor","NextView":"Următoarea vizualizare","No":"Nu","NotChecked":"Nebifat","Notes":"Note","NotSelected":"Neselectat","Of":" din ","Ok":"OK","Open":"Deschidere","Password":"Parolă","Paste":"Lipire","Phone":"Telefon","PleaseWait":"Aşteptaţi","Previous":"Anterior","PreviousView":"Vizualizarea anterioară","Print":"Imprimare","Queries":"Interogări","Redo":"Refacere","Refresh":"Reîmprospătare","Reject":"Respingere","RememberMe":"Memorare utilizator pe acest computer","Reports":"Rapoarte","Reset":"Resetare","Review":"Revizuire","RunFilter":"Executare filtru","RunJob":"Executare lucrare","Save":"Salvare","SaveBeforeClosing":"Salvare înainte de închidere","SavedFilters":"Salvare filtre","SaveSubmit":"Salvare/Trimitere","ScreenDesign":"Design ecran","Search":"Căutare","SelectContents":"Selectare conţinut","SelectDate":"Selectare dată","SelectDeselect":"Selectare/Deselectare toate","Selected":"Selectat: ","ServerName":"Nume server","Settings":"Setări","ShowFilterRow":"Afişare rând filtru","SignIn":"Conectare","SortAscending":"Sortare ascendentă","SortDescending":"Sortare descendentă","Spreadsheet":"Foaie de calcul","StartsWith":"Începe cu","StatusIndicator":"Indicator stare","Tasks":"Sarcini","Today":"Astăzi","Translate":"Traducere","UserID":"ID utilizator","Utilities":"Utilitare","Yes":"Da","Page":"Pagina","Rows":"Rânduri","ShowingAll":"Afişare toate","SessionNavigation":"Navigare sesisune","ListAllMenuItems":"Listare toate elementele de meniu","NoRecordsFound":"Nicio înregistrare găsită","SearchTree":"Arbore de căutare","Clear":"Golire","DrillDown":"Detaliere","Required":"Acest câmp este necesar","Available":"Disponibil:","Add":"Adăugare","MoveDown":"Mutare în jos","MoveUp":"Mutare în sus","Remove":"Eliminare","LastYear":"Anul trecut","NextMonth":"Luna următoare","NextWeek":"Săptămâna următoare","NextYear":"Anul următor","OneMonthAgo":"Acum o lună","OneWeekAgo":"Acum o săptămână","SixMonthsAgo":"Acum şase luni","Time":"Oră","CannotBeSelected":"Acest rând nu poate fi selectat.","ResetToDefault":"Resetare aspect implicit","CloseOtherTabs":"Închidere alte file","EmailValidation":"Introduceţi o adresă de e-mail validă","UrlValidation":"Introduceţi URL valid","EndofResults":"Sfârşit rezultate","More":"Mai multe...","RecordsPerPage":"Înregistrări pe pagină","Maximize":"Maximaliza","Minimize":"Minimaliza"}
});

}( this ));
