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
		this._renderer._mat.type = 2;

		this._renderer._mat.ambient = this._binds.matAmbient.getValue();
		this._renderer._mat.diffuse = this._binds.matDiffuse.getValue();
		this._renderer._mat.specular = this._binds.matSpecular.getValue();
		this._renderer._mat.shininess = this._binds.matShininess.getValue();

		this._renderer.reset();
	}
	
}
	