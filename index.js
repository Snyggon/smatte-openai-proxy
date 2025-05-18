import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.use(cors());
app.use(express.json());

app.post('/ask', async (req, res) => {
  const userInput = req.body.message;

  try {
    const threadRes = await axios.post('https://api.openai.com/v1/threads', {
      messages: [{ role: "user", content: userInput }]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      params: {
        assistant_id: ASSISTANT_ID
      }
    });

    const threadId = threadRes.data.id;

    await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      assistant_id: ASSISTANT_ID
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const msgRes = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    const message = msgRes.data.data.find(m => m.role === 'assistant');
    const reply = message?.content?.[0]?.text?.value || "Kunde inte hitta något svar.";

    res.json({ reply });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Något gick fel med OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxyservern körs på port ${PORT}`);
});
