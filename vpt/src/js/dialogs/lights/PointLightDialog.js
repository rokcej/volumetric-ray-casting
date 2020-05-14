// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/PointLightDialog.json

class PointLightDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.PointLightDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.lightPos.addEventListener('input', this._handleChange);
		this._binds.lightAttenuation.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._lightType = 1;

		const pos = this._binds.lightPos.getValue();
		this._renderer._lightPos[0] = pos.x;
		this._renderer._lightPos[1] = pos.y;
		this._renderer._lightPos[2] = pos.z;

		this._renderer._lightAttenuation = this._binds.lightAttenuation.getValue();

		this._renderer.reset();
	}
	
}
	