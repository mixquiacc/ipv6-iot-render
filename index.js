const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { Server } = require('socket.io');
const db = require('./db');

const APP_PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.INGEST_TOKEN || 'cambia_esto_ya';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: últimos registros
app.get('/api/latest', async (req, res) => {
  try {
    const rows = await db.latest(500);
    res.json(rows.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const server = http.createServer(app);

// WebSocket para ingestión desde el ESP32
const wss = new WebSocketServer({ server, path: '/ingest' });

// Socket.IO para el frontend en tiempo real
const io = new Server(server);

async function broadcastSample(sample) {
  io.emit('sample', sample);
}

function isValidAuth(urlObj) {
  const token = urlObj.searchParams.get('key');
  return token === AUTH_TOKEN;
}

wss.on('connection', (ws, req) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (!isValidAuth(urlObj)) {
    ws.close(1008, 'Auth required');
    return;
  }
  const device = urlObj.searchParams.get('device') || 'unknown';

  ws.on('message', async (data) => {
    const raw = data.toString();
    let msg;

    // 1) Intenta parsear normal
    try {
      msg = JSON.parse(raw);
    } catch {
      // 2) Si falla, convierte 'NaN'/'nan' a null y vuelve a intentar
      const cleaned = raw.replace(/\bNaN\b/gi, 'null').replace(/\bnan\b/gi, 'null');
      try { msg = JSON.parse(cleaned); }
      catch {
        console.warn('Invalid JSON dropped:', raw.slice(0, 120));
        return;
      }
    }

    // Normaliza numéricos
    const sample = {
      device,
      ts: Number.isFinite(msg.ts) ? msg.ts : Date.now(),
      temperature: Number.isFinite(msg.temperature) ? msg.temperature : null,
      humidity: Number.isFinite(msg.humidity) ? msg.humidity : null,
      airQuality: Number.isFinite(msg.airQuality) ? msg.airQuality : null
    };

    // Sin T/H válidos no guardamos (evita ensuciar la DB)
    if (sample.temperature === null || sample.humidity === null) return;

    try {
      await db.insert(sample);
      await broadcastSample(sample);
    } catch (e) {
      console.error('DB insert error:', e.message);
    }
  });
});

server.listen(APP_PORT, () => {
  console.log(`HTTP+WSS on :${APP_PORT}`);
});
