var express = require('express'),
    app = express(),
    http = require('http'),
    socketIo = require('socket.io'),
	crypto = require("crypto"),
	SAT = require('sat'),
	V = SAT.Vector,
	C = SAT.Circle;

// start webserver on port 8080
var server = http.Server(app);
var io = socketIo(server);
server.listen(9000);
// add directory with our static files
app.use(express.static(__dirname + '/public'));
console.log("Server running on :9000");

function random_int(min, max) {
  return Math.ceil(Math.random() * (max - min) + min);
}

function check_against_planets(spot)
{
	var response = new SAT.Response();
	planets.forEach(function(ptt) {
		var collided = SAT.testCircleCircle(spot, ptt.c, response);
		if(collided == true)
			return collided;
	})
	return (collided) ? true :false;
}

function check_against_players(spot)
{
	var response = new SAT.Response();
	players.forEach(function(ptt) {
		var collided = SAT.testCircleCircle(spot, ptt.c, response);
		if(collided == true)
			return collided;
	})
	return (collided) ? true : false;
}

//7680x4320 // such solution // much pixel // wow planets
const config = { planetAmount: 25, minimalSize: 100, maximalSize: 300, xSize: 7680, ySize: 4320, playersize: 9, playersafespace: 50, planetsafespace: 50}
let planets = [];
for(let i = 0; i < config.planetAmount; i++)
{
	var x = random_int(config.maximalSize,config.xSize-config.maximalSize);
	var y = random_int(config.maximalSize,config.ySize-config.maximalSize);
	var s = random_int(config.minimalSize,config.maximalSize)
	var ptt = new C(new V(x,y), s + config.playersafespace);
	var collided = check_against_planets(ptt);
	console.log(collided);
	if(!collided)
		planets.push({ x: x, y: y, s: s, c: new C(new V(x,y), s)});
	else
		i--;
}

function find_new_spot()
{
	while(true)
	{
			var test = {x: random_int(0,config.xSize), y: random_int(0,config.ySize), s: config.playersize};
			var ptt = new C(new V(test.x,test.y), test.s + config.playersafespace);
			var collided = check_against_planets(ptt);
			if(!collided)
			{
				var collided = check_against_players(ptt);
				if(!collided)
				{
					return test;
				}
			}
	}
}

function create_shot(player, pind, velocity, angle)
{
	shots.push({pind: pind, c: new C(new V(player.x,player.y), 1), v: new V((velocity * Math.cos(angle / 180 * Math.PI)),(velocity * -Math.sin(angle / 180 * Math.PI)))});
	//players.find(function(p){return p.username == player.username})
}

function testCircleCollision(a, b) {
  var response = new SAT.Response();
  var collided = SAT.testCircleCircle(a.c, b.c, response);

  return {
    collided: collided,
    response: response
  };
};

function stepper()
{
	shots.forEach(function(shot,sind,sarr) {
		shot.c.pos = shot.c.pos.add(shot.v)
		players.forEach(function(ptt,pind,parr) {
			var response = SAT.testCircleCollision(shot, ptt);
			if(response.collided == true)
			{
				players[pind].c = find_new_spot(); // Shot trifft auf Player = Player tot
				players[pind].deads++; // Shot trifft auf Player = Player tot
				if(shot.pind != pind) // Shot trifft auf Player = Schütze kriegt Punkt
					players[shot.pind].kills++; // allerdings nur wenn er es nicht selbst war :P
				shots.indexOf(sind); // Shot trifft auf Player = Shot geht in Rente
				socket.emit('player-update')
			}
		});
		planets.forEach(function(ptt,pind,parr) {
			var response = SAT.testCircleCollision(shot, ptt);
			if(response.collided == true)
				shots.indexOf(sind); // Shot trifft auf Planet = Shot geht garnicht mehr
		});
	});
}

// players
let players = [];
let shots = [];

var mapio = io.of('/map');
mapio.on('connection', function(sock){
	const socket = sock;
	socket.emit('clear-map');
	// auth
		socket.on('auth', function(data) {
		socket.user_id = socket.id;
		socket.username = crypto.randomBytes(15).toString('hex');
		players.push({ "socket": socket.id, "username": socket.username, "c": find_new_spot(), "deads": 0, "kills": 0 });
	});
	// Request Map -> Send map
	socket.on('request-map', function(data) {
		//if(socket.username != data.username) {socket.disconnect();}
		console.log("request-map");
		socket.emit('send-map', {"planets": planets, dimensions: { x: config.xSize, y: config.ySize}});
    });
	// get Shot
	socket.on('shot-fired', function(data) {
		console.log("shot-fired");
		create_shot(data.username,players.findIndex(function(ele,ind,arr){}),data.velocity,data.angle);
	});
	socket.on('reset', function(data) {
		planets = [];
		for(let i = 0; i < config.planetAmount; i++)
		{
			var x = random_int(config.maximalSize,config.xSize-config.maximalSize);
			var y = random_int(config.maximalSize,config.ySize-config.maximalSize);
			var s = random_int(config.minimalSize,config.maximalSize)
			var ptt = new C(new V(x,y), s);
			var collided = check_against_planets(ptt);
			if(!collided)
				planets.push({ x: x, y: y, s: s, c: new C(new V(x,y), s)});
			else
				i--;
		}
		socket.emit('send-map', {"planets": planets, dimensions: { x: config.xSize, y: config.ySize}});
	})
});
// event-handler for new incoming connections
/*io.on('connection', function(socket) {
    //
	console.log("connected");
	socket.on('getMap', function(data) {
  	  socket.emit('map', {
  		  "planets": planets
  	  });
    });
});
*/
