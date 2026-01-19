const express = require("express");
const cors = require("cors");

const app = express();

// Error handlers to prevent container from crashing
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

// Middleware
app.use(express.json());
app.use(cors()); // enable CORS for all origins

// API key for POST requests
const API_KEY = "SECRET_KEY_123";
let servers = {};

// POST /update
app.post("/update", (req, res) => {
  try {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

    const data = req.body;
    if (!data.serverId) return res.status(400).send("Missing serverId");

    servers[data.serverId] = {
      playerCount: data.playerCount || 0,
      players: data.players || [],
      lastUpdate: Date.now(),
    };

    res.sendStatus(200);
  } catch (err) {
    console.error("Error in /update:", err);
    res.sendStatus(500);
  }
});

// GET /servers
app.get("/servers", (req, res) => res.json(Object.values(servers)));

// GET /
app.get("/", (req, res) => res.send("API działa! Użyj /servers lub /update"));

// Use Railway dynamic port
const PORT = process.env.PORT;
if (!PORT) {
  console.error("❌ ERROR: process.env.PORT is not set! Railway requires this.");
  process.exit(1);
}

app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}`));
