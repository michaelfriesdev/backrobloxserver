const express = require("express");
const app = express();

app.use(express.json());

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

app.get("/servers", (req, res) => {
  res.json(Object.values(servers));
});

app.listen(3000, () => console.log("API ONLINE"));
