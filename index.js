import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

fs.mkdirSync("logs", { recursive: true });
fs.appendFileSync("logs/chatlog.jsonl", "", "utf8");

function logEvent(event) {
  try {
    const logDir = path.join(process.cwd(), "logs");

    // opprett mappen hvis den ikke finnes
    fs.mkdirSync(logDir, { recursive: true });

    console.log("Logger til:", logDir);

    const line = JSON.stringify(event) + "\n";

    fs.appendFileSync(path.join(logDir, "chatlog.jsonl"), line, "utf8");

    console.log("Log skrevet");
  } catch (e) {
    console.error("LOGGING FEIL:", e);
  }
}

console.log("BOOT: starter app...");
logEvent({
  type: "server_start",
  time: new Date().toISOString()
});
process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));

const app = express();
app.use(express.json());
app.use(express.static(process.cwd()));

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
    const requestId = Math.random().toString(16).slice(2);
    const startedAt = Date.now();

    logEvent({
      type: "chat_request",
      requestId,
      time: new Date().toISOString(),
      message,
      userAgent: req.headers["user-agent"] || "",
    });

    const key = process.env.OPENAI_API_KEY || "";
    if (!key) {
      return res.json({
        reply:
          "FEIL: OPENAI_API_KEY mangler. Legg den inn i Secrets (Run) og Production app secrets (Publish).",
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

    const reply = completion.choices[0].message.content;

    logEvent({
      type: "chat_response",
      requestId,
      time: new Date().toISOString(),
      ms: Date.now() - startedAt,
      replyPreview: reply.slice(0, 200),
    });

    res.json({ reply });
  } catch (error) {
    console.error("CHAT ERROR:", error);

    logEvent({
      type: "chat_error",
      time: new Date().toISOString(),
      message: error?.message || "ukjent feil",
    });

    res.json({ reply: "FEIL: " + (error?.message || "ukjent feil") });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("ENKforklart server startet på port", PORT);
});
app.get("/logs", (req, res) => {
  try {
    const file = fs.readFileSync("logs/chatlog.jsonl", "utf8");
    res.type("text").send(file);
  } catch (e) {
    res.send("Ingen logs enda");
  }
});
app.get("/questions", (req, res) => {
  try {
    const file = fs.readFileSync("logs/chatlog.jsonl", "utf8");

    const questions = file
      .split("\n")
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(item => item && item.type === "chat_request")
      .map(item => `${item.time} - ${item.message}`);

    res.type("text").send(questions.join("\n\n") || "Ingen spørsmål enda");
  } catch (e) {
    res.send("Ingen spørsmål enda");
  }
});
