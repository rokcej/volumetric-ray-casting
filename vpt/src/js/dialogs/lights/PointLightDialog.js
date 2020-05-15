// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/PointLightDialog.json

class PointLightDialog extends AbstractDialog {

	constructor(renderer, light, options) {
		super(UISPECS.PointLightDialog, options);
	
		this._renderer = renderer;
		this._light = light;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.lightPos.addEventListener('input', this._handleChange);
		this._binds.lightAttenuation.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._light.type = 1;

		const pos = this._binds.lightPos.getValue();
		this._light.pos[0] = pos.x;
		this._light.pos[1] = pos.y;
		this._light.pos[2] = pos.z;

		this._light.attenuation = this._binds.lightAttenuation.getValue();

		this._renderer.reset();
	}
	
}
	