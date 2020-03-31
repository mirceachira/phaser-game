const players = {};

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  autoFocus: false
};
 
function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('star', 'assets/star_gold.png');
}

var numberOfUsers = 0;
var playerOne;
var playerTwo;
 
function create() {
  const self = this;
  this.players = this.physics.add.group();

  io.on('connection', function (socket) {
    console.log('a user connected');

    if (numberOfUsers == 2) {
      return;
    }
    
    // create a new player and add it to our players object
    newPlayer = {
      soc: socket,
      info: {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: (numberOfUsers == 0) ? 1 : 2,
        input: {
          left: false,
          right: false,
          up: false
        }
      }
    };

    socket.emit('youAre', players[socket.id]);

    if (numberOfUsers == 0) {
      playerOne = newPlayer;
      playerOne.soc.emit('youAre', playerOne.info);
    } else {
      playerTwo = newPlayer;
      playerTwo.soc.emit('youAre', playerTwo.info);
      playerTwo.soc.emit('foeIs', playerOne.info);
      playerOne.soc.emit('foeIs', playerTwo.info);
    }

    numberOfUsers += 1;

    socket.on('playButtonPressed', function () {
      addPlayer(self, playerOne.info);
      addPlayer(self, playerTwo.info);
      playerOne.soc.emit('startGame');
      playerTwo.soc.emit('startGame');

      self.star.setPosition(randomPosition(700), randomPosition(500));
      playerOne.soc.emit('starLocation', { x: self.star.x, y: self.star.y });
      playerTwo.soc.emit('starLocation', { x: self.star.x, y: self.star.y });
  
    });

    // send the star object to the new player
    // socket.emit('starLocation', { x: self.star.x, y: self.star.y });
    // socket.broadcast.emit('starLocation', { x: self.star.x, y: self.star.y });
    // send the current scores
    // socket.emit('updateScore', self.scores);

    socket.on('disconnect', function () {
      console.log('user disconnected');
      removePlayer(self, socket.id);
      delete players[socket.id];
      io.emit('disconnect');
      numberOfUsers -= 1;
    });

    // when a player moves, update the player data
    socket.on('playerInput', function (inputData) {
      handlePlayerInput(self, inputData.playerId, inputData.keys);
    });
  });

  this.scores = {
    blue: 0,
    red: 0
  };
   
  this.star = this.physics.add.image(randomPosition(700), randomPosition(500), 'star');
  this.physics.add.collider(this.players);
   
  this.physics.add.overlap(this.players, this.star, function (star, player) {
    if (player.playerId === playerOne.info.playerId) {
      self.scores.blue += 10;
    } else {
      self.scores.red += 10;
    }
    self.star.setPosition(randomPosition(700), randomPosition(500));
    

    if (self.scores.blue == 30 || self.scores.red == 30) {
      self.players.clear();

      if (self.scores.blue == 30) {
        playerOne.soc.emit('closeGame', { result: 'You won!'});
        playerTwo.soc.emit('closeGame', { result: 'You lost!'});
      } else {
        playerTwo.soc.emit('closeGame', { result: 'You won!'});
        playerOne.soc.emit('closeGame', { result: 'You lost!'});
      }
      self.scores.blue = 0;
      self.scores.red = 0;
    } else {
      playerOne.soc.emit('updateScore', {me: self.scores.blue, other: self.scores.red});
      playerTwo.soc.emit('updateScore', {me: self.scores.red, other: self.scores.blue});
      
      playerOne.soc.emit('starLocation', { x: self.star.x, y: self.star.y });
      playerTwo.soc.emit('starLocation', { x: self.star.x, y: self.star.y });
    }
  });
}
 
function update() {
  if (playerOne == undefined || playerTwo == undefined) return;

  this.players.getChildren().forEach((player) => {
    const input = (player.playerId == 1) ? playerOne.info.input : playerTwo.info.input;

    if (input.left) {
      player.setAngularVelocity(-300);
    } else if (input.right) {
      player.setAngularVelocity(300);
    } else {
      player.setAngularVelocity(0);
    }
  
    if (input.up) {
      this.physics.velocityFromRotation(player.rotation + 1.5, 200, player.body.acceleration);
    } else {
      player.setAcceleration(0);
    }
  
    if (player.playerId == playerOne.info.playerId) {
      playerOne.info.x = player.x;
      playerOne.info.y = player.y;
      playerOne.info.rotation = player.rotation;
    } else {
      playerTwo.info.x = player.x;
      playerTwo.info.y = player.y;
      playerTwo.info.rotation = player.rotation;
    }
  });
  this.physics.world.wrap(this.players, 5);
  io.emit(
    'playerUpdates',
    {
      1: {x: playerOne.info.x, y: playerOne.info.y, rotation: playerOne.info.rotation}, 
      2: {x: playerTwo.info.x, y: playerTwo.info.y, rotation: playerTwo.info.rotation}
    }
  );
}


function handlePlayerInput(self, playerId, input) {
  if (playerId == 1) {
    playerOne.info.input = input;
  } else {
    playerTwo.info.input = input;
  }
}

function addPlayer(self, playerInfo) {
  const player = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  player.setDrag(100);
  player.setAngularDrag(100);
  player.setMaxVelocity(200);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}

function removePlayer(self, playerId) {
  self.players.getChildren().forEach((player) => {
    if (playerId === player.playerId) {
      player.destroy();
    }
  });
}

function randomPosition(max) {
  return Math.floor(Math.random() * max) + 50;
}

const game = new Phaser.Game(config);

window.gameLoaded();