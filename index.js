import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("ENKforklart agent kjører!");
});

app.post("/chat", async (req, res) => {
  const message = req.body.message;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Du er ENKforklart, en vennlig AI som forklarer regnskap enkelt for ENK i Norge."
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
});

app.listen(3000, () => {
  console.log("Server startet");
});