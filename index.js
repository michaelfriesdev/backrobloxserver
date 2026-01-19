const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "SECRET_KEY_123";
let servers = {}; // zapis serwerów

// POST /update – aktualizacja danych serwera
app.post("/update", (req, res) => {
  if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

  const data = req.body;
  if (!data.serverId) return res.status(400).send("Missing serverId");

  servers[data.serverId] = {
    instanceId: data.instanceId || data.serverId,
    playerCount: data.playerCount || 0,
    players: data.players || [],
    lastUpdate: Date.now()
  };

  res.sendStatus(200);
});

// GET /servers – pobranie danych wszystkich serwerów
app.get("/servers", (req, res) => res.json(Object.values(servers)));

// POST /shutdown – wysłanie komendy shutdown
app.post("/shutdown", (req, res) => {
  const {serverId, reason, apiKey} = req.body;
  if (apiKey !== API_KEY) return res.sendStatus(403);
  if (!serverId) return res.status(400).send("Missing serverId");

  // W prawdziwym scenariuszu backend wysyła komendę do Roblox RemoteEvent
  // Tutaj logujemy dla przykładu
  console.log(`Shutdown requested for server ${serverId} with reason: ${reason}`);

  res.json({status: "ok", message: `Shutdown request sent for server ${serverId}`});
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}`));
