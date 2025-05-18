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
    // Skapa tråd
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

    // Starta run
    await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      assistant_id: ASSISTANT_ID
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Vänta på svar (t.ex. 6 sekunder för säkerhets skull)
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Hämta meddelanden
    const msgRes = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    const message = msgRes.data.data.find(m => m.role === 'assistant');
    let reply = "Kunde inte hämta något svar.";

    if (message?.content?.length > 0 && message.content[0].type === "text") {
      reply = message.content[0].text.value;
    }

    res.json({ reply });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Något gick fel med OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxyservern körs på port ${PORT}`);
});
