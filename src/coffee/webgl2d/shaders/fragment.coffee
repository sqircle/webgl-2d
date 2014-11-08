# Fragment shader source
getFragmentShaderSource = (sMask, shaderMask) ->
  fsSource = [
    "#ifdef GL_ES"
    "precision highp float;"
    "#endif"
    "#define hasTexture " + ((if (sMask & shaderMask.texture) then "1" else "0"))
    "#define hasCrop " + ((if (sMask & shaderMask.crop) then "1" else "0"))
    "varying vec4 vColor;"
    "#if hasTexture"
    "varying vec2 vTextureCoord;"
    "uniform sampler2D uSampler;"
    "#if hasCrop"
    "uniform vec4 uCropSource;"
    "#endif"
    "#endif"
    "void main(void) {"
    "#if hasTexture"
    "#if hasCrop"
    "gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x * uCropSource.z, vTextureCoord.y * uCropSource.w) + uCropSource.xy);"
    "#else"
    "gl_FragColor = texture2D(uSampler, vTextureCoord);"
    "#endif"
    "#else"
    "gl_FragColor = vColor;"
    "#endif"
    "}"
  ].join("\n")
  fsSource

module.exports = getFragmentShaderSource
