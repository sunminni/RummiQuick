const COLORS = ['red', 'blue', 'orange', 'black'];
const currentLocation = window.location;
const socket = new WebSocket(`ws://${currentLocation.hostname}:${currentLocation.port}`);
var myID = null;
const id_div = document.getElementById('user_id');
const hand_div = document.getElementById('hand');
const board_div = document.getElementById('board');
const create_btn = document.getElementById('create');
const refresh_btn = document.getElementById('refresh');
const exit_btn = document.getElementById('exit');
const start_btn = document.getElementById('start');
const rooms_div = document.getElementById('rooms');
const members_div = document.getElementById('members');

function showRoom(){
	rooms_div.style.display = 'none';
	refresh_btn.style.display = 'none';
	create_btn.style.display = 'none';
	start_btn.style.display = 'inline-block';
	exit_btn.style.display = 'inline-block';
	hand_div.style.display = 'block';
	board_div.style.display = 'block';
	members_div.style.display = 'block';
}

function showLobby(){
	rooms_div.style.display = 'block';
	refresh_btn.style.display = 'inline-block';
	create_btn.style.display = 'inline-block';
	start_btn.style.display = 'none';
	exit_btn.style.display = 'none';
	hand_div.style.display = 'none';
	board_div.style.display = 'none';
	members_div.style.display = 'none';
}

function updateRoom(room){
	members_div.innerHTML = '';
	for (const mID of room.mIDs){
		let member_div = document.createElement('div');
		member_div.classList.add('member');
		if (mID == room.hID) member_div.classList.add('host');
		member_div.innerHTML = UUID2ID(mID);
		members_div.append(member_div);
	}

	start_btn.disabled = myID!=room.hID || room.mIDs.length < 2;
	console.log(room);
}

function createTileDiv(num,color){
	let div = document.createElement('div');
	div.classList.add('tile');
	div.style.color = color;
	div.innerHTML = num == 999 ? '☺' : num;
	return div;
}

function drawHand(hand){
	hand_div.innerHTML = '';
	let left = 0;
	for (const group of hand.groups) {
		for (const t of group) {
			let tile_div = createTileDiv(t.num,t.color);
			tile_div.style.left = left + 'px';
			hand_div.append(tile_div);
			left += 36;
		}
		left += 10;
	}
	for (const t of hand.tiles) {
		let tile_div = createTileDiv(t.num,t.color);
		tile_div.style.left = left + 'px';
		hand_div.append(tile_div);
		left += 36;
	}
}

function updateHand(hand){
	drawHand(hand);
	console.log(hand);
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

start_btn.onclick = function(e){
	sendMsgToServer('requestGameStart',null);
}

socket.addEventListener('open', (event) => {
	sendMsgToServer('requestLobbyStatus',null);
});

// Event listener for incoming messages from the server
socket.addEventListener('message', (event) => {
	const message = JSON.parse(event.data);
	switch(message.type){
		case 'registeredClient':
			id_div.innerHTML = "ID: "+UUID2ID(message.data);
			myID = message.data;
			break;
		case 'enteredRoom':
			showRoom();
			break;
		case 'leftRoom':
			showLobby();
			break;
		case 'updateRoom':
			updateRoom(message.data);
			break;
		case 'lobbyStatus':
			let rooms = new Map(JSON.parse(message.data));
			rooms_div.innerHTML = '';
			for (const [hID,room] of rooms){
				let room_div = document.createElement('div');
				room_div.classList.add('room');
				room_div.innerHTML = "["+room.mIDs.length+"/4] "+UUID2ID(hID)+"'s room";
				room_div.hID = hID;
				room_div.onclick = function(){
					sendMsgToServer('requestJoinRoom',this.hID);
				}
				rooms_div.append(room_div);
			}
			break;
		case 'updateHand':
			updateHand(message.data);
			break;
	}
});

