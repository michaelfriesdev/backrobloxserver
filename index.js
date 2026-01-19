app.post("/update", (req, res) => {
  try {
    if (req.headers.authorization !== API_KEY) return res.sendStatus(403);

    const data = req.body;
    if (!data.serverId) return res.status(400).send("Missing serverId");

    servers[data.serverId] = {
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
