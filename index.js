const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "SECRET_KEY_123";
let servers = {};
let shutdownCommands = {}; // { serverId: reason }

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

app.get("/servers", (req, res) => res.json(Object.values(servers)));

// Endpoint z panelu HTML do wysyłania shutdown
app.post("/shutdown", (req, res) => {
    const { serverId, reason, apiKey } = req.body;
    if (apiKey !== API_KEY) return res.sendStatus(403);
    if (!serverId) return res.status(400).send("Missing serverId");

    shutdownCommands[serverId] = reason || "Server maintenance";
    console.log(`Shutdown scheduled for ${serverId} with reason: ${reason}`);
    res.json({status:"ok"});
});

// Endpoint dla Roblox do sprawdzania komend
app.get("/checkShutdown/:serverId", (req, res) => {
    const { serverId } = req.params;
    if (!serverId) return res.status(400).send("Missing serverId");

    if (shutdownCommands[serverId]) {
        const reason = shutdownCommands[serverId];
        delete shutdownCommands[serverId]; // wykonujemy komendę tylko raz
        return res.json({ shutdown: true, reason });
    }
    res.json({ shutdown: false });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}`));
