// #package js/main

// #include ../AbstractDialog.js

// #include ../../../uispecs/materials/PhongMatDialog.json

class PhongMatDialog extends AbstractDialog {

	constructor(renderer, options) {
		super(UISPECS.PhongMatDialog, options);
	
		this._renderer = renderer;
	
		this._handleChange = this._handleChange.bind(this);
	
		this._binds.matAmbient.addEventListener('input', this._handleChange);
		this._binds.matDiffuse.addEventListener('input', this._handleChange);
		this._binds.matSpecular.addEventListener('input', this._handleChange);
		this._binds.matShininess.addEventListener('input', this._handleChange);

		this._handleChange();
	}
	
	_handleChange() {
		this._renderer._matType = 2;

		this._renderer._matAmbient = this._binds.matAmbient.getValue();
		this._renderer._matDiffuse = this._binds.matDiffuse.getValue();
		this._renderer._matSpecular = this._binds.matSpecular.getValue();
		this._renderer._matShininess = this._binds.matShininess.getValue();

		this._renderer.reset();
	}
	
}
	