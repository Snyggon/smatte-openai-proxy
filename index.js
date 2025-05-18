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
    // 1. Skapa en ny tråd
    const thread = await axios.post('https://api.openai.com/v1/threads', {}, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const threadId = thread.data.id;

    // 2. Lägg till meddelandet i tråden
    await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      role: "user",
      content: userInput
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    // 3. Starta run med assistant_id
    const run = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      assistant_id: ASSISTANT_ID
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const runId = run.data.id;

    // 4. Vänta tills run är klar (polling)
    let status = 'in_progress';
    let attempts = 0;
    while (status === 'in_progress' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const runStatus = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      status = runStatus.data.status;
      attempts++;
    }

    if (status !== 'completed') {
      return res.status(500).json({ error: 'Run did not complete in time.' });
    }

    // 5. Hämta svaret
    const messages = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const message = messages.data.data.find(m => m.role === 'assistant');
    console.log("🧠 GPT-svar:", JSON.stringify(message, null, 2));

    let reply = "Kunde inte hämta något svar.";
    if (message?.content?.length > 0 && message.content[0].type === "text") {
      reply = message.content[0].text.value;
    }

    res.json({ reply });

  } catch (err) {
    console.error("💥 Fel från OpenAI:", err.response?.data || err.message);
    res.status(500).json({ error: 'Något gick fel med OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxyservern körs på port ${PORT}`);
});
