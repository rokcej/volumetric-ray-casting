// #package glsl/shaders

// #include ../mixins/unproject.glsl
// #include ../mixins/intersectCube.glsl

// #section RCGenerate/vertex

#version 300 es
precision mediump float;

uniform mat4 uMvpInverseMatrix;

layout(location = 0) in vec2 aPosition;
out vec3 vRayFrom;
out vec3 vRayTo;
out vec2 vPositionUV;

@unproject

void main() {
    unproject(aPosition, uMvpInverseMatrix, vRayFrom, vRayTo);
    vPositionUV = (aPosition.xy + vec2(1.0)) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

// #section RCGenerate/fragment

#version 300 es
precision mediump float;

#define M_INVPI 0.31830988618

uniform mediump sampler3D uVolume;
uniform mediump sampler2D uTransferFunction;
uniform mediump sampler2D uEnvironment;
uniform float uStepSize;
//uniform float uOffset;
uniform vec2 uRandomUnitVector;
uniform float uAlphaCorrection;

in vec3 vRayFrom;
in vec3 vRayTo;
in vec2 vPositionUV;
out vec4 oColor;

@intersectCube


// https://stackoverflow.com/a/4275343/4808188
float rand(vec2 uv, vec2 seed){
    //return fract(sin(dot(uv * seed, vec2(12.9898, 78.233))) * 43758.5453);
    return fract(sin(dot(uv, seed * 79.30408)) * 43758.5453);
}

vec4 sampleEnvironmentMap(vec3 d) {
    vec2 texCoord = vec2(atan(d.x, -d.z), asin(-d.y) * 2.0) * M_INVPI * 0.5 + 0.5;
    return texture(uEnvironment, texCoord);
}

void main() {
    vec3 rayDirection = vRayTo - vRayFrom;
    vec3 rayDirectionUnit = normalize(rayDirection);
    vec2 tbounds = max(intersectCube(vRayFrom, rayDirection), 0.0);
    if (tbounds.x >= tbounds.y) {
        //oColor = vec4(0.0, 0.0, 0.0, 1.0);
        oColor = sampleEnvironmentMap(rayDirectionUnit);
    } else {
        vec3 from = mix(vRayFrom, vRayTo, tbounds.x);
        vec3 to = mix(vRayFrom, vRayTo, tbounds.y);
        float rayStepLength = distance(from, to) * uStepSize;

        float t = uStepSize * rand(vPositionUV, uRandomUnitVector); // Randomly offset t to avoid artifacts
        vec3 pos;
        float val;
        vec4 colorSample;
        vec4 accumulator = vec4(0.0);

        while (t < 1.0 && accumulator.a < 0.99) {
            pos = mix(from, to, t);
            vec4 sampleData = texture(uVolume, pos);
            val = sampleData.r;
            vec3 grad = sampleData.gba * 2.0 - vec3(1.0);
            float mag = length(grad);

            vec3 norm = vec3(0.0);
            if (mag > 0.0)
                norm = normalize(grad);

            colorSample = texture(uTransferFunction, vec2(val, mag));
            colorSample.a *= rayStepLength * uAlphaCorrection * (mag * 8.0);
            colorSample.rgb *= colorSample.a;
            accumulator += (1.0 - accumulator.a) * colorSample;
            
            t += uStepSize;
        }

        if (accumulator.a > 1.0) {
            accumulator.rgb /= accumulator.a;
        } else if (accumulator.a < 1.0) {
            accumulator += (1.0 - accumulator.a) * sampleEnvironmentMap(rayDirectionUnit);
        }

        oColor = vec4(accumulator.rgb, 1.0);
    }
}

// #section RCIntegrate/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vPosition;

void main() {
    vPosition = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

// #section RCIntegrate/fragment

#version 300 es
precision mediump float;

uniform mediump sampler2D uAccumulator;
uniform mediump sampler2D uFrame;
uniform float uInvFrameNumber;

in vec2 vPosition;
out vec4 oColor;

void main() {
    // Combine data from different frames
    vec4 acc = texture(uAccumulator, vPosition);
    vec4 frame = texture(uFrame, vPosition);
    oColor = acc + (frame - acc) * uInvFrameNumber;
    //oColor = texture(uFrame, vPosition);
}

// #section RCRender/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vPosition;

void main() {
    vPosition = (aPosition + 1.0) * 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

// #section RCRender/fragment

#version 300 es
precision mediump float;

uniform mediump sampler2D uAccumulator;

in vec2 vPosition;
out vec4 oColor;

void main() {
    oColor = texture(uAccumulator, vPosition);
}

// #section RCReset/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

// #section RCReset/fragment

#version 300 es
precision mediump float;

out vec4 oColor;

void main() {
    oColor = vec4(0.0, 0.0, 0.0, 1.0);
}
