const currentLocation = window.location;
const socket = new WebSocket(`ws://${currentLocation.hostname}:${currentLocation.port}`);
var myID = null;
var myHand = new Hand();
const lobby_div = document.getElementById('lobby');
const game_room_div = document.getElementById('game_room');
const id_div = document.getElementById('user_id');
const hand_div = document.getElementById('hand');
const board_div = document.getElementById('board');
const create_btn = document.getElementById('create');
const refresh_btn = document.getElementById('refresh');
const exit_btn = document.getElementById('exit');
const start_btn = document.getElementById('start');
const rooms_div = document.getElementById('rooms');
const members_div = document.getElementById('members');
const sortNumber_btn = document.getElementById('sortNumber');
const sortColor_btn = document.getElementById('sortColor');


function showRoom(){
	lobby_div.style.display = 'none';
	game_room_div.style.display = 'block';
}

function showLobby(){
	lobby_div.style.display = 'block';
	game_room_div.style.display = 'none';
}

function updateRoom(room){
	members_div.innerHTML = '';
	for (const mID of room.mIDs){
		let member_div = document.createElement('div');
		member_div.classList.add('member');
		if (mID == room.hID) member_div.classList.add('host');
		if (mID == myID) member_div.classList.add('me');
		let profile_div = document.createElement('div');
		profile_div.classList.add('profile');
		profile_div.innerHTML = UUID2ID(mID);
		member_div.append(profile_div);
		members_div.append(member_div);
	}

	start_btn.disabled = myID!=room.hID || room.mIDs.length < 2;
	// console.log(room);
}

function createTileDiv(num,color){
	let div = document.createElement('div');
	div.classList.add('tile');
	div.style.color = color;
	div.innerHTML = num == 999 ? '☺' : num;
	return div;
}

function drawHand(){
	hand_div.innerHTML = '';
	let left = 0;
	for (const group of myHand.groups) {
		for (const t of group) {
			let tile_div = createTileDiv(t.num,t.color);
			tile_div.style.left = left + 'px';
			hand_div.append(tile_div);
			left += 36;
		}
		left += 10;
	}
	for (const t of myHand.tiles) {
		let tile_div = createTileDiv(t.num,t.color);
		tile_div.style.left = left + 'px';
		hand_div.append(tile_div);
		left += 36;
	}
}

function updateHand(){
	drawHand();
	// console.log(hand);
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

sortNumber_btn.onclick = function(e){
	console.log(myHand);
	myHand.sortByNum();
	updateHand();
}

sortColor_btn.onclick = function(e){
	console.log(myHand);
	myHand.sortByColor();
	updateHand();
}


socket.addEventListener('open', (event) => {
	sendMsgToServer('requestLobbyStatus',null);
});

// Event listener for incoming messages from the server
socket.addEventListener('message', (event) => {
	const message = JSON.parse(event.data);
	// console.log(message.type);
	switch(message.type){
		case 'registeredClient':
			id_div.innerHTML = "My ID: "+UUID2ID(message.data);
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
			myHand.tiles = message.data.tiles;
			updateHand();
			break;
	}
});

