// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/PointLightDialog.json

class PointLightDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.PointLightDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.lightColor.addEventListener('change', this._handleChange);
		this._binds.lightPos.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._lightType = 1;

		const color = CommonUtils.hex2rgb(this._binds.lightColor.getValue());
		this._renderer._lightColor[0] = color.r;
		this._renderer._lightColor[1] = color.g;
		this._renderer._lightColor[2] = color.b;

		const pos = this._binds.lightPos.getValue();
		this._renderer._lightPos[0] = pos.x;
		this._renderer._lightPos[1] = pos.y;
		this._renderer._lightPos[2] = pos.z;

		this._renderer.reset();
	}
	
}
	