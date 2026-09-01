import json
rows = json.load(open('de_trimis.json'))

CORP = """Mă numesc Bogdan Tănase. Sunt din Roman, locuiesc în Elveția și am construit rotabo.app.

Ideea e simplă. Într-un oraș, în orice zi, cineva are nevoie de ceva concret: un om care să-l ducă la spital, un meseriaș pentru o țeavă spartă, cineva care să stea câteva ore cu un bătrân, o traducere pentru un act. Și tot în acel oraș există cineva care poate face exact acel lucru, dar nu are cum să fie găsit. Nu lipsește nici nevoia, nici omul. Lipsește doar locul în care se văd unul pe celălalt.

Rotabo este acel loc. Cine are nevoie scrie ce caută. Cine poate ajuta scrie ce oferă: o meserie, timp, unelte, un mijloc de transport. Se găsesc direct și se înțeleg între ei, fără intermediar. Înscrierea și publicarea sunt gratuite, anunțul rămâne vizibil 12 luni, iar platforma nu reține niciun comision din ceea ce câștigă omul care muncește.

Ajunge cel mai bine exact la oamenii care altfel nu au cum să fie găsiți: pensionarul care are nevoie de un drum, tânărul cu o meserie și fără clienți, femeia care poate îngriji câteva ore pe zi. Funcționează direct în browser, fără descărcare din App Store sau Google Play, deci și pe un telefon vechi.

Primăria Municipiului Roman, județul Neamț, a analizat inițiativa și a aprobat afișarea gratuită a 6 afișe informative pe panourile publice de informare, apreciind caracterul practic și comunitar al proiectului. Precizez, pentru evitarea oricărui echivoc și potrivit solicitării exprese a instituției, că acel sprijin are caracter strict informativ și nu reprezintă o recomandare, o certificare, o acreditare, o autorizare sau o garanție privind platforma.

Vă adresez aceeași solicitare: acordul de a afișa un număr de afișe informative pe panourile publice de informare aflate în administrarea dumneavoastră.

Pentru instituție nu presupune nimic:

- materialul grafic final, gata de tipar, se descarcă de la adresa de mai jos, în trei formate — A4, A3 (297 × 420 mm) și A2 (420 × 594 mm) — fișiere PDF, fără înregistrare și fără cont;
- nu se alocă fonduri publice, nu se achiziționează servicii, nu se încheie contract și nu se creează nicio obligație financiară;
- materialul nu conține numele, sigla sau identitatea vizuală a instituției;
- sprijinul acordat nu va fi prezentat drept recomandare, certificare, acreditare, autorizare sau garanție.

Îmi asum integral, pe proprie răspundere: corectitudinea și caracterul actual al informațiilor din material, precum și funcționarea adresei rotabo.app; respectarea legislației privind protecția datelor cu caracter personal, drepturile de autor și mărcile; relația exclusivă cu utilizatorii platformei, inclusiv eventualele sesizări sau reclamații; informarea instituției dacă materialul afișat devine neactual.
"""

SEMN = """Vă mulțumesc pentru timpul acordat.

Cu considerație,
Bogdan Tănase
Rotabo — rotabo.app
bogdan.tanase.ch@gmail.com"""

def institutie(r):
    u = (r.get('uat') or '').upper()
    if r['oras'] == 'București': return 'Primăria Municipiului București'
    if u.startswith('ORAS') or u.startswith('ORAŞ') or u.startswith('ORAȘ'):
        return f"Primăria Orașului {r['oras']}"
    return f"Primăria Municipiului {r['oras']}"

out=[]
for r in rows:
    inst = institutie(r)
    body = (f"Către {inst}\n"
            "În atenția Compartimentului Comunicare / Relații cu Publicul\n\n"
            "Stimată doamnă primar, stimate domnule primar,\n\n"
            + CORP + "\n"
            "Afișul poate fi văzut și descărcat aici:\nhttps://rotabo.app/afise.html\n\n"
            f"Dacă apreciați că inițiativa este utilă cetățenilor din {r['oras']}, vă rog "
            "să îmi comunicați numărul de afișe pe care îl considerați potrivit și formatul "
            "preferat.\n\n" + SEMN)
    out.append({**r, 'institutie': inst,
        'subiect': "Solicitare de afișare material informativ — platforma rotabo.app, fără costuri pentru instituție",
        'body': body})
json.dump(out, open('scrisori.json','w'), ensure_ascii=False, indent=1)
print("generate:", len(out))
print("=== EXEMPLU 1 ===");  print(out[0]['institutie'],'->',out[0]['email'])
print("=== EXEMPLU 36 (oras, nu municipiu) ==="); print(out[35]['institutie'],'->',out[35]['email'])
print()
print(out[35]['body'][:400])
print("...")
print("lungime corp:", len(out[0]['body']), "caractere")
