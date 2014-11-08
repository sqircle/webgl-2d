var Drawing, PropertyAccessors, Transform, WebGL2D, colorStringToVec4, colorVecToString, getFragmentShaderSource, getVertexShaderSource, util;

Drawing = require('./webgl2d/Drawing');

Transform = require('./webgl2d/math/Transform');

PropertyAccessors = require('property-accessors');

getFragmentShaderSource = require('./webgl2d/shaders/fragment');

getVertexShaderSource = require('./webgl2d/shaders/vertex');

util = require('./webgl2d/util');

colorVecToString = util.colorVecToString;

colorStringToVec4 = util.colorStringToVec4;

WebGL2D = (function() {
  Drawing.includeInto(WebGL2D);

  PropertyAccessors.includeInto(WebGL2D);

  function WebGL2D(canvas, options) {
    var textCanvas;
    this.canvas = canvas;
    this.options = options || {};
    this.gl = canvas.getContext("webgl");
    this.fs = void 0;
    this.vs = void 0;
    this.shaderProgram = void 0;
    this.shaderPool = [];
    this.transform = new Transform();
    this.maxTextureSize = void 0;
    textCanvas = document.createElement("canvas");
    textCanvas.width = this.canvas.width;
    textCanvas.height = this.canvas.height;
    this.textCtx = textCanvas.getContext("2d");
    this.shaderMask = {
      texture: 1,
      crop: 2,
      path: 4
    };
    this.initShaders();
    this.initBuffers();
    this.initDrawing();
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(1, 1, 1, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.colorMask(1, 1, 1, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  }

  WebGL2D.prototype.initShaders = function(transformStackDepth, sMask) {
    var fs, gl, i, shaderProgram, storedShader, vs;
    gl = this.gl;
    transformStackDepth = transformStackDepth || 1;
    sMask = sMask || 0;
    storedShader = this.shaderPool[transformStackDepth];
    if (!storedShader) {
      storedShader = this.shaderPool[transformStackDepth] = [];
    }
    storedShader = storedShader[sMask];
    if (storedShader) {
      gl.useProgram(storedShader);
      this.shaderProgram = storedShader;
      return storedShader;
    } else {
      fs = this.fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(this.fs, getFragmentShaderSource(sMask, this.shaderMask));
      gl.compileShader(this.fs);
      if (!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
        throw "fragment shader error: " + gl.getShaderInfoLog(this.fs);
      }
      vs = this.vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(this.vs, getVertexShaderSource(transformStackDepth, sMask, this.shaderMask, this.canvas));
      gl.compileShader(this.vs);
      if (!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
        throw "vertex shader error: " + gl.getShaderInfoLog(this.vs);
      }
      shaderProgram = this.shaderProgram = gl.createProgram();
      shaderProgram.stackDepth = transformStackDepth;
      gl.attachShader(shaderProgram, fs);
      gl.attachShader(shaderProgram, vs);
      gl.linkProgram(shaderProgram);
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw "Could not initialise shaders.";
      }
      gl.useProgram(shaderProgram);
      shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
      shaderProgram.uColor = gl.getUniformLocation(shaderProgram, "uColor");
      shaderProgram.uSampler = gl.getUniformLocation(shaderProgram, "uSampler");
      shaderProgram.uCropSource = gl.getUniformLocation(shaderProgram, "uCropSource");
      shaderProgram.uTransforms = [];
      i = 0;
      while (i < transformStackDepth) {
        shaderProgram.uTransforms[i] = gl.getUniformLocation(shaderProgram, "uTransforms[" + i + "]");
        ++i;
      }
      this.shaderPool[transformStackDepth][sMask] = shaderProgram;
      return shaderProgram;
    }
  };

  WebGL2D.prototype.initBuffers = function() {
    var gl;
    gl = this.gl;
    this.rectVerts = new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0]);
    this.rectVertexPositionBuffer = gl.createBuffer();
    this.rectVertexColorBuffer = gl.createBuffer();
    this.pathVertexPositionBuffer = gl.createBuffer();
    this.pathVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectVertexPositionBuffer);
    return gl.bufferData(gl.ARRAY_BUFFER, this.rectVerts, gl.STATIC_DRAW);
  };

  WebGL2D.prototype.accessor('fillStyle', {
    get: function() {
      return colorVecToString(this.drawState.fillStyle);
    },
    set: function(color) {
      return this.drawState.fillStyle = colorStringToVec4(color);
    }
  });

  WebGL2D.prototype.accessor('strokeStyle', {
    get: function() {
      return colorVecToString(this.drawState.strokeStyle);
    },
    set: function(color) {
      return this.drawState.strokeStyle = colorStringToVec4(color);
    }
  });

  WebGL2D.prototype.accessor('lineWidth', {
    get: function() {
      return this.drawState.lineWidth;
    },
    set: function(lineWidth) {
      this.gl.lineWidth(lineWidth);
      return this.drawState.lineWidth = lineWidth;
    }
  });

  WebGL2D.prototype.accessor('lineCap', {
    get: function() {
      return this.drawState.lineCap;
    },
    set: function(lineCap) {
      return this.drawState.lineCap = lineCap;
    }
  });

  WebGL2D.prototype.accessor('lineJoin', {
    get: function() {
      return this.drawState.lineJoin;
    },
    set: function(lineJoin) {
      return this.drawState.lineJoin = lineJoin;
    }
  });

  WebGL2D.prototype.accessor('miterLimit', {
    get: function() {
      return this.drawState.miterLimit;
    },
    set: function(miterLimit) {
      return this.drawState.miterLimit = miterLimit;
    }
  });

  WebGL2D.prototype.accessor('shadowOffsetX', {
    get: function() {
      return this.drawState.shadowOffsetX;
    },
    set: function(shadowOffsetX) {
      return this.drawState.shadowOffsetX = shadowOffsetX;
    }
  });

  WebGL2D.prototype.accessor('shadowOffsetY', {
    get: function() {
      return this.drawState.shadowOffsetY;
    },
    set: function(shadowOffsetY) {
      return this.drawState.shadowOffsetY = shadowOffsetY;
    }
  });

  WebGL2D.prototype.accessor('shadowBlur', {
    get: function() {
      return this.drawState.shadowBlur;
    },
    set: function(shadowBlur) {
      return this.drawState.shadowBlur = shadowBlur;
    }
  });

  WebGL2D.prototype.accessor('shadowColor', {
    get: function() {
      return this.drawState.shadowColor;
    },
    set: function(shadowColor) {
      return this.drawState.shadowColor = shadowColor;
    }
  });

  WebGL2D.prototype.accessor('font', {
    get: function() {
      return this.drawState.font;
    },
    set: function(font) {
      this.textCtx.font = font;
      return this.drawState.font = font;
    }
  });

  WebGL2D.prototype.accessor('textAlign', {
    get: function() {
      return this.drawState.textAlign;
    },
    set: function(textAlign) {
      return this.drawState.textAlign = textAlign;
    }
  });

  WebGL2D.prototype.accessor('textBaseline', {
    get: function() {
      return this.drawState.textBaseline;
    },
    set: function(textBaseline) {
      return this.drawState.textBaseline = textBaseline;
    }
  });

  WebGL2D.prototype.accessor('globalAlpha', {
    get: function() {
      return this.drawState.globalAlpha;
    },
    set: function(globalAlpha) {
      return this.drawState.globalAlpha = globalAlpha;
    }
  });

  WebGL2D.prototype.accessor('globalCompositeOperation', {
    get: function() {
      return this.drawState.globalCompositeOperation;
    },
    set: function(globalCompositeOperation) {
      return this.drawState.globalCompositeOperation = globalCompositeOperation;
    }
  });

  return WebGL2D;

})();

module.exports = WebGL2D;
