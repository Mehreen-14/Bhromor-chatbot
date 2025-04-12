const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const app = express();

// ======= MIDDLEWARE =======
app.use(cors());
app.use(express.json());

// ======= CONFIG =======
const OPENROUTER_API_KEY = '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';
const MODEL_ID = 'deepseek/deepseek-r1:free';
const WEATHER_API_KEY = '9a2b8633ab3748fc80a183944250904'; 
const MONGO_URI = 'mongodb://localhost:27017/chatbot';

// ======= MONGOOSE SETUP =======
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ======= SCHEMA =======
const chatSchema = new mongoose.Schema({
  sessionId: String,
  messages: [
    {
      text: String,
      sender: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// ======= ROUTES =======

// POST: Chat with AI or fetch weather info
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  const lowerMessage = message.toLowerCase();

  try {
    // Detect weather query
    if (lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
      const match = lowerMessage.match(/(?:weather|temperature)[^\w]+(?:in )?([a-zA-Z\s]+)/);
      const city = match?.[1].trim() || 'Dhaka';


      const weatherRes = await axios.get(`http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${city}`);
      const weather = weatherRes.data;

      const botReply = `🌦️ The current weather in ${city} is ${weather.current.temp_c}°C with ${weather.current.condition.text}.`;

      let chat = await Chat.findOne({ sessionId });

      if (chat) {
        chat.messages.push({ text: message, sender: 'user' });
        chat.messages.push({ text: botReply, sender: 'bot' });
        await chat.save();
      } else {
        chat = new Chat({
          sessionId,
          messages: [
            { text: message, sender: 'user' },
            { text: botReply, sender: 'bot' }
          ]
        });
        await chat.save();
      }

      return res.json({ reply: botReply });
    }

    // Default AI Chat Response
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL_ID,
        messages: [
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const botReply = response.data.choices[0]?.message?.content || "Sorry, no reply generated.";

    let chat = await Chat.findOne({ sessionId });

    if (chat) {
      chat.messages.push({ text: message, sender: 'user' });
      chat.messages.push({ text: botReply, sender: 'bot' });
      await chat.save();
    } else {
      chat = new Chat({
        sessionId,
        messages: [
          { text: message, sender: 'user' },
          { text: botReply, sender: 'bot' }
        ]
      });
      await chat.save();
    }

    res.json({ reply: botReply });

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    res.status(500).json({ reply: "Oops! Something went wrong." });
  }
});

// GET: Fetch previous chats
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 }).limit(100);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch previous chats.' });
  }
});

// GET: Search and return all matching messages from all chats
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query required' });

  try {
    const results = await Chat.find({
      messages: {
        $elemMatch: {
          text: { $regex: q, $options: 'i' }
        }
      }
    });

    // Filter only messages that match and return them with session info
    const matches = [];

    results.forEach(chat => {
      chat.messages.forEach(msg => {
        if (msg.text.toLowerCase().includes(q.toLowerCase())) {
          matches.push({
            sessionId: chat.sessionId,
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp,
          });
        }
      });
    });

    res.json(matches);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search messages.' });
  }
});


// ======= SERVER =======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


//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 (huggingface) 