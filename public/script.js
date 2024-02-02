const COLORS = ['red', 'blue', 'orange', 'black'];
const currentLocation = window.location;
const socket = new WebSocket(`ws://${currentLocation.hostname}:${currentLocation.port}`);
const id_div = document.getElementById('user_id');
const hand_div = document.getElementById('hand');
const board_div = document.getElementById('board');
const create_btn = document.getElementById('create');
const refresh_btn = document.getElementById('refresh');
const exit_btn = document.getElementById('exit');
const start_btn = document.getElementById('start');
const rooms_div = document.getElementById('rooms');

function showRoom(){
	rooms_div.style.display = 'none';
	refresh_btn.style.display = 'none';
	create_btn.style.display = 'none';
	start_btn.style.display = 'inline-block';
	exit_btn.style.display = 'inline-block';
	hand_div.style.display = 'block';
	board_div.style.display = 'block';
}

function showLobby(){
	rooms_div.style.display = 'block';
	refresh_btn.style.display = 'inline-block';
	create_btn.style.display = 'inline-block';
	start_btn.style.display = 'none';
	exit_btn.style.display = 'none';
	hand_div.style.display = 'none';
	board_div.style.display = 'none';
}

function sendMsgToServer(type,data){
    socket.send(JSON.stringify({type:type,data:data}));
}

function UUID2ID(uuid){
	return uuid.toUpperCase().slice(0,4);
}

create_btn.onclick = function(e){
	sendMsgToServer('requestCreateRoom',null);
}

refresh_btn.onclick = function(e){
	sendMsgToServer('requestLobbyStatus',null);
}

exit_btn.onclick = function(e){
	sendMsgToServer('requestExit',null);
}

socket.addEventListener('open', (event) => {
	sendMsgToServer('requestLobbyStatus',null);
});

// Event listener for incoming messages from the server
socket.addEventListener('message', (event) => {
	const message = JSON.parse(event.data);
	switch(message.type){
		case 'registerClient':
			id_div.innerHTML = "ID: "+UUID2ID(message.data);
			break;
		case 'enteredRoom':
			showRoom();
			break;
		case 'leftRoom':
			showLobby();
			break;
		case 'lobbyStatus':
			let rooms = new Map(JSON.parse(message.data));
			rooms_div.innerHTML = '';
			for (const [hID,mIDs] of rooms){
				let room_div = document.createElement('div');
				room_div.classList.add('room');
				room_div.innerHTML = "["+mIDs.length+"/4] "+UUID2ID(hID)+"'s room";
				room_div.hID = hID;
				room_div.onclick = function(){
					sendMsgToServer('requestJoinRoom',this.hID);
				}
				rooms_div.append(room_div);
			}
			break;
	}
});




















class Tile {
	constructor(num, color, idx) {
		this.num = num;
		this.color = color;
		this.div = document.createElement('div');
		this.div.classList.add('tile');
		this.div.style.color = color;
		this.div.innerHTML = num == 999 ? '☺' : num;
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
		hand_div.append(tile.div);
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
		this.drawTiles();
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
		this.drawTiles();
	}

	drawTiles() {
		let left = 0;
		for (const group of this.groups) {
			for (const t of group) {
				t.div.style.left = left + 'px';
				left += 36;
			}
			left += 10;
		}
		for (const t of this.tiles) {
			t.div.style.left = left + 'px';
			left += 36;
		}
	}

}


//init
let idx = 0;
let tiles = [new Tile(999, 'black', idx++), new Tile(999, 'red', idx++)];
for (let j = 0; j < 2; j++) {
	for (let c of COLORS) {
		for (let i = 0; i < 13; i++) {
			tiles.push(new Tile(i + 1, c, idx++));
		}
	}
}

//shuffle
tiles = tiles
	.map(value => ({ value, sort: Math.random() }))
	.sort((a, b) => a.sort - b.sort)
	.map(({ value }) => value)


// my_hand = new Hand();
// for (let i = 0; i < 34; i++) {
// 	my_hand.push(tiles.pop());
// }
// my_hand.drawTiles();


// document.onkeyup = function (e) {
// 	switch (e.key) {
// 		case '1':
// 			my_hand.sortByColor();
// 			break;
// 		case '2':
// 			my_hand.sortByNum();
// 			break;
// 	}
// }



// console.log(tiles.length);