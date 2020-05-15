// #package js/main

// #include ../AbstractDialog.js
// #include ../../TransferFunctionWidget.js

// #include ../lights/
// #include ../materials/

// #include ../../../uispecs/renderers/RCRendererDialog.json

class RCRendererDialog extends AbstractDialog {

constructor(renderer, options) {
    super(UISPECS.RCRendererDialog, options);

    this._renderer = renderer;

    this._handleChange = this._handleChange.bind(this);
    this._handleTFChange = this._handleTFChange.bind(this);
    this._handleLightChange = this._handleLightChange.bind(this);
    this._handleMatChange = this._handleMatChange.bind(this);

    this._binds.steps.addEventListener('input', this._handleChange);
    this._binds.opacity.addEventListener('input', this._handleChange);
    this._binds.accumulate.addEventListener('change', this._handleChange);
    this._binds.gradOpacity.addEventListener('change', this._handleChange);
    this._binds.bidirShading.addEventListener('change', this._handleChange);

    this._binds.lightType.addEventListener('change', this._handleLightChange);
    this._binds.lightColor.addEventListener('change', this._handleChange);
    this._binds.lightIntensity.addEventListener('change', this._handleChange);

    this._binds.matType.addEventListener('change', this._handleMatChange);

    this._tfwidget = new TransferFunctionWidget();
    this._binds.tfcontainer.add(this._tfwidget);
    this._tfwidget.addEventListener('change', this._handleTFChange);

    this._handleChange();
    this._handleLightChange();
    this._handleMatChange();
}

destroy() {
    this._tfwidget.destroy();
    super.destroy();
}

_handleChange() {
    this._renderer._stepSize = 1 / this._binds.steps.getValue();
    this._renderer._alphaCorrection = this._binds.opacity.getValue();
    this._renderer._accumulate = this._binds.accumulate.isChecked();
    this._renderer._gradOpacity = this._binds.gradOpacity.isChecked();
    this._renderer._bidirShading = this._binds.bidirShading.isChecked();

    const color = CommonUtils.hex2rgb(this._binds.lightColor.getValue());
    this._renderer._lightColor[0] = color.r;
    this._renderer._lightColor[1] = color.g;
    this._renderer._lightColor[2] = color.b;

    this._renderer._lightIntensity = this._binds.lightIntensity.getValue();

    this._renderer.reset();
}

_handleTFChange() {
    this._renderer.setTransferFunction(this._tfwidget.getTransferFunction());
    this._renderer.reset();
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

    this._lightDialog = new dialogClass(this._renderer);
    this._lightDialog.appendTo(this._binds.lightTypeContainer);
}

_handleMatChange() {
    if (this._matDialog) {
        this._matDialog.destroy();
    }

    const selectedMat = this._binds.matType.getValue();
    let dialogClass;
    switch (selectedMat) {
        case 'lambertian'   : dialogClass = LambertianMatDialog; break;
        case 'phong'        : dialogClass = PhongMatDialog; break;
        case 'blinn'        : dialogClass = BlinnMatDialog; break;
    }

    this._matDialog = new dialogClass(this._renderer);
    this._matDialog.appendTo(this._binds.matTypeContainer);
}

}
