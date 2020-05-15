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
uniform bool uGradOpacity;
uniform bool uBidirShading;

// Lights
uniform int uLightType;
uniform float uLightIntensity;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform vec3 uLightDir;
uniform float uLightAttenuation;

// Materials
uniform int uMatType;
uniform float uMatAmbient;
uniform float uMatDiffuse;
uniform float uMatSpecular;
uniform float uMatShininess;

in vec3 vRayFrom;
in vec3 vRayTo;
in vec2 vPositionUV;
out vec4 oColor;

@intersectCube

// https://stackoverflow.com/a/4275343/4808188
float rand(vec2 uv, vec2 unitVector){
    //return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
    return fract(sin(dot(uv, unitVector * 79.30408)) * 43758.5453);
}

vec4 sampleEnvironmentMap(vec3 d) {
    vec2 texCoord = vec2(atan(d.x, -d.z), asin(-d.y) * 2.0) * M_INVPI * 0.5 + 0.5;
    return texture(uEnvironment, texCoord);
}

float cosAngle(vec3 v1, vec3 v2) {
    if (uBidirShading)
        return abs(dot(v1, v2));
    else
        return max(dot(v1, v2), 0.0);
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

        vec3 pos, grad, norm;
        float val, mag;
        vec4 volumeSample, colorSample;
        vec4 accumulator = vec4(0.0);

        while (t < 1.0 && accumulator.a < 0.999) {
            pos = mix(from, to, t);
            volumeSample = texture(uVolume, pos);
            val = volumeSample.r;
            grad = volumeSample.gba * 2.0 - vec3(1.0); // Unpack data
            mag = length(grad);

            if (mag > 0.0) {
                norm = normalize(grad);

                colorSample = texture(uTransferFunction, vec2(val, mag));
                colorSample.a *= rayStepLength * uAlphaCorrection;
                if (uGradOpacity) {
                    colorSample.a *= mag * 8.0;
                }
                colorSample.rgb *= colorSample.a;

                // Lights
                vec3 illum = uLightColor * uLightIntensity;
                if (uLightType != 0) {
                    vec3 lightDir;
                    float attenuation = 1.0;
                    if (uLightType == 1) { // Point light
                        lightDir = uLightPos - pos;
                        float d2 = dot(lightDir, lightDir); // Distance squared
                        lightDir = normalize(lightDir);
                        attenuation = 1.0 / (1.0 + uLightAttenuation * d2);
                    } else if (uLightType == 2) { // Directional light
                        lightDir = uLightDir;
                    } else { // Undefined light
                        lightDir = vec3(0.0);
                    }
                    illum *= attenuation;

                    // Materials
                    if (uMatType == 1) { // Lambertian
                        float diffuse = uMatDiffuse * cosAngle(lightDir, norm);
                        illum *= diffuse;
                    } else if (uMatType == 2) { // Phong
                        float ambient = uMatAmbient;
                        float diffuse = uMatDiffuse * cosAngle(lightDir, norm);
                        float specular = uMatSpecular * pow(cosAngle(-rayDirectionUnit, reflect(-lightDir, norm)), uMatShininess);
                        illum *= (ambient + diffuse + specular);
                    }

                }
                colorSample.rgb *= illum;

                accumulator += (1.0 - accumulator.a) * colorSample;
            }
            
            t += uStepSize;
        }

        if (accumulator.a > 1.0) {
            accumulator.rgb /= accumulator.a;
        } else if (accumulator.a < 1.0) { // Sample environment if visible through object
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
    if (uInvFrameNumber == 1.0) {
        // Only use latest frame
        oColor = texture(uFrame, vPosition);
    } else {
        // Combine data from different frames
        vec4 acc = texture(uAccumulator, vPosition);
        vec4 frame = texture(uFrame, vPosition);
        oColor = acc + (frame - acc) * uInvFrameNumber;
    }
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
