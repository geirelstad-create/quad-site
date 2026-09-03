# Redigere teksten på quad.no

All tekst på nettsiden ligger i **én fil**: `public/innhold.json`.

## Slik endrer du tekst
1. Åpne repoet på GitHub og gå til `public/innhold.json`.
2. Klikk blyanten («Edit this file») øverst til høyre.
3. Endre teksten mellom anførselstegnene. La komma, klammer og anførselstegn stå.
4. Klikk **Commit changes**. Render bygger og publiserer automatisk – siden er oppdatert etter 1–2 minutter.

Tips
- Linjeskift i en tekst skrives som `\n`.
- Lister (områder, prinsipper, kriterier, steg, fakta) kan få flere eller færre elementer – kopier et helt element inkl. klammene `{ … }` og husk komma mellom dem.
- Skriver du feil (f.eks. mangler et komma), feiler siden ved oppstart. Render viser feilen i loggen, og forrige versjon fortsetter å kjøre til du retter det. GitHub markerer også JSON-feil med rødt i editoren.

## Filer
- `public/innhold.json` – all tekst
- `public/index.html`, `investeringer.html`, `om.html`, `sok-kapital.html`, `kontakt.html` – sidenes oppbygning (maler med `{{felt}}`)
- `public/stil.css` – design (farger, typografi)
- `public/bilder/` – logo og ikon
- `src/server.ts` – Express-server: fyller malene med innhold + skjema-API (`/api/kontakt`, `/api/pitch`)
- `src/mal.ts` – den lille malmotoren
- `src/mailer.ts`, `src/config.ts` – e-postutsending (uendret bortsett fra navnet Quad Invest AS)

## Miljøvariabler i Render
Som før (se `.env.example`): `PUBLIC_URL`, `SMTP_*`, `MAIL_FROM`, `MAIL_TO`. Standardverdien for `MAIL_FROM` er nå «Quad Invest AS <invest@quad.no>» – oppdater verdien i Render hvis den er satt eksplisitt der.

## Portefølje
Selskapene ligger i `innhold.json` under `portefolje.selskaper` (navn, url, bransje, år, logo, beskrivelse).
- Uten logo vises selskapsnavnet som tekst.
- For å vise logo: legg filen (SVG eller PNG med gjennomsiktig bakgrunn) i `public/bilder/portefolje/` og skriv filnavnet i feltet `"logo"`, f.eks. `"visuado.svg"`. Logoen gjengis automatisk i hvitt, så alle får samme uttrykk.
- Legg til eller fjern selskaper ved å kopiere/slette et helt element `{ … }` i listen.
