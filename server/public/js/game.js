var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
 
var game = new Phaser.Game(config);
 
function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('star', 'assets/star_gold.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
}
 
var gameOn = false;
var button;

var myInfo = undefined;
var foeInfo = undefined;

var mainButton;

var blueScoreText;
var redScoreText;

var scores = {
  blue: 0,
  red: 0
}


function create() {
  var self = this;
  this.socket = io();
  this.players = this.add.group();

  blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

  mainButton = this.add.text(150, 250, 'room is busy, try again later..', { fontSize: '32px', fill: '#FFFFFF' });
  mainButton.setInteractive();  
  mainButton.on('pointerdown', function(event) {
    console.log('pointdown still works!');
    if (foeInfo == undefined) {
      return;
    }
    self.socket.emit('playButtonPressed');
  });

  this.socket.on('youAre', function(info) {
      myInfo = info;
      mainButton.setText('waiting for other player..');
    }
  );
  this.socket.on('foeIs', function(info) {
    foeInfo = info;
    mainButton.setText('play');
  });

  this.socket.on('startGame', function() {
    gameOn = true;
    mainButton.setText('');

    displayPlayers(self, myInfo, 'ship', 'blue');
    displayPlayers(self, foeInfo, 'otherPlayer', 'red');

    blueScoreText.setText('me: ' + scores.blue);
    redScoreText.setText('enemy: ' + scores.red);
  });

  this.socket.on('closeGame', function(result) {
    blueScoreText.setText('');
    redScoreText.setText('');

    mainButton.setText(result.result + ' Play again?');

    self.players.clear(true, true);
    
    self.star.destroy();
    delete self.star;
  })
 
  this.socket.on('disconnect', function () {
    self.players.clear(true, true);
    mainButton.setText('enemy disconnected..');
    foeInfo = undefined;
    blueScoreText.setText('');
    redScoreText.setText('');
    scores.blue = 0;
    scores.red = 0;
  });

  this.socket.on('playerUpdates', function (players) {
    if (gameOn) {
      self.players.getChildren().forEach(function (player) {
        player.setRotation(players[player.playerId].rotation);
        player.setPosition(players[player.playerId].x, players[player.playerId].y);
      });
    }
  });

  this.socket.on('updateScore', function (scores) {
    if (gameOn == true) {
        blueScoreText.setText('me: ' + scores.me);
        redScoreText.setText('enemy: ' + scores.other);
    } else {
      blueScoreText.setText('');
      redScoreText.setText('');
    }
  });
  
  this.socket.on('starLocation', function (starLocation) {
    console.log(gameOn, self.star, starLocation);
    if (gameOn) {
      if (!self.star) {
        self.star = self.add.image(starLocation.x, starLocation.y, 'star');
      } else {
        self.star.setPosition(starLocation.x, starLocation.y);
      }
    } else {
      if (self.star) {
        delete self.star;
      }
    }
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  this.leftKeyPressed = false;
  this.rightKeyPressed = false;
  this.upKeyPressed = false;
}
 
function update() {
  const left = this.leftKeyPressed;
  const right = this.rightKeyPressed;
  const up = this.upKeyPressed;
  
  if (this.cursors.left.isDown) {
    this.leftKeyPressed = true;
  } else if (this.cursors.right.isDown) {
    this.rightKeyPressed = true;
  } else {
    this.leftKeyPressed = false;
    this.rightKeyPressed = false;
  }
  
  if (this.cursors.up.isDown) {
    this.upKeyPressed = true;
  } else {
    this.upKeyPressed = false;
  }
  
  if (left !== this.leftKeyPressed || right !== this.rightKeyPressed || up !== this.upKeyPressed) {
    this.socket.emit(
      'playerInput',
      { 
        playerId: myInfo.playerId,
        keys: {
          left: this.leftKeyPressed ,
          right: this.rightKeyPressed,
          up: this.upKeyPressed 
        }
      }
    );
  }
}


function displayPlayers(self, playerInfo, sprite, color) {
  const player = self.add.sprite(playerInfo.x, playerInfo.y, sprite).setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (color === 'blue') player.setTint(0x0000ff);
  else player.setTint(0xff0000);
  player.playerId = playerInfo.playerId;
  self.players.add(player);
}
