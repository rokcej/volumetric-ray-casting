// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/DirectionalLightDialog.json

class DirectionalLightDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.DirectionalLightDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.lightColor.addEventListener('change', this._handleChange);
		this._binds.lightDir.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._lightType = 2;

		const color = CommonUtils.hex2rgb(this._binds.lightColor.getValue());
		this._renderer._lightColor[0] = color.r;
		this._renderer._lightColor[1] = color.g;
		this._renderer._lightColor[2] = color.b;

		const dir = this._binds.lightDir.getValue();
		this._renderer._lightDir[0] = dir.x;
		this._renderer._lightDir[1] = dir.y;
		this._renderer._lightDir[2] = dir.z;
		let len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
		if (len > 0.0) {
			let invLen = 1.0 / len;
			this._renderer._lightDir[0] *= invLen;
			this._renderer._lightDir[1] *= invLen;
			this._renderer._lightDir[2] *= invLen;
		}

		this._renderer.reset();
	}
	
}
	