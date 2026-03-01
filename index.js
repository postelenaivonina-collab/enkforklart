import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// Healthcheck (for deploy)
app.get("/healthcheck", (req, res) => res.status(200).send("ok"));

// Debug: sjekk om key finnes (viser ikke hele key)
app.get("/debug-key", (req, res) => {
  const key = process.env.OPENAI_API_KEY || "";
  const envNames = Object.keys(process.env).filter((k) =>
    k.toLowerCase().includes("openai")
  );
  res.json({
    hasKey: key.length > 0,
    keyPrefix: key.slice(0, 3), // "sk-"
    keyLength: key.length,
    envNames,
  });
});

// Vis chat-siden (index.html ligger i root)
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// Last systemprompt (fallback hvis fil mangler)
let systemPrompt = `
Du er ENKforklart – en profesjonell, vennlig og pedagogisk AI-assistent for ENK i Norge.

Svar alltid med strukturen:
Kort svar
Hva påvirkes (bank, resultat, MVA, egenkapital)
Hvorfor
Oppsummering
`;

try {
  const p = path.join(process.cwd(), "systemprompt.txt");
  systemPrompt = fs.readFileSync(p, "utf8");
} catch (e) {
  console.log("systemprompt.txt ikke funnet – bruker fallback");
}

app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message || "";
    const key = process.env.OPENAI_API_KEY || "";

    if (!key) {
      return res.json({
        reply:
          "FEIL: OPENAI_API_KEY mangler i dette miljøet. Legg den inn i Replit Secrets (🔒) for Run/Preview, og/eller Publishing → Production app secrets for deploy.",
      });
    }

    // Lag klient her (runtime)
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