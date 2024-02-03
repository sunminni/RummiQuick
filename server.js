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

const COLORS = ['red', 'blue', 'orange', 'black'];

function sendMsgToClient(cID, type, data) {
    clients.get(cID).ws.send(JSON.stringify({ type: type, data: data }));
}

class client {
    constructor(ws) {
        this.ws = ws;
        this.rID = null;
        this.hand = null;
    }
}

class room {
    constructor(hID) {
        this.hID = hID;
        this.mIDs = [];
        this.status = "Waiting";
    }
}

class Tile {
    constructor(num, color, idx) {
        this.num = num;
        this.color = color;
        this.sortValColor = num + COLORS.indexOf(color) * 100 + idx / 1000;
        this.sortValNum = num * 10 + COLORS.indexOf(color) + idx / 1000;
    }
}

function getSet(tiles) {
    let set = [];
    let done = [];
    let colors = [];
    for (const t of tiles) {
        if (colors.includes(t.color)) {
            done.push(t);
        }
        else {
            colors.push(t.color);
            set.push(t);
        }
    }
    if (colors.length > 2) {
        return [set, done];
    }
    else {
        return [[], tiles];
    }
}

function getRun(tiles) {
    let run = [];
    let done = [];
    for (const t of tiles) {
        if (run.length == 0) {
            run.push(t);
            continue;
        }
        if (run[run.length - 1].num == t.num) {
            done.push(t);
            continue;
        }
        if (run[run.length - 1].num + 1 == t.num) {
            run.push(t);
            continue;
        }
        if (run.length >= 3) {
            done.push(t);
            continue;
        }
        done = done.concat(run);
        run = [t];
    }
    if (run.length >= 3) {
        done.sort((a, b) => a.sortValColor - b.sortValColor);
        return [run, done];
    }
    return [[], tiles];
}

class Hand {
    constructor() {
        this.groups = [];
        this.tiles = [];
    }

    push(tile) {
        this.tiles.push(tile);
    }

    sortByNum() {
        for (const g of this.groups) {
            this.tiles = this.tiles.concat(g);
        }
        this.tiles.sort((a, b) => a.sortValNum - b.sortValNum);
        this.groups = [];
        let processed = [];
        for (let i = 1; i <= 13; i++) {
            let processing = [];
            while (this.tiles.length > 0 && this.tiles[0].num == i) {
                processing.push(this.tiles.shift());
            }
            while (true) {
                let set;
                [set, processing] = getSet(processing);
                if (set.length == 0) {
                    break;
                }
                else {
                    this.groups.push(set);
                }
            }
            processed = processed.concat(processing);
        }
        this.tiles = processed.concat(this.tiles);
    }

    sortByColor() {
        for (const g of this.groups) {
            this.tiles = this.tiles.concat(g);
        }
        this.tiles.sort((a, b) => a.sortValColor - b.sortValColor);
        this.groups = [];
        let processed = [];
        for (let c of COLORS) {
            let processing = [];
            while (this.tiles.length > 0 && this.tiles[0].color == c) {
                processing.push(this.tiles.shift());
            }
            while (true) {
                let run;
                [run, processing] = getRun(processing);
                if (run.length == 0) {
                    break;
                }
                else {
                    this.groups.push(run);
                }
            }
            processed = processed.concat(processing);
        }
        this.tiles = processed.concat(this.tiles);
    }
}



class Deck {
    constructor() {
        //init
        let idx = 0;
        this.tiles = [new Tile(999, 'black', idx++), new Tile(999, 'red', idx++)];
        for (let j = 0; j < 2; j++) {
            for (let c of COLORS) {
                for (let i = 0; i < 13; i++) {
                    this.tiles.push(new Tile(i + 1, c, idx++));
                }
            }
        }
        //shuffle
        this.tiles = this.tiles
            .map(value => ({ value, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)
    }

    draw(){
        return this.tiles.pop();
    }
}


function enterRoom(cID, rID) {
    let client = clients.get(cID);
    let room = rooms.get(rID);
    if (client == undefined || room == undefined) return;
    client.rID = rID;
    room.mIDs.push(cID);
    sendMsgToClient(cID, 'enteredRoom', null);
    for (const mID of room.mIDs) {
        sendMsgToClient(mID, 'updateRoom', room);
    }
}

function exitRoom(cID) {
    let client = clients.get(cID);
    if (client.rID == null) return;
    let room = rooms.get(client.rID);
    room.mIDs.splice(room.mIDs.indexOf(cID), 1);
    if (room.mIDs.length == 0) {
        rooms.delete(room.hID);
    }
    else {
        if (room.hID == cID) {
            rooms.delete(room.hID);
            room.hID = room.mIDs[0];
            rooms.set(room.hID, room);
        }
        for (const mID of room.mIDs) {
            clients.get(mID).rID = room.hID;
            sendMsgToClient(mID, 'updateRoom', room);
        }
    }
    client.rID = null;
    sendMsgToClient(cID, 'leftRoom', null);
    sendMsgToClient(cID, 'lobbyStatus', JSON.stringify(Array.from(rooms.entries())));
}

function startGame(hID) {
    let client = clients.get(hID);
    if (client.rID == null) return;
    let room = rooms.get(client.rID);
    if (client == undefined || room == undefined) return;
    let newDeck = new Deck();

    decks.set(client.rID,newDeck);
    
    for (const mID of room.mIDs){
        let c = clients.get(mID);
        c.hand = new Hand();
        for (let i = 0; i < 14; i++) {
            c.hand.push(newDeck.draw());
        }
        sendMsgToClient(mID, 'updateHand', c.hand);
    }
}

const clients = new Map();
const rooms = new Map();
const decks = new Map();

wss.on('connection', (ws) => {
    const cID = uuidv4(); // Generate a unique ID for the client
    clients.set(cID, new client(ws));
    ws.cID = cID;
    sendMsgToClient(cID, 'registeredClient', cID);

    console.log('Client connected');

    ws.on('message', (msg) => {
        let message = JSON.parse(msg);
        console.log(message.type);
        switch (message.type) {
            case 'requestCreateRoom':
                rooms.set(ws.cID, new room(ws.cID));
                enterRoom(ws.cID, ws.cID);
                break;
            case 'requestLobbyStatus':
                sendMsgToClient(ws.cID, 'lobbyStatus', JSON.stringify(Array.from(rooms.entries())));
                break;
            case 'requestJoinRoom':
                let rID = message.data;
                enterRoom(ws.cID, rID);
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
