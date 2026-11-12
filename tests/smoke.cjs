const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../vendor/three.min.js');
const nodes=new Map(),handlers={};let callback,now=0;
function node(){return {hidden:false,style:{},dataset:{},textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},appendChild(){},addEventListener(){},setPointerCapture(){},showModal(){this.open=true},close(){this.open=false},getContext(){return {fillRect(){},fillStyle:''}}};}
THREE.WebGLRenderer=class{constructor(){this.domElement=node();this.shadowMap={};this.info={render:{calls:0}}}setPixelRatio(){}setSize(){}render(){}};
const sandbox={THREE,console,innerWidth:1440,innerHeight:900,devicePixelRatio:1,performance:{now:()=>now},localStorage:{getItem(){return null},setItem(){}},document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll:()=>[],body:node(),addEventListener(){}},addEventListener:(type,f)=>handlers[type]=f,requestAnimationFrame:f=>callback=f};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync('game.js','utf8'),sandbox);const game=sandbox.riderGame;
function frames(n){for(let i=0;i<n;i++){now+=1000/60;callback(now);}}
function down(code){handlers.keydown({code,preventDefault(){}})}function up(code){handlers.keyup({code})}
assert.equal(game.snapshot().mode,'intro');for(let scene=0;scene<3;scene++){game.setScene(scene);assert(game.snapshot().clearance>=6.39,'scene '+scene+' must keep scenery outside the track');}game.setScene(0);frames(90);const lightDay=game.snapshot();game.setScene(2);frames(150);const lightDark=game.snapshot();assert(lightDark.darkness>lightDay.darkness+.3,'tunnel must be darker');assert(lightDark.headlight>lightDay.headlight+10,'dark scene must brighten the headlight');assert(lightDark.eyeGlow>lightDay.eyeGlow+.5,'dark scene must brighten the eyes');assert(lightDark.beltGlow>lightDay.beltGlow+.5,'dark scene must brighten the belt');game.setScene(0);frames(60);game.start();assert.equal(game.snapshot().camera,1);assert.equal(game.snapshot().windReady,true);assert(game.snapshot().clearance>=6.39,'scenery must stay outside the track clearance');down('KeyC');up('KeyC');assert.equal(game.snapshot().camera,2);game.start();assert.equal(game.snapshot().camera,1);frames(60);assert(game.snapshot().distance>25);assert(game.snapshot().speed>=110);
// Move outside obstacle lanes to measure vehicle behavior independently.
down('KeyD');frames(90);up('KeyD');assert.equal(game.snapshot().x,4.05);
down('KeyW');frames(180);up('KeyW');assert.equal(game.snapshot().speed,220);
down('Space');frames(15);up('Space');assert(game.snapshot().jump>.5);frames(90);assert.equal(game.snapshot().jump,0);
down('ShiftLeft');frames(20);assert.equal(game.snapshot().boost,false);assert(game.snapshot().spool>0);
frames(100);assert(game.snapshot().boost);assert(game.snapshot().energy<100);assert(game.snapshot().speed>270);assert(game.snapshot().flamePower>.9);
const boostSpeed=game.snapshot().speed;up('ShiftLeft');frames(1);assert.equal(game.snapshot().boost,false);assert(game.snapshot().speed>boostSpeed-2,'release must not snap down to normal cap');
const beforeCharge=game.snapshot().energy;down('KeyE');frames(45);assert(game.snapshot().charging);assert(game.snapshot().energy>beforeCharge+15);assert(game.snapshot().beltPower>0,'belt vortex must be visible while absorbing');up('KeyE');
// Empty tank cannot repeatedly reignite while Shift remains held.
down('ShiftLeft');frames(330);assert.equal(game.snapshot().boost,false);assert(game.snapshot().boostLocked);assert(game.snapshot().flamePower<.1);frames(90);assert.equal(game.snapshot().boost,false);up('ShiftLeft');frames(1);assert.equal(game.snapshot().boostLocked,false);
// Tap-to-toggle absorb: start, stop, then hold open until the tank is full.
down('KeyE');frames(12);assert(game.snapshot().charging);const idleEnergy=game.snapshot().energy;up('KeyE');down('KeyE');frames(1);assert.equal(game.snapshot().charging,false);up('KeyE');assert(game.snapshot().energy>=idleEnergy);
down('KeyE');let windFrames=0;while(game.snapshot().energy<100&&windFrames++<600)frames(1);assert.equal(game.snapshot().energy,100);assert.equal(game.snapshot().windReady,true);assert.equal(game.snapshot().absorbing,false);assert.equal(game.snapshot().charging,false);assert(game.snapshot().windBurst>.5,'full wind must trigger the belt burst');up('KeyE');
game.pause();const paused=game.snapshot();frames(60);assert.equal(game.snapshot().distance,paused.distance);assert.equal(game.snapshot().energy,paused.energy);assert.equal(game.snapshot().time,paused.time);game.pause();
down('KeyW');frames(6000);up('KeyW');assert.equal(game.snapshot().mode,'finished');assert.equal(game.snapshot().scene,2);assert(game.snapshot().distance>=3000);
game.start();const lanes1=game.snapshot().items.filter(i=>i.kind==='barrier').map(i=>i.x);assert(new Set(lanes1).size>=2,'barriers must cover more than one lane');
const layout1=game.snapshot().items.map(i=>i.kind+i.x).join('|');game.start();const layout2=game.snapshot().items.map(i=>i.kind+i.x).join('|');assert.notEqual(layout1,layout2,'each start must reroll the layout');
game.start();frames(300);assert(game.snapshot().score>0);
// Pick a real barrier from this run, steer into its lane, then wait for the collision.
game.start();const target=game.snapshot().items.filter(i=>i.kind==='barrier').reduce((a,b)=>b.z>a.z?b:a);const dir=target.x>0?'KeyD':target.x<0?'KeyA':null;if(dir)down(dir);let steerFrames=0;while(dir&&Math.abs(game.snapshot().x-target.x)>.12&&steerFrames++<240)frames(1);if(dir)up(dir);let collideFrames=0;while(game.snapshot().hp===5&&collideFrames++<2400)frames(1);assert(game.snapshot().hp<5);
game.start();assert.equal(game.snapshot().hp,5);assert.equal(game.snapshot().distance,0);assert.equal(game.snapshot().spool,0);game.home();frames(1);assert.equal(game.snapshot().mode,'intro');assert.equal(game.snapshot().flamePower,0);assert.equal(game.snapshot().windOpacity,0);
// Brake input is gone: S must not change the cruise speed.
game.start();const cruise=game.snapshot().speed;down('KeyS');frames(60);up('KeyS');assert.equal(game.snapshot().speed,cruise);
console.log('PASS: cruise/top speed, wind toggle + belt burst + full charge, dark-scene headlight/eyes/belt, spool, flames, depletion lockout, smooth boost release, no brake input, jump, pause, track clearance, randomized barrier layouts, collisions, pickups, scene progression, completion and reset.');
