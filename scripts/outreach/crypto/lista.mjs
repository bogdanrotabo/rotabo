/* gift.ceo — crypto, AI si open source.
   Fiecare adresa e publicata de companie, cu sursa in campul src.
   Niciuna nu e ghicita dupa tipar: un CEO caruia ii scrii pe o adresa
   inventata e ori un bounce, ori un strain care n-a cerut nimic. */

export const SUBJECT = "Ten founding seats on gift.ceo — yours costs nothing";

export const TAIL =
"\n\n@FOUND@\n\n" +
"That gap is why gift.ceo exists, and it is why I am writing to you rather than to a marketing department.\n\n" +
"gift.ceo is one page. A CEO writes, under their own name and their company's name, a single thing: here is what we are giving. A tool, free for anyone who needs it. Code released so it can never be taken back. A bonus that goes to the team. Equity for the people who built the company. A day of your time. No foundation, no CSR report, no agency turning it into a campaign. Gifts, numbered in the order they were given, starting at #1.\n\n" +
"@KICKER@\n\n" +
"A seat normally costs 10,000 CHF, once. That is not a price, it is a filter: only a CEO who truly intends to give will pay to do it publicly, under their own name.\n\n" +
"The site opens with ten founding seats that cost nothing. They pass a different filter — you don't pay, you give first. The first one is already up: Cyberbotics published Webots, the robot simulator they have kept open source since 1998. One condition: publish your gift within 30 days and the seat belongs to @CO@ permanently, whoever runs it later.\n\n" +
"If you want one, reply with your company domain and I will mark it before you sign in, so nothing ever asks you for payment.\n\n" +
"Eight of the ten are still open.\n\n" +
"gift.ceo\n\ngift.ceo.support@gmail.com\n\nSwiss made — Available worldwide";

/* Argumentul de deschidere, diferit pe sector. */
export const FOUND = {
crypto:
"Your industry was founded on a gift.\n\n" +
"Satoshi Nakamoto published Bitcoin and walked away. No equity, no company, no fee, no board seat, no vesting schedule. The most valuable thing anyone built this century was handed over and abandoned by the person who built it — and every exchange, every chain, every protocol since has been built on top of that single act of giving something away permanently.\n\n" +
"Fifteen years later, the industry is known for the opposite. The public story of crypto is now extraction: tokens designed so that value moves upward, launches engineered to end in someone else's loss, a decade of headlines about what was taken rather than what was given. Whatever you personally have built, you are read against that story, and so is everyone who works for you.",
ai:
"Your industry was built on gifts it never paid for.\n\n" +
"Every model your industry ships was trained on things people gave away for nothing: Wikipedia, open source, papers published rather than patented, photographs and text posted by people who were never paid and never asked. The entire field is downstream of a century of gifts, and it is the largest transfer of freely given work into private value that has ever happened.\n\n" +
"That debt is now the central argument against you. Whatever your company actually does, it is read as taking — and the people who gave the training data are the ones making the argument loudest.",
os:
"Your organisation is the gift.\n\n" +
"You already do the thing. Everything your organisation makes is given away, permanently, to people who will never thank you and mostly do not know your name. That is not a marketing position, it is the whole design.\n\n" +
"Which is exactly the problem. The gift is so complete that it has become invisible: infrastructure the entire economy runs on, maintained by people most CEOs could not name, funded by nobody in particular.",
tech:
"Your industry inherited its foundations for free.\n\n" +
"Nothing your company sells would exist if the generation before you had charged for what they found. The internet protocols were published rather than licensed. Unix, C, the compiler your products are built with, the web itself — handed over, by people who could have owned them and decided not to. The entire industry is standing on a pile of gifts it rarely mentions.\n\n" +
"That inheritance does not appear in an annual report. The companies that received the most from it are usually the ones least likely to say so out loud.",
listed:
"You cannot give away what is not yours.\n\n" +
"That is the honest problem with writing to a listed company about generosity, and I am not going to pretend it away. A hired chief executive holds other people\u2019s property in trust. Handing over an asset without a board behind you is not generosity, it is a breach of duty \u2014 and every CEO who has tried to be personally magnanimous with shareholder assets has learned that quickly.\n\n" +
"Which is exactly why the few companies that have done it are worth naming, and why almost nobody remembers which ones they were."
};

export const KICKER = {
crypto:
"There is one reason this matters more in your industry than in any other.\n\nA token can be printed. A gift cannot.\n\nAnyone can mint a coin and call it a community, write a manifesto about decentralisation, publish a roadmap. Every one of those is a claim, and in crypto every claim is discounted to zero because everyone has learned that claims are free. A gift is the one thing that cannot be manufactured: the thing either left your hands or it did not. It is the only signal in your sector that costs the sender something — which is the only reason anyone believes a signal at all.",
ai:
"There is one reason this matters more in your industry than in any other.\n\nWeights can be published as a strategy. A gift is something else.\n\nAn open release timed to undercut a competitor is a business decision, and everyone reads it as one. What gift.ceo asks for is the version with a name attached to it: you, personally, saying here is what we gave and here is what it cost us. Not a licence change buried in a repo — a signature. In a field where every company claims to be building for humanity, the only distinguishing fact left is which ones can point to something they handed over and cannot take back.",
os:
"There is one reason gift.ceo is worth a line of your time.\n\nYou have given for years and never once put your name on it in a place built for exactly that.\n\nA release note is not a signature. gift.ceo is one page, numbered, permanent, where the person responsible says: this is what we gave. Not to raise money and not to be thanked — so that the CEOs who have never given anything have to look at a page where the people who did are listed by name.",
tech:
"There is one reason this matters at your scale.\n\nA small company is believed when it says it gives. You are not.\n\nAt your size every generous act is read as marketing, tax structure or lock-in — and most of the time that reading is correct. The only version that survives the cynicism is the specific one: a named person, a named thing, a date, and something that cannot be quietly withdrawn next quarter. gift.ceo is built for that shape and nothing else. No campaign, no report, no logo wall.",
listed:
"There is one reason I am writing to you anyway.\n\nThe gifts that came out of companies like yours are the largest ones in the list, and they are the least known.\n\nNot a foundation, not a giving programme, not a percentage of profit \u2014 one decision, taken once, that put something permanently beyond the company\u2019s own reach. Those decisions are made by a named person on a named day, and then they vanish into corporate history where nobody can find them. gift.ceo is one page where they would be findable, numbered, next to each other."
};

export const L = [
/* ---------- CRYPTO ---------- */
{s:"crypto", co:"Binance", niv:"C", to:"Richard Teng, CEO", em:"pr@binance.com",
 src:"binance.com/en/press — PR & Communications",
 p:"For Richard Teng.\n\nYour founder signed the Giving Pledge in 2022, promising to give away the overwhelming majority of his wealth. That is a commitment about an estate — it takes effect when he is gone. gift.ceo is about the other kind: what the company gives this quarter, under its own name, while the people who decided it are still running it."},

{s:"crypto", co:"the Ethereum Foundation", niv:"C", to:"Ethereum Foundation", em:"press@ethereum.org",
 src:"ethereum.org/foundation — Media Relations",
 p:"For the Ethereum Foundation.\n\nYou have funded public goods for a decade — clients, research, tooling that nobody owns and everybody uses. It is the largest sustained act of giving in your industry, and almost nobody outside it can name a single item on the list. That is not modesty working, it is a filing problem."},

{s:"crypto", co:"the Solana Foundation", niv:"B", to:"Solana Foundation", em:"press@solana.org",
 src:"solana.com/branding — press contact",
 p:"For the Solana Foundation.\n\nYou fund the work nobody captures: validators, tooling, documentation, the unglamorous half that makes a chain usable. It is written up as programme pages and grant announcements, which is precisely where gifts go to be forgotten."},

{s:"crypto", co:"Kraken", niv:"C", to:"Kraken", em:"press@kraken.com",
 src:"comunicat Businesswire — press contact",
 p:"For Kraken.\n\nYou published your Proof of Reserves methodology instead of keeping it as a competitive moat, which handed every customer of every other exchange an argument to use against their own exchange. Giving away your verification standard is a gift to your competitors' users, and it is the kind that never gets counted as one."},

{s:"crypto", co:"Polygon", niv:"B", to:"Polygon Labs", em:"pr@polygon.technology",
 src:"polygon.technology/contact",
 p:"For Polygon Labs.\n\nYou have funded builders through grants for years — money out, no equity back, most of it to teams that will never make headlines. In your sector that is unusual enough to be worth saying out loud, once, with a name attached."},

{s:"crypto", co:"Arbitrum", niv:"B", to:"Offchain Labs", em:"pr@offchain.io",
 src:"offchainlabs.com/contact",
 p:"For Offchain Labs.\n\nRetroactive public goods funding — paying for work after it has already been given away — is one of the few genuinely new ideas about generosity to come out of your industry. You helped make it normal. It deserves a line somewhere other than a governance forum."},

{s:"crypto", co:"the Tezos Foundation", niv:"A", to:"Tezos Foundation", em:"contact@tezos.foundation",
 src:"tezos.foundation/contact",
 p:"For the Tezos Foundation.\n\nYou have given grants since 2018, through two full market cycles, including the years when nobody was watching and there was no attention to be bought with it. Giving in a bear market is the only version that proves anything."},

{s:"crypto", co:"Paxos", niv:"B", to:"Paxos", em:"press@paxos.com",
 src:"paxos.com/contact",
 p:"For Paxos.\n\nYou publish attestations that most of your competitors would rather not have to match. Transparency that raises the floor for an entire category is a gift to everyone in it, including the people who resent you for it."},

/* ---------- AI ---------- */
{s:"ai", co:"the Allen Institute for AI", niv:"B", to:"Ali Farhadi, CEO", em:"press@allenai.org",
 src:"allenai.org/press/resources",
 p:"For Ali Farhadi.\n\nOLMo is not an open model in the sense the phrase has come to mean. You released the weights, the code, the data and the training recipe — the entire thing, so that someone with no relationship to you can reproduce it and check your work. Almost nobody else in this field has done that, and the ones who have not are the ones using the word 'open' most often."},

{s:"ai", co:"EleutherAI", niv:"A", to:"EleutherAI", em:"contact@eleuther.ai",
 src:"eleuther.ai",
 p:"For EleutherAI.\n\nYou built GPT-Neo and the Pile as volunteers, in public, and gave them away at a moment when the alternative was that nobody outside three companies could study large models at all. An entire generation of open research exists because of a Discord server and people who were not being paid."},

{s:"ai", co:"Hugging Face", niv:"B", to:"Clément Delangue, CEO", em:"press@huggingface.co",
 src:"huggingface.co",
 p:"For Clément Delangue.\n\nYou host, free, the work of people who will never pay you — hundreds of thousands of models and datasets, served to anyone. Most companies call that a growth strategy. It is also, measured in bandwidth alone, one of the largest ongoing donations in the industry, and it is the reason a student in any country can do this work at all."},

{s:"ai", co:"Mistral AI", niv:"B", to:"Arthur Mensch, CEO", em:"press@mistral.ai",
 src:"mistral.ai/contact",
 p:"For Arthur Mensch.\n\nYou released open-weight models at a point when the argument for keeping everything closed had effectively won. Whatever the commercial logic, the result is that capabilities which were the property of a handful of American companies became available to anyone, permanently, and cannot be recalled."},

{s:"ai", co:"Stability AI", niv:"B", to:"Stability AI", em:"press@stability.ai",
 src:"stability.ai/contact",
 p:"For Stability AI.\n\nStable Diffusion was released openly, and the consequence was that image generation stopped being something you rented and became something you could run. Whatever has happened to the company since, that release is irreversible and millions of people used it."},

{s:"ai", co:"LAION", niv:"A", to:"LAION", em:"contact@laion.ai",
 src:"laion.ai",
 p:"For LAION.\n\nYou are a non-profit that assembled and gave away the datasets a commercial industry was built on, and took none of the value that followed. That is the purest version of the thing gift.ceo exists to record, and you have never once been paid for it."},

{s:"ai", co:"DeepSeek", niv:"B", to:"DeepSeek", em:"service@deepseek.com",
 src:"deepseek.com",
 p:"For DeepSeek.\n\nYou published weights and methods that others in your position would have treated as the entire asset. The effect on what the rest of the field believed was possible, and on what it costs, was immediate and global."},

{s:"ai", co:"Cohere", niv:"B", to:"Aidan Gomez, CEO", em:"support@cohere.com",
 src:"cohere.com/contact-sales",
 p:"For Aidan Gomez.\n\nCohere For AI put open multilingual models into the hands of researchers working in languages the rest of the industry treats as rounding errors. Giving capability to the languages nobody monetises is a gift by definition — there was never a business case."},

{s:"ai", co:"Anthropic", niv:"C", to:"Anthropic", em:"press@anthropic.com",
 src:"contact publicat pentru presa",
 p:"For Anthropic.\n\nYou open-sourced the Model Context Protocol rather than keeping it as a proprietary integration layer, and competitors adopted it. Handing a standard to the people you are competing with is a specific, datable act of giving, and it is more concrete than most of what gets written in an AI company's values page."},

/* ---------- OPEN SOURCE ---------- */
{s:"os", co:"SQLite", niv:"A", to:"D. Richard Hipp", em:"drh@hwaci.com",
 src:"sqlite.org/support.html — adresa personala publicata",
 p:"For D. Richard Hipp.\n\nSQLite is in the public domain. Not permissively licensed — public domain, no attribution, no conditions, nothing owed to you by anyone. It runs in every phone, every browser, most aircraft, and you kept the option of charging for it and did not take it. It is the largest gift in the history of software measured by installs, and there is no page anywhere that says so."},

{s:"os", co:"the Apache Software Foundation", niv:"B", to:"Apache Software Foundation", em:"press@apache.org",
 src:"apache.org/foundation/contact.html",
 p:"For the Apache Software Foundation.\n\nThe licence that carries your name is on a substantial share of the world's running code, and the foundation behind it has never charged for any of it. Corporations built trillion-dollar businesses on top and the foundation is still funded by donations."},

{s:"os", co:"the Wikimedia Foundation", niv:"B", to:"Wikimedia Foundation", em:"info@wikimedia.org",
 src:"wikimediafoundation.org/about/contact",
 p:"For the Wikimedia Foundation.\n\nWikipedia is the single most-used gift on the internet, and it is currently being consumed at industrial scale to train commercial models whose owners do not mention where the text came from. You gave it anyway, and would again."},

{s:"os", co:"the Rust Foundation", niv:"A", to:"Rust Foundation", em:"contact@rustfoundation.org",
 src:"foundation.rust-lang.org/contact",
 p:"For the Rust Foundation.\n\nA language given away, governed in the open, now underneath operating systems and browsers used by billions. The companies that depend on it most are not the ones paying for it."},

{s:"os", co:"the Free Software Foundation", niv:"A", to:"Free Software Foundation", em:"info@fsf.org",
 src:"fsf.org/about/contact",
 p:"For the Free Software Foundation.\n\nThe GPL is a legal instrument invented for one purpose: to make a gift impossible to take back. Whatever anyone thinks of the politics, that mechanism is why a large part of the world's software could not be enclosed, and it was given away too."},

{s:"os", co:"Creative Commons", niv:"A", to:"Creative Commons", em:"info@creativecommons.org",
 src:"creativecommons.org/about/contact",
 p:"For Creative Commons.\n\nYou built the licences that let everyone else give things away properly, and you gave those away as well. Billions of works are shareable because of infrastructure that charges nothing and is credited almost nowhere."},

{s:"os", co:"Debian", niv:"A", to:"the Debian Project", em:"press@debian.org",
 src:"debian.org/contact",
 p:"For the Debian Project.\n\nThe Social Contract is a promise, made in 1997 and kept since, that the system will remain free and that its users' interests come first. Thirty years of volunteers honouring a document nobody could have enforced."},

{s:"os", co:"KDE", niv:"A", to:"KDE e.V.", em:"press@kde.org",
 src:"kde.org/contact",
 p:"For KDE.\n\nA complete desktop, given away, maintained for decades by people who are not paid for it, on which a great deal of public-sector and educational computing quietly depends."},

{s:"os", co:"GitLab", niv:"B", to:"GitLab", em:"press@gitlab.com",
 src:"about.gitlab.com/press",
 p:"For GitLab.\n\nThe Community Edition is genuinely free and genuinely complete enough to run a company on, and your handbook — the entire operating manual of a public company — is published for anyone to copy. Very few companies give away how they work."},

{s:"os", co:"the OpenSSF", niv:"A", to:"Open Source Security Foundation", em:"pr@openssf.org",
 src:"openssf.org/about/contact",
 p:"For the OpenSSF.\n\nYou fund security work on software that everyone uses and nobody owns — the maintainers who hold up the supply chain and get noticed only when something breaks. Paying for other people's unglamorous work is giving in its least rewarded form."},

{s:"os", co:"Bluesky", niv:"B", to:"Bluesky", em:"press@blueskyweb.xyz",
 src:"bsky.social/about/support",
 p:"For Bluesky.\n\nThe AT Protocol is open, and it is designed so that people can leave you and take their identity and their followers with them. Building your own exit door is a gift to users at the direct expense of your own leverage."}
,
/* ---------- TECH / HARDWARE / SOFTWARE ---------- */
{s:"tech", co:"Bosch", niv:"C", to:"Stefan Hartung, CEO", em:"Christof.Ehrhart@de.bosch.com",
 src:"bosch-presse.de — Head of Communications",
 p:"For Stefan Hartung.\n\nNinety-four per cent of Bosch is owned by a charitable foundation. The dividends of one of the largest engineering companies on earth do not go to shareholders, because there effectively are none — they go to public health, education and research, and have since 1964. Almost nobody outside Germany knows this. It is the single largest structural act of giving by any company I have written to, and it is invisible."},

{s:"tech", co:"Siemens", niv:"C", to:"Roland Busch, CEO", em:"contact@siemens.com",
 src:"press.siemens.com",
 p:"For Roland Busch.\n\nSiemens Stiftung has funded education and basic services for decades, and the company has published engineering standards it could have kept closed. At your scale, giving is usually institutional and anonymous. gift.ceo asks for the opposite: one thing, your name on it."},

{s:"tech", co:"Adobe", niv:"C", to:"Shantanu Narayen, CEO", em:"adobepr@adobe.com",
 src:"news.adobe.com/contact-us",
 p:"For Shantanu Narayen.\n\nAdobe gave away PDF. The specification was released and became an ISO standard in 2008, which meant surrendering control of the most widely used document format in the world at the moment it was most valuable to own. Every government form, every contract, every invoice on earth runs on something your company handed to the public."},

{s:"tech", co:"Cloudflare", niv:"C", to:"Matthew Prince, CEO", em:"press@cloudflare.com",
 src:"cloudflare.com/press",
 p:"For Matthew Prince.\n\nProject Galileo protects human rights groups, journalists and election infrastructure for nothing, and has since 2014 — the customers least able to pay and most likely to be attacked. Add 1.1.1.1 and a free tier that a real business can actually run on, and you are giving away infrastructure at a scale most companies would call a business line."},

{s:"tech", co:"Canonical", niv:"B", to:"Mark Shuttleworth, CEO", em:"pr@canonical.com",
 src:"canonical.com/contact-us",
 p:"For Mark Shuttleworth.\n\nUbuntu was free, and for years you posted pressed CDs anywhere in the world, free, including postage, to people who had no way to download it. That was not a growth channel — it was the deliberate removal of the last barrier for people with no bandwidth and no money. A generation of engineers in places your competitors ignored started there."},

{s:"tech", co:"Atlassian", niv:"C", to:"Mike Cannon-Brookes & Scott Farquhar", em:"press@atlassian.com",
 src:"atlassian.com/company/contact",
 p:"For Mike Cannon-Brookes and Scott Farquhar.\n\nYou co-founded Pledge 1% — one per cent of equity, product and time, committed before the company was worth anything, and then you convinced thousands of other founders to do the same. Giving away your own idea about giving, so competitors could copy it, is the version that almost nobody does."},

{s:"tech", co:"Grafana Labs", niv:"B", to:"Raj Dutt, CEO", em:"press@grafana.com",
 src:"grafana.com/about/press",
 p:"For Raj Dutt.\n\nGrafana is free and it is on the wall of nearly every operations team in the world. You could have made the useful half proprietary at any point in the last decade and did not."},

{s:"tech", co:"Elastic", niv:"B", to:"Ash Kulkarni, CEO", em:"pr-team@elastic.co",
 src:"elastic.co/about/press",
 p:"For Ash Kulkarni.\n\nIn 2024 you moved Elasticsearch back to an open source licence. Companies almost never walk back a licence change in that direction — the pressure runs entirely the other way. Returning something to the commons after taking it out is rarer than giving it in the first place."},

{s:"tech", co:"Arm", niv:"C", to:"Rene Haas, CEO", em:"Global-PRteam@arm.com",
 src:"arm.com/company/contact-us",
 p:"For Rene Haas.\n\nYour architecture is in essentially every phone on the planet, which puts you in an unusual position: a decision you make about access changes what is possible for people who will never be your customers. That is leverage most CEOs do not have, and gift.ceo is a page for people who have it and use it."}
,
/* ---------- COMPANII COTATE LA BURSA ---------- */
{s:"listed", co:"Volvo", niv:"C", to:"Volvo Group", em:"press@volvo.com",
 src:"volvogroup.com — media relations",
 p:"For Volvo.\n\nIn 1959 Nils Bohlin designed the three-point seatbelt, and Volvo opened the patent to every other manufacturer for nothing. You held the most valuable safety patent of the century and gave it to your competitors on the reasoning that it was worth more in every car than in yours alone. The estimates run past a million lives. It is, by a distance, the best answer any company has ever given to the question gift.ceo asks, and it was given sixty-seven years ago by people who are no longer here to say so."},

{s:"listed", co:"Merck", niv:"C", to:"Merck & Co.", em:"mediarelations@merck.com",
 src:"merck.com/contact-us",
 p:"For Merck.\n\nIn 1987 you committed to donate Mectizan for river blindness — as much as needed, for as long as needed, to anyone who needed it, with no end date written anywhere. Nearly forty years and billions of treatments later that promise is still running, and a disease that blinded people across West Africa is close to gone. Almost no one under forty has heard of it."},

{s:"listed", co:"AstraZeneca", niv:"C", to:"AstraZeneca", em:"global-mediateam@astrazeneca.com",
 src:"astrazeneca.com/contact-us",
 p:"For AstraZeneca.\n\nYou supplied the COVID vaccine at cost through the pandemic while others priced to the market, and the majority of the doses went to lower-income countries. Whatever the arguments about what came after, the decision itself was taken at a moment when it could have gone the other way and would have earned billions."},

{s:"listed", co:"Ørsted", niv:"C", to:"Ørsted", em:"info@orsted.com",
 src:"orsted.com/en/contact-us",
 p:"For Ørsted.\n\nYou were a coal and oil company and you dismantled that business on purpose to build offshore wind, at a scale that made the technology cheap enough for everyone else to copy. Making your own hard-won engineering cheap for competitors is not usually described as giving. It should be."}

];
