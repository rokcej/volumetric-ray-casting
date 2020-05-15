// #package js/main

// #include AbstractDialog.js

// #include lights/

// #include ../../uispecs/lights/LightDialog.json

class LightDialog extends AbstractDialog {

constructor(renderer, index, options) {
	super(UISPECS.LightDialog, options);

	this._renderer = renderer;
	this._index = index;
	this._light = renderer._lights[index];

	this._handleChange = this._handleChange.bind(this);
	this._handleLightChange = this._handleLightChange.bind(this);
    this._changeIndex = this._changeIndex.bind(this);

	this._binds.lightType.addEventListener('change', this._handleLightChange);
    this._binds.lightColor.addEventListener('change', this._handleChange);
	this._binds.lightIntensity.addEventListener('change', this._handleChange);

	this._handleChange();
	this._handleLightChange();
	this._changeIndex(index);
}

_handleChange() {
	const color = CommonUtils.hex2rgb(this._binds.lightColor.getValue());
    this._light.color[0] = color.r;
    this._light.color[1] = color.g;
    this._light.color[2] = color.b;

    this._light.intensity = this._binds.lightIntensity.getValue();

	this._renderer.reset();
}

_changeIndex(index) {
	this._index = index;
	this._light = this._renderer._lights[index];
	this._lightDialog._light = this._renderer._lights[index];

	this._handleChange();
	this._lightDialog._handleChange();

	this._binds.dropdown._binds.handle.textContent = "Light #" + index.toString();
}

_handleLightChange() {
	if (this._lightDialog) {
		this._lightDialog.destroy();
	}

	const selectedLight = this._binds.lightType.getValue();
	let dialogClass;
	switch (selectedLight) {
		case 'uniform'      : dialogClass = UniformLightDialog; break;
		case 'point'        : dialogClass = PointLightDialog; break;
		case 'directional'  : dialogClass = DirectionalLightDialog; break;
	}

	this._lightDialog = new dialogClass(this._renderer, this._light);
	this._lightDialog.appendTo(this._binds.lightTypeContainer);
}

}
	