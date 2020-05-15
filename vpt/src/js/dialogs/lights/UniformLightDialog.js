// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/UniformLightDialog.json

class UniformLightDialog extends AbstractDialog {

	constructor(renderer, light, options) {
		super(UISPECS.UniformLightDialog, options);
	
		this._renderer = renderer;
		this._light = light;
	
		this._handleChange = this._handleChange.bind(this);

		this._handleChange();
	}
	
	_handleChange() {
		this._light.type = 0;

		this._renderer.reset();
	}
	
}
	