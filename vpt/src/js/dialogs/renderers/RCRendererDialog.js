// #package js/main

// #include ../AbstractDialog.js
// #include ../../TransferFunctionWidget.js

// #include ../lights/
// #include ../LightDialog.js
// #include ../materials/

// #include ../../../uispecs/renderers/RCRendererDialog.json

class RCRendererDialog extends AbstractDialog {

constructor(renderer, options) {
    super(UISPECS.RCRendererDialog, options);

    this._renderer = renderer;

    this._lights = [];

    this._handleChange = this._handleChange.bind(this);
    this._handleTFChange = this._handleTFChange.bind(this);
    this._handleMatChange = this._handleMatChange.bind(this);
    this._handleAddLight = this._handleAddLight.bind(this);

    this._binds.steps.addEventListener('input', this._handleChange);
    this._binds.opacity.addEventListener('input', this._handleChange);
    this._binds.accumulate.addEventListener('change', this._handleChange);
    this._binds.gradOpacity.addEventListener('change', this._handleChange);
    this._binds.bidirShading.addEventListener('change', this._handleChange);

    this._binds.addLight.addEventListener('click', this._handleAddLight);

    this._binds.matType.addEventListener('change', this._handleMatChange);

    this._tfwidget = new TransferFunctionWidget();
    this._binds.tfcontainer.add(this._tfwidget);
    this._tfwidget.addEventListener('change', this._handleTFChange);

    this._handleChange();
    this._handleMatChange();
    this._handleAddLight(); // Start with a default light
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

    this._renderer.reset();
}

_handleTFChange() {
    this._renderer.setTransferFunction(this._tfwidget.getTransferFunction());
    this._renderer.reset();
}

_handleAddLight() {
    if (this._lights.length >= this._renderer._maxLights) {
        alert("Maximum number of lights exceeded.");
    } else {
        let ld = new LightDialog(this._renderer, this._lights.length);
        ld.appendTo(this._binds.lightsContainer);
        this._lights.push(ld);

        ld._binds.removeLight.addEventListener('click', () => { this._handleRemoveLight(ld._index); }); // JavaScript magic

        ++this._renderer._numLights;
        this._renderer.reset();
    }
}

_handleRemoveLight(index) {
    if (this._lights.length > index) {
        this._lights[index].destroy();
        this._lights.splice(index, 1);

        for (let i = index; i < this._lights.length; ++i)
            this._lights[i]._changeIndex(i);

        --this._renderer._numLights;
        this._renderer.reset();
    }
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
