# Quad AS — flytte til GitHub/Render med e-post bevart

To uavhengige nettsteder under samme domene, hostet på Render, mens domene og **e-post forblir hos Domeneshop**:

- **quad.no** (+ `www`) → selskapssider (forside, om, søk kapital, kontakt) med skjema-backend
- **invest.quad.no** → innlogget investeringsoversikt (egen tjeneste)

Domenet blir værende registrert hos Domeneshop. Vi endrer bare hvor `quad.no` og `invest.quad.no` *peker*. MX-postene (e-post) røres ikke, så `geir@quad.no` / `invest@quad.no` fortsetter uforstyrret.

---

## Viktigst av alt: ikke rør e-posten

E-posten din styres av **MX-postene** i DNS hos Domeneshop. Regelen er enkel:

> Behold domeneregistrering og navnetjenere hos Domeneshop. Endre kun A/CNAME-postene for selve nettstedet. La MX stå.

Så lenge du følger DNS-stegene nedenfor (som bare rører nettsted-postene), kan e-posten ikke påvirkes. Ikke bytt navnetjenere, og ikke flytt domenet.

---

## Del A — Publiser quad.no (Web Service med skjema-backend)

quad.no er nå en liten **Express + Nodemailer-tjeneste** — samme stack som sabi-apartment/kragerokontor. Den serverer de statiske sidene *og* håndterer to skjemaer (kontakt + søk kapital), som sender e-post via SMTP og bekreftelse til avsenderen.

Filer i `quad-site/`:
- `public/` — sidene (`index.html`, `om.html`, `sok-kapital.html`, `kontakt.html`, `stil.css`)
- `src/server.ts` — Express-server: statiske sider + `/api/kontakt` + `/api/pitch`
- `src/mailer.ts` — Nodemailer; videresending + bekreftelse for begge skjemaer
- `src/config.ts` — miljøvariabler
- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`

1. Legg `quad-site/` i et GitHub-repo.
2. På **render.com** → **New** → **Web Service** → velg repoet.
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
3. Fyll inn miljøvariablene (Del A.1 under).
4. Deploy. Test på Render-URL-en (f.eks. `quad-no.onrender.com`) at sidene vises og at et test-skjema kommer frem.

### A.1 — Miljøvariabler i Render
Samme SMTP som sabi-apartment. De faktiske verdiene for `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` finner du i Render → din sabi-apartment-tjeneste → **Environment** (de er ikke synlige for meg, fordi de ligger som hemmeligheter der).

```
PUBLIC_URL=https://www.quad.no
SMTP_HOST=smtp.domeneshop.no   (bekreft mot sabi-apartment)
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<fra sabi-apartment>
SMTP_PASS=<fra sabi-apartment>
MAIL_FROM=Quad AS <invest@quad.no>
MAIL_TO=invest@quad.no
```

> **Uten SMTP** kjører siden fint, men skjemaene logger bare og sender ingen e-post. Med SMTP på plass går både henvendelsen til `invest@quad.no` og en bekreftelse til avsenderen.

### Skjemaene
- **Kontakt** (`/api/kontakt`): navn, e-post, melding → e-post til Quad + bekreftelse til avsender.
- **Søk kapital** (`/api/pitch`): selskap, kontakt, bransje, fase, kapital/økonomi, sammendrag og **pitch-vedlegg** (PDF/PowerPoint/Word, maks 10 MB) → e-post til Quad med vedlegg + bekreftelse til avsender.

Vil du legge til flere skjemaer senere, er mønsteret det samme: nytt endepunkt i `server.ts`, ny funksjon i `mailer.ts`.

## Del B — Publiser investeringsoversikten (invest.quad.no)

Dette er tjenesten fra `quad-invest/` (egen mappe/repo). Følg `OPPSETT.md` i den mappen: Azure-appregistrering, `DRIVE_ID`/`ITEM_ID`, og deploy som **Web Service** på Render med miljøvariablene. Den er ferdig bygget og testet.

## Del C — Koble domenet hos Domeneshop

Du har to verter å peke. Begge gjøres i Domeneshop under fanen **DNS-pekere**.

### 1. invest.quad.no → investeringstjenesten
- I Render (web service `quad-invest`) → Settings → Custom Domains → legg til `invest.quad.no`. Render gir en CNAME-verdi.
- I Domeneshop → **DNS-pekere** → ny post:
  ```
  Type:   CNAME
  Navn:   invest
  Peker:  quad-invest.onrender.com   (verdien Render oppgir)
  ```

### 2. quad.no + www → de statiske sidene
- I Render (static site `quad-no`) → Settings → Custom Domains → legg til både `quad.no` og `www.quad.no`. Render viser hva hver skal peke på.
- Et toppdomene (`quad.no` uten `www`) kan ikke være CNAME. Render oppgir derfor enten en **A-post** (en IP) for `quad.no`, eller anbefaler at du bruker `www` som hovedadresse. Vanlig oppsett i Domeneshop → **DNS-pekere**:
  ```
  # toppdomenet
  Type:  A
  Navn:  @            (eller tomt = quad.no)
  Peker: <IP fra Render>

  # www
  Type:  CNAME
  Navn:  www
  Peker: quad-no.onrender.com
  ```
  Følg de eksakte verdiene Render viser i Custom Domains-panelet — de er autoritative.

> Hvis Domeneshop ikke tillater A-post på toppdomenet mot ekstern IP, er alternativet å sette `www.quad.no` som primær (CNAME) og slå på Domeneshop sin **WWW-videresending** (egen fane i panelet) fra `quad.no` til `www.quad.no`.

### 3. La MX stå
Ikke slett eller endre eksisterende **MX**-poster. De holder e-posten i gang.

---

## Rekkefølge som gir null nedetid

1. Deploy begge tjenestene på Render og test på `*.onrender.com`-URL-ene. Den gamle quad.no lever fortsatt hos Domeneshop imens.
2. Legg til Custom Domains i Render (begge tjenester).
3. Endre DNS-pekerne i Domeneshop som over. La MX stå.
4. Vent på DNS-spredning (minutter til et par timer). Render utsteder TLS-sertifikater automatisk.
5. Verifiser `https://quad.no`, `https://www.quad.no` og `https://invest.quad.no`. Send en test-e-post til deg selv for å bekrefte at posten fortsatt kommer frem.
6. Når alt virker, kan du eventuelt si opp webhotell-delen hos Domeneshop — men **behold domene + e-post-abonnementet**. Sjekk hva som er bundlet før du sier opp noe.

---

## Innhold du kan justere

Teksten på den gamle siden vekslet mellom «Quad AS» og «Quad Invest AS». Jeg har brukt **Quad AS** overalt. Vil du ha «Quad Invest AS», er det søk-og-erstatt i de tre HTML-filene.
- Logoen er gjenskapt som SVG (skarp i alle størrelser, ingen bildefil). Vil du heller bruke din egen PNG-logo, bytt `<svg>…</svg>` i toppen av hver side med `<img src="/logo.png" …>` og legg filen i `public/`.
- Kortillustrasjonene på forsiden er enkle SVG-grafikker i samme palett. Vil du ha foto i stedet, kan jeg bytte dem.
