const express = require("express");
const cors = require("cors");

const app = express();

process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

app.use(express.json());
app.use(cors());

const API_KEY = "SECRET_KEY_123";
let servers = {};

// Aktualizacja danych serwera
app.post("/update", (req, res) => {
  try {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

    const data = req.body;
    if (!data.serverId) return res.status(400).send("Missing serverId");

    servers[data.serverId] = {
      instanceId: data.instanceId || data.serverId,
      playerCount: data.playerCount || 0,
      players: data.players.map(p => ({
        name: p.name,
        userId: p.userId,
        avatar: p.avatar,
        playtime: p.playtime
      })),
      lastUpdate: Date.now(),
    };

    res.sendStatus(200);
  } catch (err) {
    console.error("Error in /update:", err);
    res.sendStatus(500);
  }
});

// Pobieranie danych serwerów
app.get("/servers", (req, res) => res.json(Object.values(servers)));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}`));
