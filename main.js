// ----- Start of the assigment ----- //
const POOL_SIZE = 60;
const SPAWN_INTERVAL = 50;
const PULSE_COIN_AMOUNT = 20;
const BASE_DURATION = 1200;
const VELOCITY_RANGE = 2000;
const COIN_SCALE_MIN = 0.08;
const COIN_SCALE_MAX = 0.4;
const FADE_IN = 0.15;

class ParticleSystem extends PIXI.Container {
	constructor() {
		super();

		// Set start and duration for this effect in milliseconds
		this.start = 0;
		this.duration = 999999;
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
	spawnCoin(gt) {
		let sp = this.pool.pop();
		sp.visible = true;
		// randomize startposition, size, arc height, horizontal velocity
		sp.startX = 350 + Math.random() * 100;
		sp.baseScale =
			COIN_SCALE_MIN + Math.random() * (COIN_SCALE_MAX - COIN_SCALE_MIN);
		sp.arcHeight = Math.random() * 400;
		sp.velocityX = (Math.random() - 0.5) * VELOCITY_RANGE;

		sp.spawnTime = gt;
		// larger coins moves faster than smaller to give parallax feel, 1.4 must be > COIN_SCALE_MAX, otherwise duration becomes negative
		sp.duration = (BASE_DURATION + sp.arcHeight * 2) * (1.4 - sp.baseScale);
		this.activeCoins.push(sp);
	}
	animTick(nt, lt, gt) {
		// Every update we get three different time variables: nt, lt and gt.
		//   nt: Normalized time in procentage (0.0 to 1.0) and is calculated by
		//       just dividing local time with duration of this effect.
		//   lt: Local time in milliseconds, from 0 to this.duration.
		//   gt: Global time in milliseconds,

		//spawn new coin if enough time has passed
		if (gt - this.lastSpawn > SPAWN_INTERVAL && this.pool.length > 0) {
			// add extra burst of spawning coins every second
			if (Math.floor(gt / 1000) > this.lastPulse) {
				this.lastPulse = Math.floor(gt / 1000);
				for (let p = 0; p < PULSE_COIN_AMOUNT && this.pool.length > 0; p++) {
					this.spawnCoin(gt);
				}
			} else {
				this.spawnCoin(gt);
			}
			this.lastSpawn = gt;
		}

		for (let i = this.activeCoins.length - 1; i >= 0; i--) {
			let sp = this.activeCoins[i];
			let age = gt - sp.spawnTime;
			let t = age / sp.duration;

			if (t >= 1) {
				//return to pool
				sp.visible = false;
				this.pool.push(sp);
				this.activeCoins.splice(i, 1);
				continue;
			}

			// Set a new texture on a sprite particle
			let frame = ("000" + (Math.floor(t * 32) % 8)).substr(-3);
			game.setTexture(sp, "CoinsGold" + frame);
			//animate position
			sp.y = 225 + Math.sin(t * Math.PI) * -sp.arcHeight + t * 400;
			sp.x = sp.startX + t * sp.velocityX;
			// animate scale
			sp.scale.x = sp.scale.y = sp.baseScale;
			// Animate alpha
			sp.alpha = t < FADE_IN ? t * (1 / FADE_IN) : 1;
			// Animate rotation
			sp.rotation = t * Math.PI * 2;
		}
	}
}

// ----- End of the assigment ----- //

class Game {
	constructor(props) {
		this.totalDuration = 0;
		this.effects = [];
		this.renderer = new PIXI.WebGLRenderer(800, 450);
		document.body.appendChild(this.renderer.view);
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
	start() {
		this.isRunning = true;
		this.t0 = Date.now();
		update.bind(this)();
		function update() {
			if (!this.isRunning) return;
			this.tick();
			this.render();
			requestAnimationFrame(update.bind(this));
		}
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
};
