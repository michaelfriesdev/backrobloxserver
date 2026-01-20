const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "SECRET_KEY_123";
let servers = {};
let shutdownCommands = {};
let avatarCache = {};
let bans = [];
let kicks = {}; // Nowa kolekcja dla kicków { serverId: { playerId, reason } }
let logs = [];
const AVATAR_CACHE_DURATION = 1000 * 60 * 60;

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

    const fallback = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
    avatarCache[userId] = { url: fallback, lastUpdate: now };
    return fallback;
}

app.post("/update", async (req, res) => {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

    const data = req.body;
    if (!data.serverId) return res.status(400).send("Missing serverId");

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

    logs.push({
        timestamp: Date.now(),
        type: "info",
        message: `Server ${data.serverId} updated with ${data.playerCount} players`
    });

    res.sendStatus(200);
});

app.get("/servers", (req, res) => res.json(Object.values(servers)));

app.post("/shutdown", (req, res) => {
    const { serverId, reason, apiKey } = req.body;
    if (apiKey !== API_KEY) return res.sendStatus(403);
    if (!serverId) return res.status(400).send("Missing serverId");

    shutdownCommands[serverId] = reason || "Server maintenance";
    
    logs.push({
        timestamp: Date.now(),
        type: "warning",
        message: `Shutdown scheduled for ${serverId}: ${reason}`
    });
    
    res.json({status:"ok"});
});

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

// KICK SYSTEM - NOWE ENDPOINTY

// Wysłanie komendy kick
app.post("/kick", (req, res) => {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);
    
    const { playerId, playerName, reason, serverId } = req.body;
    
    if (!playerId || !reason) {
        return res.status(400).json({ error: "Missing playerId or reason" });
    }
    
    // Zapisujemy kick dla wszystkich serwerów (lub konkretnego jeśli podano)
    const kickId = `${playerId}_${Date.now()}`;
    kicks[kickId] = {
        playerId,
        playerName,
        reason,
        serverId: serverId || "all", // "all" oznacza wszystkie serwery
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // Kick wygasa po 5 minutach
    };
    
    logs.push({
        timestamp: Date.now(),
        type: "warning",
        message: `Player ${playerName} (${playerId}) kicked: ${reason} ${serverId ? `from server ${serverId}` : 'from all servers'}`
    });
    
    // Oczyszczanie starych kicków
    cleanupExpiredKicks();
    
    res.json({ status: "ok", message: "Kick command sent" });
});

// Sprawdzenie czy gracz ma być wykopany (dla konkretnego serwera)
app.get("/checkKick/:serverId/:playerId", (req, res) => {
    const { serverId, playerId } = req.params;
    
    cleanupExpiredKicks();
    
    // Szukamy kicków dla tego gracza
    const playerKicks = Object.values(kicks).filter(kick => 
        kick.playerId == playerId && 
        (kick.serverId === "all" || kick.serverId === serverId)
    );
    
    if (playerKicks.length > 0) {
        const latestKick = playerKicks[0];
        // Usuwamy użyty kick
        const kickId = Object.keys(kicks).find(id => kicks[id] === latestKick);
        if (kickId) delete kicks[kickId];
        
        return res.json({ 
            kick: true, 
            reason: latestKick.reason 
        });
    }
    
    res.json({ kick: false });
});

// Oczyszczanie wygasłych kicków
function cleanupExpiredKicks() {
    const now = Date.now();
    Object.keys(kicks).forEach(kickId => {
        if (kicks[kickId].expiresAt < now) {
            delete kicks[kickId];
        }
    });
}

// BAN SYSTEM

app.post("/ban", (req, res) => {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);
    
    const { playerId, playerName, reason, duration } = req.body;
    
    const expiresAt = duration > 0 ? Date.now() + (duration * 60 * 60 * 1000) : null;
    
    // Usuwamy stare bany dla tego gracza
    bans = bans.filter(b => b.playerId !== playerId);
    
    // Dodajemy nowy ban
    bans.push({
        playerId,
        playerName,
        reason,
        expiresAt,
        bannedAt: Date.now(),
        bannedBy: "admin"
    });
    
    // Wyrzucamy również gracza (dodajemy kick)
    const kickId = `${playerId}_ban_${Date.now()}`;
    kicks[kickId] = {
        playerId,
        playerName,
        reason: `Banned: ${reason}`,
        serverId: "all",
        timestamp: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minut na ban kick
    };
    
    logs.push({
        timestamp: Date.now(),
        type: "error",
        message: `Player ${playerName} (${playerId}) banned: ${reason} (${duration || "permanent"})`
    });
    
    res.json({ status: "ok" });
});

app.post("/unban", (req, res) => {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);
    
    const { playerId } = req.body;
    
    const banIndex = bans.findIndex(ban => ban.playerId == playerId);
    if (banIndex !== -1) {
        const unbannedPlayer = bans[banIndex];
        bans.splice(banIndex, 1);
        
        logs.push({
            timestamp: Date.now(),
            type: "info",
            message: `Player ${unbannedPlayer.playerName} (${playerId}) unbanned`
        });
        
        return res.json({ status: "ok", playerName: unbannedPlayer.playerName });
    }
    
    res.status(404).json({ error: "Ban not found" });
});

app.get("/bans", (req, res) => {
    const now = Date.now();
    bans = bans.filter(ban => !ban.expiresAt || ban.expiresAt > now);
    res.json(bans);
});

// Pobranie listy aktywnych kicków (dla panelu admina)
app.get("/kicks", (req, res) => {
    cleanupExpiredKicks();
    res.json(Object.values(kicks));
});

app.get("/logs", (req, res) => {
    res.json(logs.slice(-100)); // Ostatnie 100 logów
});

// Strona główna przekierowuje do index.html
app.use(express.static('public'));

app.use((req, res) => {
    res.redirect('/');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ONLINE on port ${PORT}\nKick system ready`));
