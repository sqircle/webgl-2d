var Texture, isPOT, math;

math = require('./math');

isPOT = math.isPOT;

Texture = (function() {
  function Texture(image, gl2d) {
    var canvas, ctx, gl;
    this.gl2d = gl2d;
    gl = this.gl2d.gl;
    this.obj = gl.createTexture();
    this.index = this.gl2d.textureCache.push(this);
    this.gl2d.imageCache.push(image);
    if (image.width > this.gl2d.maxTextureSize || image.height > this.gl2d.maxTextureSize) {
      canvas = document.createElement("canvas");
      canvas.width = (image.width > this.gl2d.maxTextureSize ? this.gl2d.maxTextureSize : image.width);
      canvas.height = (image.height > this.gl2d.maxTextureSize ? this.gl2d.maxTextureSize : image.height);
      ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
      image = canvas;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.obj);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (math.isPOT(image.width) && math.isPOT(image.height)) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  return Texture;

})();

module.exports = Texture;
