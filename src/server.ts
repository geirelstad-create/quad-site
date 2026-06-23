import express from "express";
import helmet from "helmet";
import multer from "multer";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { sendKontakt, sendPitch } from "./mailer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

// ---------- Spam-vern (usynlig for ekte brukere) ----------
// Returnerer en grunn hvis innsendingen ser ut som spam, ellers null.
function spamGrunn(body: Record<string, any>, tekstfelt: string[]): string | null {
  // 1) Honeypot: et skjult felt "website" som mennesker aldri ser.
  //    Bots fyller det ofte ut automatisk.
  if (body.website && String(body.website).trim() !== "") {
    return "honeypot";
  }

  // 2) Tidssperre: skjemaet sender et skjult tidsstempel (ms) fra da siden lastet.
  //    Sendes det under 3 sekunder etter lasting, er det nesten garantert en bot.
  const lastet = Number(body.lastet_ts);
  if (Number.isFinite(lastet) && lastet > 0) {
    const brukt = Date.now() - lastet;
    if (brukt < 3000) return "for-raskt";
    if (brukt > 1000 * 60 * 60 * 6) return "for-gammelt"; // 6t: utløpt/forfalsket
  }

  // 3) Innholdssjekk: avvis tekstfelt som ser ut som tilfeldige tegnstrenger.
  //    Ekte tekst har mellomrom og vokaler; "bdrLNZJTlWk" har ingen av delene.
  for (const navn of tekstfelt) {
    const v = String(body[navn] || "").trim();
    if (!v) continue;
    if (v.length >= 8) {
      const harMellomrom = /\s/.test(v);
      const vokalandel = (v.match(/[aeiouyæøåAEIOUYÆØÅ]/g) || []).length / v.length;
      // Lang streng helt uten mellomrom OG nesten uten vokaler = søppel
      if (!harMellomrom && vokalandel < 0.15) return "tegnsalat:" + navn;
    }
  }
  return null;
}

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false, // enkel statisk side; CSP kan strammes senere
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Filopplasting: maks 10 MB, kun ett vedlegg, trygge typer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/pdf",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, ok.includes(file.mimetype));
  },
});

// ---------- Kontaktskjema ----------
const kontaktSkjema = z.object({
  navn: z.string().min(1).max(200),
  epost: z.string().email().max(200),
  melding: z.string().min(1).max(5000),
});

app.post("/api/kontakt", async (req, res) => {
  // Spam-vern: later som det gikk bra (200) så boten ikke prøver på nytt
  const grunn = spamGrunn(req.body, ["navn", "melding"]);
  if (grunn) {
    console.log("Kontakt avvist (spam):", grunn);
    return res.json({ ok: true });
  }
  const r = kontaktSkjema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ feil: "Ugyldige felter" });
  try {
    await sendKontakt(r.data);
    res.json({ ok: true });
  } catch (e) {
    console.error("Kontakt-feil:", e);
    res.status(502).json({ feil: "Kunne ikke sende meldingen. Prøv igjen senere." });
  }
});

// ---------- Investor-/pitch-skjema ----------
const pitchSkjema = z.object({
  selskap: z.string().min(1).max(200),
  nettside: z.string().max(200).optional(),
  bransje: z.string().min(1).max(120),
  stadie: z.string().min(1).max(80),
  grunnlagt: z.string().max(20).optional(),
  ansatte: z.string().max(20).optional(),
  kontaktperson: z.string().min(1).max(200),
  rolle: z.string().max(120).optional(),
  epost: z.string().email().max(200),
  telefon: z.string().max(40).optional(),
  omsetning: z.string().max(80).optional(),
  vekst: z.string().max(80).optional(),
  kunder: z.string().max(120).optional(),
  lonnsomhet: z.string().max(80).optional(),
  sokt_belop: z.string().max(80).optional(),
  finansiering_hittil: z.string().max(80).optional(),
  bruk_av_kapital: z.string().max(2000).optional(),
  team: z.string().max(3000).optional(),
  sammendrag: z.string().min(1).max(5000),
});

app.post("/api/pitch", upload.single("vedlegg"), async (req, res) => {
  const grunn = spamGrunn(req.body, ["selskap", "kontaktperson", "sammendrag"]);
  if (grunn) {
    console.log("Pitch avvist (spam):", grunn);
    return res.json({ ok: true });
  }
  const r = pitchSkjema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ feil: "Ugyldige felter" });
  try {
    const f = req.file;
    const vedlegg = f
      ? { filename: f.originalname, content: f.buffer, contentType: f.mimetype }
      : undefined;
    await sendPitch(r.data, vedlegg);
    res.json({ ok: true });
  } catch (e) {
    console.error("Pitch-feil:", e);
    res.status(502).json({ feil: "Kunne ikke sende henvendelsen. Prøv igjen senere." });
  }
});

// ---------- Statiske sider + pene URL-er ----------
app.use(express.static(PUBLIC, { extensions: ["html"] }));
app.get("/healthz", (_req, res) => res.send("ok"));

app.listen(config.PORT, () =>
  console.log(`Quad-nettstedet kjører på :${config.PORT}`)
);
