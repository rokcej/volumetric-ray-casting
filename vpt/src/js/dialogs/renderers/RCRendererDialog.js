// #package js/main

// #include ../AbstractDialog.js
// #include ../../TransferFunctionWidget.js

// #include ../lights/

// #include ../../../uispecs/renderers/RCRendererDialog.json

class RCRendererDialog extends AbstractDialog {

constructor(renderer, options) {
    super(UISPECS.RCRendererDialog, options);

    this._renderer = renderer;

    this._handleChange = this._handleChange.bind(this);
    this._handleTFChange = this._handleTFChange.bind(this);
    this._handleLightChange = this._handleLightChange.bind(this);

    this._binds.steps.addEventListener('input', this._handleChange);
    this._binds.opacity.addEventListener('input', this._handleChange);
    this._binds.accumulate.addEventListener('change', this._handleChange);
    this._binds.gradOpacity.addEventListener('change', this._handleChange);

    this._binds.lightType.addEventListener('change', this._handleLightChange);

    this._tfwidget = new TransferFunctionWidget();
    this._binds.tfcontainer.add(this._tfwidget);
    this._tfwidget.addEventListener('change', this._handleTFChange);

    this._handleChange();
    this._handleLightChange();
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

}
