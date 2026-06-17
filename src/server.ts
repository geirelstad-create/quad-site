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
  kontaktperson: z.string().min(1).max(200),
  epost: z.string().email().max(200),
  telefon: z.string().max(40).optional(),
  nettside: z.string().max(200).optional(),
  bransje: z.string().min(1).max(120),
  stadie: z.string().min(1).max(60),
  sokt_belop: z.string().max(60).optional(),
  omsetning: z.string().max(60).optional(),
  finansiering_hittil: z.string().max(60).optional(),
  bruk_av_kapital: z.string().max(2000).optional(),
  sammendrag: z.string().min(1).max(5000),
});

app.post("/api/pitch", upload.single("vedlegg"), async (req, res) => {
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
