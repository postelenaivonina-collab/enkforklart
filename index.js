import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// last systemprompt fra fil
const systemPrompt = fs.readFileSync(path.join(process.cwd(), "systemprompt.txt"), "utf8");

// OpenAI klient
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// vis chat-siden
app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.json({
      reply: "Beklager, det oppstod en feil. Prøv igjen."
    });
  }
});

// start server
app.listen(3000, () => {
  console.log("ENKforklart server startet");
});