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

function sendMsgToClient(cID,type,data){
    clients.get(cID).ws.send(JSON.stringify({type:type,data:data}));
}

class client{
	constructor(ws) {
        this.ws = ws;
        this.rID = null;
    }
}

class room{
	constructor(hID) {
        this.hID = hID;
        this.mIDs = [];
        this.status = "Waiting";
    }
}

function enterRoom(cID,rID){
    let client = clients.get(cID);
    let room = rooms.get(rID);
    if (client == undefined || room == undefined) return;
    client.rID = rID;
    room.mIDs.push(cID);
    sendMsgToClient(cID,'enteredRoom',null);
    for (const mID of room.mIDs){
        sendMsgToClient(mID,'updateRoom',room);
    }
}

function exitRoom(cID){
    let client = clients.get(cID);
    if (client.rID==null) return;
    let room = rooms.get(client.rID);
    room.mIDs.splice(room.mIDs.indexOf(cID),1);
    if (room.mIDs.length==0){
        rooms.delete(room.hID);
    }
    else{
        if (room.hID==cID){
            rooms.delete(room.hID);
            room.hID = room.mIDs[0];
            rooms.set(room.hID,room);
        }
        for (const mID of room.mIDs){
            clients.get(mID).rID = room.hID;
            sendMsgToClient(mID,'updateRoom',room);
        }
    }
    client.rID = null;
    sendMsgToClient(cID,'leftRoom',null);
    sendMsgToClient(cID,'lobbyStatus',JSON.stringify(Array.from(rooms.entries())));
}

function startGame(hID){
    let client = clients.get(hID);
    if (client.rID==null) return;
    //TODO
}

const clients = new Map();
const rooms = new Map();

wss.on('connection', (ws) => {
    const cID = uuidv4(); // Generate a unique ID for the client
    clients.set(cID, new client(ws));
    ws.cID = cID;
    sendMsgToClient(cID,'registeredClient',cID);

    console.log('Client connected');

    ws.on('message', (msg) => {
        let message = JSON.parse(msg);
        console.log(message.type);
        switch(message.type){
            case 'requestCreateRoom':
                rooms.set(ws.cID,new room(ws.cID));
                enterRoom(ws.cID,ws.cID);
                break;
            case 'requestLobbyStatus':
                sendMsgToClient(ws.cID,'lobbyStatus',JSON.stringify(Array.from(rooms.entries())));
                break;
            case 'requestJoinRoom':
                let rID = message.data;
                enterRoom(ws.cID,rID);
                break;
            case 'requestExit':
                exitRoom(ws.cID);
                break;
            case 'requestGameStart':
                startGame(ws.cID);
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        exitRoom(cID);
        clients.delete(cID);
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
