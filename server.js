const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const { v4: uuidv4 } = require('uuid'); // Import the uuid library

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

function sendMsgToClient(ws,type,data){
    ws.send(JSON.stringify({type:type,data:data}));
}

function enterRoom(cID,roomID){
    let room = rooms.get(roomID);
    if (!room.includes(cID)){
        room.push(cID);
        sendMsgToClient(clients.get(cID),'enteredRoom',null);
    }
}

function exitRoom(cID){
    for (const [hID,mIDs] of rooms){
        //broadcast exit to all members?
        // if (hID==cID){
        //     return;
        // }
        if (mIDs.includes(cID)){
            mIDs.splice(mIDs.indexOf(cID),1);
            sendMsgToClient(clients.get(cID),'leftRoom',null);
            if (mIDs.length==0){
                rooms.delete(hID);
            }
            sendMsgToClient(clients.get(cID),'lobbyStatus',JSON.stringify(Array.from(rooms.entries())));
            return;
        }
    }
}

const clients = new Map();
const rooms = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4(); // Generate a unique ID for the client
    clients.set(clientId, ws);
    ws.clientId = clientId;
    sendMsgToClient(ws,'registerClient',clientId);

    console.log('Client connected');

    ws.on('message', (msg) => {
        let message = JSON.parse(msg);
        switch(message.type){
            case 'requestCreateRoom':
                rooms.set(ws.clientId,[]);
                enterRoom(ws.clientId,ws.clientId);
                break;
            case 'requestLobbyStatus':
                sendMsgToClient(ws,'lobbyStatus',JSON.stringify(Array.from(rooms.entries())));
                break;
            case 'requestJoinRoom':
                let roomID = message.data;
                enterRoom(ws.clientId,roomID);
                break;
            case 'requestExit':
                exitRoom(ws.clientId);
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(clientId);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
