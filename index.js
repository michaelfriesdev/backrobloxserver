-- Roblox Server Script
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- RemoteEvent dla komend z backendu
local AdminEvent = Instance.new("RemoteEvent")
AdminEvent.Name = "AdminEvent"
AdminEvent.Parent = ReplicatedStorage

-- Backend API info
local API_URL = "https://backrobloxserver.fly.dev/update"
local API_KEY = "SECRET_KEY_123"

-- Śledzenie czasu dołączenia graczy
local joinTimes = {}

-- Funkcja wysyłania danych o serwerze do backendu
local function sendData()
    local players = {}

    for _, plr in ipairs(Players:GetPlayers()) do
        local joinTime = joinTimes[plr.UserId] or os.time()
        local playtime = os.time() - joinTime

        -- Avatar z UserId przez Thumbnails API
        local avatarUrl = "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. plr.UserId ..
                          "&size=420x420&format=Png&isCircular=false"

        table.insert(players, {
            name = plr.Name,
            userId = plr.UserId,
            avatar = avatarUrl,
            playtime = playtime
        })
    end

    local data = {
        serverId = game.JobId,
        instanceId = game.JobId,
        playerCount = #players,
        players = players
    }

    local json = HttpService:JSONEncode(data)

    pcall(function()
        HttpService:PostAsync(
            API_URL,
            json,
            Enum.HttpContentType.ApplicationJson,
            false,
            {["Authorization"] = API_KEY}
        )
    end)
end

-- Eventy graczy
Players.PlayerAdded:Connect(function(plr)
    joinTimes[plr.UserId] = os.time()
    sendData()
end)

Players.PlayerRemoving:Connect(function(plr)
    sendData()
    joinTimes[plr.UserId] = nil
end)

-- Funkcja shutdown serwera
local function shutdownServer(reason)
    for _, plr in ipairs(Players:GetPlayers()) do
        plr:Kick(reason or "Serwer zostaje zamknięty.")
    end
end

-- Nasłuchiwanie komendy shutdown z backendu
AdminEvent.OnServerEvent:Connect(function(player, command, reason)
    if command == "shutdown" then
        shutdownServer(reason)
    end
end)
