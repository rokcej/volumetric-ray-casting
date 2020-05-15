// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/materials/LambertianMatDialog.json

class LambertianMatDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.LambertianMatDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.matAmbient.addEventListener('input', this._handleChange);
		this._binds.matDiffuse.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._matType = 1;

		this._renderer._matAmbient = this._binds.matAmbient.getValue();
		this._renderer._matDiffuse = this._binds.matDiffuse.getValue();

		this._renderer.reset();
	}
	
}
	