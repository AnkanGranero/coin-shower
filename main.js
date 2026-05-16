// ----- Start of the assigment ----- //
const POOL_SIZE = 60;
const SPAWN_INTERVAL = 0.005;
const PULSE_COIN_AMOUNT = 20;
const BASE_DURATION = 1200;
let VELOCITY_RANGE = 2000;
const COIN_SCALE_MIN = 0.08;
let DEPTH = 0.32;
let SCALE_GROWTH = 0.2;
const FADE_IN = 0.15;
const SPAWN_END = 0.7;

class ParticleSystem extends PIXI.Container {
	constructor() {
		super();

		// Set start and duration for this effect in milliseconds
		this.start = 0;
		this.duration = 10000;
		// used for spawning more coins at the pulse
		this.lastPulse = 0;

		this.pool = [];
		this.activeCoins = [];
		this.lastSpawn = 0;

		// Populate pool with inactive coins
		for (let i = 0; i < POOL_SIZE; i++) {
			let sp = game.sprite("CoinsGold000");
			sp.pivot.x = sp.width / 2;
			sp.pivot.y = sp.height / 2;
			this.addChild(sp);
			sp.visible = false;
			this.pool.push(sp);
		}
	}
	spawnCoin(nt) {
		let sp = this.pool.pop();
		sp.visible = true;
		// randomize startposition, size, arc height, horizontal velocity
		sp.startX = 350 + Math.random() * 100;
		sp.baseScale = COIN_SCALE_MIN + Math.random() * DEPTH;
		sp.arcHeight = Math.random() * 400;
		sp.velocityX = (Math.random() - 0.5) * VELOCITY_RANGE;

		sp.spawnNt = nt;
		// larger coins moves faster than smaller to give parallax feel, 1.4 must be > COIN_SCALE_MIN + DEPTH, otherwise duration becomes negative
		sp.duration =
			((BASE_DURATION + sp.arcHeight * 2) * (1.4 - sp.baseScale)) /
			this.duration;
		//sort array by scale so that larger coins render in front of smaller ones
		let insertIndex = 0;
		for (let i = 0; i < this.activeCoins.length; i++) {
			if (this.activeCoins[i].baseScale < sp.baseScale) insertIndex++;
		}
		this.setChildIndex(sp, insertIndex);
		this.activeCoins.push(sp);
	}
	animTick(nt, lt, gt) {
		// Every update we get three different time variables: nt, lt and gt.
		//   nt: Normalized time in procentage (0.0 to 1.0) and is calculated by
		//       just dividing local time with duration of this effect.
		//   lt: Local time in milliseconds, from 0 to this.duration.
		//   gt: Global time in milliseconds,

		//spawn new coin if enough time has passed
		if (
			nt - this.lastSpawn > SPAWN_INTERVAL &&
			this.pool.length > 0 &&
			nt < SPAWN_END
		) {
			// add extra burst of spawning coins every second
			if (lt - this.lastPulse >= 1000) {
				this.lastPulse = lt;
				for (let i = 0; i < PULSE_COIN_AMOUNT && this.pool.length > 0; i++) {
					this.spawnCoin(nt);
				}
			} else {
				this.spawnCoin(nt);
			}
			this.lastSpawn = nt;
		}

		for (let i = this.activeCoins.length - 1; i >= 0; i--) {
			let sp = this.activeCoins[i];
			let age = nt - sp.spawnNt;
			// 0 = new spawn , 1 = finished
			let lifeProgress = age / sp.duration;

			if (lifeProgress >= 1) {
				//return to pool
				sp.visible = false;
				this.pool.push(sp);
				this.activeCoins.splice(i, 1);
				continue;
			}

			// cycle through sprite frames based on lifeProgress
			let frameIndex = Math.floor(lifeProgress * 32) % 8;
			let frame = ("000" + frameIndex).substr(-3);
			game.setTexture(sp, "CoinsGold" + frame);
			//animate position
			sp.y =
				225 +
				Math.sin(lifeProgress * Math.PI) * -sp.arcHeight +
				lifeProgress * 400;
			sp.x = sp.startX + lifeProgress * sp.velocityX;
			// animate scale up to 1+SCALE_GROWTH times baseScale to create illusion of coins coming at us
			sp.scale.x = sp.scale.y =
				sp.baseScale * (1 + lifeProgress * SCALE_GROWTH);

			// Animate alpha
			sp.alpha = lifeProgress < FADE_IN ? lifeProgress * (1 / FADE_IN) : 1;
			// Animate rotation
			sp.rotation = lifeProgress * Math.PI * 2;
		}
	}
	reset() {
		for (let i = this.activeCoins.length - 1; i >= 0; i--) {
			let sp = this.activeCoins[i];
			sp.visible = false;
			this.pool.push(sp);
		}
		this.activeCoins = [];
		this.lastSpawn = 0;
		this.lastPulse = 0;
	}
}

// ----- End of the assigment ----- //

class Game {
	constructor(props) {
		this.totalDuration = 0;
		this.effects = [];
		this.renderer = new PIXI.WebGLRenderer(800, 450);
		document.getElementById("canvas-container").appendChild(this.renderer.view);
		this.stage = new PIXI.Container();
		this.loadAssets(props && props.onload);
	}
	loadAssets(cb) {
		let textureNames = [];
		// Load coin assets
		for (let i = 0; i <= 8; i++) {
			let num = ("000" + i).substr(-3);
			let name = "CoinsGold" + num;
			let url = "gfx/CoinsGold/" + num + ".png";
			textureNames.push(name);
			PIXI.loader.add(name, url);
		}
		PIXI.loader.load(
			function (loader, res) {
				// Access assets by name, not url
				let keys = Object.keys(res);
				for (let i = 0; i < keys.length; i++) {
					var texture = res[keys[i]].texture;
					if (!texture) continue;
					PIXI.utils.TextureCache[keys[i]] = texture;
				}
				// Assets are loaded and ready!
				this.start();
				cb && cb();
			}.bind(this),
		);
	}
	loop() {
		if (!this.isRunning) return;
		this.tick();
		this.render();
		requestAnimationFrame(this.loop.bind(this));
	}
	pause() {
		this.isRunning = false;
		this.pausedAt = Date.now();
	}
	resume() {
		this.t0 += Date.now() - this.pausedAt;
		this.isRunning = true;
		this.loop();
	}
	start() {
		for (let i = 0; i < this.effects.length; i++) {
			if (this.effects[i].reset) this.effects[i].reset();
		}
		this.isRunning = true;
		this.t0 = Date.now();
		this.loop();
	}

	addEffect(eff) {
		this.totalDuration = Math.max(
			this.totalDuration,
			eff.duration + eff.start || 0,
		);
		this.effects.push(eff);
		this.stage.addChild(eff);
	}
	render() {
		this.renderer.render(this.stage);
	}
	tick() {
		let gt = Date.now();
		let lt = (gt - this.t0) % this.totalDuration;
		for (let i = 0; i < this.effects.length; i++) {
			let eff = this.effects[i];
			if (lt > eff.start + eff.duration || lt < eff.start) continue;
			let elt = lt - eff.start;
			let ent = elt / eff.duration;
			eff.animTick(ent, elt, gt);
		}
	}
	sprite(name) {
		return new PIXI.Sprite(PIXI.utils.TextureCache[name]);
	}
	setTexture(sp, name) {
		sp.texture = PIXI.utils.TextureCache[name];
		if (!sp.texture) console.warn("Texture '" + name + "' don't exist!");
	}
}

window.onload = function () {
	window.game = new Game({
		onload: function () {
			game.addEffect(new ParticleSystem());
		},
	});
	let playButton = document.getElementById("play-btn");
	let winButton = document.getElementById("win-btn");
	let spreadSlider = document.getElementById("spread-slider");
	spreadSlider.value = VELOCITY_RANGE;
	let towardsScreenSlider = document.getElementById("towards-screen-slider");
	towardsScreenSlider.value = SCALE_GROWTH;
	let depthSlider = document.getElementById("depth-slider");
	depthSlider.value = DEPTH;

	playButton.addEventListener("click", function () {
		if (game.isRunning) {
			game.pause();
			playButton.textContent = "Play";
		} else {
			game.resume();
			playButton.textContent = "Pause";
		}
	});
	winButton.addEventListener("click", function () {
		game.start();
	});
	spreadSlider.addEventListener("input", function () {
		VELOCITY_RANGE = this.value;
	});
	towardsScreenSlider.addEventListener("input", function () {
		SCALE_GROWTH = this.value;
	});
	depthSlider.addEventListener("input", function () {
		DEPTH = this.value;
	});
};
