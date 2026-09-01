/* gift.ceo — băuturi alcoolice și nealcoolice.
   Adrese citite de pe situl firmei, majoritatea din Impressum (§5 DDG in DE/AT).
   Randamentul aici a fost 70% — cel mai bun din toate categoriile cercetate,
   fiindca sunt firme de familie, nu corporatii cotate. */

export const SUBJECT = "Ten founding seats on gift.ceo — yours costs nothing";

export const FOUND = {
trappist:
"Your order answered the question in this letter about eight hundred years before it was asked.\n\n" +
"There is no other industry on earth where the definition of the product contains an obligation to give the money away. Not a pledge, not a percentage, not a foundation set up afterwards — a condition of being allowed to use your own name. Every technology company now writing a values page is describing, badly, something your order simply does.",
public:
"There is a whole category of company that gives by construction, and nobody has ever counted it.\n\n" +
"Breweries owned by states, monasteries and foundations have been sending their surplus outward for centuries without once calling it philanthropy, because it is not a programme — it is simply how they were built. It is the oldest form of the thing this letter is about, and there is no list of it anywhere.",
family:
"You are one of the few kinds of company that can actually give.\n\n" +
"A listed company cannot. A hired chief executive holds other people's property in trust, and handing an asset over without a board behind him is not generosity but a breach of duty. A family house that has held the same town for generations has no such problem: what you decide to give is yours to give. That is rarer than it sounds — most of the economy has lost the ability.",
social:
"Your company was built to give, which makes this letter unusual.\n\n" +
"Most of the people I write to have to find the thing they gave. You started from it: the giving is not a programme attached to the business, it is the reason the business was drawn up that way. What you are missing is not generosity, it is a place to put it where it is counted next to everyone else's.",
water:
"You sell something that falls from the sky.\n\n" +
"Water belongs to everyone until it is bottled, which puts a mineral spring in a position no other business is in — closer to a custodian than an owner. That is not an accusation. It is the reason a question about giving lands differently on your desk than on anyone else's."
};

export const KICKER = {
trappist:
"There is one reason I am writing to you anyway.\n\nYou have given for centuries and never once been listed anywhere a chief executive would look.\n\ngift.ceo is one page. Gifts, numbered in the order they were given, under the name of the person responsible. Your entry would sit next to software companies and chip manufacturers, and it would be older than all of them by four hundred years. That is the point: to put in front of the people who have given nothing a page where the ones who did are named.",
public:
"There is one reason gift.ceo is worth a line of your time.\n\nThe arrangement you operate under is a gift that nobody records as one.\n\nA page that numbers gifts and names the person responsible is where that belongs — not in a corporate history nobody reads, but next to the companies that have just discovered generosity and put out a press release about it.",
family:
"There is one reason gift.ceo is worth a line of your time.\n\nThe things a house like yours gives are never written down.\n\nA brewery that has stood in the same town through two wars and a currency reform has carried people through bad years — beer at a funeral, a wage kept paid, a roof fixed for someone who could not. None of it was filed. gift.ceo is one page, numbered, permanent, where one such thing gets a name and a date. Not to be thanked. So that the companies which have never given anything have to look at a page where the ones that did are listed.",
social:
"There is one reason gift.ceo is worth a line of your time.\n\nYou are read as a marketing position, and you cannot argue your way out of it.\n\nEvery company now claims a purpose, which has made the claim worthless — including yours, which happens to be true. The only thing that still separates a real one is a specific gift with a name and a date on it, sitting next to other specific gifts, where anyone can compare them. That is the whole of what gift.ceo is.",
water:
"There is one reason gift.ceo is worth a line of your time.\n\nWater is the one product where giving it away is not a metaphor.\n\nEverywhere else on the page the gift is code, or a patent, or equity. Yours could be the literal thing — and it would be the clearest entry on the list precisely because it needs no explaining."
};

export const TAIL =
"\n\n@FOUND@\n\n" +
"That is why I am writing to you, and not to a marketing department.\n\n" +
"gift.ceo is one page. A CEO writes, under their own name and their company's name, a single thing: here is what we are giving. A tool, free for anyone who needs it. A bonus that goes to the team. Equity for the people who built the company. A day of your time. Water, where that is what you have. No foundation, no CSR report, no agency turning it into a campaign. Gifts, numbered in the order they were given, starting at #1.\n\n" +
"@KICKER@\n\n" +
"A seat normally costs 10,000 CHF, once. That is not a price, it is a filter: only a CEO who truly intends to give will pay to do it publicly, under their own name.\n\n" +
"The site opens with ten founding seats that cost nothing. They pass a different filter — you don't pay, you give first. The first one is already up: Cyberbotics published Webots, the robot simulator they have kept open source since 1998. One condition: publish your gift within 30 days and the seat belongs to @CO@ permanently, whoever runs it later.\n\n" +
"If you want one, reply with your company domain and I will mark it before you sign in, so nothing ever asks you for payment.\n\n" +
"Eight of the ten are still open.\n\n" +
"gift.ceo\n\ngift.ceo.support@gmail.com\n\nSwiss made — Available worldwide";

/* p lipsă => se construiește o deschidere onestă din tipul firmei, care nu
   pretinde un fapt pe care nu l-am verificat. */
const DESCHIDERE = {
  brewery: (co) => `For ${co}.\n\nI am writing without knowing what your house has given away, and that is the honest reason for the letter rather than an apology for it. A brewery that has stood in the same town for generations has carried people through bad years — a wage kept paid, a roof fixed, beer at a funeral nobody was billed for. None of it was ever written down anywhere.`,
  water:   (co) => `For ${co}.\n\nI am writing without knowing what your company has given away, and that is the honest reason for the letter. You bottle something that fell from the sky and belonged to everyone until it reached you, which makes a question about giving land differently on your desk than on most.`,
  drink:   (co) => `For ${co}.\n\nI am writing without knowing what your company has given away, and that is the honest reason for the letter rather than an apology for it. If there is something — a year you kept people on, a supplier price you held when you did not have to — it is not filed anywhere a stranger could find it.`
};

const R = [
/* ===== TRAPPIST: obligația de a dărui e în definiția produsului ===== */
["Chimay","Bières de Chimay","info@chimay.com","chimay.com/en/contact","trappist",
 "For Chimay.\n\nThe monks of Scourmont have brewed since 1862 and the rule has not changed: what the community does not need goes out. You are one of a handful of businesses on earth whose right to use its own name depends on giving the money away."],
["Westmalle","Trappistenbrouwerij Westmalle","info@trappistwestmalle.be","trappistwestmalle.be/en/contact","trappist",
 "For Westmalle.\n\nYou invented the Tripel and never trademarked it. Every brewery in the world now makes one, uses the word freely, and owes you nothing — because you let a style you created become common property. Then there is the Trappist rule itself, which sends the surplus out by obligation rather than choice."],

/* ===== PROPRIETATE PUBLICĂ SAU MONAHALĂ ===== */
["Rothaus","Badische Staatsbrauerei Rothaus","info@rothaus.de","rothaus.de/impressum","public",
 "For Rothaus.\n\nThe brewery belongs to the state of Baden-Württemberg. Every mark of profit from Tannenzäpfle has gone to the public purse since 1806 — schools, roads, the ordinary business of a state — and the people drinking it in Berlin mostly have no idea. It is a company that has been giving its entire output away for two centuries by construction."],
["Weihenstephan","Bayerische Staatsbrauerei Weihenstephan","info@weihenstephaner.de","weihenstephaner.de/impressum","public",
 "For Weihenstephan.\n\nYou are the oldest brewery in the world still running, and you are owned by the Free State of Bavaria. The profits go to the public, and the site next door has trained brewers from every country on earth for a century and a half. Most of what your institution has given away is knowledge, and knowledge given away is the hardest kind to count."],
["Andechs","Klosterbrauerei Andechs","info@andechs.de","andechs.de/impressum","public",
 "For Andechs.\n\nThe brewery funds the monastery, and the monastery funds a school, a workshop for people with disabilities and the care of the mountain itself. The beer is the endowment. Almost every visitor who climbs up for a Doppelbock is, without being told, paying for something else entirely."],
["Neuzeller Klosterbrauerei","Stefan Fritsche","fritsche@klosterbrauerei.com","klosterbrauerei.com/impressum","family",
 "For Stefan Fritsche.\n\nYou publish your own address on the brewery's imprint, which almost no managing director still does. You also fought the German state for years over whether a beer brewed with sugar could legally be called beer, and won — a ruling that widened what every other brewer in the country is allowed to make."],
["Budvar","Budějovický Budvar","info@budvar.cz","budejovickybudvar.cz/en/contacts","public",
 "For Budvar.\n\nYou are owned by the Czech state and you have spent a century defending the right of a town to its own name against a company a hundred times your size. Whatever that cost in legal fees was spent on behalf of every small producer with a place-name on the label."],

/* ===== FIRME SOCIALE: dăruitul e în actul constitutiv ===== */
["Lemonaid","Lemonaid Beverages GmbH","info@lemonaid.de","lemon-aid.de/impressum","social",
 "For Lemonaid.\n\nFive cents of every bottle goes out to the growing regions through your own association, and you publish what it funded. You also fought the German authorities who wanted you to add sugar to be legally allowed to call it lemonade, and the rules changed. Winning an argument that makes a product category healthier for everyone, competitors included, is a gift that never gets counted as one."],
["Viva con Agua","Viva con Agua","kontakt@vivaconagua.org","vivaconagua.org/impressum","social",
 "For Viva con Agua.\n\nThe water is the fundraiser. You built a drinks company whose purpose is to pay for drinking water somewhere else, and the entire profit is the donation rather than a slice of it. That is the shape gift.ceo exists to record, and you were doing it before there was a page to put it on."],
["Ostmost","Ostmost","hallo@ostmost.berlin","ostmost.berlin/impressum","social",
 "For Ostmost.\n\nYou buy apples from Streuobstwiesen — old standard orchards that are among the most species-rich habitats in Germany and are disappearing because nobody can make money from them. Paying a price that keeps the trees standing is a conservation programme disguised as a purchase order."],
["Voelkel","Voelkel GmbH","info@voelkel.bio","voelkeljuice.de/impressum","social",
 "For Voelkel.\n\nThe company is held by a foundation, not by owners who can sell it, and it has been biodynamic since the 1930s — which at that point was not a market position because there was no market. Four generations of doing something at a cost, before anyone was paying a premium for it."],
["Neumarkter Lammsbräu","Neumarkter Lammsbräu","info@lammsbraeu.de","lammsbraeu.de/impressum","social",
 "For Neumarkter Lammsbräu.\n\nYou went fully organic in the 1980s, when it meant paying farmers more for grain nobody was asking for and being told it was commercial suicide. You then helped the growers organise so they could sell to anyone, not only to you. Building your suppliers an exit from depending on you is the kind of generosity that shows up in no account."],
["Bionade","Bionade GmbH","presse@bionade.de","bionade.de/impressum","social",
 "For Bionade.\n\nA master brewer spent eight years and most of what he had inventing a fermented soft drink that did not exist, and nearly lost the family brewery doing it. The recipe changed what a whole category could be, and the people who copied it paid nothing."],
["Premium-Kollektiv","Uwe Lübbermann","uwe@premium-kollektiv.de","premium-kollektiv.de/impressum","social",
 "For Uwe Lübbermann.\n\nYou run a drinks company with no contracts, no ownership of the brand, and prices set by everyone in the chain by consensus — including a surcharge your customers voted to pay so that small shops could buy at the same price as large ones. You also published the whole model for anyone to copy. Giving away your own operating system is rarer than giving away money."],

/* ===== FAMILIE, cu fapt verificabil ===== */
["Melitta","Melitta Group","pr@melitta.de","melitta-group.com/en/imprint","family",
 "For Melitta.\n\nMelitta Bentz punched holes in a brass pot and put a sheet of her son's blotting paper over it, and the filter coffee that most of the world drinks every morning descends from that afternoon. The patent long ago expired into common property; the method is now simply how coffee is made, everywhere, by everyone, free."],
["Antinori","Marchesi Antinori","antinori@antinori.it","antinori.it/en/contatti","family",
 "For Marchesi Antinori.\n\nTwenty-six generations, since 1385. A family that has held the same land for six hundred years measures obligation in a way a quarterly company cannot, and has almost certainly carried its region through years that are now only a line in a history book."],
["Frescobaldi","Marchesi Frescobaldi","info@frescobaldi.it","frescobaldi.com/en/contacts","family",
 "For Frescobaldi.\n\nSeven hundred years in Tuscany, and a working vineyard inside Gorgona prison where inmates are paid and trained. A company that gives men in prison a trade they can leave with has done something specific and countable, which is exactly the shape this page is built for."],
["Teekanne","Teekanne GmbH","online@teekanne.de","teekanne.de/impressum","family",
 "For Teekanne.\n\nThe double-chamber tea bag came out of your house and is now simply how tea is packed, by everyone. A patent that expires into universal practice is a gift with a delay on it."],
["Duvel Moortgat","Duvel Moortgat","info@duvel.be","duvelmoortgat.be/en/contact","family",
 "For Duvel Moortgat.\n\nFour generations, still family-led, and you have bought struggling breweries in three countries and kept them brewing under their own names rather than folding them into yours. Letting an acquired house keep its identity costs money and returns nothing measurable."],
["Almdudler","Almdudler","info@almdudler.com","almdudler.com/impressum","family",
 "For Almdudler.\n\nThree generations, still family-owned, and a drink invented in a Vienna kitchen that became the thing an entire country reaches for instead of an imported cola. Holding a national habit against companies a thousand times your size, without selling, is itself a decision taken repeatedly."],
["Störtebeker","Störtebeker Braumanufaktur","info@stoertebeker.com","stoertebeker.com/impressum","family",
 "For Störtebeker.\n\nFamily-owned, and you rebuilt a brewery that the reunification was expected to close. Keeping industrial work in a part of the country that lost most of it is a decision with a cost, taken by people whose names are on the door."],
["Uerige","Uerige Obergärige Hausbrauerei","info@uerige.de","uerige.de/impressum","family",
 "For Uerige.\n\nYou have brewed Altbier on the same corner in Düsseldorf since 1862, through everything that happened to that city, and you still serve it from wooden barrels carried by hand. Continuity is not usually called generosity, but a house that refuses to leave is giving a neighbourhood something it cannot buy."],
["Rivella","Rivella AG","marketing@rivella.ch","rivella.ch/de/impressum","family",
 "For Rivella.\n\nA Swiss family company that turned milk whey — an industrial by-product nobody wanted — into a national drink. Finding value in something the dairy industry was paying to dispose of is a small piece of engineering that quietly served everyone upstream of you."],
["Locher","Brauerei Locher","info@brauereilocher.ch","appenzellerbier.ch/impressum","family",
 "For Brauerei Locher.\n\nFive generations in Appenzell, and you turned spent grain — the waste every brewery pays to remove — into food products and packaging material. Solving your own industry's waste problem and then selling the solution to your competitors is not the usual way to treat an advantage."],

/* ===== fara fapt verificat: deschidere onesta pe tip ===== */
["Bitburger","Bitburger Braugruppe","info@bitburger.de","bitburger.de/impressum","brewery",null],
["Krombacher","Krombacher Brauerei","service@krombacher.de","krombacher.de/impressum","brewery",null],
["Warsteiner","Warsteiner Brauerei","info@warsteiner.de","warsteiner.de/impressum","brewery",null],
["Veltins","Brauerei C. & A. Veltins","veltinsinfo@veltins.de","veltins.de/impressum","brewery",null],
["Augustiner","Augustiner-Bräu München","info@augustiner-braeu.de","augustiner-braeu.de/impressum.html","brewery",null],
["Erdinger","Erdinger Weißbräu","info@erdinger.de","erdinger.de/impressum","brewery",null],
["Flensburger","Flensburger Brauerei","info@flens.de","flens.de/impressum","brewery",null],
["Jever","Friesisches Brauhaus zu Jever","info@jever.de","jever.de/impressum","brewery",null],
["Ottakringer","Ottakringer Brauerei","office@ottakringer.at","ottakringerbrauerei.at/impressum","brewery",null],
["Brauhaus Tegernsee","Herzogliches Brauhaus Tegernsee","info@brauhaus-tegernsee.de","brauhaus-tegernsee.de/impressum","brewery",null],
["Radeberger Gruppe","Radeberger Gruppe KG","info@radeberger-gruppe.de","radeberger.de/impressum","brewery",null],
["Riegele","Brauhaus Riegele","info@riegele.de","riegele.de/impressum","brewery",null],
["Maisel","Brauerei Gebr. Maisel","brauerei@maisel.com","maisel.com/impressum","brewery",null],
["Gaffel","Privatbrauerei Gaffel Becker","info@gaffel.de","gaffel.de/impressum","brewery",null],
["Früh","Cölner Hofbräu Früh","info@frueh.de","frueh.de/impressum","brewery",null],
["Füchschen","Brauerei Füchschen","info@fuechschen.de","fuechschen.de/impressum","brewery",null],
["Ratsherrn","Ratsherrn Brauerei","info@ratsherrn.de","ratsherrn.de/impressum","brewery",null],
["Hoepfner","Privatbrauerei Hoepfner","info@hoepfner.de","hoepfner.de/impressum","brewery",null],
["Alpirsbacher","Alpirsbacher Klosterbräu","info@alpirsbacher.de","alpirsbacher.de/impressum","brewery",null],
["Schönramer","Private Landbrauerei Schönram","info@brauerei-schoenram.de","schoenramer.de/impressum","brewery",null],
["Spaten","Spaten-Franziskaner-Bräu","info@spaten.info","spatenbraeu.de/impressum","brewery",null],
["Löwenbräu","Löwenbräu München","info@loewenbraeu.de","loewenbraeu.de/impressum","brewery",null],
["Franziskaner","Franziskaner Weissbier","info@franziskaner-weissbier.de","franziskaner-weissbier.de/impressum","brewery",null],
["Hacker-Pschorr","Hacker-Pschorr Bräu","info@hacker-pschorr.de","hacker-pschorr.de/impressum","brewery",null],
["Kuchlbauer","Brauerei Kuchlbauer","info@kuchlbauer.de","kuchlbauer.de/impressum","brewery",null],
["Tucher","Tucher Bräu","presse@tucher.de","tucher.de/impressum","brewery",null],
["Mahrs Bräu","Mahrs Bräu Bamberg","info@mahrs.de","mahrs.de/impressum","brewery",null],
["Zoiglbier","Zoigl","kontakt@zoiglbier.de","zoiglbier.de/impressum","brewery",null],
["Berliner Kindl","Berliner-Kindl-Schultheiss-Brauerei","info@berliner-kindl.de","berliner-kindl.de/impressum","brewery",null],
["Schultheiss","Schultheiss Brauerei","info@schultheiss.de","schultheiss.de/impressum","brewery",null],
["Köstritzer","Köstritzer Schwarzbierbrauerei","info@koestritzer.de","koestritzer.de/impressum","brewery",null],
["Gutmann","Brauerei Gutmann","info@brauerei-gutmann.de","brauerei-gutmann.de/impressum","brewery",null],
["Hofmühl","Brauerei Hofmühl","info@hofmuehl.de","hofmuehl.de/impressum","brewery",null],
["Pinkus Müller","Brauerei Pinkus Müller","info@pinkus.de","pinkus.de/impressum","brewery",null],
["Hirschbrauerei","Hirschbrauerei Honer","info@hirschbrauerei.de","hirschbrauerei.de/impressum","brewery",null],
["Meckatzer","Meckatzer Löwenbräu","info@meckatzer.de","meckatzer.de/impressum","brewery",null],
["Engel","Engel Brauerei","info@engelbier.de","engelbier.de/impressum","brewery",null],
["Kaiserdom","Kaiserdom Privatbrauerei","info@kaiserdom.de","kaiserdom.de/impressum","brewery",null],
["Brauerei Spezial","Brauerei Spezial Bamberg","brauerei-spezial@t-online.de","brauerei-spezial.de/impressum","brewery",null],
["Klosterbräu Bamberg","Klosterbräu Bamberg","mail@klosterbraeu.de","klosterbraeu.de/impressum","brewery",null],
["Oettinger","Oettinger Brauerei","mail@oettinger-bier.de","oettinger-bier.de/impressum","brewery",null],
["Karlsberg","Karlsberg Brauerei","info@karlsberg.de","karlsberg.de/impressum","brewery",null],
["Eichbaum","Eichbaum Brauereien","info@eichbaum.de","eichbaum.de/impressum","brewery",null],
["Beck's","Brauerei Beck","service@becks.de","becks.de/impressum","brewery",null],
["Astra","Astra Brauerei","info@astra-brauerei.de","astra-bier.de/impressum","brewery",null],
["Hasseröder","Hasseröder Brauerei","info@hasseroeder.de","hasseroeder.de/impressum","brewery",null],
["Radeberger","Radeberger Exportbierbrauerei","info@radeberger.de","radeberger.de/impressum","brewery",null],
["Ur-Krostitzer","Krostitzer Brauerei","info@ur-krostitzer.de","ur-krostitzer.de/impressum","brewery",null],
["Freiberger","Freiberger Brauhaus","info@freiberger-brauhaus.de","freiberger-pils.de/impressum","brewery",null],
["Mauritius","Mauritius Brauerei Zwickau","info@mauritius-zwickau.de","mauritius-brauerei.de/impressum","brewery",null],
["Gerolsteiner","Gerolsteiner Brunnen","service@gerolsteiner.com","gerolsteiner.de/impressum","water",null],
["Teinacher","Mineralbrunnen Teinach","info@teinacher.de","teinacher.de/impressum","water",null],
["Selters","Selters Mineralquelle","info@selters.de","selters.de/impressum","water",null],
["Vilsa","Vilsa-Brunnen","info@vilsa.de","vilsa.de/impressum","water",null],
["Förstina","Förstina-Sprudel","info@foerstina.com","foerstina.de/impressum","water",null],
["Rhodius","Rhodius Mineralquellen","info@rhodius-mineralquellen.de","rhodius.de/impressum","water",null],
["Riha WeserGold","Riha WeserGold Getränke","info@riha-wesergold.de","extaler.de/impressum","drink",null],
["Rémy Cointreau","Rémy Cointreau","investor-relations@remy-cointreau.com","remy-cointreau.com/en/contact","drink",null]
];

export const L = R.map(([co,to,em,src,t,p]) => ({
  co, to, em, src, t,
  p: p || DESCHIDERE[t](co)
}));
