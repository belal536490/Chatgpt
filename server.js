const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// ─── MAIN PROXY ──────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { apiKey, model, messages, system, max_tokens } = req.body;
  if (!apiKey) return res.json({ error: { type: 'auth', message: 'API key দাও' } });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: max_tokens || 64000,
        system: system || '',
        messages: messages
      })
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.json({ error: { type: 'network', message: e.message } });
  }
});

// ─── IMAGE UPLOAD ─────────────────────────────────────────────
app.post('/api/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.json({ error: 'No file' });
  const base64 = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;
  res.json({ base64, mediaType, size: req.file.size });
});

// ─── VALIDATE KEY ─────────────────────────────────────────────
app.post('/api/validate', async (req, res) => {
  const { apiKey } = req.body;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] })
    });
    const d = await r.json();
    if (d.error) res.json({ valid: false, message: d.error.message });
    else res.json({ valid: true });
  } catch (e) {
    res.json({ valid: false, message: e.message });
  }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Claude Chat running on port', PORT));
