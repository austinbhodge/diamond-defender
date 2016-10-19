var mouseDown = false;

function setMouse(v){
  mouseDown = v;
}


function init(){
  var stage = new createjs.Stage("canvas");

  var player = new newPlayer(700,700);
  var mouse = new Mouse();
  var laser = new Phaser('laser');
  var kick = new Kick();
  var upgrades = new upgradeBtn();
  var enem = new enemy();

  createjs.Ticker.setFPS(55);
  createjs.Ticker.addEventListener("tick", handleTick);

  var blurX = new createjs.BlurFilter(120, 0, 1);
  var blurY = new createjs.BlurFilter(0, 120, 1);
  var superBlur = new createjs.BlurFilter(200, 200, .5);
  var isPaused = false;

//----------------------------------------Game loop

function handleTick(event) {
 updateMap();
}


function setMouse(v){
  mouseDown = v;
}


function updateMap(){
  kick.update();
  laser.update();
  mouse.update();
  player.update();
  enem.update();
  upgrades.update();

  stage.update();
  if(!stage.mouseInBounds){
    mouseDown = false;
  }
}



  function upgradeBtn(){
    this.menuOpen = false;
    this.btn = new createjs.Shape();
    this.btn.graphics.beginFill("rgb(42, 47, 47)").drawRect(1312, 13, 100, 30);
    this.btnText = new createjs.Text("upgrades", "18px Hammersmith One", "#fff");
    this.btnText.x = 1320;
    this.btnText.y = 16;
    this.btn.alpha = 0.3;
    this.btnText.alpha = 0.4;
    this.btn.addEventListener("click", function(){this.menuOpen = true;})
    stage.addChild(this.btnText);
    stage.addChild(this.btn);

    this.update = function(){
      if (this.menuOpen == true){
        this.upgradeMenu = new createjs.Shape();
        this.upgradeMenu.graphics.beginFill("rgb(42, 47, 47)").drawRect(800, 0, 600, 800);
        stage.addChild(this.upgradeMenu);
      }

    }
  }






  function enemy(){
    this.hp = 50;
    this.en = new createjs.Shape();
    this.en.graphics.beginFill("rgb(126, 0, 0)").drawPolyStar(0, 0, 7, 3, 2, 90);
    stage.addChild(this.en);
    this.speed = 6;
    this.acc = 0.05;
    this.velocityX = 0;
    this.velocityY = 0;
    this.angle = 0;


    this.update = function(){
      if(player.ship.x > this.en.x){
        this.en.x += this.velocityX;
        this.velocityX += this.acc;
      }
      if(player.ship.x < this.en.x){
        this.en.x -= this.velocityX;
        this.velocityX -= this.acc;
      }
      if(player.ship.y > this.en.y){
        this.en.y += this.velocityY;
        this.velocityY += this.acc;
      }
      if(player.ship.y < this.en.y){
        this.en.y -= this.velocityY;
        this.velocityY -= this.acc;
      }
    }
  }








function newPlayer(x,y){
  this.angle = 0;
  this.ship = new createjs.Shape();
  this.ship.graphics.beginFill("rgb(0, 180, 174)").drawPolyStar(0, 0, 14, 2, 0.7,90);
  stage.addChild(this.ship);
  this.ship.regX = this.ship.height/2;
  this.ship.regY = this.ship.width/2;
  this.velocityX = 0;
  this.velocityY = 0;
  this.accY = 0.08;
  this.accX = 0.08;
  this.maxVel = 9;
  this.maxAcc = 2;
  this.xNeg = 1;
  this.yNeg = 1;
  this.ship.x = window.innerWidth/2;
  this.ship.y = window.innerHeight/2;




  this.update = function(){

    this.ship.rotation = this.angle;
    this.ship.filters = []

    if ((key.isPressed('up') || key.isPressed('w')) || (key.isPressed('down') || key.isPressed('s'))){
      this.ship.filters = [blurY];
      if (key.isPressed('up') || key.isPressed('w')) {
        this.ship.y -= this.velocityY;
        this.aY();
        this.yNeg = -1;}

      if (key.isPressed('down') || key.isPressed('s')) {
        this.ship.y += this.velocityY;
        this.aY();
        this.yNeg = 1;}
      }      else if(this.velocityY > 0.005){
                this.velocityY -= this.velocityY/15;
                this.ship.y += this.velocityY * this.yNeg;
                if(this.accY > 0.05){
                  this.accY -= this.accY/30;}
              }else{
                this.velocityY = 0;
              }

    if ((key.isPressed('left') || key.isPressed('a')) || (key.isPressed('right') || key.isPressed('d'))){
      this.ship.filters = [blurX];
      if (key.isPressed('left') || key.isPressed('a')) {
        this.ship.x -= this.velocityX;
        this.aX();
        this.xNeg = -1;
        }
      if (key.isPressed('right') || key.isPressed('d')) {
        this.ship.x += this.velocityX;
        this.aX();
        this.xNeg = 1;
        }
      }
      else if(this.velocityX > 0.005){
        this.velocityX -= this.velocityX/15;
        this.ship.x += this.velocityX * this.xNeg;
        if(this.accX > 0.05){
          this.accX -= this.accX/30;}
      }else{
        this.velocityX = 0;
  }


//end of changes
    };

    this.aY = function () {
      if (this.velocityY < this.maxVel){
        this.velocityY += this.accY;
        if(this.accY < this.maxAcc){
          this.accY += this.accY/4;
        }
      }else if (this.velocityY >= this.maxVel) {
          this.accY = 0.05;
      }
    };

    this.aX = function(){

      if (this.velocityX < this.maxVel){
        this.velocityX += this.accX;
        if(this.accX < this.maxAcc && !(this.accX > this.maxAcc)){
          this.accX += this.accX/4;
        }
      }

    };



//end of ship
  }

function Mouse(){
  this.aim = new createjs.Shape();
  this.thetaDeg = 0;
  this.aim.graphics.beginFill("rgb(0, 232, 255)").drawPolyStar(0, 0, 15, 4, 0.95, 0);
  stage.addChild(this.aim);
  this.hypot = 0;

  this.update = function(){

    this.xOff = player.ship.x - stage.mouseX;
    this.yOff = player.ship.y - stage.mouseY;
    this.thetaDeg = (Math.atan(this.xOff/this.yOff))/Math.PI * 180;
    this.hypot = Math.sqrt(Math.pow(this.xOff,2) + Math.pow(this.yOff, 2));
    if (Math.cos(this.xOff) < 0 && this.thetaDeg <0){
      this.thetaDeg = (this.thetaDeg - 180 );
    }
    player.angle = this.thetaDeg * -1;
    this.aim.x = stage.mouseX;
    this.aim.y = stage.mouseY;
    };
  }


  function Kick(){
    this.kick = new createjs.Shape();
    this.thickness = 6;
    this.kick.graphics.beginFill("rgb(120, 162, 171)").drawCircle(0, 0, 1);
    this.kick.alpha = 0;
    this.expandRate = 1;
    this.decayRate = 100;
    this.maxRad = 30;
    this.active = false;
    this.elapsed = false;
    this.loop= false;

    stage.addChild(this.kick);

    this.update = function(){
      if(key.isPressed('e') && !this.loop){
        this.active = true;
        this.elapsed = true;
      }

      if(this.elapsed){
        this.decayRate -= 1;
        if(this.decayRate < 0){
          this.loop = false;
          this.elapsed = false;
          this.decayRate = 100;
        }
      }

      if(this.active){
        this.loop = true;
        this.kick.alpha = .85;
        this.active = false;
        }
      if(this.loop){
        this.kick.scaleX +=0.5 + 0.44*this.kick.scaleX;
        this.kick.scaleY +=0.5 + 0.44*this.kick.scaleY;
        this.kick.x = player.ship.x;
        this.kick.y = player.ship.y;
        this.kick.alpha -=.06;
      }else{
        this.kick.scaleX = 1;
        this.kick.scaleY = 1;
        this.kick.alpha = 0.15;
      }
    }
  }



  function Phaser(type){
    this.type = type;
    this.flip = 1;
    this.angle = mouse.thetaDeg;
    this.r = mouse.hypot;
    this.shapeAr = [];
    this.firing = false;
    this.resonance = 0;
    this.harmony = 0;
    this.limit = 200;
    this.speed = -16;
    this.cycle = 0;
    this.cycleDown = false;

    this.update = function(){

      this.xOff = (player.ship.x - stage.mouseX) * -1;
      this.yOff = player.ship.y - stage.mouseY;

      this.angle = (Math.atan(this.xOff/this.yOff))/Math.PI * 180;
      if (this.yOff > 0){
        this.angle += -180;
      }
      this.r = mouse.hypot;


      //dubCannon
      if (this.type == 'dub'){

        this.thick = 6 ;
        this.speed = -8;
        this.cycleMax = 2;
        this.baseAmp = 40;

        if(mouseDown && this.shapeAr.length < this.limit){
        this.laserRay = new createjs.Shape();
        this.amp = this.baseAmp - Math.random()*10;
        this.laserRay.graphics.beginFill("rgb(107, 233, 255)").drawRect(0, 0,  this.amp, this.thick);
        this.laserRay.regY = this.laserRay.height -this.amp;
        this.laserRay.regX = this.laserRay.width +this.amp;
        this.laserRay.rotation = this.angle;
        this.offsetX = player.ship.x + Math.cos(((this.laserRay.rotation+270)/180)*Math.PI) *3.5 - Math.cos(((this.laserRay.rotation+270)/180)*Math.PI) * this.amp/2 ;

        this.offsetY = player.ship.y + Math.sin(((this.laserRay.rotation+270)/180)*Math.PI) *3.5 - Math.sin(((this.laserRay.rotation+270)/180)*Math.PI) * this.amp/2;
        this.laserRay.x = this.offsetX +2.5*this.flip;
        this.laserRay.y = this.offsetY +2.5*this.flip;

        this.laserRay.alpha = 0.7;

        this.laserRay.filters = [blurX,blurY, superBlur];
        stage.addChild(this.laserRay);

        this.shapeAr.push(this.laserRay);}

        for (i=0; i<this.shapeAr.length;i++){
          this.xVel = Math.cos(((this.shapeAr[i].rotation+270)/180)*Math.PI) * this.speed;
          this.yVel = Math.sin(((this.shapeAr[i].rotation+270)/180)*Math.PI) * this.speed;
          this.shapeAr[i].alpha -= 0.02 ;
          this.shapeAr[i].scaleX = this.cycle * this.flip;
          if(this.cycle < this.cycleMax && !this.cycleDown){
            this.cycle += .001;
          }else{this.cycleDown = true};

          if(this.cycleDown && this.cycle > 0){
            this.cycle -= 0.001;
          }

          if(this.cycle <= 0){
            this.cycleDown = false;
          }

          if(!mouseDown && this.cycle > 0.4){
            this.cycleDown = true;
            this.cycle -= .001
          }




          this.shapeAr[i].x += this.xVel;
          this.shapeAr[i].y += this.yVel;
          if (this.shapeAr[i].x < 0 || this.shapeAr[i].x > window.innerWidth || this.shapeAr[i].y < 0 || this.shapeAr[i].y > window.innerHeight){
            this.shapeAr[i].graphics.clear();
            this.shapeAr.splice(i,1);
          }
        }
      }


      // Laser Phaser;
      if (this.type == 'laser'){
        if(mouseDown && this.shapeAr.length < this.limit){
        this.laserRay = new createjs.Shape();

        this.laserRay.graphics.beginFill("rgb(107, 233, 255)").drawRect(0, 0,  2, 22);
        this.laserRay.regY = this.laserRay.height/2;
        this.laserRay.regX = this.laserRay.width * -1;
        this.laserRay.rotation = this.angle;
        this.laserRay.x = player.ship.x;
        this.laserRay.y = player.ship.y;
        this.laserRay.filters = [blurX,blurY, superBlur];
        this.laserRay.alpha= 1;
        stage.addChild(this.laserRay);

        this.shapeAr.push(this.laserRay);}

        for (i=0; i<this.shapeAr.length;i++){
          this.xVel = Math.cos(((this.shapeAr[i].rotation+270)/180)*Math.PI) * this.speed;
          this.yVel = Math.sin(((this.shapeAr[i].rotation+270)/180)*Math.PI) * this.speed;
          if( Math.cos(((this.shapeAr[i].rotation)/180)*Math.PI)> 0){
            this.xVel *= 1;
          }
          this.shapeAr[i].alpha -= 0.015;
          this.shapeAr[i].x += this.xVel *(1 - Math.random()*0.25);
          this.shapeAr[i].y += this.yVel *(1 - Math.random()*0.25);
          if (this.shapeAr[i].x < 0 || this.shapeAr[i].x > window.innerWidth || this.shapeAr[i].y < 0 || this.shapeAr[i].y > window.innerHeight){
            this.shapeAr[i].graphics.clear();
            this.shapeAr.splice(i,1);
          }
        }
      }
    };
  }
}
