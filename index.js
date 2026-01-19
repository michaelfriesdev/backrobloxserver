// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // npm install node-fetch@2

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "SECRET_KEY_123";
let servers = {}; // zapis serwerów
let shutdownCommands = {}; // { serverId: reason }
let avatarCache = {}; // { userId: { url, lastUpdate } }
const AVATAR_CACHE_DURATION = 1000 * 60 * 60; // 1h

// helper do pobrania avataru z cache lub Roblox
async function getAvatarUrl(userId) {
  const now = Date.now();
  if (avatarCache[userId] && (now - avatarCache[userId].lastUpdate < AVATAR_CACHE_DURATION)) {
    return avatarCache[userId].url;
  }

  try {
    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
    const json = await res.json();
    if (json.data && json.data[0] && json.data[0].imageUrl) {
      avatarCache[userId] = { url: json.data[0].imageUrl, lastUpdate: now };
      return json.data[0].imageUrl;
    }
  } catch(e){ console.error("Avatar fetch error:", e); }

  // fallback
  const fallback = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
  avatarCache[userId] = { url: fallback, lastUpdate: now };
  return fallback;
}

// POST /update – aktualizacja danych serwera
app.post("/update", async (req, res) => {
  if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

  const data = req.body;
  if (!data.serverId) return res.status(400).send("Missing serverId");

  // dla każdego gracza pobieramy avatar z cache
  const playersWithAvatars = await Promise.all(data.players.map(async p => {
    const avatarUrl = await getAvatarUrl(p.userId);
    return { ...p, avatar: avatarUrl };
  }));

  servers[data.serverId] = {
    instanceId: data.instanceId || data.serverId,
    playerCount: data.playerCount || 0,
    players: playersWithAvatars,
    lastUpdate: Date.now()
  };

  res.sendStatus(200);
});

// GET /servers – pobranie danych serwerów
app.get("/servers", (req, res) => res.json(Object.values(servers)));

// POST /shutdown – wysłanie komendy shutdown
app.post("/shutdown", (req, res) => {
  const { serverId, reason, apiKey } = req.body;
  if (apiKey !== API_KEY) return res.sendStatus(403);
  if (!serverId) return res.status(400).send("Missing serverId");

  shutdownCommands[serverId] = reason || "Server maintenance";
  console.log(`Shutdown scheduled for ${serverId} with reason: ${reason}`);
  res.json({status:"ok"});
});

// GET /checkShutdown/:serverId – dla Roblox
app.get("/checkShutdown/:serverId", (req, res) => {
  const { serverId } = req.params;
  if (!serverId) return res.status(400).send("Missing serverId");

  if (shutdownCommands[serverId]) {
    const reason = shutdownCommands[serverId];
    delete shutdownCommands[serverId];
    return res.json({ shutdown: true, reason });
  }
  res.json({ shutdown: false });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}`));
