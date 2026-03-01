import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

console.log("BOOT: starter app...");
process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));

const app = express();
app.use(express.json());

// Healthcheck må aldri feile (for Replit Publish)
app.get("/healthcheck", (req, res) => res.status(200).send("ok"));

// Debug for å se om key finnes (viser ikke hele key)
app.get("/debug-key", (req, res) => {
  const key = process.env.OPENAI_API_KEY || "";
  res.json({
    hasKey: key.length > 0,
    keyPrefix: key.slice(0, 3),
    keyLength: key.length,
  });
});

// Server index.html
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// Systemprompt (fallback hvis fil mangler)
let systemPrompt = `
Du er ENKforklart. Svar alltid med:
Kort svar
Hva påvirkes (bank, resultat, MVA, egenkapital)
Hvorfor
Oppsummering
`;

try {
  systemPrompt = fs.readFileSync(path.join(process.cwd(), "systemprompt.txt"), "utf8");
} catch (e) {
  console.log("systemprompt.txt ikke funnet – bruker fallback");
}

app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message || "";
    const key = process.env.OPENAI_API_KEY || "";

    if (!key) {
      return res.json({
        reply: "FEIL: OPENAI_API_KEY mangler. Legg den inn i Secrets (Run) og Production app secrets (Publish).",
      });
    }

    const client = new OpenAI({ apiKey: key });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.json({ reply: "FEIL: " + (error?.message || "ukjent feil") });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("ENKforklart server startet på port", PORT);
});