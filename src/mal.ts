// Enkel malmotor: fyller HTML-sidene i public/ med tekst fra public/innhold.json
//
//   {{sti.til.tekst}}           -> tekst (HTML-escapet)
//   {{#sti.til.liste}} … {{/sti.til.liste}}  -> gjentas for hvert element
//       inne i en liste: {{.}} = elementet (streng), {{.felt}} = felt på elementet
//
import fs from "fs";
import path from "path";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\n/g, "<br>");
}

function hent(obj: any, sti: string, lokal: any): any {
  if (sti === ".") return lokal;
  if (sti.startsWith(".")) return sti.slice(1).split(".").reduce((o, k) => (o == null ? o : o[k]), lokal);
  return sti.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function fyll(mal: string, data: any, lokal: any = null): string {
  // Lister først (kan være nøstet)
  mal = mal.replace(/\{\{#([\w.]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, sti, kropp) => {
    const liste = hent(data, sti, lokal);
    if (!Array.isArray(liste)) return "";
    return liste.map((el) => fyll(kropp, data, el)).join("");
  });
  // Enkeltverdier
  return mal.replace(/\{\{([\w.]+)\}\}/g, (_m, sti) => esc(hent(data, sti, lokal)));
}

export function lesInnhold(publicDir: string): any {
  const p = path.join(publicDir, "innhold.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
