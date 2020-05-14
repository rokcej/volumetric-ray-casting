// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/lights/UniformLightDialog.json

class UniformLightDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.UniformLightDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._lightType = 0;

		this._renderer.reset();
	}
	
}
	