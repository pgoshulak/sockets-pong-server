const express = require('express')
const SocketServer = require('ws').Server;
const uuidv1 = require('uuid/v1')

const PORT = process.env.PORT || 3001;
const VERBOSE_LOGGING = true;

const log = (...messages) => {
  if (VERBOSE_LOGGING) console.log(...messages);
}

const server = express()
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new SocketServer({ server });

// Generate a unique ID
wss.getUniqueId = () => uuidv1();
// Assign player numbers (0, 1) to WS clients by UUID
wss.assignPlayers = () => {
  // Dict of UUID: playerNum, eg. wss.playerNums['abc123-abc123'] = 0 (player 0)
  wss.playerNums = {}
  // array of playerNum: ws connection, eg. wss.clientNums[0] = client for player 0
  wss.clientNums = []
  let playerNum = 0;
  wss.clients.forEach(function each(client) {
    wss.playerNums[client.id] = playerNum;
    wss.clientNums[playerNum] = client
    // Update each client with its new playerNum
    client.send(JSON.stringify({
      type: 'ASSIGN_PLAYER',
      content: playerNum
    }))
    playerNum++
  })
  log('wss.playerNums = ', wss.playerNums)
}

const totalClients = (wss) => wss.clients.size;

wss.on('connection', (ws) => {
  log(`New connection -> ${totalClients(wss)} client(s) connected`)
  // Assign unique id to the client
  ws.id = wss.getUniqueId();

  wss.assignPlayers();

  ws.on('close', () => {
    log(`Player ${wss.playerNums[ws.id]} has dropped`)
    wss.assignPlayers();
    log(`Client disconnected -> ${totalClients(wss)} client(s) connected`)
  })
  ws.on('message', (receivedData) => {
    const data = JSON.parse(receivedData)
    // Broadcast player moves to all players
    if (data.type === 'P0' || data.type === 'P1') {
      wss.clients.forEach(function each(client) {
        client.send(receivedData)
      })
    }

  })
})