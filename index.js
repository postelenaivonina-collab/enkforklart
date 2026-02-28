import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// 1) Healthcheck FIRST (må aldri feile)
app.get("/healthcheck", (req, res) => {
  res.status(200).send("ok");
});
app.get("/debug-key", (req, res) => {
  const key = process.env.OPENAI_API_KEY || "";
  res.json({
    hasKey: key.length > 0,
    keyPrefix: key.slice(0, 3),   // skal være "sk-"
    keyLength: key.length
  });
});
// 2) Vis chat-siden
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// 3) Les systemprompt trygt (fallback hvis fil mangler)
let systemPrompt = `
Du er ENKforklart – en profesjonell, vennlig og pedagogisk AI-assistent for ENK i Norge.
Svar alltid med: Kort svar / Hva påvirkes / Hvorfor / Oppsummering.
`;

try {
  systemPrompt = fs.readFileSync(path.join(process.cwd(), "systemprompt.txt"), "utf8");
} catch (e) {
  console.log("Fant ikke systemprompt.txt i deploy, bruker fallback.");
}

// 4) OpenAI klient (må ha secret OPENAI_API_KEY i Replit Secrets)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

console.log("API KEY EXISTS:", !!process.env.OPENAI_API_KEY);

// 5) Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message || "";

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

// 6) Riktig port for deploy
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("ENKforklart server startet på port", PORT));