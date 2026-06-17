import nodemailer from "nodemailer";
import { config, smtpKonfigurert } from "./config.js";

const transporter = smtpKonfigurert
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE, // false for STARTTLS på 587
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  : null;

type Vedlegg = { filename: string; content: Buffer; contentType?: string };

async function send(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: Vedlegg[];
}) {
  if (!transporter) {
    console.warn("SMTP ikke konfigurert — e-post ikke sendt:", opts.subject);
    return;
  }
  await transporter.sendMail({
    from: config.MAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  });
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- Kontaktskjema ----------
export async function sendKontakt(d: {
  navn: string; epost: string; melding: string;
}) {
  const tekst =
    `Ny henvendelse fra kontaktskjemaet på quad.no\n\n` +
    `Navn: ${d.navn}\nE-post: ${d.epost}\n\nMelding:\n${d.melding}\n`;
  const html =
    `<h2 style="font-family:Georgia,serif">Ny henvendelse — kontakt</h2>` +
    `<p><strong>Navn:</strong> ${esc(d.navn)}<br>` +
    `<strong>E-post:</strong> ${esc(d.epost)}</p>` +
    `<p><strong>Melding:</strong><br>${esc(d.melding).replace(/\n/g, "<br>")}</p>`;

  // Til Quad
  await send({
    to: config.MAIL_TO,
    replyTo: d.epost,
    subject: `Kontakt fra quad.no — ${d.navn}`,
    text: tekst, html,
  });
  // Bekreftelse til avsender
  await send({
    to: d.epost,
    subject: "Vi har mottatt din henvendelse — Quad AS",
    text:
      `Hei ${d.navn},\n\nTakk for at du tok kontakt med Quad AS. ` +
      `Vi har mottatt meldingen din og svarer så snart vi kan.\n\n` +
      `Med vennlig hilsen\nQuad AS\ninvest@quad.no`,
    html:
      `<p>Hei ${esc(d.navn)},</p>` +
      `<p>Takk for at du tok kontakt med Quad AS. Vi har mottatt meldingen din og svarer så snart vi kan.</p>` +
      `<p>Med vennlig hilsen<br>Quad AS<br>invest@quad.no</p>`,
  });
}

// ---------- Investor-/pitch-skjema ----------
export type PitchData = {
  selskap: string; kontaktperson: string; epost: string; telefon?: string;
  nettside?: string; bransje: string; stadie: string; sokt_belop?: string;
  omsetning?: string; finansiering_hittil?: string; bruk_av_kapital?: string;
  sammendrag: string;
};

export async function sendPitch(d: PitchData, vedlegg?: Vedlegg) {
  const rader: [string, string | undefined][] = [
    ["Selskap", d.selskap],
    ["Kontaktperson", d.kontaktperson],
    ["E-post", d.epost],
    ["Telefon", d.telefon],
    ["Nettside", d.nettside],
    ["Bransje", d.bransje],
    ["Fase", d.stadie],
    ["Søkt kapital", d.sokt_belop],
    ["Omsetning siste 12 mnd", d.omsetning],
    ["Reist kapital hittil", d.finansiering_hittil],
    ["Bruk av kapital", d.bruk_av_kapital],
  ];
  const synlige = rader.filter(([, v]) => v && String(v).trim());

  const tekst =
    `Ny investeringshenvendelse fra quad.no\n\n` +
    synlige.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nSammendrag:\n${d.sammendrag}\n` +
    (vedlegg ? `\nVedlegg: ${vedlegg.filename}\n` : "");

  const html =
    `<h2 style="font-family:Georgia,serif">Ny investeringshenvendelse</h2>` +
    `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
    synlige.map(([k, v]) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#6b7d7d">${esc(k)}</td>` +
      `<td style="padding:4px 0"><strong>${esc(String(v))}</strong></td></tr>`
    ).join("") +
    `</table>` +
    `<p style="margin-top:16px"><strong>Sammendrag:</strong><br>${esc(d.sammendrag).replace(/\n/g, "<br>")}</p>` +
    (vedlegg ? `<p><em>Vedlegg: ${esc(vedlegg.filename)}</em></p>` : "");

  // Til Quad (med vedlegg)
  await send({
    to: config.MAIL_TO,
    replyTo: d.epost,
    subject: `Investeringshenvendelse — ${d.selskap}`,
    text: tekst, html,
    attachments: vedlegg ? [vedlegg] : undefined,
  });

  // Bekreftelse til avsender (uten vedlegg)
  await send({
    to: d.epost,
    subject: "Vi har mottatt din henvendelse — Quad AS",
    text:
      `Hei ${d.kontaktperson},\n\n` +
      `Takk for at dere tok kontakt med Quad AS angående ${d.selskap}. ` +
      `Vi har mottatt henvendelsen og går gjennom materialet. ` +
      `Dersom det er aktuelt for oss, tar vi kontakt for en videre samtale.\n\n` +
      `Med vennlig hilsen\nQuad AS\ninvest@quad.no`,
    html:
      `<p>Hei ${esc(d.kontaktperson)},</p>` +
      `<p>Takk for at dere tok kontakt med Quad AS angående <strong>${esc(d.selskap)}</strong>. ` +
      `Vi har mottatt henvendelsen og går gjennom materialet. Dersom det er aktuelt for oss, tar vi kontakt for en videre samtale.</p>` +
      `<p>Med vennlig hilsen<br>Quad AS<br>invest@quad.no</p>`,
  });
}
