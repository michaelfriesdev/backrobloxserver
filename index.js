const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());

// Włącz CORS
app.use(cors()); // or { origin: "https://strazroblox.pl" }

const API_KEY = "SECRET_KEY_123";
let servers = {};

// POST /update
app.post("/update", (req, res) => {
  if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

  const data = req.body;
  servers[data.serverId] = {
    playerCount: data.playerCount,
    players: data.players,
    lastUpdate: Date.now()
  };
  res.sendStatus(200);
});

// GET /servers
app.get("/servers", (req, res) => res.json(Object.values(servers)));

// GET /
app.get("/", (req, res) => res.send("API działa! Użyj /servers lub /update"));

// **Dynamic port assignment for Railway**
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ ERROR: process.env.PORT is not set. Railway requires this to be used.");
  process.exit(1);
}

app.listen(PORT, () => console.log(`API ONLINE na porcie ${PORT}`));
