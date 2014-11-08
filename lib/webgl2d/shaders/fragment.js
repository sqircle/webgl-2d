var getFragmentShaderSource;

getFragmentShaderSource = function(sMask, shaderMask) {
  var fsSource;
  fsSource = ["#ifdef GL_ES", "precision highp float;", "#endif", "#define hasTexture " + (sMask & shaderMask.texture ? "1" : "0"), "#define hasCrop " + (sMask & shaderMask.crop ? "1" : "0"), "varying vec4 vColor;", "#if hasTexture", "varying vec2 vTextureCoord;", "uniform sampler2D uSampler;", "#if hasCrop", "uniform vec4 uCropSource;", "#endif", "#endif", "void main(void) {", "#if hasTexture", "#if hasCrop", "gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x * uCropSource.z, vTextureCoord.y * uCropSource.w) + uCropSource.xy);", "#else", "gl_FragColor = texture2D(uSampler, vTextureCoord);", "#endif", "#else", "gl_FragColor = vColor;", "#endif", "}"].join("\n");
  return fsSource;
};

module.exports = getFragmentShaderSource;
