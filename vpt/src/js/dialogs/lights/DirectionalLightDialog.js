// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/DirectionalLightDialog.json

class DirectionalLightDialog extends AbstractDialog {

	constructor(renderer, light, options) {
		super(UISPECS.DirectionalLightDialog, options);
	
		this._renderer = renderer;
		this._light = light;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.lightDir.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._light.type = 2;

		const dir = this._binds.lightDir.getValue();
		this._light.dir[0] = dir.x;
		this._light.dir[1] = dir.y;
		this._light.dir[2] = dir.z;
		let len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
		if (len > 0.0) {
			let invLen = 1.0 / len;
			this._light.dir[0] *= invLen;
			this._light.dir[1] *= invLen;
			this._light.dir[2] *= invLen;
		}

		this._renderer.reset();
	}
	
}
	