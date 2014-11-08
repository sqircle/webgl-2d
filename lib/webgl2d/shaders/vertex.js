var getVertexShaderSource;

getVertexShaderSource = function(stackDepth, sMask, shaderMask, canvas) {
  var h, vsSource, w;
  w = 2 / canvas.width;
  h = -2 / canvas.height;
  stackDepth = stackDepth || 1;
  vsSource = ["#define hasTexture " + (sMask & shaderMask.texture ? "1" : "0"), "attribute vec4 aVertexPosition;", "#if hasTexture", "varying vec2 vTextureCoord;", "#endif", "uniform vec4 uColor;", "uniform mat3 uTransforms[" + stackDepth + "];", "varying vec4 vColor;", "const mat4 pMatrix = mat4(" + w + ",0,0,0, 0," + h + ",0,0, 0,0,1.0,1.0, -1.0,1.0,0,0);", "mat3 crunchStack(void) {", "mat3 result = uTransforms[0];", "for (int i = 1; i < " + stackDepth + "; ++i) {", "result = uTransforms[i] * result;", "}", "return result;", "}", "void main(void) {", "vec3 position = crunchStack() * vec3(aVertexPosition.x, aVertexPosition.y, 1.0);", "gl_Position = pMatrix * vec4(position, 1.0);", "vColor = uColor;", "#if hasTexture", "vTextureCoord = aVertexPosition.zw;", "#endif", "}"].join("\n");
  return vsSource;
};

module.exports = getVertexShaderSource;
