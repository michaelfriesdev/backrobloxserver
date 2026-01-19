const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());

// Włącz CORS na test
app.use(cors()); // lub { origin: "https://strazroblox.pl" }

const API_KEY = "SECRET_KEY_123";
let servers = {};

app.post("/update", (req, res) => {
  if (req.headers.authorization !== API_KEY)
    return res.sendStatus(403);

  const data = req.body;
  servers[data.serverId] = {
    playerCount: data.playerCount,
    players: data.players,
    lastUpdate: Date.now()
  };
  res.sendStatus(200);
});

app.get("/servers", (req, res) => res.json(Object.values(servers)));

app.get("/", (req, res) => res.send("API działa! Użyj /servers lub /update"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE na porcie ${PORT}`));
