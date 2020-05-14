// #package js/main

// #include ../AbstractDialog.js
// #include ../../TransferFunctionWidget.js

// #include ../../../uispecs/renderers/RCRendererDialog.json

class RCRendererDialog extends AbstractDialog {

constructor(renderer, options) {
    super(UISPECS.RCRendererDialog, options);

    this._renderer = renderer;

    this._handleChange = this._handleChange.bind(this);
    this._handleTFChange = this._handleTFChange.bind(this);

    this._binds.steps.addEventListener('input', this._handleChange);
    this._binds.opacity.addEventListener('input', this._handleChange);
    this._binds.accumulate.addEventListener('change', this._handleChange);
    this._binds.gradOpacity.addEventListener('change', this._handleChange);
    
    this._binds.useLights.addEventListener('change', this._handleChange);
    this._binds.lightColor.addEventListener('change', this._handleChange);
    this._binds.lightPos.addEventListener('input', this._handleChange);

    this._tfwidget = new TransferFunctionWidget();
    this._binds.tfcontainer.add(this._tfwidget);
    this._tfwidget.addEventListener('change', this._handleTFChange);

    this._handleChange();
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

    const color = CommonUtils.hex2rgb(this._binds.lightColor.getValue());
    this._renderer._lightColor[0] = color.r;
    this._renderer._lightColor[1] = color.g;
    this._renderer._lightColor[2] = color.b;

    const pos = this._binds.lightPos.getValue();
    this._renderer._lightPos[0] = pos.x;
    this._renderer._lightPos[1] = pos.y;
    this._renderer._lightPos[2] = pos.z;

    this._renderer.reset();
}

_handleTFChange() {
    this._renderer.setTransferFunction(this._tfwidget.getTransferFunction());
    this._renderer.reset();
}

}
