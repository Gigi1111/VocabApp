import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

  
app.post('/lookup', async (req, res) => {
  const { word, difficulty } = req.body;

  if (!word) return res.status(400).json({ error: 'Missing word' });

  
  try {
    const difficultyText =
    difficulty === 'beginner' ? 'use very simple language suitable for beginner learners' :
    difficulty === 'moderate' ? 'use medium complexity language, suitable for intermediate learners' :
    'form a sentence that is more elegant and use harder but still fluent expressions';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `
          You are a German teacher. When given a word or a multi-word phrase in German:
            - Return a JSON object with "base", "pos", "gender", "meaning", "example".
            - If the input is a phrase, treat it as a single unit and explain the phrase meaning.
            - Include the word/phrase in base form and its gender if it's a noun.

          - "base": the correct base form of the word(s) (singular for nouns, infinitive for verbs), and if it's multi-words, find the verb and return it to base form
          - "pos": judge Part of Speech as one of these categories: noun, verb, adjective, adverb, phrase.
          - "gender": "der", "die", "das" if it is a noun, otherwise null
          - "meaning": the English meaning
          - "example": a German sentence using the word correctly, ${difficultyText}
          - "exampleTranslated": an English translation of the German sentence you generated as "example"
          
          Respond **ONLY** with JSON, no extra text, no markdown fences.
          ` },
          { role: 'user', content: `Word: ${word}` }
        ]
      })
    });
    console.log("difficultyText: ", difficultyText);
    const data = await response.json();

    if (!data.choices || !data.choices[0].message) {
      return res.status(500).json({ error: 'Invalid GPT response', data });
    }

    res.json(data.choices[0].message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----- Generate text route -----
app.post('/generate-text', async (req, res) => {
    const { words, minWords, maxWords } = req.body;
  
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ error: 'Invalid words' });
    }
  
    try {
      // Prompt GPT to return both German text and English translation
      const prompt = `
        Generate a coherent text in German using the following words: ${words.join(', ')}.
        The text should be between ${minWords} and ${maxWords} words.
        After the German text, provide an English translation.
        Respond in JSON format like this:
        {
          "german": "…",
          "english": "…"
        }
        No extra text, no markdown, only valid JSON.
      `;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a German teacher and translator.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
  
      const data = await response.json();
  
      if (!data.choices || !data.choices[0].message?.content) {
        return res.status(500).json({ error: 'Invalid GPT response', data });
      }
  
      // Parse GPT JSON response
      let jsonResult;
      try {
        jsonResult = JSON.parse(data.choices[0].message.content);
      } catch {
        return res.status(500).json({ error: 'GPT did not return valid JSON', raw: data.choices[0].message.content });
      }
      console.log("jsonResult:", jsonResult);
      res.json({
        german: jsonResult.german,
        english: jsonResult.english,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
