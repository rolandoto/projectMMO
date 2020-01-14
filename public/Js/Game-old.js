/*-------------------------------
        Mundo Shinoby
    VERSION:    alpha
*-------------------------------*/
"use strict";
/*-------------------------------
    Variables
*-------------------------------*/
let canvas,		// Canvas DOM elemento
	ctx,		// Canvas contexto de representación
	localPlayer,	// Clase jugador local
	remotePlayers = [],	// Clase jugador remoto
    attackDistance = [], // Contiene los ataques a distancia
    clsJutsus, // Clase jutsus
    clsInteface = new Interface(),
    clsMap,
	quests,
	items,
	npcs = [],
	collisionMap,	// Map containing NPCs and enemies, 0 = walkable, 1 = enemy, 2 = enemy, 3 = not walkable
	worldSize,
	adjustedTileSize,
	showMap = false,
	showQuests = false,
	lastClicked = {x: null, y: null},
	lastMapUpdate = Date.now(),
	socket,		// Socket connection
	tellCounter = 0,
    questlist = [];
    
/* ------------------------------
    Iniciando el juego
*------------------------------*/
window.onload = function() {
	// Inicia la conexion al socket
	socket = io.connect();

	// Start listening for events
	setEventHandlers();

	// Fialize chatlog scrollbar
	$("#chat").mCustomScrollbar({ autoHideScrollbar: true, });

    // Fialize chatlog scrollbar
	//simpleScroll.init("chat");
}

// GAME EVENT HANDLERS
let setEventHandlers = function() {
    // Keyboard
	document.getElementById("Mensaje").addEventListener("keydown", localMessage, false);

    // Window resize
	window.addEventListener("resize", onResize, false);
    window.addEventListener("load", onResize, false);

	// Socket connection successful
	socket.on('connect', onSocketConnected);

    // Account characters - load the characters of the account on screen
    socket.on('account:characters', onAccountCharacters);

    // Message
    socket.on('chat:newMessage', onReceiveMessage);

    // Create Local Player
    socket.on('players:localPlayer', onCreateLocalPlayer);

    // Create remote player
    socket.on('players:remotePlayer', onNewRemotePlayer);

    // Player move message received
	socket.on('player:move', onMovePlayer);

    // Carga Mapa
    socket.on('map:data', onMapData);

    // REDIMENCIONA EL MAPA
    socket.on('map:init', onInitMap);

    // Carga la coliciones
    socket.on('map:collision', onInitCollisionMap);
}

/*-------------------------------
    Socket connected
*-------------------------------*/
function onSocketConnected () {
    // Carga la pantalla de carga
    clsInteface.loadScreen();

    // Tell game server client connected
    var idAccount = prompt("id del pj");
	socket.emit('account:connected', {idAccount: idAccount});
}

/*-------------------------------
    Personajes
*-------------------------------*/
// Muestra los personajes en la interface
function onAccountCharacters (data) {
    // Ocualta la pantalla de carga
    $('#loading').addClass('Invisible');

    // Muestra la pantalla de los personajes
    $('#personajes').removeClass('Invisible');

    let maxPj = 5, html;

    selCharacter(data[0].id, data[0].skinBase, data[0].nombre, data[0].statFuerza, data[0].statAgilidad, data[0].statInteligencia, data[0].statSellos, data[0].statResistencia, data[0].statVitalidad, data[0].statDestreza, data[0].statPercepcion);

    data.forEach((Pj) => {

        let dataPJ = [Pj.id, Pj.skinBase, Pj.nombre, Pj.statFuerza, Pj.statAgilidad, Pj.statInteligencia, Pj.statSellos, Pj.statResistencia, Pj.statVitalidad, Pj.statDestreza, Pj.statPercepcion];

        html += clsInteface.accountCharacters(dataPJ);
    });

    for (let count = (data.length + 1); count <= maxPj; count++) {
        html += clsInteface.accountNewCharacter(count, data[0].id);
    }

    $('#listPersonajes').append(html);
}

function selCharacter (...data) {
    let [id, skinBase, nombre, statFuerza, statAgilidad, statInteligencia, statSellos, statResistencia, statVitalidad, statDestreza, statPercepcion] = data;

    $('#characters_Skin').replaceWith(`<div id="characters_Skin" style="margin-top: 15%; margin-left: 40%;"><img src="../sprites/Player/Base/${skinBase}.png" style="width: 150px;"></div>`);
    $('#characters_BtnGetInGame').replaceWith(`<div id="characters_BtnGetInGame" class="mx-auto" style="width: 50%; margin-top: 10%;"><button onclick="getInGame(${id});" style="width: 100%;">Entrar al mundo</button></div>`);

    $('#characters_Name').replaceWith(`<div id="characters_Name"><b>Nombre: ${nombre}</b></div>`);
    $('#characters_Rank').replaceWith(`<div id="characters_Rank"><b>Rango: rango</b></div>`);

    atributos.series[0].update({
        data: [statFuerza, statAgilidad, statInteligencia, statSellos, statResistencia, statVitalidad, statDestreza, statPercepcion]
    });
}

/*-------------------------------
    Crear Personaje
*-------------------------------*/
function createCharacter (data) {
    // Oculta los personajes
    $('#personajes').addClass('Invisible');

    alert("crear pj "+ data);
}

/*-------------------------------
    Iniciar videojuego
*-------------------------------*/
function getInGame (data) {
    // Oculta los personajes
    $('#personajes').addClass('Invisible');

    clsInteface.loadScreen();

    socket.emit('player:connected', {idPlayer: data});
}

function onNewRemotePlayer (data) {
	// Initialise new remote player
	remotePlayers.push(new RemotePlayer(data));
}

function onCreateLocalPlayer (data) {
    // Ocualta la pantalla de carga
    $('#loading').addClass('Invisible');

    // Muestra la interfaz principal
    $('#hubPrincial').removeClass('Invisible');

    // Inicia un nuevo jugador en la clase jugador
    localPlayer = new LocalPlayer(data);
    console.log("Localplayer created");

    // Declare the canvas and rendering context
	canvas = document.getElementById("game");
	ctx = canvas.getContext("2d");
	ctx.globalAlpha = 0.1;

	// Maximise the canvas
	canvas.width = 1184;
	canvas.height = 1184;

    // REDIMENCIONA EL CANVAS
    onResize();
}

function onInitMap (data) {
    // CARGA LAS CAPAS
    clsMap.setCapas(data);

    clsMap.getSpritesheet().onload = function() {
        // INICIA ANIMACION
        animate();
    };
}

function onMapData (data) {
    clsMap = new Map(data);
}

// Inicia las coliciones del map - 100%
function onInitCollisionMap (data) {
    collisionMap = data.collisionMap;
}

/*-------------------------------
    Funciones de Ayuda
*-------------------------------*/
// Buscar el jugador remoto
function findRemotePlayer (id) {
    for (let remotePlayer of remotePlayers) {
        if (remotePlayer.getID() == id) {
            return remotePlayer;
        }
    }

	return false;
}

// Retornar player
function findPlayer (id) {
    let player;

    if (localPlayer.getID() === id){
        player = localPlayer;
    } else {
        player = findRemotePlayer(id);
    }

    return player;
}

/*-------------------------------
    Videojuego cargado
*-------------------------------*/
// Move player
function onMovePlayer (data) {
    let player = findPlayer(data.id);

    if (player) {        
        player.setPos(data.posWorld.x, data.posWorld.y);
        player.setDir(data.dir);
        player.setAbsPos(0, 0);
    } else {
        console.log("MovePlayer - Player not found: "+ data.id);
    }
}

/*-------------------------------
    Mensajes
*-------------------------------*/
function onReceiveMessage (data) {
    let chatTxtClr;
	//var pColor = (data.player == localPlayer.name) ? "#CD96CD" : "#96CDCD";
    switch (data.mode) {
		case 's':
			chatTxtClr = "yellow";
			break;
		case 'w':
			chatTxtClr = "red";
			break;
		default:
			chatTxtClr = "white";
	}

    $('.text .mCSB_container').append("<span style='color: "+ chatTxtClr +";'>"+ data.name +": "+ data.text +"</span></br>");
	$('.text').mCustomScrollbar("update");
	$('.text').mCustomScrollbar("scrollTo","bottom");
	$('#Mensaje').val('');
}

function localMessage (e) {
    let help = false, text, opcion, sayMode, chatTo;

	if (e.keyCode == 13) {
		if (this.value) {
            text = this.value;

            if (text.charAt(0) == '/') {
                opcion = text.substring(1);

                if (text.charAt(1) == 'w') {
					sayMode = 'w';
					chatTo = null;
					text = text.substring(3);
				} else if (text.charAt(1) == 's') {
					sayMode = 's';
					chatTo = text.substring(3, text.indexOf(' ', 3));
					text = text.substring(text.indexOf(' ', 3));
				} else if (text.charAt(1) == 'd') {
					sayMode = 'd';
					chatTo = null;
					text = text.substring(3);
				} else if (opcion == 'loc') {
                    help = true;
                    text = `Posicion actual: X: ${localPlayer.getPos().x} - Y: ${localPlayer.getPos().y}`;
                } else if (opcion == 'ayuda') {
                    help = true;
                    text = 'Bienvenido al menu de ayuda. <br> - Usa /loc para saber tu ubicacion actual. <br> - Usa /Aradio para saber mas sobre la emisora de radio.';
                } else {
                    help = true;
                    text = 'Bienvenido al menu de ayuda. <br> - Usa /loc para saber tu ubicacion actual. <br> - Usa /Aradio para saber mas sobre la emisora de radio.';
                }
			}
            if (help) {
                onReceiveMessage({mode: sayMode, text: text, name: localPlayer.getName()});
            } else {
                socket.emit('chat:newMessage', {name: localPlayer.getName(), mode: sayMode, text: text, chatTo: chatTo});
            }
		}
		$('#Mensaje').blur();
	}
}

/*-------------------------------
    Funciones mouse videojuego
*-------------------------------*/
function getClickedTile (e) {
    //Click en la pagina
	var x = e.pageX;
	var y = e.pageY;

	return {x: Math.floor(x / 32), y: Math.floor(y / 32)};
}

game.onclick = function (e) {
	let tile = getClickedTile(e),
        playerPosX = Math.round((canvas.width / 2) / 32),
        playerPosY = Math.round((canvas.height / 2) / 32);

    console.log(tile);
    
    if (!(tile.x == lastClicked.x && tile.y == lastClicked.y) && !(tile.x == playerPosX && tile.y == playerPosY) && !(collisionMap[tile.y][tile.x] === 1)) { // To avoid a bug, where player wouldn't walk anymore, when clicked twice on the same tile

        $("#conversation, #confirmation").addClass("hidden");
		lastClicked = tile;

        if (collisionMap[tile.y][tile.x] == 2) { // Going to talk to NPC

            console.log("Habla con npc");

			lastClicked = {x: null, y: null};
			var npc = getNpcAt(tile.x * 32, tile.y * 32);

			if (npc.questID != null) {
				var quest = questlist[npc.questID];
				localPlayer.addQuest(quest);
			}

			localPlayer.setGoToNpc(npc);

        } else if (collisionMap[tile.y][tile.x] == 3) { // Going to attack enemy

            console.log("ataca al enemigo");

			for (var i = 0; i < enemies.length; i++) {
				if (enemies[i].alive && tile.x * 32 == enemies[i].x && tile.y * 32 == enemies[i].y) {
					localPlayer.setGoFight(i);
					break;
				}
			}

		} else {

			if (localPlayer.fighting != null) {

                console.log("abando pelea");
				tellCounter = 0;
				//socket.emit("abort fight", {id: localPlayer.ID});
			}

            console.log("camina");
            localPlayer.playerMove();
		}

        console.log("sigue a");
		localPlayer.stop = true;


		// Wait for the player to stop at next tile
		let timer = setInterval(() => {
			if (!localPlayer.isMoving()) {
				clearTimeout(timer);
				localPlayer.stop = false;
                let pathStart = {x: playerPosX, y: playerPosY},
                    pathfinder = new Pathfinder(collisionMap, pathStart, tile),
                    path = pathfinder.calculatePath();

				// Calculate path
				if (path.length > 0) {
					localPlayer.setPath(path);
				}
			}
		}, 1);
	}
}

document.onmousemove = function (e) {
    if (!$('#hubPrincial').hasClass('Invisible')) {
        let tile = getClickedTile(e);

        if (collisionMap[tile.y][tile.x] === 1) {
            document.documentElement.style.cursor = "url('../img/game/icons/mouse_noWalk.png') 16 16, auto";
        } else {
            document.documentElement.style.cursor = "url('../img/game/icons/mouse_walk.png') 16 16, auto";
        }
    }
}

function changeCharacter (mode) {
    clsInteface.changeCharacter(mode);
}

/*-------------------------------
    GAME ANIMATION LOOP
*-------------------------------*/
let lastRender = Date.now(), lastFpsCycle = Date.now();
function animate () {
    let dateNow = Date.now(),
	    delta = (dateNow - lastRender) / 1000;
    
    /*
    update(delta);
    draw();
    event();
    */
    /*
    update(delta);
    draw();
    event();
    //update(delta);
    */

    update(delta);
	lastRender = dateNow;
	draw();

	if(dateNow - lastFpsCycle > 1000){
		lastFpsCycle = dateNow;
		var fps = Math.round(1 / delta);
        //$("#fps").html("FPS: "+fps);
        $(".text").html("FPS: "+ fps +" DELTA: "+ delta);
	}
    // Request a new animation frame using Paul Irish's shim
    requestAnimationFrame(animate);
	//window.requestAnimFrame(animate);
}

/*-------------------------------
    GAME UPDATE
*-------------------------------*/
function update (delta) {
    // Mover el player
	if (localPlayer.isMoving()) {
		let absPos = localPlayer.getAbsPos(),
            width = $(window).width(),
            height = $(window).height(),
            tileSize = clsMap.getTileSize();

        localPlayer.playerMove(tileSize, delta);

        if (localPlayer.getLastFrame() > tileSize) {
            console.log("Dentro update");
            socket.emit('player:move', {id: localPlayer.getID(), x: absPos.absX, y: absPos.absY, dir: localPlayer.getDir()});
    
            // Mover el MAPA
            socket.emit('map:move', {width: width, height: height});
            localPlayer.setLastFrame(0);
        }
	}
    
    // Npc movimiento
    for (let i = npcs.length; i-- > 0;) {
        let npc = npcs[i];

        if (npc.isMoving()) {
            let absPos = npc.getAbsPos();
            
            //if (absPos.x || absPos.y) {
                console.log("Npc: "+ npc.getName() +" SE movio ");
                npc.playerMove();

                console.warn(`Movimiento del npc: ${absPos.absX} -- ${absPos.absY}`);

                socket.emit('npc:move', {id: npc.getID(), x: absPos.absX, y: absPos.absY, dir: npc.getDir()});
            //}
        }
    }
}

function event (delta) {
    let width = $('#game').outerWidth(),
        height = $('#game').outerHeight(),
        middleTileX = Math.round((width / 2) / 32),
        middleTileY = Math.round((height / 2) / 32),
        posWorld = localPlayer.getPos(),
        maxTilesX = Math.floor((width / 32) + 1),
        maxTilesY = Math.floor((height / 32) + 1);
    
    // Radio ataque Npc
    for (let i = npcs.length; i-- > 0;) {
        let npc = npcs[i],
            posNow = npc.posNow(middleTileX, middleTileY, posWorld);
        
        if (posNow && npc.isAggressive() && !npc.isMoving()) {
            
            let visionDistance = npc.getVisionDistance(),
                initVisionX = posNow.x - visionDistance,
                initVisionY = posNow.y - visionDistance,
                endVisionX = initVisionX + (visionDistance * 2),
                endVisionY = initVisionY + (visionDistance * 2);
            
            for (let y = initVisionY; y <= endVisionY; y++) {
                let x = posNow.x - visionDistance;
                for (; x <= endVisionX; x++) {
                    if (x >= middleTileX && x <= middleTileX && y >= middleTileY && y <= middleTileY) {

                        let pathFinder = new Pathfinder(collisionMap, posNow, {x: middleTileX, y: middleTileY}),
                            Mover = pathFinder.attack();
                            
                        console.log("El npc "+ npc.getName() +" Ataca a "+ localPlayer.getName() +"---"+ Mover);

                        if (Mover.length > 0) {
                            npc.setPath(Mover);
                        }
                    }
                }
            }
        }
    }
}

/*-------------------------------
    GAME DRAW
*-------------------------------*/
function draw () {
    let width = canvas.width,
        height = canvas.height,
        middleTileX = Math.round((width / 2) / 32),
        middleTileY = Math.round((height / 2) / 32),
        posWorld = localPlayer.getPos(),
        maxTilesX = Math.floor((width / 32) + 2),
        maxTilesY = Math.floor((height / 32) + 2),
        absPos = localPlayer.getAbsPos();

    // Wipe the canvas clean
	ctx.clearRect(0, 0, width, height);

    for (let h = 0; h < maxTilesY; h++) {
        for (let w = 0; w < maxTilesX; w++) {
            
            let dañoJugador;
            
            // Dibuja capas inferiores
            clsMap.drawMapDown(ctx, w, h);

            // Dibujar remote players
            /*
            for (let i = remotePlayers.length; i-- > 0;) {
                let remotePlayer = remotePlayers[i],
                    posNow = remotePlayer.posNow(middleTileX, middleTileY, posWorld);
                
                if (posNow.x == w && posNow.y == h) {
                    remotePlayer.draw(ctx, posNow.x, posNow.y);
                    dañoJugador = remotePlayer;
                }
            }
            */
            
            // Draw local playeyer
            if (middleTileX == w && middleTileY == h) {
                localPlayer.draw(ctx, middleTileX, middleTileY);
            }

            // Dibuja las capas superiores
            clsMap.drawMapUp(ctx, w, h);
        }
    }
}

// Browser window resize
function onResize (e) {
    // REDIMENZIONAR MAPA
    let width = $(window).width(),
        height = $(window).height();

    socket.emit('map:move', {width: width, height: height});

	// Maximise the canvas
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

    $('#game').css({
        width: $(window).width(),
        height: $(window).height()
    });

    if (showMap) {
        //drawMap();
    }
}