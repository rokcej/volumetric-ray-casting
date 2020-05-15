// #package js/main

// #include ../WebGL.js
// #include AbstractRenderer.js

class RCRenderer extends AbstractRenderer {

constructor(gl, volume, environmentTexture, options) {
    super(gl, volume, environmentTexture, options);

    // Lights
    this._maxLights = 8;
    this._numLights = 0;
    this._lights = new Array(this._maxLights);
    for (let i = 0; i < this._maxLights; ++i) {
        this._lights[i] = {
            type        : 0,
            color       : [0.0, 0.0, 0.0],
            pos         : [0.0, 0.0, 0.0],
            dir         : [0.0, 0.0, 0.0],
            intensity   : 1.0,
            attenuation : 0.0,
        };
    }

    // Material
    this._mat = {
        type        : 0, 
        ambient     : 0.0,
        diffuse     : 0.0,
        specular    : 0.0,
        shininess   : 1.0,
    }

    Object.assign(this, {
        _stepSize : 0.0,
        _alphaCorrection : 0.0,
    }, options);

    this._programs = WebGL.buildPrograms(this._gl, {
        generate  : SHADERS.RCGenerate,
        integrate : SHADERS.RCIntegrate,
        render    : SHADERS.RCRender,
        reset     : SHADERS.RCReset
    }, MIXINS);
    
    this._frameNumber = 1;
}

destroy() {
    const gl = this._gl;
    Object.keys(this._programs).forEach(programName => {
        gl.deleteProgram(this._programs[programName].program);
    });

    super.destroy();
}

_resetFrame() {
    const gl = this._gl;

    const program = this._programs.reset;
    gl.useProgram(program.program);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    this._frameNumber = 1;
}

_generateFrame() {
    const gl = this._gl;

    const program = this._programs.generate;
    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, this._volume.getTexture());
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._transferFunction);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this._environmentTexture);

    gl.uniform1i(program.uniforms.uVolume, 0);
    gl.uniform1i(program.uniforms.uTransferFunction, 1);
    gl.uniform1i(program.uniforms.uEnvironment, 2);
    gl.uniform1f(program.uniforms.uStepSize, this._stepSize);
    gl.uniform1f(program.uniforms.uAlphaCorrection, this._alphaCorrection);
    gl.uniform1i(program.uniforms.uGradOpacity, this._gradOpacity);
    gl.uniform1i(program.uniforms.uBidirShading, this._bidirShading);
    //gl.uniform1f(program.uniforms.uOffset, Math.random());
    let angle = Math.random() * 2 * Math.PI
    gl.uniform2f(program.uniforms.uRandomUnitVector, Math.cos(angle), Math.sin(angle));
    gl.uniformMatrix4fv(program.uniforms.uMvpInverseMatrix, false, this._mvpInverseMatrix.m);

    // Lights
    gl.uniform1i(program.uniforms.uNumLights, this._numLights);
    for (let i = 0; i < Math.min(this._numLights, this._maxLights); ++i) {
        let si = i.toString();
        gl.uniform1i(program.uniforms["uLights[" + si + "].type"], this._lights[i].type);
        gl.uniform3fv(program.uniforms["uLights[" + si + "].color"], this._lights[i].color);
        gl.uniform1f(program.uniforms["uLights[" + si + "].intensity"], this._lights[i].intensity);
        gl.uniform3fv(program.uniforms["uLights[" + si + "].pos"], this._lights[i].pos);
        gl.uniform3fv(program.uniforms["uLights[" + si + "].dir"], this._lights[i].dir);
        gl.uniform1f(program.uniforms["uLights[" + si + "].attenuation"], this._lights[i].attenuation);
    }

    // Materials
    gl.uniform1i(program.uniforms["uMat.type"], this._mat.type);
    gl.uniform1f(program.uniforms["uMat.ambient"], this._mat.ambient);
    gl.uniform1f(program.uniforms["uMat.diffuse"], this._mat.diffuse);
    gl.uniform1f(program.uniforms["uMat.specular"], this._mat.specular);
    gl.uniform1f(program.uniforms["uMat.shininess"], this._mat.shininess);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

_integrateFrame() {
    const gl = this._gl;

    const program = this._programs.integrate;
    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._frameBuffer.getAttachments().color[0]);

    gl.uniform1i(program.uniforms.uAccumulator, 0);
    gl.uniform1i(program.uniforms.uFrame, 1);
    gl.uniform1f(program.uniforms.uInvFrameNumber, 1.0 / this._frameNumber);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    if (this._accumulate === true)
        ++this._frameNumber;
}

_renderFrame() {
    const gl = this._gl;

    const program = this._programs.render;
    gl.useProgram(program.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[0]);

    gl.uniform1i(program.uniforms.uAccumulator, 0);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

_getFrameBufferSpec() {
    const gl = this._gl;
    return [{
        width          : this._bufferSize,
        height         : this._bufferSize,
        min            : gl.NEAREST,
        mag            : gl.NEAREST,
        format         : gl.RGBA,
        internalFormat : gl.RGBA,
        type           : gl.UNSIGNED_BYTE
    }];
}

_getAccumulationBufferSpec() {
    const gl = this._gl;
    return [{
        width          : this._bufferSize,
        height         : this._bufferSize,
        min            : gl.NEAREST,
        mag            : gl.NEAREST,
        format         : gl.RGBA,
        internalFormat : gl.RGBA,
        type           : gl.UNSIGNED_BYTE
    }];
}

}
