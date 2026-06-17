import "dotenv/config";

function valgfri(navn: string, fallback = ""): string {
  return process.env[navn] ?? fallback;
}

export const config = {
  PORT: Number(process.env.PORT ?? 4000),

  // Offentlig URL — brukes i e-post og lenker
  PUBLIC_URL: valgfri("PUBLIC_URL", "http://localhost:4000"),

  // SMTP (samme oppsett som sabi-apartment)
  SMTP_HOST: valgfri("SMTP_HOST"),
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: valgfri("SMTP_USER"),
  SMTP_PASS: valgfri("SMTP_PASS"),

  // Avsender og mottaker
  MAIL_FROM: valgfri("MAIL_FROM", "Quad AS <invest@quad.no>"),
  MAIL_TO: valgfri("MAIL_TO", "invest@quad.no"),
};

// Sann hvis vi har nok til å sende e-post
export const smtpKonfigurert = Boolean(
  config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS
);
