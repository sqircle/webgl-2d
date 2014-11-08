!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.WebGL2D=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/WebGL2D.js');

},{"./lib/WebGL2D.js":2}],2:[function(require,module,exports){
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

},{"./webgl2d/Drawing":3,"./webgl2d/math/Transform":7,"./webgl2d/shaders/fragment":9,"./webgl2d/shaders/vertex":10,"./webgl2d/util":11,"property-accessors":14}],3:[function(require,module,exports){
var Drawing, Mixin, SubPath, Texture, Transform, colorStringToVec4, colorVecToString, util,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Mixin = require('mixto');

SubPath = require('./SubPath');

Texture = require('./Texture');

Transform = require('./math/Transform');

util = require('./util');

colorVecToString = util.colorVecToString;

colorStringToVec4 = util.colorStringToVec4;

Drawing = (function(_super) {
  __extends(Drawing, _super);

  function Drawing() {
    return Drawing.__super__.constructor.apply(this, arguments);
  }

  Drawing.prototype.restoreDrawState = function() {
    if (this.drawStateStack.length) {
      return this.drawState = this.drawStateStack.pop();
    }
  };

  Drawing.prototype.initDrawing = function() {
    var tempCanvas;
    this.gl2d = this;
    this.subPaths = [];
    this.imageCache = [];
    this.textureCache = [];
    this.drawStateStack = [];
    this.drawState = {};
    tempCanvas = document.createElement('canvas');
    this.tempCtx = tempCanvas.getContext('2d');
    this.drawState.fillStyle = [0, 0, 0, 1];
    this.drawState.strokeStyle = [0, 0, 0, 1];
    this.drawState.lineWidth = 1.0;
    this.drawState.lineCap = 'butt';
    this.drawState.lineJoin = "miter";
    this.drawState.miterLimit = 10;
    this.drawState.shadowOffsetX = 0;
    this.drawState.shadowOffsetY = 0;
    this.drawState.shadowBlur = 0;
    this.drawState.shadowColor = "rgba(0, 0, 0, 0.0)";
    this.drawState.font = "10px sans-serif";
    this.drawState.textAlign = "start";
    this.drawState.textBaseline = "alphabetic";
    this.drawState.globalAlpha = 1.0;
    return this.drawState.globalCompositeOperation = "source-over";
  };

  Drawing.prototype.fillText = function(text, x, y) {};

  Drawing.prototype.strokeText = function() {};

  Drawing.prototype.measureText = function() {};

  Drawing.prototype.save = function() {
    this.gl2d.transform.pushMatrix();
    return this.saveDrawState();
  };

  Drawing.prototype.restore = function() {
    this.gl2d.transform.popMatrix();
    return this.restoreDrawState();
  };

  Drawing.prototype.translate = function(x, y) {
    return this.gl2d.transform.translate(x, y);
  };

  Drawing.prototype.rotate = function(a) {
    return this.gl2d.transform.rotate(a);
  };

  Drawing.prototype.scale = function(x, y) {
    return this.gl2d.transform.scale(x, y);
  };

  Drawing.prototype.createImageData = function(width, height) {
    return this.tempCtx.createImageData(width, height);
  };

  Drawing.prototype.getImageData = function(x, y, width, height) {
    var buffer, data, h, i, index1, index2, j, maxI, maxJ, w;
    data = this.tempCtx.createImageData(width, height);
    buffer = new Uint8Array(width * height * 4);
    this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, buffer);
    w = width * 4;
    h = height;
    i = 0;
    maxI = h / 2;
    while (i < maxI) {
      j = 0;
      maxJ = w;
      while (j < maxJ) {
        index1 = i * w + j;
        index2 = (h - i - 1) * w + j;
        data.data[index1] = buffer[index2];
        data.data[index2] = buffer[index1];
        ++j;
      }
      ++i;
    }
    return data;
  };

  Drawing.prototype.putImageData = function(imageData, x, y) {
    return this.drawImage(imageData, x, y);
  };

  Drawing.prototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m;
    m = this.gl2d.transform.m_stack[this.gl2d.transform.c_stack];
    m[0] *= m11;
    m[1] *= m21;
    m[2] *= dx;
    m[3] *= m12;
    m[4] *= m22;
    m[5] *= dy;
    m[6] = 0;
    return m[7] = 0;
  };

  Drawing.prototype.sendTransformStack = function(sp) {
    var i, maxI, stack, _results;
    stack = this.gl2d.transform.m_stack;
    i = 0;
    maxI = this.gl2d.transform.c_stack + 1;
    _results = [];
    while (i < maxI) {
      this.gl.uniformMatrix3fv(sp.uTransforms[i], false, stack[maxI - 1 - i]);
      _results.push(++i);
    }
    return _results;
  };

  Drawing.prototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    this.gl2d.transform.setIdentity();
    return this.transform.apply(this, arguments);
  };

  Drawing.prototype.fillRect = function(x, y, width, height) {
    var gl, shaderProgram, transform;
    gl = this.gl;
    transform = this.gl2d.transform;
    shaderProgram = this.gl2d.initShaders(transform.c_stack + 2, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);
    transform.pushMatrix();
    transform.translate(x, y);
    transform.scale(width, height);
    this.sendTransformStack(shaderProgram);
    gl.uniform4f(shaderProgram.uColor, this.drawState.fillStyle[0], this.drawState.fillStyle[1], this.drawState.fillStyle[2], this.drawState.fillStyle[3]);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    return transform.popMatrix();
  };

  Drawing.prototype.strokeRect = function(x, y, width, height) {
    var gl, shaderProgram, transform;
    gl = this.gl;
    transform = this.gl2d.transform;
    shaderProgram = this.gl2d.initShaders(transform.c_stack + 2, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.rectVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);
    transform.pushMatrix();
    transform.translate(x, y);
    transform.scale(width, height);
    this.sendTransformStack(shaderProgram);
    gl.uniform4f(shaderProgram.uColor, this.drawState.strokeStyle[0], this.drawState.strokeStyle[1], this.drawState.strokeStyle[2], this.drawState.strokeStyle[3]);
    gl.drawArrays(gl.LINE_LOOP, 0, 4);
    return transform.popMatrix();
  };

  Drawing.prototype.clearRect = function(x, y, width, height) {};

  Drawing.prototype.beginPath = function() {
    return this.subPaths.length = 0;
  };

  Drawing.prototype.closePath = function() {
    var newPath, prevPath, startX, startY;
    if (this.subPaths.length) {
      prevPath = this.subPaths[this.subPaths.length - 1];
      startX = prevPath.verts[0];
      startY = prevPath.verts[1];
      prevPath.closed = true;
      newPath = new SubPath(startX, startY);
      return this.subPaths.push(newPath);
    }
  };

  Drawing.prototype.moveTo = function(x, y) {
    return this.subPaths.push(new SubPath(x, y));
  };

  Drawing.prototype.lineTo = function(x, y) {
    if (this.subPaths.length) {
      return this.subPaths[this.subPaths.length - 1].verts.push(x, y, 0, 0);
    } else {
      return this.moveTo(x, y);
    }
  };

  Drawing.prototype.quadraticCurveTo = function(cp1x, cp1y, x, y) {};

  Drawing.prototype.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {};

  Drawing.prototype.arcTo = function() {};

  Drawing.prototype.rect = function(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    return this.closePath();
  };

  Drawing.prototype.arc = function(x, y, radius, startAngle, endAngle, anticlockwise) {};

  Drawing.prototype.fillSubPath = function(index) {
    var gl, shaderProgram, subPath, transform, verts;
    gl = this.gl;
    transform = this.gl2d.transform;
    shaderProgram = this.gl2d.initShaders(transform.c_stack + 2, 0);
    subPath = this.subPaths[index];
    verts = subPath.verts;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.pathVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);
    transform.pushMatrix();
    this.sendTransformStack(shaderProgram);
    gl.uniform4f(shaderProgram.uColor, this.drawState.fillStyle[0], this.drawState.fillStyle[1], this.drawState.fillStyle[2], this.drawState.fillStyle[3]);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, verts.length / 4);
    return transform.popMatrix();
  };

  Drawing.prototype.fill = function() {
    var i, _results;
    i = 0;
    _results = [];
    while (i < this.subPaths.length) {
      this.fillSubPath(i);
      _results.push(i++);
    }
    return _results;
  };

  Drawing.prototype.strokeSubPath = function(index) {
    var gl, shaderProgram, subPath, transform, verts;
    gl = this.gl;
    transform = this.gl2d.transform;
    shaderProgram = this.gl2d.initShaders(transform.c_stack + 2, 0);
    subPath = this.subPaths[index];
    verts = subPath.verts;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.pathVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);
    transform.pushMatrix();
    this.sendTransformStack(shaderProgram);
    gl.uniform4f(shaderProgram.uColor, this.drawState.strokeStyle[0], this.drawState.strokeStyle[1], this.drawState.strokeStyle[2], this.drawState.strokeStyle[3]);
    if (subPath.closed) {
      gl.drawArrays(gl.LINE_LOOP, 0, verts.length / 4);
    } else {
      gl.drawArrays(gl.LINE_STRIP, 0, verts.length / 4);
    }
    return transform.popMatrix();
  };

  Drawing.prototype.stroke = function() {
    var i, _results;
    i = 0;
    _results = [];
    while (i < this.subPaths.length) {
      this.strokeSubPath(i);
      _results.push(i++);
    }
    return _results;
  };

  Drawing.prototype.clip = function() {};

  Drawing.prototype.isPointInPath = function() {};

  Drawing.prototype.drawFocusRing = function() {};

  Drawing.prototype.drawImage = function(image, a, b, c, d, e, f, g, h) {
    var cacheIndex, doCrop, gl, sMask, shaderProgram, texture, transform;
    gl = this.gl;
    transform = this.gl2d.transform;
    transform.pushMatrix();
    sMask = this.shaderMask.texture;
    doCrop = false;
    if (arguments.length === 3) {
      transform.translate(a, b);
      transform.scale(image.width, image.height);
    } else if (arguments.length === 5) {
      transform.translate(a, b);
      transform.scale(c, d);
    } else if (arguments.length === 9) {
      transform.translate(e, f);
      transform.scale(g, h);
      sMask = sMask | this.shaderMask.crop;
      doCrop = true;
    }
    shaderProgram = this.gl2d.initShaders(transform.c_stack, sMask);
    texture = void 0;
    cacheIndex = this.imageCache.indexOf(image);
    if (cacheIndex !== -1) {
      texture = this.textureCache[cacheIndex];
    } else {
      texture = new Texture(image, this);
    }
    if (doCrop) {
      gl.uniform4f(shaderProgram.uCropSource, a / image.width, b / image.height, c / image.width, d / image.height);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gl2d.rectVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture.obj);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(shaderProgram.uSampler, 0);
    this.sendTransformStack(shaderProgram);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    return transform.popMatrix();
  };

  Drawing.prototype.saveDrawState = function() {
    var bakedDrawState;
    bakedDrawState = {
      fillStyle: [this.drawState.fillStyle[0], this.drawState.fillStyle[1], this.drawState.fillStyle[2], this.drawState.fillStyle[3]],
      strokeStyle: [this.drawState.strokeStyle[0], this.drawState.strokeStyle[1], this.drawState.strokeStyle[2], this.drawState.strokeStyle[3]],
      globalAlpha: this.drawState.globalAlpha,
      globalCompositeOperation: this.drawState.globalCompositeOperation,
      lineCap: this.drawState.lineCap,
      lineJoin: this.drawState.lineJoin,
      lineWidth: this.drawState.lineWidth,
      miterLimit: this.drawState.miterLimit,
      shadowColor: this.drawState.shadowColor,
      shadowBlur: this.drawState.shadowBlur,
      shadowOffsetX: this.drawState.shadowOffsetX,
      shadowOffsetY: this.drawState.shadowOffsetY,
      textAlign: this.drawState.textAlign,
      font: this.drawState.font,
      textBaseline: this.drawState.textBaseline
    };
    return this.drawStateStack.push(bakedDrawState);
  };

  return Drawing;

})(Mixin);

module.exports = Drawing;

},{"./SubPath":4,"./Texture":5,"./math/Transform":7,"./util":11,"mixto":12}],4:[function(require,module,exports){
var SubPath;

SubPath = (function() {
  function SubPath(x, y) {
    this.closed = false;
    this.verts = [x, y, 0, 0];
  }

  return SubPath;

})();

module.exports = SubPath;

},{}],5:[function(require,module,exports){
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

},{"./math":6}],6:[function(require,module,exports){
var math;

math = {
  isPOT: function(value) {
    return value > 0 && ((value - 1) & value) === 0;
  }
};

module.exports = math;

},{}],7:[function(require,module,exports){
var Transform, mat3;

mat3 = require('./mat3');

Transform = (function() {
  Transform.STACK_DEPTH_LIMIT = 16;

  function Transform(mat) {
    this.clearStack(mat);
  }

  Transform.prototype.clearStack = function(init_mat) {
    var i;
    this.m_stack = [];
    this.m_cache = [];
    this.c_stack = 0;
    this.valid = 0;
    this.result = null;
    i = 0;
    while (i < Transform.STACK_DEPTH_LIMIT) {
      this.m_stack[i] = this.getIdentity();
      i++;
    }
    if (init_mat !== void 0) {
      return this.m_stack[0] = init_mat;
    } else {
      return this.setIdentity();
    }
  };

  Transform.prototype.setIdentity = function() {
    this.m_stack[this.c_stack] = this.getIdentity();
    if (this.valid === this.c_stack && this.c_stack) {
      return this.valid--;
    }
  };

  Transform.prototype.getIdentity = function() {
    return [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
  };

  Transform.prototype.getResult = function() {
    var i, m;
    if (!this.c_stack) {
      return this.m_stack[0];
    }
    m = mat3.identity;
    if (this.valid > this.c_stack - 1) {
      this.valid = this.c_stack - 1;
    }
    i = this.valid;
    while (i < this.c_stack + 1) {
      m = mat3.multiply(this.m_stack[i], m);
      this.m_cache[i] = m;
      i++;
    }
    this.valid = this.c_stack - 1;
    this.result = this.m_cache[this.c_stack];
    return this.result;
  };

  Transform.prototype.pushMatrix = function() {
    this.c_stack++;
    return this.m_stack[this.c_stack] = this.getIdentity();
  };

  Transform.prototype.popMatrix = function() {
    if (this.c_stack === 0) {
      return;
    }
    return this.c_stack--;
  };

  Transform.prototype.translate = function(x, y) {
    var translateMatrix;
    translateMatrix = this.getIdentity();
    translateMatrix[6] = x;
    translateMatrix[7] = y;
    return mat3.multiply(translateMatrix, this.m_stack[this.c_stack]);
  };

  Transform.prototype.scale = function(x, y) {
    var scaleMatrix;
    scaleMatrix = this.getIdentity();
    scaleMatrix[0] = x;
    scaleMatrix[4] = y;
    return mat3.multiply(scaleMatrix, this.m_stack[this.c_stack]);
  };

  Transform.prototype.rotate = function(ang) {
    var cAng, rotateMatrix, sAng;
    rotateMatrix = this.getIdentity();
    sAng = Math.sin(-ang);
    cAng = Math.cos(-ang);
    rotateMatrix[0] = cAng;
    rotateMatrix[3] = sAng;
    rotateMatrix[1] = -sAng;
    rotateMatrix[4] = cAng;
    return mat3.multiply(rotateMatrix, this.m_stack[this.c_stack]);
  };

  return Transform;

})();

module.exports = Transform;

},{"./mat3":8}],8:[function(require,module,exports){
var mat3;

mat3 = {
  identity: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
  multiply: function(m1, m2) {
    var m10, m11, m12, m13, m14, m15, m16, m17, m18, m20, m21, m22, m23, m24, m25, m26, m27, m28;
    m10 = m1[0];
    m11 = m1[1];
    m12 = m1[2];
    m13 = m1[3];
    m14 = m1[4];
    m15 = m1[5];
    m16 = m1[6];
    m17 = m1[7];
    m18 = m1[8];
    m20 = m2[0];
    m21 = m2[1];
    m22 = m2[2];
    m23 = m2[3];
    m24 = m2[4];
    m25 = m2[5];
    m26 = m2[6];
    m27 = m2[7];
    m28 = m2[8];
    m2[0] = m20 * m10 + m23 * m11 + m26 * m12;
    m2[1] = m21 * m10 + m24 * m11 + m27 * m12;
    m2[2] = m22 * m10 + m25 * m11 + m28 * m12;
    m2[3] = m20 * m13 + m23 * m14 + m26 * m15;
    m2[4] = m21 * m13 + m24 * m14 + m27 * m15;
    m2[5] = m22 * m13 + m25 * m14 + m28 * m15;
    m2[6] = m20 * m16 + m23 * m17 + m26 * m18;
    m2[7] = m21 * m16 + m24 * m17 + m27 * m18;
    return m2[8] = m22 * m16 + m25 * m17 + m28 * m18;
  },
  vec2_multiply: function(m1, m2) {
    var mOut;
    mOut = [];
    mOut[0] = m2[0] * m1[0] + m2[3] * m1[1] + m2[6];
    mOut[1] = m2[1] * m1[0] + m2[4] * m1[1] + m2[7];
    return mOut;
  },
  transpose: function(m) {
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  }
};

module.exports = mat3;

},{}],9:[function(require,module,exports){
var getFragmentShaderSource;

getFragmentShaderSource = function(sMask, shaderMask) {
  var fsSource;
  fsSource = ["#ifdef GL_ES", "precision highp float;", "#endif", "#define hasTexture " + (sMask & shaderMask.texture ? "1" : "0"), "#define hasCrop " + (sMask & shaderMask.crop ? "1" : "0"), "varying vec4 vColor;", "#if hasTexture", "varying vec2 vTextureCoord;", "uniform sampler2D uSampler;", "#if hasCrop", "uniform vec4 uCropSource;", "#endif", "#endif", "void main(void) {", "#if hasTexture", "#if hasCrop", "gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x * uCropSource.z, vTextureCoord.y * uCropSource.w) + uCropSource.xy);", "#else", "gl_FragColor = texture2D(uSampler, vTextureCoord);", "#endif", "#else", "gl_FragColor = vColor;", "#endif", "}"].join("\n");
  return fsSource;
};

module.exports = getFragmentShaderSource;

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
var color, util;

color = require('onecolor');

util = {
  colorStringToVec4: function(colorString) {
    var colorParsed;
    colorParsed = color(colorString);
    return [colorParsed.red(), colorParsed.green(), colorParsed.blue(), colorParsed.alpha()];
  },
  colorVecToString: function(colorVec) {
    var colorRGBA;
    colorRGBA = new color.RGB(colorVec[0], colorVec[1], colorVec[2], colorVec[3]);
    return colorRGBA.cssa();
  }
};

module.exports = util;

},{"onecolor":13}],12:[function(require,module,exports){
(function() {
  var ExcludedClassProperties, ExcludedPrototypeProperties, Mixin, name;

  module.exports = Mixin = (function() {
    Mixin.includeInto = function(constructor) {
      var name, value, _ref;
      this.extend(constructor.prototype);
      for (name in this) {
        value = this[name];
        if (ExcludedClassProperties.indexOf(name) === -1) {
          if (!constructor.hasOwnProperty(name)) {
            constructor[name] = value;
          }
        }
      }
      return (_ref = this.included) != null ? _ref.call(constructor) : void 0;
    };

    Mixin.extend = function(object) {
      var name, _i, _len, _ref, _ref1;
      _ref = Object.getOwnPropertyNames(this.prototype);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        if (ExcludedPrototypeProperties.indexOf(name) === -1) {
          if (!object.hasOwnProperty(name)) {
            object[name] = this.prototype[name];
          }
        }
      }
      return (_ref1 = this.prototype.extended) != null ? _ref1.call(object) : void 0;
    };

    function Mixin() {
      if (typeof this.extended === "function") {
        this.extended();
      }
    }

    return Mixin;

  })();

  ExcludedClassProperties = ['__super__'];

  for (name in Mixin) {
    ExcludedClassProperties.push(name);
  }

  ExcludedPrototypeProperties = ['constructor', 'extended'];

}).call(this);

},{}],13:[function(require,module,exports){
/*jshint evil:true, onevar:false*/
/*global define*/
var installedColorSpaces = [],
    namedColors = {},
    undef = function (obj) {
        return typeof obj === 'undefined';
    },
    channelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)(%)?\s*/,
    alphaChannelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)\s*/,
    cssColorRegExp = new RegExp(
                         "^(rgb|hsl|hsv)a?" +
                         "\\(" +
                             channelRegExp.source + "," +
                             channelRegExp.source + "," +
                             channelRegExp.source +
                             "(?:," + alphaChannelRegExp.source + ")?" +
                         "\\)$", "i");

function ONECOLOR(obj) {
    if (Object.prototype.toString.apply(obj) === '[object Array]') {
        if (typeof obj[0] === 'string' && typeof ONECOLOR[obj[0]] === 'function') {
            // Assumed array from .toJSON()
            return new ONECOLOR[obj[0]](obj.slice(1, obj.length));
        } else if (obj.length === 4) {
            // Assumed 4 element int RGB array from canvas with all channels [0;255]
            return new ONECOLOR.RGB(obj[0] / 255, obj[1] / 255, obj[2] / 255, obj[3] / 255);
        }
    } else if (typeof obj === 'string') {
        var lowerCased = obj.toLowerCase();
        if (namedColors[lowerCased]) {
            obj = '#' + namedColors[lowerCased];
        }
        if (lowerCased === 'transparent') {
            obj = 'rgba(0,0,0,0)';
        }
        // Test for CSS rgb(....) string
        var matchCssSyntax = obj.match(cssColorRegExp);
        if (matchCssSyntax) {
            var colorSpaceName = matchCssSyntax[1].toUpperCase(),
                alpha = undef(matchCssSyntax[8]) ? matchCssSyntax[8] : parseFloat(matchCssSyntax[8]),
                hasHue = colorSpaceName[0] === 'H',
                firstChannelDivisor = matchCssSyntax[3] ? 100 : (hasHue ? 360 : 255),
                secondChannelDivisor = (matchCssSyntax[5] || hasHue) ? 100 : 255,
                thirdChannelDivisor = (matchCssSyntax[7] || hasHue) ? 100 : 255;
            if (undef(ONECOLOR[colorSpaceName])) {
                throw new Error("one.color." + colorSpaceName + " is not installed.");
            }
            return new ONECOLOR[colorSpaceName](
                parseFloat(matchCssSyntax[2]) / firstChannelDivisor,
                parseFloat(matchCssSyntax[4]) / secondChannelDivisor,
                parseFloat(matchCssSyntax[6]) / thirdChannelDivisor,
                alpha
            );
        }
        // Assume hex syntax
        if (obj.length < 6) {
            // Allow CSS shorthand
            obj = obj.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3');
        }
        // Split obj into red, green, and blue components
        var hexMatch = obj.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
        if (hexMatch) {
            return new ONECOLOR.RGB(
                parseInt(hexMatch[1], 16) / 255,
                parseInt(hexMatch[2], 16) / 255,
                parseInt(hexMatch[3], 16) / 255
            );
        }
    } else if (typeof obj === 'object' && obj.isColor) {
        return obj;
    }
    return false;
}

function installColorSpace(colorSpaceName, propertyNames, config) {
    ONECOLOR[colorSpaceName] = new Function(propertyNames.join(","),
        // Allow passing an array to the constructor:
        "if (Object.prototype.toString.apply(" + propertyNames[0] + ") === '[object Array]') {" +
            propertyNames.map(function (propertyName, i) {
                return propertyName + "=" + propertyNames[0] + "[" + i + "];";
            }).reverse().join("") +
        "}" +
        "if (" + propertyNames.filter(function (propertyName) {
            return propertyName !== 'alpha';
        }).map(function (propertyName) {
            return "isNaN(" + propertyName + ")";
        }).join("||") + "){" + "throw new Error(\"[" + colorSpaceName + "]: Invalid color: (\"+" + propertyNames.join("+\",\"+") + "+\")\");}" +
        propertyNames.map(function (propertyName) {
            if (propertyName === 'hue') {
                return "this._hue=hue<0?hue-Math.floor(hue):hue%1"; // Wrap
            } else if (propertyName === 'alpha') {
                return "this._alpha=(isNaN(alpha)||alpha>1)?1:(alpha<0?0:alpha);";
            } else {
                return "this._" + propertyName + "=" + propertyName + "<0?0:(" + propertyName + ">1?1:" + propertyName + ")";
            }
        }).join(";") + ";"
    );
    ONECOLOR[colorSpaceName].propertyNames = propertyNames;

    var prototype = ONECOLOR[colorSpaceName].prototype;

    ['valueOf', 'hex', 'hexa', 'css', 'cssa'].forEach(function (methodName) {
        prototype[methodName] = prototype[methodName] || (colorSpaceName === 'RGB' ? prototype.hex : new Function("return this.rgb()." + methodName + "();"));
    });

    prototype.isColor = true;

    prototype.equals = function (otherColor, epsilon) {
        if (undef(epsilon)) {
            epsilon = 1e-10;
        }

        otherColor = otherColor[colorSpaceName.toLowerCase()]();

        for (var i = 0; i < propertyNames.length; i = i + 1) {
            if (Math.abs(this['_' + propertyNames[i]] - otherColor['_' + propertyNames[i]]) > epsilon) {
                return false;
            }
        }

        return true;
    };

    prototype.toJSON = new Function(
        "return ['" + colorSpaceName + "', " +
            propertyNames.map(function (propertyName) {
                return "this._" + propertyName;
            }, this).join(", ") +
        "];"
    );

    for (var propertyName in config) {
        if (config.hasOwnProperty(propertyName)) {
            var matchFromColorSpace = propertyName.match(/^from(.*)$/);
            if (matchFromColorSpace) {
                ONECOLOR[matchFromColorSpace[1].toUpperCase()].prototype[colorSpaceName.toLowerCase()] = config[propertyName];
            } else {
                prototype[propertyName] = config[propertyName];
            }
        }
    }

    // It is pretty easy to implement the conversion to the same color space:
    prototype[colorSpaceName.toLowerCase()] = function () {
        return this;
    };
    prototype.toString = new Function("return \"[one.color." + colorSpaceName + ":\"+" + propertyNames.map(function (propertyName, i) {
        return "\" " + propertyNames[i] + "=\"+this._" + propertyName;
    }).join("+") + "+\"]\";");

    // Generate getters and setters
    propertyNames.forEach(function (propertyName, i) {
        prototype[propertyName] = prototype[propertyName === 'black' ? 'k' : propertyName[0]] = new Function("value", "isDelta",
            // Simple getter mode: color.red()
            "if (typeof value === 'undefined') {" +
                "return this._" + propertyName + ";" +
            "}" +
            // Adjuster: color.red(+.2, true)
            "if (isDelta) {" +
                "return new this.constructor(" + propertyNames.map(function (otherPropertyName, i) {
                    return "this._" + otherPropertyName + (propertyName === otherPropertyName ? "+value" : "");
                }).join(", ") + ");" +
            "}" +
            // Setter: color.red(.2);
            "return new this.constructor(" + propertyNames.map(function (otherPropertyName, i) {
                return propertyName === otherPropertyName ? "value" : "this._" + otherPropertyName;
            }).join(", ") + ");");
    });

    function installForeignMethods(targetColorSpaceName, sourceColorSpaceName) {
        var obj = {};
        obj[sourceColorSpaceName.toLowerCase()] = new Function("return this.rgb()." + sourceColorSpaceName.toLowerCase() + "();"); // Fallback
        ONECOLOR[sourceColorSpaceName].propertyNames.forEach(function (propertyName, i) {
            obj[propertyName] = obj[propertyName === 'black' ? 'k' : propertyName[0]] = new Function("value", "isDelta", "return this." + sourceColorSpaceName.toLowerCase() + "()." + propertyName + "(value, isDelta);");
        });
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && ONECOLOR[targetColorSpaceName].prototype[prop] === undefined) {
                ONECOLOR[targetColorSpaceName].prototype[prop] = obj[prop];
            }
        }
    }

    installedColorSpaces.forEach(function (otherColorSpaceName) {
        installForeignMethods(colorSpaceName, otherColorSpaceName);
        installForeignMethods(otherColorSpaceName, colorSpaceName);
    });

    installedColorSpaces.push(colorSpaceName);
}

ONECOLOR.installMethod = function (name, fn) {
    installedColorSpaces.forEach(function (colorSpace) {
        ONECOLOR[colorSpace].prototype[name] = fn;
    });
};

installColorSpace('RGB', ['red', 'green', 'blue', 'alpha'], {
    hex: function () {
        var hexString = (Math.round(255 * this._red) * 0x10000 + Math.round(255 * this._green) * 0x100 + Math.round(255 * this._blue)).toString(16);
        return '#' + ('00000'.substr(0, 6 - hexString.length)) + hexString;
    },

    hexa: function () {
        var alphaString = Math.round(this._alpha * 255).toString(16);
        return '#' + '00'.substr(0, 2 - alphaString.length) + alphaString + this.hex().substr(1, 6);
    },

    css: function () {
        return "rgb(" + Math.round(255 * this._red) + "," + Math.round(255 * this._green) + "," + Math.round(255 * this._blue) + ")";
    },

    cssa: function () {
        return "rgba(" + Math.round(255 * this._red) + "," + Math.round(255 * this._green) + "," + Math.round(255 * this._blue) + "," + this._alpha + ")";
    }
});
if (typeof define === 'function' && !undef(define.amd)) {
    define(function () {
        return ONECOLOR;
    });
} else if (typeof exports === 'object') {
    // Node module export
    module.exports = ONECOLOR;
} else {
    one = window.one || {};
    one.color = ONECOLOR;
}

if (typeof jQuery !== 'undefined' && undef(jQuery.color)) {
    jQuery.color = ONECOLOR;
}

/*global namedColors*/
namedColors = {
    aliceblue: 'f0f8ff',
    antiquewhite: 'faebd7',
    aqua: '0ff',
    aquamarine: '7fffd4',
    azure: 'f0ffff',
    beige: 'f5f5dc',
    bisque: 'ffe4c4',
    black: '000',
    blanchedalmond: 'ffebcd',
    blue: '00f',
    blueviolet: '8a2be2',
    brown: 'a52a2a',
    burlywood: 'deb887',
    cadetblue: '5f9ea0',
    chartreuse: '7fff00',
    chocolate: 'd2691e',
    coral: 'ff7f50',
    cornflowerblue: '6495ed',
    cornsilk: 'fff8dc',
    crimson: 'dc143c',
    cyan: '0ff',
    darkblue: '00008b',
    darkcyan: '008b8b',
    darkgoldenrod: 'b8860b',
    darkgray: 'a9a9a9',
    darkgrey: 'a9a9a9',
    darkgreen: '006400',
    darkkhaki: 'bdb76b',
    darkmagenta: '8b008b',
    darkolivegreen: '556b2f',
    darkorange: 'ff8c00',
    darkorchid: '9932cc',
    darkred: '8b0000',
    darksalmon: 'e9967a',
    darkseagreen: '8fbc8f',
    darkslateblue: '483d8b',
    darkslategray: '2f4f4f',
    darkslategrey: '2f4f4f',
    darkturquoise: '00ced1',
    darkviolet: '9400d3',
    deeppink: 'ff1493',
    deepskyblue: '00bfff',
    dimgray: '696969',
    dimgrey: '696969',
    dodgerblue: '1e90ff',
    firebrick: 'b22222',
    floralwhite: 'fffaf0',
    forestgreen: '228b22',
    fuchsia: 'f0f',
    gainsboro: 'dcdcdc',
    ghostwhite: 'f8f8ff',
    gold: 'ffd700',
    goldenrod: 'daa520',
    gray: '808080',
    grey: '808080',
    green: '008000',
    greenyellow: 'adff2f',
    honeydew: 'f0fff0',
    hotpink: 'ff69b4',
    indianred: 'cd5c5c',
    indigo: '4b0082',
    ivory: 'fffff0',
    khaki: 'f0e68c',
    lavender: 'e6e6fa',
    lavenderblush: 'fff0f5',
    lawngreen: '7cfc00',
    lemonchiffon: 'fffacd',
    lightblue: 'add8e6',
    lightcoral: 'f08080',
    lightcyan: 'e0ffff',
    lightgoldenrodyellow: 'fafad2',
    lightgray: 'd3d3d3',
    lightgrey: 'd3d3d3',
    lightgreen: '90ee90',
    lightpink: 'ffb6c1',
    lightsalmon: 'ffa07a',
    lightseagreen: '20b2aa',
    lightskyblue: '87cefa',
    lightslategray: '789',
    lightslategrey: '789',
    lightsteelblue: 'b0c4de',
    lightyellow: 'ffffe0',
    lime: '0f0',
    limegreen: '32cd32',
    linen: 'faf0e6',
    magenta: 'f0f',
    maroon: '800000',
    mediumaquamarine: '66cdaa',
    mediumblue: '0000cd',
    mediumorchid: 'ba55d3',
    mediumpurple: '9370d8',
    mediumseagreen: '3cb371',
    mediumslateblue: '7b68ee',
    mediumspringgreen: '00fa9a',
    mediumturquoise: '48d1cc',
    mediumvioletred: 'c71585',
    midnightblue: '191970',
    mintcream: 'f5fffa',
    mistyrose: 'ffe4e1',
    moccasin: 'ffe4b5',
    navajowhite: 'ffdead',
    navy: '000080',
    oldlace: 'fdf5e6',
    olive: '808000',
    olivedrab: '6b8e23',
    orange: 'ffa500',
    orangered: 'ff4500',
    orchid: 'da70d6',
    palegoldenrod: 'eee8aa',
    palegreen: '98fb98',
    paleturquoise: 'afeeee',
    palevioletred: 'd87093',
    papayawhip: 'ffefd5',
    peachpuff: 'ffdab9',
    peru: 'cd853f',
    pink: 'ffc0cb',
    plum: 'dda0dd',
    powderblue: 'b0e0e6',
    purple: '800080',
    rebeccapurple: '639',
    red: 'f00',
    rosybrown: 'bc8f8f',
    royalblue: '4169e1',
    saddlebrown: '8b4513',
    salmon: 'fa8072',
    sandybrown: 'f4a460',
    seagreen: '2e8b57',
    seashell: 'fff5ee',
    sienna: 'a0522d',
    silver: 'c0c0c0',
    skyblue: '87ceeb',
    slateblue: '6a5acd',
    slategray: '708090',
    slategrey: '708090',
    snow: 'fffafa',
    springgreen: '00ff7f',
    steelblue: '4682b4',
    tan: 'd2b48c',
    teal: '008080',
    thistle: 'd8bfd8',
    tomato: 'ff6347',
    turquoise: '40e0d0',
    violet: 'ee82ee',
    wheat: 'f5deb3',
    white: 'fff',
    whitesmoke: 'f5f5f5',
    yellow: 'ff0',
    yellowgreen: '9acd32'
};

/*global INCLUDE, installColorSpace, ONECOLOR*/

installColorSpace('XYZ', ['x', 'y', 'z', 'alpha'], {
    fromRgb: function () {
        // http://www.easyrgb.com/index.php?X=MATH&H=02#text2
        var convert = function (channel) {
                return channel > 0.04045 ?
                    Math.pow((channel + 0.055) / 1.055, 2.4) :
                    channel / 12.92;
            },
            r = convert(this._red),
            g = convert(this._green),
            b = convert(this._blue);

        // Reference white point sRGB D65:
        // http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
        return new ONECOLOR.XYZ(
            r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
            r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
            r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
            this._alpha
        );
    },

    rgb: function () {
        // http://www.easyrgb.com/index.php?X=MATH&H=01#text1
        var x = this._x,
            y = this._y,
            z = this._z,
            convert = function (channel) {
                return channel > 0.0031308 ?
                    1.055 * Math.pow(channel, 1 / 2.4) - 0.055 :
                    12.92 * channel;
            };

        // Reference white point sRGB D65:
        // http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
        return new ONECOLOR.RGB(
            convert(x *  3.2404542 + y * -1.5371385 + z * -0.4985314),
            convert(x * -0.9692660 + y *  1.8760108 + z *  0.0415560),
            convert(x *  0.0556434 + y * -0.2040259 + z *  1.0572252),
            this._alpha
        );
    },

    lab: function () {
        // http://www.easyrgb.com/index.php?X=MATH&H=07#text7
        var convert = function (channel) {
                return channel > 0.008856 ?
                    Math.pow(channel, 1 / 3) :
                    7.787037 * channel + 4 / 29;
            },
            x = convert(this._x /  95.047),
            y = convert(this._y / 100.000),
            z = convert(this._z / 108.883);

        return new ONECOLOR.LAB(
            (116 * y) - 16,
            500 * (x - y),
            200 * (y - z),
            this._alpha
        );
    }
});

/*global INCLUDE, installColorSpace, ONECOLOR*/

installColorSpace('LAB', ['l', 'a', 'b', 'alpha'], {
    fromRgb: function () {
        return this.xyz().lab();
    },

    rgb: function () {
        return this.xyz().rgb();
    },

    xyz: function () {
        // http://www.easyrgb.com/index.php?X=MATH&H=08#text8
        var convert = function (channel) {
                var pow = Math.pow(channel, 3);
                return pow > 0.008856 ?
                    pow :
                    (channel - 16 / 116) / 7.87;
            },
            y = (this._l + 16) / 116,
            x = this._a / 500 + y,
            z = y - this._b / 200;

        return new ONECOLOR.XYZ(
            convert(x) *  95.047,
            convert(y) * 100.000,
            convert(z) * 108.883,
            this._alpha
        );
    }
});

/*global one*/

installColorSpace('HSV', ['hue', 'saturation', 'value', 'alpha'], {
    rgb: function () {
        var hue = this._hue,
            saturation = this._saturation,
            value = this._value,
            i = Math.min(5, Math.floor(hue * 6)),
            f = hue * 6 - i,
            p = value * (1 - saturation),
            q = value * (1 - f * saturation),
            t = value * (1 - (1 - f) * saturation),
            red,
            green,
            blue;
        switch (i) {
        case 0:
            red = value;
            green = t;
            blue = p;
            break;
        case 1:
            red = q;
            green = value;
            blue = p;
            break;
        case 2:
            red = p;
            green = value;
            blue = t;
            break;
        case 3:
            red = p;
            green = q;
            blue = value;
            break;
        case 4:
            red = t;
            green = p;
            blue = value;
            break;
        case 5:
            red = value;
            green = p;
            blue = q;
            break;
        }
        return new ONECOLOR.RGB(red, green, blue, this._alpha);
    },

    hsl: function () {
        var l = (2 - this._saturation) * this._value,
            sv = this._saturation * this._value,
            svDivisor = l <= 1 ? l : (2 - l),
            saturation;

        // Avoid division by zero when lightness approaches zero:
        if (svDivisor < 1e-9) {
            saturation = 0;
        } else {
            saturation = sv / svDivisor;
        }
        return new ONECOLOR.HSL(this._hue, saturation, l / 2, this._alpha);
    },

    fromRgb: function () { // Becomes one.color.RGB.prototype.hsv
        var red = this._red,
            green = this._green,
            blue = this._blue,
            max = Math.max(red, green, blue),
            min = Math.min(red, green, blue),
            delta = max - min,
            hue,
            saturation = (max === 0) ? 0 : (delta / max),
            value = max;
        if (delta === 0) {
            hue = 0;
        } else {
            switch (max) {
            case red:
                hue = (green - blue) / delta / 6 + (green < blue ? 1 : 0);
                break;
            case green:
                hue = (blue - red) / delta / 6 + 1 / 3;
                break;
            case blue:
                hue = (red - green) / delta / 6 + 2 / 3;
                break;
            }
        }
        return new ONECOLOR.HSV(hue, saturation, value, this._alpha);
    }
});

/*global one*/


installColorSpace('HSL', ['hue', 'saturation', 'lightness', 'alpha'], {
    hsv: function () {
        // Algorithm adapted from http://wiki.secondlife.com/wiki/Color_conversion_scripts
        var l = this._lightness * 2,
            s = this._saturation * ((l <= 1) ? l : 2 - l),
            saturation;

        // Avoid division by zero when l + s is very small (approaching black):
        if (l + s < 1e-9) {
            saturation = 0;
        } else {
            saturation = (2 * s) / (l + s);
        }

        return new ONECOLOR.HSV(this._hue, saturation, (l + s) / 2, this._alpha);
    },

    rgb: function () {
        return this.hsv().rgb();
    },

    fromRgb: function () { // Becomes one.color.RGB.prototype.hsv
        return this.hsv().hsl();
    }
});

/*global one*/

installColorSpace('CMYK', ['cyan', 'magenta', 'yellow', 'black', 'alpha'], {
    rgb: function () {
        return new ONECOLOR.RGB((1 - this._cyan * (1 - this._black) - this._black),
                                 (1 - this._magenta * (1 - this._black) - this._black),
                                 (1 - this._yellow * (1 - this._black) - this._black),
                                 this._alpha);
    },

    fromRgb: function () { // Becomes one.color.RGB.prototype.cmyk
        // Adapted from http://www.javascripter.net/faq/rgb2cmyk.htm
        var red = this._red,
            green = this._green,
            blue = this._blue,
            cyan = 1 - red,
            magenta = 1 - green,
            yellow = 1 - blue,
            black = 1;
        if (red || green || blue) {
            black = Math.min(cyan, Math.min(magenta, yellow));
            cyan = (cyan - black) / (1 - black);
            magenta = (magenta - black) / (1 - black);
            yellow = (yellow - black) / (1 - black);
        } else {
            black = 1;
        }
        return new ONECOLOR.CMYK(cyan, magenta, yellow, black, this._alpha);
    }
});

ONECOLOR.installMethod('clearer', function (amount) {
    return this.alpha(isNaN(amount) ? -0.1 : -amount, true);
});


ONECOLOR.installMethod('darken', function (amount) {
    return this.lightness(isNaN(amount) ? -0.1 : -amount, true);
});


ONECOLOR.installMethod('desaturate', function (amount) {
    return this.saturation(isNaN(amount) ? -0.1 : -amount, true);
});

function gs () {
    var rgb = this.rgb(),
        val = rgb._red * 0.3 + rgb._green * 0.59 + rgb._blue * 0.11;

    return new ONECOLOR.RGB(val, val, val, this._alpha);
};

ONECOLOR.installMethod('greyscale', gs);
ONECOLOR.installMethod('grayscale', gs);


ONECOLOR.installMethod('lighten', function (amount) {
    return this.lightness(isNaN(amount) ? 0.1 : amount, true);
});

ONECOLOR.installMethod('mix', function (otherColor, weight) {
    otherColor = ONECOLOR(otherColor).rgb();
    weight = 1 - (isNaN(weight) ? 0.5 : weight);

    var w = weight * 2 - 1,
        a = this._alpha - otherColor._alpha,
        weight1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2,
        weight2 = 1 - weight1,
        rgb = this.rgb();

    return new ONECOLOR.RGB(
        rgb._red * weight1 + otherColor._red * weight2,
        rgb._green * weight1 + otherColor._green * weight2,
        rgb._blue * weight1 + otherColor._blue * weight2,
        rgb._alpha * weight + otherColor._alpha * (1 - weight)
    );
});

ONECOLOR.installMethod('negate', function () {
    var rgb = this.rgb();
    return new ONECOLOR.RGB(1 - rgb._red, 1 - rgb._green, 1 - rgb._blue, this._alpha);
});

ONECOLOR.installMethod('opaquer', function (amount) {
    return this.alpha(isNaN(amount) ? 0.1 : amount, true);
});

ONECOLOR.installMethod('rotate', function (degrees) {
    return this.hue((degrees || 0) / 360, true);
});


ONECOLOR.installMethod('saturate', function (amount) {
    return this.saturation(isNaN(amount) ? 0.1 : amount, true);
});

// Adapted from http://gimp.sourcearchive.com/documentation/2.6.6-1ubuntu1/color-to-alpha_8c-source.html
/*
    toAlpha returns a color where the values of the argument have been converted to alpha
*/
ONECOLOR.installMethod('toAlpha', function (color) {
    var me = this.rgb(),
        other = ONECOLOR(color).rgb(),
        epsilon = 1e-10,
        a = new ONECOLOR.RGB(0, 0, 0, me._alpha),
        channels = ['_red', '_green', '_blue'];

    channels.forEach(function (channel) {
        if (me[channel] < epsilon) {
            a[channel] = me[channel];
        } else if (me[channel] > other[channel]) {
            a[channel] = (me[channel] - other[channel]) / (1 - other[channel]);
        } else if (me[channel] > other[channel]) {
            a[channel] = (other[channel] - me[channel]) / other[channel];
        } else {
            a[channel] = 0;
        }
    });

    if (a._red > a._green) {
        if (a._red > a._blue) {
            me._alpha = a._red;
        } else {
            me._alpha = a._blue;
        }
    } else if (a._green > a._blue) {
        me._alpha = a._green;
    } else {
        me._alpha = a._blue;
    }

    if (me._alpha < epsilon) {
        return me;
    }

    channels.forEach(function (channel) {
        me[channel] = (me[channel] - other[channel]) / me._alpha + other[channel];
    });
    me._alpha *= a._alpha;

    return me;
});

/*global one*/

// This file is purely for the build system

// Order is important to prevent channel name clashes. Lab <-> hsL

// Convenience functions


},{}],14:[function(require,module,exports){
(function (global){
(function() {
  var Mixin, PropertyAccessors, WeakMap, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Mixin = require('mixto');

  WeakMap = (_ref = global.WeakMap) != null ? _ref : require('harmony-collections').WeakMap;

  module.exports = PropertyAccessors = (function(_super) {
    __extends(PropertyAccessors, _super);

    function PropertyAccessors() {
      _ref1 = PropertyAccessors.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    PropertyAccessors.prototype.accessor = function(name, definition) {
      if (typeof definition === 'function') {
        definition = {
          get: definition
        };
      }
      return Object.defineProperty(this, name, definition);
    };

    PropertyAccessors.prototype.advisedAccessor = function(name, definition) {
      var getAdvice, setAdvice, values;
      if (typeof definition === 'function') {
        getAdvice = definition;
      } else {
        getAdvice = definition.get;
        setAdvice = definition.set;
      }
      values = new WeakMap;
      return this.accessor(name, {
        get: function() {
          if (getAdvice != null) {
            getAdvice.call(this);
          }
          return values.get(this);
        },
        set: function(newValue) {
          if (setAdvice != null) {
            setAdvice.call(this, newValue, values.get(this));
          }
          return values.set(this, newValue);
        }
      });
    };

    PropertyAccessors.prototype.lazyAccessor = function(name, definition) {
      var values;
      values = new WeakMap;
      return this.accessor(name, {
        get: function() {
          if (values.has(this)) {
            return values.get(this);
          } else {
            values.set(this, definition.call(this));
            return values.get(this);
          }
        },
        set: function(value) {
          return values.set(this, value);
        }
      });
    };

    return PropertyAccessors;

  })(Mixin);

}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"harmony-collections":15,"mixto":16}],15:[function(require,module,exports){
/* (The MIT License)
 *
 * Copyright (c) 2012 Brandon Benvie <http://bbenvie.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the 'Software'), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included with all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY  CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Original WeakMap implementation by Gozala @ https://gist.github.com/1269991
// Updated and bugfixed by Raynos @ https://gist.github.com/1638059
// Expanded by Benvie @ https://github.com/Benvie/harmony-collections

void function(string_, object_, function_, prototype_, toString_,
              Array, Object, Function, FP, global, exports, undefined_, undefined){

  var getProperties = Object.getOwnPropertyNames,
      es5 = typeof getProperties === function_ && !(prototype_ in getProperties);

  var callbind = FP.bind
    ? FP.bind.bind(FP.call)
    : (function(call){
        return function(func){
          return function(){
            return call.apply(func, arguments);
          };
        };
      }(FP.call));

  var functionToString = callbind(FP[toString_]),
      objectToString = callbind({}[toString_]),
      numberToString = callbind(.0.toString),
      call = callbind(FP.call),
      apply = callbind(FP.apply),
      hasOwn = callbind({}.hasOwnProperty),
      push = callbind([].push),
      splice = callbind([].splice);

  var name = function(func){
    if (typeof func !== function_)
      return '';
    else if ('name' in func)
      return func.name;

    return functionToString(func).match(/^\n?function\s?(\w*)?_?\(/)[1];
  };

  var create = es5
    ? Object.create
    : function(proto, descs){
        var Ctor = function(){};
        Ctor[prototype_] = Object(proto);
        var object = new Ctor;

        if (descs)
          for (var key in descs)
            defineProperty(object, key, descs[k]);

        return object;
      };


  function Hash(){}

  if (es5 || typeof document === "undefined") {
    void function(ObjectCreate){
      Hash.prototype = ObjectCreate(null);
      function inherit(obj){
        return ObjectCreate(obj);
      }
      Hash.inherit = inherit;
    }(Object.create);
  } else {
    void function(F){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = 'javascript:'
      Hash.prototype = iframe.contentWindow.Object.prototype;
      document.body.removeChild(iframe);
      iframe = null;

      var props = ['constructor', 'hasOwnProperty', 'propertyIsEnumerable',
                   'isProtoypeOf', 'toLocaleString', 'toString', 'valueOf'];

      for (var i=0; i < props.length; i++)
        delete Hash.prototype[props[i]];

      function inherit(obj){
        F.prototype = obj;
        obj = new F;
        F.prototype = null;
        return obj;
      }

      Hash.inherit = inherit;
    }(function(){});
  }

  var defineProperty = es5
    ? Object.defineProperty
    : function(object, key, desc) {
        object[key] = desc.value;
        return object;
      };

  var define = function(object, key, value){
    if (typeof key === function_) {
      value = key;
      key = name(value).replace(/_$/, '');
    }

    return defineProperty(object, key, { configurable: true, writable: true, value: value });
  };

  var isArray = es5
    ? (function(isArray){
        return function(o){
          return isArray(o) || o instanceof Array;
        };
      })(Array.isArray)
    : function(o){
        return o instanceof Array || objectToString(o) === '[object Array]';
      };

  // ############
  // ### Data ###
  // ############

  var builtinWeakMap = 'WeakMap' in global;

  var MapData = builtinWeakMap
    ? (function(){
      var BuiltinWeakMap = global.WeakMap,
          wmget = callbind(BuiltinWeakMap[prototype_].get),
          wmset = callbind(BuiltinWeakMap[prototype_].set),
          wmhas = callbind(BuiltinWeakMap[prototype_].has);

      function MapData(name){
        var map = new BuiltinWeakMap;

        this.get = function(o){
          return wmget(map, o);
        };
        this.set = function(o, v){
          wmset(map, o, v);
        };

        if (name) {
          this.wrap = function(o, v){
            if (wmhas(map, o))
              throw new TypeError("Object is already a " + name);
            wmset(map, o, v);
          };
          this.unwrap = function(o){
            var storage = wmget(map, o);
            if (!storage)
              throw new TypeError(name + " is not generic");
            return storage;
          };
        }
      }

      return MapData;
    })()
    : (function(){
      var locker = 'return function(k){if(k===s)return l}',
          random = Math.random,
          uids = new Hash,
          slice = callbind(''.slice),
          indexOf = callbind([].indexOf);

      var createUID = function(){
        var key = slice(numberToString(random(), 36), 2);
        return key in uids ? createUID() : uids[key] = key;
      };

      var globalID = createUID();

      // common per-object storage area made visible by patching getOwnPropertyNames'
      function getOwnPropertyNames(obj){
        var props = getProperties(obj);
        if (hasOwn(obj, globalID))
          splice(props, indexOf(props, globalID), 1);
        return props;
      }

      if (es5) {
        // check for the random key on an object, create new storage if missing, return it
        var storage = function(obj){
          if (!hasOwn(obj, globalID))
            defineProperty(obj, globalID, { value: new Hash });
          return obj[globalID];
        };

        define(Object, getOwnPropertyNames);
      } else {

        var toStringToString = function(s){
          function toString(){ return s }
          return toString[toString_] = toString;
        }(Object[prototype_][toString_]+'');

        // store the values on a custom valueOf in order to hide them but store them locally
        var storage = function(obj){
          if (hasOwn(obj, toString_) && globalID in obj[toString_])
            return obj[toString_][globalID];

          if (!(toString_ in obj))
            throw new Error("Can't store values for "+obj);

          var oldToString = obj[toString_];
          function toString(){ return oldToString.call(this) }
          obj[toString_] = toString;
          toString[toString_] = toStringToString;
          return toString[globalID] = {};
        };
      }



      // shim for [[MapData]] from es6 spec, and pulls double duty as WeakMap storage
      function MapData(name){
        var puid = createUID(),
            iuid = createUID(),
            secret = { value: undefined, writable: true };

        var attach = function(obj){
          var store = storage(obj);
          if (hasOwn(store, puid))
            return store[puid](secret);

          var lockbox = new Hash;
          defineProperty(lockbox, iuid, secret);
          defineProperty(store, puid, {
            value: new Function('s', 'l', locker)(secret, lockbox)
          });
          return lockbox;
        };

        this.get = function(o){
          return attach(o)[iuid];
        };
        this.set = function(o, v){
          attach(o)[iuid] = v;
        };

        if (name) {
          this.wrap = function(o, v){
            var lockbox = attach(o);
            if (lockbox[iuid])
              throw new TypeError("Object is already a " + name);
            lockbox[iuid] = v;
          };
          this.unwrap = function(o){
            var storage = attach(o)[iuid];
            if (!storage)
              throw new TypeError(name + " is not generic");
            return storage;
          };
        }
      }

      return MapData;
    }());

  var exporter = (function(){
    // [native code] looks slightly different in each engine
    var src = (''+Object).split('Object');

    // fake [native code]
    function toString(){
      return src[0] + name(this) + src[1];
    }

    define(toString, toString);

    // attempt to use __proto__ so the methods don't all have an own toString
    var prepFunction = { __proto__: [] } instanceof Array
      ? function(func){ func.__proto__ = toString }
      : function(func){ define(func, toString) };

    // assemble an array of functions into a fully formed class
    var prepare = function(methods){
      var Ctor = methods.shift(),
          brand = '[object ' + name(Ctor) + ']';

      function toString(){ return brand }
      methods.push(toString);
      prepFunction(Ctor);

      for (var i=0; i < methods.length; i++) {
        prepFunction(methods[i]);
        define(Ctor[prototype_], methods[i]);
      }

      return Ctor;
    };

    return function(name, init){
      if (name in exports)
        return exports[name];

      var data = new MapData(name);

      return exports[name] = prepare(init(
        function(collection, value){
          data.wrap(collection, value);
        },
        function(collection){
          return data.unwrap(collection);
        }
      ));
    };
  }());


  // initialize collection with an iterable, currently only supports forEach function
  var initialize = function(iterable, callback){
    if (iterable !== null && typeof iterable === object_ && typeof iterable.forEach === function_) {
      iterable.forEach(function(item, i){
        if (isArray(item) && item.length === 2)
          callback(iterable[i][0], iterable[i][1]);
        else
          callback(iterable[i], i);
      });
    }
  }

  // attempt to fix the name of "delete_" methods, should work in V8 and spidermonkey
  var fixDelete = function(func, scopeNames, scopeValues){
    try {
      scopeNames[scopeNames.length] = ('return '+func).replace('e_', '\\u0065');
      return Function.apply(0, scopeNames).apply(0, scopeValues);
    } catch (e) {
      return func;
    }
  }

  var WM, HM, M;

  // ###############
  // ### WeakMap ###
  // ###############

  WM = builtinWeakMap ? (exports.WeakMap = global.WeakMap) : exporter('WeakMap', function(wrap, unwrap){
    var prototype = WeakMap[prototype_];
    var validate = function(key){
      if (key == null || typeof key !== object_ && typeof key !== function_)
        throw new TypeError("Invalid WeakMap key");
    };

    /**
     * @class        WeakMap
     * @description  Collection using objects with unique identities as keys that disallows enumeration
     *               and allows for better garbage collection.
     * @param        {Iterable} [iterable]  An item to populate the collection with.
     */
    function WeakMap(iterable){
      if (this === global || this == null || this === prototype)
        return new WeakMap(iterable);

      wrap(this, new MapData);

      var self = this;
      iterable && initialize(iterable, function(value, key){
        call(set, self, value, key);
      });
    }
    /**
     * @method       <get>
     * @description  Retrieve the value in the collection that matches key
     * @param        {Any} key
     * @return       {Any}
     */
    function get(key){
      validate(key);
      var value = unwrap(this).get(key);
      return value === undefined_ ? undefined : value;
    }
    /**
     * @method       <set>
     * @description  Add or update a pair in the collection. Enforces uniqueness by overwriting.
     * @param        {Any} key
     * @param        {Any} val
     **/
    function set(key, value){
      validate(key);
      // store a token for explicit undefined so that "has" works correctly
      unwrap(this).set(key, value === undefined ? undefined_ : value);
    }
    /*
     * @method       <has>
     * @description  Check if key is in the collection
     * @param        {Any} key
     * @return       {Boolean}
     **/
    function has(key){
      validate(key);
      return unwrap(this).get(key) !== undefined;
    }
    /**
     * @method       <delete>
     * @description  Remove key and matching value if found
     * @param        {Any} key
     * @return       {Boolean} true if item was in collection
     */
    function delete_(key){
      validate(key);
      var data = unwrap(this);

      if (data.get(key) === undefined)
        return false;

      data.set(key, undefined);
      return true;
    }

    delete_ = fixDelete(delete_, ['validate', 'unwrap'], [validate, unwrap]);
    return [WeakMap, get, set, has, delete_];
  });


  // ###############
  // ### HashMap ###
  // ###############

  HM = exporter('HashMap', function(wrap, unwrap){
    // separate numbers, strings, and atoms to compensate for key coercion to string

    var prototype = HashMap[prototype_],
        STRING = 0, NUMBER = 1, OTHER = 2,
        others = { 'true': true, 'false': false, 'null': null, 0: -0 };

    var proto = Math.random().toString(36).slice(2);

    var coerce = function(key){
      return key === '__proto__' ? proto : key;
    };

    var uncoerce = function(type, key){
      switch (type) {
        case STRING: return key === proto ? '__proto__' : key;
        case NUMBER: return +key;
        case OTHER: return others[key];
      }
    }


    var validate = function(key){
      if (key == null) return OTHER;
      switch (typeof key) {
        case 'boolean': return OTHER;
        case string_: return STRING;
        // negative zero has to be explicitly accounted for
        case 'number': return key === 0 && Infinity / key === -Infinity ? OTHER : NUMBER;
        default: throw new TypeError("Invalid HashMap key");
      }
    }

    /**
     * @class          HashMap
     * @description    Collection that only allows primitives to be keys.
     * @param          {Iterable} [iterable]  An item to populate the collection with.
     */
    function HashMap(iterable){
      if (this === global || this == null || this === prototype)
        return new HashMap(iterable);

      wrap(this, {
        size: 0,
        0: new Hash,
        1: new Hash,
        2: new Hash
      });

      var self = this;
      iterable && initialize(iterable, function(value, key){
        call(set, self, value, key);
      });
    }
    /**
     * @method       <get>
     * @description  Retrieve the value in the collection that matches key
     * @param        {Any} key
     * @return       {Any}
     */
    function get(key){
      return unwrap(this)[validate(key)][coerce(key)];
    }
    /**
     * @method       <set>
     * @description  Add or update a pair in the collection. Enforces uniqueness by overwriting.
     * @param        {Any} key
     * @param        {Any} val
     **/
    function set(key, value){
      var items = unwrap(this),
          data = items[validate(key)];

      key = coerce(key);
      key in data || items.size++;
      data[key] = value;
    }
    /**
     * @method       <has>
     * @description  Check if key exists in the collection.
     * @param        {Any} key
     * @return       {Boolean} is in collection
     **/
    function has(key){
      return coerce(key) in unwrap(this)[validate(key)];
    }
    /**
     * @method       <delete>
     * @description  Remove key and matching value if found
     * @param        {Any} key
     * @return       {Boolean} true if item was in collection
     */
    function delete_(key){
      var items = unwrap(this),
          data = items[validate(key)];

      key = coerce(key);
      if (key in data) {
        delete data[key];
        items.size--;
        return true;
      }

      return false;
    }
    /**
     * @method       <size>
     * @description  Retrieve the amount of items in the collection
     * @return       {Number}
     */
    function size(){
      return unwrap(this).size;
    }
    /**
     * @method       <forEach>
     * @description  Loop through the collection raising callback for each
     * @param        {Function} callback  `callback(value, key)`
     * @param        {Object}   context    The `this` binding for callbacks, default null
     */
    function forEach(callback, context){
      var data = unwrap(this);
      context = context == null ? global : context;
      for (var i=0; i < 3; i++)
        for (var key in data[i])
          call(callback, context, data[i][key], uncoerce(i, key), this);
    }

    delete_ = fixDelete(delete_, ['validate', 'unwrap', 'coerce'], [validate, unwrap, coerce]);
    return [HashMap, get, set, has, delete_, size, forEach];
  });


  // ###########
  // ### Map ###
  // ###########

  // if a fully implemented Map exists then use it
  if ('Map' in global && 'forEach' in global.Map.prototype) {
    M = exports.Map = global.Map;
  } else {
    M = exporter('Map', function(wrap, unwrap){
      // attempt to use an existing partially implemented Map
      var BuiltinMap = global.Map,
          prototype = Map[prototype_],
          wm = WM[prototype_],
          hm = (BuiltinMap || HM)[prototype_],
          mget    = [callbind(hm.get), callbind(wm.get)],
          mset    = [callbind(hm.set), callbind(wm.set)],
          mhas    = [callbind(hm.has), callbind(wm.has)],
          mdelete = [callbind(hm['delete']), callbind(wm['delete'])];

      var type = BuiltinMap
        ? function(){ return 0 }
        : function(o){ return +(typeof o === object_ ? o !== null : typeof o === function_) }

      // if we have a builtin Map we can let it do most of the heavy lifting
      var init = BuiltinMap
        ? function(){ return { 0: new BuiltinMap } }
        : function(){ return { 0: new HM, 1: new WM } };

      /**
       * @class         Map
       * @description   Collection that allows any kind of value to be a key.
       * @param         {Iterable} [iterable]  An item to populate the collection with.
       */
      function Map(iterable){
        if (this === global || this == null || this === prototype)
          return new Map(iterable);

        var data = init();
        data.keys = [];
        data.values = [];
        wrap(this, data);

        var self = this;
        iterable && initialize(iterable, function(value, key){
          call(set, self, value, key);
        });
      }
      /**
       * @method       <get>
       * @description  Retrieve the value in the collection that matches key
       * @param        {Any} key
       * @return       {Any}
       */
      function get(key){
        var data = unwrap(this),
            t = type(key);
        return data.values[mget[t](data[t], key)];
      }
      /**
       * @method       <set>
       * @description  Add or update a pair in the collection. Enforces uniqueness by overwriting.
       * @param        {Any} key
       * @param        {Any} val
       **/
      function set(key, value){
        var data = unwrap(this),
            t = type(key),
            index = mget[t](data[t], key);

        if (index === undefined) {
          mset[t](data[t], key, data.keys.length);
          push(data.keys, key);
          push(data.values, value);
        } else {
          data.keys[index] = key;
          data.values[index] = value;
        }
      }
      /**
       * @method       <has>
       * @description  Check if key exists in the collection.
       * @param        {Any} key
       * @return       {Boolean} is in collection
       **/
      function has(key){
        var t = type(key);
        return mhas[t](unwrap(this)[t], key);
      }
      /**
       * @method       <delete>
       * @description  Remove key and matching value if found
       * @param        {Any} key
       * @return       {Boolean} true if item was in collection
       */
      function delete_(key){
        var data = unwrap(this),
            t = type(key),
            index = mget[t](data[t], key);

        if (index === undefined)
          return false;

        mdelete[t](data[t], key);
        splice(data.keys, index, 1);
        splice(data.values, index, 1);
        return true;
      }
      /**
       * @method       <size>
       * @description  Retrieve the amount of items in the collection
       * @return       {Number}
       */
      function size(){
        return unwrap(this).keys.length;
      }
      /**
       * @method       <forEach>
       * @description  Loop through the collection raising callback for each
       * @param        {Function} callback  `callback(value, key)`
       * @param        {Object}   context    The `this` binding for callbacks, default null
       */
      function forEach(callback, context){
        var data = unwrap(this),
            keys = data.keys,
            values = data.values;

        context = context == null ? global : context;

        for (var i=0, len=keys.length; i < len; i++)
          call(callback, context, values[i], keys[i], this);
      }

      delete_ = fixDelete(delete_,
        ['type', 'unwrap', 'call', 'splice'],
        [type, unwrap, call, splice]
      );
      return [Map, get, set, has, delete_, size, forEach];
    });
  }


  // ###########
  // ### Set ###
  // ###########

  exporter('Set', function(wrap, unwrap){
    var prototype = Set[prototype_],
        m = M[prototype_],
        msize = callbind(m.size),
        mforEach = callbind(m.forEach),
        mget = callbind(m.get),
        mset = callbind(m.set),
        mhas = callbind(m.has),
        mdelete = callbind(m['delete']);

    /**
     * @class        Set
     * @description  Collection of values that enforces uniqueness.
     * @param        {Iterable} [iterable]  An item to populate the collection with.
     **/
    function Set(iterable){
      if (this === global || this == null || this === prototype)
        return new Set(iterable);

      wrap(this, new M);

      var self = this;
      iterable && initialize(iterable, function(value, key){
        call(add, self, key);
      });
    }
    /**
     * @method       <add>
     * @description  Insert value if not found, enforcing uniqueness.
     * @param        {Any} val
     */
    function add(key){
      mset(unwrap(this), key, key);
    }
    /**
     * @method       <has>
     * @description  Check if key exists in the collection.
     * @param        {Any} key
     * @return       {Boolean} is in collection
     **/
    function has(key){
      return mhas(unwrap(this), key);
    }
    /**
     * @method       <delete>
     * @description  Remove key and matching value if found
     * @param        {Any} key
     * @return       {Boolean} true if item was in collection
     */
    function delete_(key){
      return mdelete(unwrap(this), key);
    }
    /**
     * @method       <size>
     * @description  Retrieve the amount of items in the collection
     * @return       {Number}
     */
    function size(){
      return msize(unwrap(this));
    }
    /**
     * @method       <forEach>
     * @description  Loop through the collection raising callback for each. Index is simply the counter for the current iteration.
     * @param        {Function} callback  `callback(value, index)`
     * @param        {Object}   context    The `this` binding for callbacks, default null
     */
    function forEach(callback, context){
      var index = 0,
          self = this;
      mforEach(unwrap(this), function(key){
        call(callback, this, key, index++, self);
      }, context);
    }

    delete_ = fixDelete(delete_, ['mdelete', 'unwrap'], [mdelete, unwrap]);
    return [Set, add, has, delete_, size, forEach];
  });
}('string', 'object', 'function', 'prototype', 'toString',
  Array, Object, Function, Function.prototype, (0, eval)('this'),
  typeof exports === 'undefined' ? this : exports, {});

},{}],16:[function(require,module,exports){
module.exports=require(12)
},{"/home/k2052/Dropbox/creations/webgl-2d/node_modules/mixto/lib/mixin.js":12}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9XZWJHTDJELmpzIiwibGliL3dlYmdsMmQvRHJhd2luZy5qcyIsImxpYi93ZWJnbDJkL1N1YlBhdGguanMiLCJsaWIvd2ViZ2wyZC9UZXh0dXJlLmpzIiwibGliL3dlYmdsMmQvbWF0aC5qcyIsImxpYi93ZWJnbDJkL21hdGgvVHJhbnNmb3JtLmpzIiwibGliL3dlYmdsMmQvbWF0aC9tYXQzLmpzIiwibGliL3dlYmdsMmQvc2hhZGVycy9mcmFnbWVudC5qcyIsImxpYi93ZWJnbDJkL3NoYWRlcnMvdmVydGV4LmpzIiwibGliL3dlYmdsMmQvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9taXh0by9saWIvbWl4aW4uanMiLCJub2RlX21vZHVsZXMvb25lY29sb3Ivb25lLWNvbG9yLWFsbC1kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9wcm9wZXJ0eS1hY2Nlc3NvcnMvbGliL3Byb3BlcnR5LWFjY2Vzc29ycy5qcyIsIm5vZGVfbW9kdWxlcy9wcm9wZXJ0eS1hY2Nlc3NvcnMvbm9kZV9tb2R1bGVzL2hhcm1vbnktY29sbGVjdGlvbnMvaGFybW9ueS1jb2xsZWN0aW9ucy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL1dlYkdMMkQuanMnKTtcbiIsInZhciBEcmF3aW5nLCBQcm9wZXJ0eUFjY2Vzc29ycywgVHJhbnNmb3JtLCBXZWJHTDJELCBjb2xvclN0cmluZ1RvVmVjNCwgY29sb3JWZWNUb1N0cmluZywgZ2V0RnJhZ21lbnRTaGFkZXJTb3VyY2UsIGdldFZlcnRleFNoYWRlclNvdXJjZSwgdXRpbDtcblxuRHJhd2luZyA9IHJlcXVpcmUoJy4vd2ViZ2wyZC9EcmF3aW5nJyk7XG5cblRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vd2ViZ2wyZC9tYXRoL1RyYW5zZm9ybScpO1xuXG5Qcm9wZXJ0eUFjY2Vzc29ycyA9IHJlcXVpcmUoJ3Byb3BlcnR5LWFjY2Vzc29ycycpO1xuXG5nZXRGcmFnbWVudFNoYWRlclNvdXJjZSA9IHJlcXVpcmUoJy4vd2ViZ2wyZC9zaGFkZXJzL2ZyYWdtZW50Jyk7XG5cbmdldFZlcnRleFNoYWRlclNvdXJjZSA9IHJlcXVpcmUoJy4vd2ViZ2wyZC9zaGFkZXJzL3ZlcnRleCcpO1xuXG51dGlsID0gcmVxdWlyZSgnLi93ZWJnbDJkL3V0aWwnKTtcblxuY29sb3JWZWNUb1N0cmluZyA9IHV0aWwuY29sb3JWZWNUb1N0cmluZztcblxuY29sb3JTdHJpbmdUb1ZlYzQgPSB1dGlsLmNvbG9yU3RyaW5nVG9WZWM0O1xuXG5XZWJHTDJEID0gKGZ1bmN0aW9uKCkge1xuICBEcmF3aW5nLmluY2x1ZGVJbnRvKFdlYkdMMkQpO1xuXG4gIFByb3BlcnR5QWNjZXNzb3JzLmluY2x1ZGVJbnRvKFdlYkdMMkQpO1xuXG4gIGZ1bmN0aW9uIFdlYkdMMkQoY2FudmFzLCBvcHRpb25zKSB7XG4gICAgdmFyIHRleHRDYW52YXM7XG4gICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLmdsID0gY2FudmFzLmdldENvbnRleHQoXCJ3ZWJnbFwiKTtcbiAgICB0aGlzLmZzID0gdm9pZCAwO1xuICAgIHRoaXMudnMgPSB2b2lkIDA7XG4gICAgdGhpcy5zaGFkZXJQcm9ncmFtID0gdm9pZCAwO1xuICAgIHRoaXMuc2hhZGVyUG9vbCA9IFtdO1xuICAgIHRoaXMudHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSgpO1xuICAgIHRoaXMubWF4VGV4dHVyZVNpemUgPSB2b2lkIDA7XG4gICAgdGV4dENhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG4gICAgdGV4dENhbnZhcy53aWR0aCA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgIHRleHRDYW52YXMuaGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgIHRoaXMudGV4dEN0eCA9IHRleHRDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHRoaXMuc2hhZGVyTWFzayA9IHtcbiAgICAgIHRleHR1cmU6IDEsXG4gICAgICBjcm9wOiAyLFxuICAgICAgcGF0aDogNFxuICAgIH07XG4gICAgdGhpcy5pbml0U2hhZGVycygpO1xuICAgIHRoaXMuaW5pdEJ1ZmZlcnMoKTtcbiAgICB0aGlzLmluaXREcmF3aW5nKCk7XG4gICAgdGhpcy5nbC52aWV3cG9ydCgwLCAwLCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0KTtcbiAgICB0aGlzLmdsLmNsZWFyQ29sb3IoMSwgMSwgMSwgMSk7XG4gICAgdGhpcy5nbC5jbGVhcih0aGlzLmdsLkNPTE9SX0JVRkZFUl9CSVQpO1xuICAgIHRoaXMuZ2wuY29sb3JNYXNrKDEsIDEsIDEsIDApO1xuICAgIHRoaXMuZ2wuZW5hYmxlKHRoaXMuZ2wuQkxFTkQpO1xuICAgIHRoaXMuZ2wuYmxlbmRGdW5jKHRoaXMuZ2wuU1JDX0FMUEhBLCB0aGlzLmdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuICAgIHRoaXMubWF4VGV4dHVyZVNpemUgPSB0aGlzLmdsLmdldFBhcmFtZXRlcih0aGlzLmdsLk1BWF9URVhUVVJFX1NJWkUpO1xuICB9XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuaW5pdFNoYWRlcnMgPSBmdW5jdGlvbih0cmFuc2Zvcm1TdGFja0RlcHRoLCBzTWFzaykge1xuICAgIHZhciBmcywgZ2wsIGksIHNoYWRlclByb2dyYW0sIHN0b3JlZFNoYWRlciwgdnM7XG4gICAgZ2wgPSB0aGlzLmdsO1xuICAgIHRyYW5zZm9ybVN0YWNrRGVwdGggPSB0cmFuc2Zvcm1TdGFja0RlcHRoIHx8IDE7XG4gICAgc01hc2sgPSBzTWFzayB8fCAwO1xuICAgIHN0b3JlZFNoYWRlciA9IHRoaXMuc2hhZGVyUG9vbFt0cmFuc2Zvcm1TdGFja0RlcHRoXTtcbiAgICBpZiAoIXN0b3JlZFNoYWRlcikge1xuICAgICAgc3RvcmVkU2hhZGVyID0gdGhpcy5zaGFkZXJQb29sW3RyYW5zZm9ybVN0YWNrRGVwdGhdID0gW107XG4gICAgfVxuICAgIHN0b3JlZFNoYWRlciA9IHN0b3JlZFNoYWRlcltzTWFza107XG4gICAgaWYgKHN0b3JlZFNoYWRlcikge1xuICAgICAgZ2wudXNlUHJvZ3JhbShzdG9yZWRTaGFkZXIpO1xuICAgICAgdGhpcy5zaGFkZXJQcm9ncmFtID0gc3RvcmVkU2hhZGVyO1xuICAgICAgcmV0dXJuIHN0b3JlZFNoYWRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgZnMgPSB0aGlzLmZzID0gZ2wuY3JlYXRlU2hhZGVyKGdsLkZSQUdNRU5UX1NIQURFUik7XG4gICAgICBnbC5zaGFkZXJTb3VyY2UodGhpcy5mcywgZ2V0RnJhZ21lbnRTaGFkZXJTb3VyY2Uoc01hc2ssIHRoaXMuc2hhZGVyTWFzaykpO1xuICAgICAgZ2wuY29tcGlsZVNoYWRlcih0aGlzLmZzKTtcbiAgICAgIGlmICghZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHRoaXMuZnMsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICB0aHJvdyBcImZyYWdtZW50IHNoYWRlciBlcnJvcjogXCIgKyBnbC5nZXRTaGFkZXJJbmZvTG9nKHRoaXMuZnMpO1xuICAgICAgfVxuICAgICAgdnMgPSB0aGlzLnZzID0gZ2wuY3JlYXRlU2hhZGVyKGdsLlZFUlRFWF9TSEFERVIpO1xuICAgICAgZ2wuc2hhZGVyU291cmNlKHRoaXMudnMsIGdldFZlcnRleFNoYWRlclNvdXJjZSh0cmFuc2Zvcm1TdGFja0RlcHRoLCBzTWFzaywgdGhpcy5zaGFkZXJNYXNrLCB0aGlzLmNhbnZhcykpO1xuICAgICAgZ2wuY29tcGlsZVNoYWRlcih0aGlzLnZzKTtcbiAgICAgIGlmICghZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHRoaXMudnMsIGdsLkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICB0aHJvdyBcInZlcnRleCBzaGFkZXIgZXJyb3I6IFwiICsgZ2wuZ2V0U2hhZGVySW5mb0xvZyh0aGlzLnZzKTtcbiAgICAgIH1cbiAgICAgIHNoYWRlclByb2dyYW0gPSB0aGlzLnNoYWRlclByb2dyYW0gPSBnbC5jcmVhdGVQcm9ncmFtKCk7XG4gICAgICBzaGFkZXJQcm9ncmFtLnN0YWNrRGVwdGggPSB0cmFuc2Zvcm1TdGFja0RlcHRoO1xuICAgICAgZ2wuYXR0YWNoU2hhZGVyKHNoYWRlclByb2dyYW0sIGZzKTtcbiAgICAgIGdsLmF0dGFjaFNoYWRlcihzaGFkZXJQcm9ncmFtLCB2cyk7XG4gICAgICBnbC5saW5rUHJvZ3JhbShzaGFkZXJQcm9ncmFtKTtcbiAgICAgIGlmICghZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihzaGFkZXJQcm9ncmFtLCBnbC5MSU5LX1NUQVRVUykpIHtcbiAgICAgICAgdGhyb3cgXCJDb3VsZCBub3QgaW5pdGlhbGlzZSBzaGFkZXJzLlwiO1xuICAgICAgfVxuICAgICAgZ2wudXNlUHJvZ3JhbShzaGFkZXJQcm9ncmFtKTtcbiAgICAgIHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUgPSBnbC5nZXRBdHRyaWJMb2NhdGlvbihzaGFkZXJQcm9ncmFtLCBcImFWZXJ0ZXhQb3NpdGlvblwiKTtcbiAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUpO1xuICAgICAgc2hhZGVyUHJvZ3JhbS51Q29sb3IgPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24oc2hhZGVyUHJvZ3JhbSwgXCJ1Q29sb3JcIik7XG4gICAgICBzaGFkZXJQcm9ncmFtLnVTYW1wbGVyID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwidVNhbXBsZXJcIik7XG4gICAgICBzaGFkZXJQcm9ncmFtLnVDcm9wU291cmNlID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwidUNyb3BTb3VyY2VcIik7XG4gICAgICBzaGFkZXJQcm9ncmFtLnVUcmFuc2Zvcm1zID0gW107XG4gICAgICBpID0gMDtcbiAgICAgIHdoaWxlIChpIDwgdHJhbnNmb3JtU3RhY2tEZXB0aCkge1xuICAgICAgICBzaGFkZXJQcm9ncmFtLnVUcmFuc2Zvcm1zW2ldID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwidVRyYW5zZm9ybXNbXCIgKyBpICsgXCJdXCIpO1xuICAgICAgICArK2k7XG4gICAgICB9XG4gICAgICB0aGlzLnNoYWRlclBvb2xbdHJhbnNmb3JtU3RhY2tEZXB0aF1bc01hc2tdID0gc2hhZGVyUHJvZ3JhbTtcbiAgICAgIHJldHVybiBzaGFkZXJQcm9ncmFtO1xuICAgIH1cbiAgfTtcblxuICBXZWJHTDJELnByb3RvdHlwZS5pbml0QnVmZmVycyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBnbDtcbiAgICBnbCA9IHRoaXMuZ2w7XG4gICAgdGhpcy5yZWN0VmVydHMgPSBuZXcgRmxvYXQzMkFycmF5KFswLCAwLCAwLCAwLCAwLCAxLCAwLCAxLCAxLCAxLCAxLCAxLCAxLCAwLCAxLCAwXSk7XG4gICAgdGhpcy5yZWN0VmVydGV4UG9zaXRpb25CdWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICB0aGlzLnJlY3RWZXJ0ZXhDb2xvckJ1ZmZlciA9IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuICAgIHRoaXMucGF0aFZlcnRleFBvc2l0aW9uQnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG4gICAgdGhpcy5wYXRoVmVydGV4Q29sb3JCdWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5yZWN0VmVydGV4UG9zaXRpb25CdWZmZXIpO1xuICAgIHJldHVybiBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5yZWN0VmVydHMsIGdsLlNUQVRJQ19EUkFXKTtcbiAgfTtcblxuICBXZWJHTDJELnByb3RvdHlwZS5hY2Nlc3NvcignZmlsbFN0eWxlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gY29sb3JWZWNUb1N0cmluZyh0aGlzLmRyYXdTdGF0ZS5maWxsU3R5bGUpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZSA9IGNvbG9yU3RyaW5nVG9WZWM0KGNvbG9yKTtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdzdHJva2VTdHlsZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNvbG9yVmVjVG9TdHJpbmcodGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGUpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihjb2xvcikge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLnN0cm9rZVN0eWxlID0gY29sb3JTdHJpbmdUb1ZlYzQoY29sb3IpO1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ2xpbmVXaWR0aCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmxpbmVXaWR0aDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obGluZVdpZHRoKSB7XG4gICAgICB0aGlzLmdsLmxpbmVXaWR0aChsaW5lV2lkdGgpO1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmxpbmVXaWR0aCA9IGxpbmVXaWR0aDtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdsaW5lQ2FwJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUubGluZUNhcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obGluZUNhcCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmxpbmVDYXAgPSBsaW5lQ2FwO1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ2xpbmVKb2luJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUubGluZUpvaW47XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGxpbmVKb2luKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUubGluZUpvaW4gPSBsaW5lSm9pbjtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdtaXRlckxpbWl0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUubWl0ZXJMaW1pdDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obWl0ZXJMaW1pdCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLm1pdGVyTGltaXQgPSBtaXRlckxpbWl0O1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ3NoYWRvd09mZnNldFgnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmRyYXdTdGF0ZS5zaGFkb3dPZmZzZXRYO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihzaGFkb3dPZmZzZXRYKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuc2hhZG93T2Zmc2V0WCA9IHNoYWRvd09mZnNldFg7XG4gICAgfVxuICB9KTtcblxuICBXZWJHTDJELnByb3RvdHlwZS5hY2Nlc3Nvcignc2hhZG93T2Zmc2V0WScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLnNoYWRvd09mZnNldFk7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHNoYWRvd09mZnNldFkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRyYXdTdGF0ZS5zaGFkb3dPZmZzZXRZID0gc2hhZG93T2Zmc2V0WTtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdzaGFkb3dCbHVyJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuc2hhZG93Qmx1cjtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oc2hhZG93Qmx1cikge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLnNoYWRvd0JsdXIgPSBzaGFkb3dCbHVyO1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ3NoYWRvd0NvbG9yJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuc2hhZG93Q29sb3I7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHNoYWRvd0NvbG9yKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuc2hhZG93Q29sb3IgPSBzaGFkb3dDb2xvcjtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdmb250Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuZm9udDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oZm9udCkge1xuICAgICAgdGhpcy50ZXh0Q3R4LmZvbnQgPSBmb250O1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmZvbnQgPSBmb250O1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ3RleHRBbGlnbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLnRleHRBbGlnbjtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odGV4dEFsaWduKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUudGV4dEFsaWduID0gdGV4dEFsaWduO1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ3RleHRCYXNlbGluZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLnRleHRCYXNlbGluZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odGV4dEJhc2VsaW5lKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUudGV4dEJhc2VsaW5lID0gdGV4dEJhc2VsaW5lO1xuICAgIH1cbiAgfSk7XG5cbiAgV2ViR0wyRC5wcm90b3R5cGUuYWNjZXNzb3IoJ2dsb2JhbEFscGhhJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuZ2xvYmFsQWxwaGE7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGdsb2JhbEFscGhhKSB7XG4gICAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuZ2xvYmFsQWxwaGEgPSBnbG9iYWxBbHBoYTtcbiAgICB9XG4gIH0pO1xuXG4gIFdlYkdMMkQucHJvdG90eXBlLmFjY2Vzc29yKCdnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmRyYXdTdGF0ZS5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb247XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuZHJhd1N0YXRlLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbjtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBXZWJHTDJEO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYkdMMkQ7XG4iLCJ2YXIgRHJhd2luZywgTWl4aW4sIFN1YlBhdGgsIFRleHR1cmUsIFRyYW5zZm9ybSwgY29sb3JTdHJpbmdUb1ZlYzQsIGNvbG9yVmVjVG9TdHJpbmcsIHV0aWwsXG4gIF9faGFzUHJvcCA9IHt9Lmhhc093blByb3BlcnR5LFxuICBfX2V4dGVuZHMgPSBmdW5jdGlvbihjaGlsZCwgcGFyZW50KSB7IGZvciAodmFyIGtleSBpbiBwYXJlbnQpIHsgaWYgKF9faGFzUHJvcC5jYWxsKHBhcmVudCwga2V5KSkgY2hpbGRba2V5XSA9IHBhcmVudFtrZXldOyB9IGZ1bmN0aW9uIGN0b3IoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfSBjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7IGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7IGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7IHJldHVybiBjaGlsZDsgfTtcblxuTWl4aW4gPSByZXF1aXJlKCdtaXh0bycpO1xuXG5TdWJQYXRoID0gcmVxdWlyZSgnLi9TdWJQYXRoJyk7XG5cblRleHR1cmUgPSByZXF1aXJlKCcuL1RleHR1cmUnKTtcblxuVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9tYXRoL1RyYW5zZm9ybScpO1xuXG51dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmNvbG9yVmVjVG9TdHJpbmcgPSB1dGlsLmNvbG9yVmVjVG9TdHJpbmc7XG5cbmNvbG9yU3RyaW5nVG9WZWM0ID0gdXRpbC5jb2xvclN0cmluZ1RvVmVjNDtcblxuRHJhd2luZyA9IChmdW5jdGlvbihfc3VwZXIpIHtcbiAgX19leHRlbmRzKERyYXdpbmcsIF9zdXBlcik7XG5cbiAgZnVuY3Rpb24gRHJhd2luZygpIHtcbiAgICByZXR1cm4gRHJhd2luZy5fX3N1cGVyX18uY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIERyYXdpbmcucHJvdG90eXBlLnJlc3RvcmVEcmF3U3RhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kcmF3U3RhdGVTdGFjay5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLmRyYXdTdGF0ZSA9IHRoaXMuZHJhd1N0YXRlU3RhY2sucG9wKCk7XG4gICAgfVxuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmluaXREcmF3aW5nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRlbXBDYW52YXM7XG4gICAgdGhpcy5nbDJkID0gdGhpcztcbiAgICB0aGlzLnN1YlBhdGhzID0gW107XG4gICAgdGhpcy5pbWFnZUNhY2hlID0gW107XG4gICAgdGhpcy50ZXh0dXJlQ2FjaGUgPSBbXTtcbiAgICB0aGlzLmRyYXdTdGF0ZVN0YWNrID0gW107XG4gICAgdGhpcy5kcmF3U3RhdGUgPSB7fTtcbiAgICB0ZW1wQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy50ZW1wQ3R4ID0gdGVtcENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZSA9IFswLCAwLCAwLCAxXTtcbiAgICB0aGlzLmRyYXdTdGF0ZS5zdHJva2VTdHlsZSA9IFswLCAwLCAwLCAxXTtcbiAgICB0aGlzLmRyYXdTdGF0ZS5saW5lV2lkdGggPSAxLjA7XG4gICAgdGhpcy5kcmF3U3RhdGUubGluZUNhcCA9ICdidXR0JztcbiAgICB0aGlzLmRyYXdTdGF0ZS5saW5lSm9pbiA9IFwibWl0ZXJcIjtcbiAgICB0aGlzLmRyYXdTdGF0ZS5taXRlckxpbWl0ID0gMTA7XG4gICAgdGhpcy5kcmF3U3RhdGUuc2hhZG93T2Zmc2V0WCA9IDA7XG4gICAgdGhpcy5kcmF3U3RhdGUuc2hhZG93T2Zmc2V0WSA9IDA7XG4gICAgdGhpcy5kcmF3U3RhdGUuc2hhZG93Qmx1ciA9IDA7XG4gICAgdGhpcy5kcmF3U3RhdGUuc2hhZG93Q29sb3IgPSBcInJnYmEoMCwgMCwgMCwgMC4wKVwiO1xuICAgIHRoaXMuZHJhd1N0YXRlLmZvbnQgPSBcIjEwcHggc2Fucy1zZXJpZlwiO1xuICAgIHRoaXMuZHJhd1N0YXRlLnRleHRBbGlnbiA9IFwic3RhcnRcIjtcbiAgICB0aGlzLmRyYXdTdGF0ZS50ZXh0QmFzZWxpbmUgPSBcImFscGhhYmV0aWNcIjtcbiAgICB0aGlzLmRyYXdTdGF0ZS5nbG9iYWxBbHBoYSA9IDEuMDtcbiAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGUuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gXCJzb3VyY2Utb3ZlclwiO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmZpbGxUZXh0ID0gZnVuY3Rpb24odGV4dCwgeCwgeSkge307XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuc3Ryb2tlVGV4dCA9IGZ1bmN0aW9uKCkge307XG5cbiAgRHJhd2luZy5wcm90b3R5cGUubWVhc3VyZVRleHQgPSBmdW5jdGlvbigpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmdsMmQudHJhbnNmb3JtLnB1c2hNYXRyaXgoKTtcbiAgICByZXR1cm4gdGhpcy5zYXZlRHJhd1N0YXRlKCk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUucmVzdG9yZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZ2wyZC50cmFuc2Zvcm0ucG9wTWF0cml4KCk7XG4gICAgcmV0dXJuIHRoaXMucmVzdG9yZURyYXdTdGF0ZSgpO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5nbDJkLnRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24oYSkge1xuICAgIHJldHVybiB0aGlzLmdsMmQudHJhbnNmb3JtLnJvdGF0ZShhKTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5nbDJkLnRyYW5zZm9ybS5zY2FsZSh4LCB5KTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5jcmVhdGVJbWFnZURhdGEgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgcmV0dXJuIHRoaXMudGVtcEN0eC5jcmVhdGVJbWFnZURhdGEod2lkdGgsIGhlaWdodCk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuZ2V0SW1hZ2VEYXRhID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBidWZmZXIsIGRhdGEsIGgsIGksIGluZGV4MSwgaW5kZXgyLCBqLCBtYXhJLCBtYXhKLCB3O1xuICAgIGRhdGEgPSB0aGlzLnRlbXBDdHguY3JlYXRlSW1hZ2VEYXRhKHdpZHRoLCBoZWlnaHQpO1xuICAgIGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XG4gICAgdGhpcy5nbC5yZWFkUGl4ZWxzKHgsIHksIHdpZHRoLCBoZWlnaHQsIHRoaXMuZ2wuUkdCQSwgdGhpcy5nbC5VTlNJR05FRF9CWVRFLCBidWZmZXIpO1xuICAgIHcgPSB3aWR0aCAqIDQ7XG4gICAgaCA9IGhlaWdodDtcbiAgICBpID0gMDtcbiAgICBtYXhJID0gaCAvIDI7XG4gICAgd2hpbGUgKGkgPCBtYXhJKSB7XG4gICAgICBqID0gMDtcbiAgICAgIG1heEogPSB3O1xuICAgICAgd2hpbGUgKGogPCBtYXhKKSB7XG4gICAgICAgIGluZGV4MSA9IGkgKiB3ICsgajtcbiAgICAgICAgaW5kZXgyID0gKGggLSBpIC0gMSkgKiB3ICsgajtcbiAgICAgICAgZGF0YS5kYXRhW2luZGV4MV0gPSBidWZmZXJbaW5kZXgyXTtcbiAgICAgICAgZGF0YS5kYXRhW2luZGV4Ml0gPSBidWZmZXJbaW5kZXgxXTtcbiAgICAgICAgKytqO1xuICAgICAgfVxuICAgICAgKytpO1xuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5wdXRJbWFnZURhdGEgPSBmdW5jdGlvbihpbWFnZURhdGEsIHgsIHkpIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3SW1hZ2UoaW1hZ2VEYXRhLCB4LCB5KTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbihtMTEsIG0xMiwgbTIxLCBtMjIsIGR4LCBkeSkge1xuICAgIHZhciBtO1xuICAgIG0gPSB0aGlzLmdsMmQudHJhbnNmb3JtLm1fc3RhY2tbdGhpcy5nbDJkLnRyYW5zZm9ybS5jX3N0YWNrXTtcbiAgICBtWzBdICo9IG0xMTtcbiAgICBtWzFdICo9IG0yMTtcbiAgICBtWzJdICo9IGR4O1xuICAgIG1bM10gKj0gbTEyO1xuICAgIG1bNF0gKj0gbTIyO1xuICAgIG1bNV0gKj0gZHk7XG4gICAgbVs2XSA9IDA7XG4gICAgcmV0dXJuIG1bN10gPSAwO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLnNlbmRUcmFuc2Zvcm1TdGFjayA9IGZ1bmN0aW9uKHNwKSB7XG4gICAgdmFyIGksIG1heEksIHN0YWNrLCBfcmVzdWx0cztcbiAgICBzdGFjayA9IHRoaXMuZ2wyZC50cmFuc2Zvcm0ubV9zdGFjaztcbiAgICBpID0gMDtcbiAgICBtYXhJID0gdGhpcy5nbDJkLnRyYW5zZm9ybS5jX3N0YWNrICsgMTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIHdoaWxlIChpIDwgbWF4SSkge1xuICAgICAgdGhpcy5nbC51bmlmb3JtTWF0cml4M2Z2KHNwLnVUcmFuc2Zvcm1zW2ldLCBmYWxzZSwgc3RhY2tbbWF4SSAtIDEgLSBpXSk7XG4gICAgICBfcmVzdWx0cy5wdXNoKCsraSk7XG4gICAgfVxuICAgIHJldHVybiBfcmVzdWx0cztcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5zZXRUcmFuc2Zvcm0gPSBmdW5jdGlvbihtMTEsIG0xMiwgbTIxLCBtMjIsIGR4LCBkeSkge1xuICAgIHRoaXMuZ2wyZC50cmFuc2Zvcm0uc2V0SWRlbnRpdHkoKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5maWxsUmVjdCA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wsIHNoYWRlclByb2dyYW0sIHRyYW5zZm9ybTtcbiAgICBnbCA9IHRoaXMuZ2w7XG4gICAgdHJhbnNmb3JtID0gdGhpcy5nbDJkLnRyYW5zZm9ybTtcbiAgICBzaGFkZXJQcm9ncmFtID0gdGhpcy5nbDJkLmluaXRTaGFkZXJzKHRyYW5zZm9ybS5jX3N0YWNrICsgMiwgMCk7XG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMucmVjdFZlcnRleFBvc2l0aW9uQnVmZmVyKTtcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUsIDQsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XG4gICAgdHJhbnNmb3JtLnB1c2hNYXRyaXgoKTtcbiAgICB0cmFuc2Zvcm0udHJhbnNsYXRlKHgsIHkpO1xuICAgIHRyYW5zZm9ybS5zY2FsZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICB0aGlzLnNlbmRUcmFuc2Zvcm1TdGFjayhzaGFkZXJQcm9ncmFtKTtcbiAgICBnbC51bmlmb3JtNGYoc2hhZGVyUHJvZ3JhbS51Q29sb3IsIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVswXSwgdGhpcy5kcmF3U3RhdGUuZmlsbFN0eWxlWzFdLCB0aGlzLmRyYXdTdGF0ZS5maWxsU3R5bGVbMl0sIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVszXSk7XG4gICAgZ2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRV9GQU4sIDAsIDQpO1xuICAgIHJldHVybiB0cmFuc2Zvcm0ucG9wTWF0cml4KCk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuc3Ryb2tlUmVjdCA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wsIHNoYWRlclByb2dyYW0sIHRyYW5zZm9ybTtcbiAgICBnbCA9IHRoaXMuZ2w7XG4gICAgdHJhbnNmb3JtID0gdGhpcy5nbDJkLnRyYW5zZm9ybTtcbiAgICBzaGFkZXJQcm9ncmFtID0gdGhpcy5nbDJkLmluaXRTaGFkZXJzKHRyYW5zZm9ybS5jX3N0YWNrICsgMiwgMCk7XG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuZ2wyZC5yZWN0VmVydGV4UG9zaXRpb25CdWZmZXIpO1xuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoc2hhZGVyUHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSwgNCwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcbiAgICB0cmFuc2Zvcm0ucHVzaE1hdHJpeCgpO1xuICAgIHRyYW5zZm9ybS50cmFuc2xhdGUoeCwgeSk7XG4gICAgdHJhbnNmb3JtLnNjYWxlKHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuc2VuZFRyYW5zZm9ybVN0YWNrKHNoYWRlclByb2dyYW0pO1xuICAgIGdsLnVuaWZvcm00ZihzaGFkZXJQcm9ncmFtLnVDb2xvciwgdGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGVbMF0sIHRoaXMuZHJhd1N0YXRlLnN0cm9rZVN0eWxlWzFdLCB0aGlzLmRyYXdTdGF0ZS5zdHJva2VTdHlsZVsyXSwgdGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGVbM10pO1xuICAgIGdsLmRyYXdBcnJheXMoZ2wuTElORV9MT09QLCAwLCA0KTtcbiAgICByZXR1cm4gdHJhbnNmb3JtLnBvcE1hdHJpeCgpO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmNsZWFyUmVjdCA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmJlZ2luUGF0aCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnN1YlBhdGhzLmxlbmd0aCA9IDA7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuY2xvc2VQYXRoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5ld1BhdGgsIHByZXZQYXRoLCBzdGFydFgsIHN0YXJ0WTtcbiAgICBpZiAodGhpcy5zdWJQYXRocy5sZW5ndGgpIHtcbiAgICAgIHByZXZQYXRoID0gdGhpcy5zdWJQYXRoc1t0aGlzLnN1YlBhdGhzLmxlbmd0aCAtIDFdO1xuICAgICAgc3RhcnRYID0gcHJldlBhdGgudmVydHNbMF07XG4gICAgICBzdGFydFkgPSBwcmV2UGF0aC52ZXJ0c1sxXTtcbiAgICAgIHByZXZQYXRoLmNsb3NlZCA9IHRydWU7XG4gICAgICBuZXdQYXRoID0gbmV3IFN1YlBhdGgoc3RhcnRYLCBzdGFydFkpO1xuICAgICAgcmV0dXJuIHRoaXMuc3ViUGF0aHMucHVzaChuZXdQYXRoKTtcbiAgICB9XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUubW92ZVRvID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnN1YlBhdGhzLnB1c2gobmV3IFN1YlBhdGgoeCwgeSkpO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmxpbmVUbyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAodGhpcy5zdWJQYXRocy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnN1YlBhdGhzW3RoaXMuc3ViUGF0aHMubGVuZ3RoIC0gMV0udmVydHMucHVzaCh4LCB5LCAwLCAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMubW92ZVRvKHgsIHkpO1xuICAgIH1cbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5xdWFkcmF0aWNDdXJ2ZVRvID0gZnVuY3Rpb24oY3AxeCwgY3AxeSwgeCwgeSkge307XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuYmV6aWVyQ3VydmVUbyA9IGZ1bmN0aW9uKGNwMXgsIGNwMXksIGNwMngsIGNwMnksIHgsIHkpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmFyY1RvID0gZnVuY3Rpb24oKSB7fTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5yZWN0ID0gZnVuY3Rpb24oeCwgeSwgdywgaCkge1xuICAgIHRoaXMubW92ZVRvKHgsIHkpO1xuICAgIHRoaXMubGluZVRvKHggKyB3LCB5KTtcbiAgICB0aGlzLmxpbmVUbyh4ICsgdywgeSArIGgpO1xuICAgIHRoaXMubGluZVRvKHgsIHkgKyBoKTtcbiAgICByZXR1cm4gdGhpcy5jbG9zZVBhdGgoKTtcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5hcmMgPSBmdW5jdGlvbih4LCB5LCByYWRpdXMsIHN0YXJ0QW5nbGUsIGVuZEFuZ2xlLCBhbnRpY2xvY2t3aXNlKSB7fTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5maWxsU3ViUGF0aCA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgdmFyIGdsLCBzaGFkZXJQcm9ncmFtLCBzdWJQYXRoLCB0cmFuc2Zvcm0sIHZlcnRzO1xuICAgIGdsID0gdGhpcy5nbDtcbiAgICB0cmFuc2Zvcm0gPSB0aGlzLmdsMmQudHJhbnNmb3JtO1xuICAgIHNoYWRlclByb2dyYW0gPSB0aGlzLmdsMmQuaW5pdFNoYWRlcnModHJhbnNmb3JtLmNfc3RhY2sgKyAyLCAwKTtcbiAgICBzdWJQYXRoID0gdGhpcy5zdWJQYXRoc1tpbmRleF07XG4gICAgdmVydHMgPSBzdWJQYXRoLnZlcnRzO1xuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmdsMmQucGF0aFZlcnRleFBvc2l0aW9uQnVmZmVyKTtcbiAgICBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgbmV3IEZsb2F0MzJBcnJheSh2ZXJ0cyksIGdsLlNUQVRJQ19EUkFXKTtcbiAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUsIDQsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XG4gICAgdHJhbnNmb3JtLnB1c2hNYXRyaXgoKTtcbiAgICB0aGlzLnNlbmRUcmFuc2Zvcm1TdGFjayhzaGFkZXJQcm9ncmFtKTtcbiAgICBnbC51bmlmb3JtNGYoc2hhZGVyUHJvZ3JhbS51Q29sb3IsIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVswXSwgdGhpcy5kcmF3U3RhdGUuZmlsbFN0eWxlWzFdLCB0aGlzLmRyYXdTdGF0ZS5maWxsU3R5bGVbMl0sIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVszXSk7XG4gICAgZ2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRV9GQU4sIDAsIHZlcnRzLmxlbmd0aCAvIDQpO1xuICAgIHJldHVybiB0cmFuc2Zvcm0ucG9wTWF0cml4KCk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBfcmVzdWx0cztcbiAgICBpID0gMDtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIHdoaWxlIChpIDwgdGhpcy5zdWJQYXRocy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZmlsbFN1YlBhdGgoaSk7XG4gICAgICBfcmVzdWx0cy5wdXNoKGkrKyk7XG4gICAgfVxuICAgIHJldHVybiBfcmVzdWx0cztcbiAgfTtcblxuICBEcmF3aW5nLnByb3RvdHlwZS5zdHJva2VTdWJQYXRoID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB2YXIgZ2wsIHNoYWRlclByb2dyYW0sIHN1YlBhdGgsIHRyYW5zZm9ybSwgdmVydHM7XG4gICAgZ2wgPSB0aGlzLmdsO1xuICAgIHRyYW5zZm9ybSA9IHRoaXMuZ2wyZC50cmFuc2Zvcm07XG4gICAgc2hhZGVyUHJvZ3JhbSA9IHRoaXMuZ2wyZC5pbml0U2hhZGVycyh0cmFuc2Zvcm0uY19zdGFjayArIDIsIDApO1xuICAgIHN1YlBhdGggPSB0aGlzLnN1YlBhdGhzW2luZGV4XTtcbiAgICB2ZXJ0cyA9IHN1YlBhdGgudmVydHM7XG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMuZ2wyZC5wYXRoVmVydGV4UG9zaXRpb25CdWZmZXIpO1xuICAgIGdsLmJ1ZmZlckRhdGEoZ2wuQVJSQVlfQlVGRkVSLCBuZXcgRmxvYXQzMkFycmF5KHZlcnRzKSwgZ2wuU1RBVElDX0RSQVcpO1xuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIoc2hhZGVyUHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSwgNCwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcbiAgICB0cmFuc2Zvcm0ucHVzaE1hdHJpeCgpO1xuICAgIHRoaXMuc2VuZFRyYW5zZm9ybVN0YWNrKHNoYWRlclByb2dyYW0pO1xuICAgIGdsLnVuaWZvcm00ZihzaGFkZXJQcm9ncmFtLnVDb2xvciwgdGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGVbMF0sIHRoaXMuZHJhd1N0YXRlLnN0cm9rZVN0eWxlWzFdLCB0aGlzLmRyYXdTdGF0ZS5zdHJva2VTdHlsZVsyXSwgdGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGVbM10pO1xuICAgIGlmIChzdWJQYXRoLmNsb3NlZCkge1xuICAgICAgZ2wuZHJhd0FycmF5cyhnbC5MSU5FX0xPT1AsIDAsIHZlcnRzLmxlbmd0aCAvIDQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnbC5kcmF3QXJyYXlzKGdsLkxJTkVfU1RSSVAsIDAsIHZlcnRzLmxlbmd0aCAvIDQpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmb3JtLnBvcE1hdHJpeCgpO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLnN0cm9rZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBfcmVzdWx0cztcbiAgICBpID0gMDtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIHdoaWxlIChpIDwgdGhpcy5zdWJQYXRocy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuc3Ryb2tlU3ViUGF0aChpKTtcbiAgICAgIF9yZXN1bHRzLnB1c2goaSsrKTtcbiAgICB9XG4gICAgcmV0dXJuIF9yZXN1bHRzO1xuICB9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmNsaXAgPSBmdW5jdGlvbigpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmlzUG9pbnRJblBhdGggPSBmdW5jdGlvbigpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmRyYXdGb2N1c1JpbmcgPSBmdW5jdGlvbigpIHt9O1xuXG4gIERyYXdpbmcucHJvdG90eXBlLmRyYXdJbWFnZSA9IGZ1bmN0aW9uKGltYWdlLCBhLCBiLCBjLCBkLCBlLCBmLCBnLCBoKSB7XG4gICAgdmFyIGNhY2hlSW5kZXgsIGRvQ3JvcCwgZ2wsIHNNYXNrLCBzaGFkZXJQcm9ncmFtLCB0ZXh0dXJlLCB0cmFuc2Zvcm07XG4gICAgZ2wgPSB0aGlzLmdsO1xuICAgIHRyYW5zZm9ybSA9IHRoaXMuZ2wyZC50cmFuc2Zvcm07XG4gICAgdHJhbnNmb3JtLnB1c2hNYXRyaXgoKTtcbiAgICBzTWFzayA9IHRoaXMuc2hhZGVyTWFzay50ZXh0dXJlO1xuICAgIGRvQ3JvcCA9IGZhbHNlO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICB0cmFuc2Zvcm0udHJhbnNsYXRlKGEsIGIpO1xuICAgICAgdHJhbnNmb3JtLnNjYWxlKGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQpO1xuICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gNSkge1xuICAgICAgdHJhbnNmb3JtLnRyYW5zbGF0ZShhLCBiKTtcbiAgICAgIHRyYW5zZm9ybS5zY2FsZShjLCBkKTtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDkpIHtcbiAgICAgIHRyYW5zZm9ybS50cmFuc2xhdGUoZSwgZik7XG4gICAgICB0cmFuc2Zvcm0uc2NhbGUoZywgaCk7XG4gICAgICBzTWFzayA9IHNNYXNrIHwgdGhpcy5zaGFkZXJNYXNrLmNyb3A7XG4gICAgICBkb0Nyb3AgPSB0cnVlO1xuICAgIH1cbiAgICBzaGFkZXJQcm9ncmFtID0gdGhpcy5nbDJkLmluaXRTaGFkZXJzKHRyYW5zZm9ybS5jX3N0YWNrLCBzTWFzayk7XG4gICAgdGV4dHVyZSA9IHZvaWQgMDtcbiAgICBjYWNoZUluZGV4ID0gdGhpcy5pbWFnZUNhY2hlLmluZGV4T2YoaW1hZ2UpO1xuICAgIGlmIChjYWNoZUluZGV4ICE9PSAtMSkge1xuICAgICAgdGV4dHVyZSA9IHRoaXMudGV4dHVyZUNhY2hlW2NhY2hlSW5kZXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0dXJlID0gbmV3IFRleHR1cmUoaW1hZ2UsIHRoaXMpO1xuICAgIH1cbiAgICBpZiAoZG9Dcm9wKSB7XG4gICAgICBnbC51bmlmb3JtNGYoc2hhZGVyUHJvZ3JhbS51Q3JvcFNvdXJjZSwgYSAvIGltYWdlLndpZHRoLCBiIC8gaW1hZ2UuaGVpZ2h0LCBjIC8gaW1hZ2Uud2lkdGgsIGQgLyBpbWFnZS5oZWlnaHQpO1xuICAgIH1cbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgdGhpcy5nbDJkLnJlY3RWZXJ0ZXhQb3NpdGlvbkJ1ZmZlcik7XG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihzaGFkZXJQcm9ncmFtLnZlcnRleFBvc2l0aW9uQXR0cmlidXRlLCA0LCBnbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIHRleHR1cmUub2JqKTtcbiAgICBnbC5hY3RpdmVUZXh0dXJlKGdsLlRFWFRVUkUwKTtcbiAgICBnbC51bmlmb3JtMWkoc2hhZGVyUHJvZ3JhbS51U2FtcGxlciwgMCk7XG4gICAgdGhpcy5zZW5kVHJhbnNmb3JtU3RhY2soc2hhZGVyUHJvZ3JhbSk7XG4gICAgZ2wuZHJhd0FycmF5cyhnbC5UUklBTkdMRV9GQU4sIDAsIDQpO1xuICAgIHJldHVybiB0cmFuc2Zvcm0ucG9wTWF0cml4KCk7XG4gIH07XG5cbiAgRHJhd2luZy5wcm90b3R5cGUuc2F2ZURyYXdTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBiYWtlZERyYXdTdGF0ZTtcbiAgICBiYWtlZERyYXdTdGF0ZSA9IHtcbiAgICAgIGZpbGxTdHlsZTogW3RoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVswXSwgdGhpcy5kcmF3U3RhdGUuZmlsbFN0eWxlWzFdLCB0aGlzLmRyYXdTdGF0ZS5maWxsU3R5bGVbMl0sIHRoaXMuZHJhd1N0YXRlLmZpbGxTdHlsZVszXV0sXG4gICAgICBzdHJva2VTdHlsZTogW3RoaXMuZHJhd1N0YXRlLnN0cm9rZVN0eWxlWzBdLCB0aGlzLmRyYXdTdGF0ZS5zdHJva2VTdHlsZVsxXSwgdGhpcy5kcmF3U3RhdGUuc3Ryb2tlU3R5bGVbMl0sIHRoaXMuZHJhd1N0YXRlLnN0cm9rZVN0eWxlWzNdXSxcbiAgICAgIGdsb2JhbEFscGhhOiB0aGlzLmRyYXdTdGF0ZS5nbG9iYWxBbHBoYSxcbiAgICAgIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbjogdGhpcy5kcmF3U3RhdGUuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uLFxuICAgICAgbGluZUNhcDogdGhpcy5kcmF3U3RhdGUubGluZUNhcCxcbiAgICAgIGxpbmVKb2luOiB0aGlzLmRyYXdTdGF0ZS5saW5lSm9pbixcbiAgICAgIGxpbmVXaWR0aDogdGhpcy5kcmF3U3RhdGUubGluZVdpZHRoLFxuICAgICAgbWl0ZXJMaW1pdDogdGhpcy5kcmF3U3RhdGUubWl0ZXJMaW1pdCxcbiAgICAgIHNoYWRvd0NvbG9yOiB0aGlzLmRyYXdTdGF0ZS5zaGFkb3dDb2xvcixcbiAgICAgIHNoYWRvd0JsdXI6IHRoaXMuZHJhd1N0YXRlLnNoYWRvd0JsdXIsXG4gICAgICBzaGFkb3dPZmZzZXRYOiB0aGlzLmRyYXdTdGF0ZS5zaGFkb3dPZmZzZXRYLFxuICAgICAgc2hhZG93T2Zmc2V0WTogdGhpcy5kcmF3U3RhdGUuc2hhZG93T2Zmc2V0WSxcbiAgICAgIHRleHRBbGlnbjogdGhpcy5kcmF3U3RhdGUudGV4dEFsaWduLFxuICAgICAgZm9udDogdGhpcy5kcmF3U3RhdGUuZm9udCxcbiAgICAgIHRleHRCYXNlbGluZTogdGhpcy5kcmF3U3RhdGUudGV4dEJhc2VsaW5lXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5kcmF3U3RhdGVTdGFjay5wdXNoKGJha2VkRHJhd1N0YXRlKTtcbiAgfTtcblxuICByZXR1cm4gRHJhd2luZztcblxufSkoTWl4aW4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERyYXdpbmc7XG4iLCJ2YXIgU3ViUGF0aDtcblxuU3ViUGF0aCA9IChmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gU3ViUGF0aCh4LCB5KSB7XG4gICAgdGhpcy5jbG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLnZlcnRzID0gW3gsIHksIDAsIDBdO1xuICB9XG5cbiAgcmV0dXJuIFN1YlBhdGg7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gU3ViUGF0aDtcbiIsInZhciBUZXh0dXJlLCBpc1BPVCwgbWF0aDtcblxubWF0aCA9IHJlcXVpcmUoJy4vbWF0aCcpO1xuXG5pc1BPVCA9IG1hdGguaXNQT1Q7XG5cblRleHR1cmUgPSAoZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIFRleHR1cmUoaW1hZ2UsIGdsMmQpIHtcbiAgICB2YXIgY2FudmFzLCBjdHgsIGdsO1xuICAgIHRoaXMuZ2wyZCA9IGdsMmQ7XG4gICAgZ2wgPSB0aGlzLmdsMmQuZ2w7XG4gICAgdGhpcy5vYmogPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdGhpcy5pbmRleCA9IHRoaXMuZ2wyZC50ZXh0dXJlQ2FjaGUucHVzaCh0aGlzKTtcbiAgICB0aGlzLmdsMmQuaW1hZ2VDYWNoZS5wdXNoKGltYWdlKTtcbiAgICBpZiAoaW1hZ2Uud2lkdGggPiB0aGlzLmdsMmQubWF4VGV4dHVyZVNpemUgfHwgaW1hZ2UuaGVpZ2h0ID4gdGhpcy5nbDJkLm1heFRleHR1cmVTaXplKSB7XG4gICAgICBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgY2FudmFzLndpZHRoID0gKGltYWdlLndpZHRoID4gdGhpcy5nbDJkLm1heFRleHR1cmVTaXplID8gdGhpcy5nbDJkLm1heFRleHR1cmVTaXplIDogaW1hZ2Uud2lkdGgpO1xuICAgICAgY2FudmFzLmhlaWdodCA9IChpbWFnZS5oZWlnaHQgPiB0aGlzLmdsMmQubWF4VGV4dHVyZVNpemUgPyB0aGlzLmdsMmQubWF4VGV4dHVyZVNpemUgOiBpbWFnZS5oZWlnaHQpO1xuICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgIGN0eC5kcmF3SW1hZ2UoaW1hZ2UsIDAsIDAsIGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQsIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgICBpbWFnZSA9IGNhbnZhcztcbiAgICB9XG4gICAgZ2wuYmluZFRleHR1cmUoZ2wuVEVYVFVSRV8yRCwgdGhpcy5vYmopO1xuICAgIGdsLnRleEltYWdlMkQoZ2wuVEVYVFVSRV8yRCwgMCwgZ2wuUkdCQSwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgaW1hZ2UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbC5MSU5FQVIpO1xuICAgIGlmIChtYXRoLmlzUE9UKGltYWdlLndpZHRoKSAmJiBtYXRoLmlzUE9UKGltYWdlLmhlaWdodCkpIHtcbiAgICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbC5MSU5FQVJfTUlQTUFQX0xJTkVBUik7XG4gICAgICBnbC5nZW5lcmF0ZU1pcG1hcChnbC5URVhUVVJFXzJEKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsLkxJTkVBUik7XG4gICAgfVxuICAgIGdsLmJpbmRUZXh0dXJlKGdsLlRFWFRVUkVfMkQsIG51bGwpO1xuICB9XG5cbiAgcmV0dXJuIFRleHR1cmU7XG5cbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZTtcbiIsInZhciBtYXRoO1xuXG5tYXRoID0ge1xuICBpc1BPVDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPiAwICYmICgodmFsdWUgLSAxKSAmIHZhbHVlKSA9PT0gMDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtYXRoO1xuIiwidmFyIFRyYW5zZm9ybSwgbWF0MztcblxubWF0MyA9IHJlcXVpcmUoJy4vbWF0MycpO1xuXG5UcmFuc2Zvcm0gPSAoZnVuY3Rpb24oKSB7XG4gIFRyYW5zZm9ybS5TVEFDS19ERVBUSF9MSU1JVCA9IDE2O1xuXG4gIGZ1bmN0aW9uIFRyYW5zZm9ybShtYXQpIHtcbiAgICB0aGlzLmNsZWFyU3RhY2sobWF0KTtcbiAgfVxuXG4gIFRyYW5zZm9ybS5wcm90b3R5cGUuY2xlYXJTdGFjayA9IGZ1bmN0aW9uKGluaXRfbWF0KSB7XG4gICAgdmFyIGk7XG4gICAgdGhpcy5tX3N0YWNrID0gW107XG4gICAgdGhpcy5tX2NhY2hlID0gW107XG4gICAgdGhpcy5jX3N0YWNrID0gMDtcbiAgICB0aGlzLnZhbGlkID0gMDtcbiAgICB0aGlzLnJlc3VsdCA9IG51bGw7XG4gICAgaSA9IDA7XG4gICAgd2hpbGUgKGkgPCBUcmFuc2Zvcm0uU1RBQ0tfREVQVEhfTElNSVQpIHtcbiAgICAgIHRoaXMubV9zdGFja1tpXSA9IHRoaXMuZ2V0SWRlbnRpdHkoKTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGluaXRfbWF0ICE9PSB2b2lkIDApIHtcbiAgICAgIHJldHVybiB0aGlzLm1fc3RhY2tbMF0gPSBpbml0X21hdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0SWRlbnRpdHkoKTtcbiAgICB9XG4gIH07XG5cbiAgVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRJZGVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubV9zdGFja1t0aGlzLmNfc3RhY2tdID0gdGhpcy5nZXRJZGVudGl0eSgpO1xuICAgIGlmICh0aGlzLnZhbGlkID09PSB0aGlzLmNfc3RhY2sgJiYgdGhpcy5jX3N0YWNrKSB7XG4gICAgICByZXR1cm4gdGhpcy52YWxpZC0tO1xuICAgIH1cbiAgfTtcblxuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmdldElkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFsxLjAsIDAuMCwgMC4wLCAwLjAsIDEuMCwgMC4wLCAwLjAsIDAuMCwgMS4wXTtcbiAgfTtcblxuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmdldFJlc3VsdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpLCBtO1xuICAgIGlmICghdGhpcy5jX3N0YWNrKSB7XG4gICAgICByZXR1cm4gdGhpcy5tX3N0YWNrWzBdO1xuICAgIH1cbiAgICBtID0gbWF0My5pZGVudGl0eTtcbiAgICBpZiAodGhpcy52YWxpZCA+IHRoaXMuY19zdGFjayAtIDEpIHtcbiAgICAgIHRoaXMudmFsaWQgPSB0aGlzLmNfc3RhY2sgLSAxO1xuICAgIH1cbiAgICBpID0gdGhpcy52YWxpZDtcbiAgICB3aGlsZSAoaSA8IHRoaXMuY19zdGFjayArIDEpIHtcbiAgICAgIG0gPSBtYXQzLm11bHRpcGx5KHRoaXMubV9zdGFja1tpXSwgbSk7XG4gICAgICB0aGlzLm1fY2FjaGVbaV0gPSBtO1xuICAgICAgaSsrO1xuICAgIH1cbiAgICB0aGlzLnZhbGlkID0gdGhpcy5jX3N0YWNrIC0gMTtcbiAgICB0aGlzLnJlc3VsdCA9IHRoaXMubV9jYWNoZVt0aGlzLmNfc3RhY2tdO1xuICAgIHJldHVybiB0aGlzLnJlc3VsdDtcbiAgfTtcblxuICBUcmFuc2Zvcm0ucHJvdG90eXBlLnB1c2hNYXRyaXggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNfc3RhY2srKztcbiAgICByZXR1cm4gdGhpcy5tX3N0YWNrW3RoaXMuY19zdGFja10gPSB0aGlzLmdldElkZW50aXR5KCk7XG4gIH07XG5cbiAgVHJhbnNmb3JtLnByb3RvdHlwZS5wb3BNYXRyaXggPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jX3N0YWNrID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNfc3RhY2stLTtcbiAgfTtcblxuICBUcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgdHJhbnNsYXRlTWF0cml4O1xuICAgIHRyYW5zbGF0ZU1hdHJpeCA9IHRoaXMuZ2V0SWRlbnRpdHkoKTtcbiAgICB0cmFuc2xhdGVNYXRyaXhbNl0gPSB4O1xuICAgIHRyYW5zbGF0ZU1hdHJpeFs3XSA9IHk7XG4gICAgcmV0dXJuIG1hdDMubXVsdGlwbHkodHJhbnNsYXRlTWF0cml4LCB0aGlzLm1fc3RhY2tbdGhpcy5jX3N0YWNrXSk7XG4gIH07XG5cbiAgVHJhbnNmb3JtLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgc2NhbGVNYXRyaXg7XG4gICAgc2NhbGVNYXRyaXggPSB0aGlzLmdldElkZW50aXR5KCk7XG4gICAgc2NhbGVNYXRyaXhbMF0gPSB4O1xuICAgIHNjYWxlTWF0cml4WzRdID0geTtcbiAgICByZXR1cm4gbWF0My5tdWx0aXBseShzY2FsZU1hdHJpeCwgdGhpcy5tX3N0YWNrW3RoaXMuY19zdGFja10pO1xuICB9O1xuXG4gIFRyYW5zZm9ybS5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24oYW5nKSB7XG4gICAgdmFyIGNBbmcsIHJvdGF0ZU1hdHJpeCwgc0FuZztcbiAgICByb3RhdGVNYXRyaXggPSB0aGlzLmdldElkZW50aXR5KCk7XG4gICAgc0FuZyA9IE1hdGguc2luKC1hbmcpO1xuICAgIGNBbmcgPSBNYXRoLmNvcygtYW5nKTtcbiAgICByb3RhdGVNYXRyaXhbMF0gPSBjQW5nO1xuICAgIHJvdGF0ZU1hdHJpeFszXSA9IHNBbmc7XG4gICAgcm90YXRlTWF0cml4WzFdID0gLXNBbmc7XG4gICAgcm90YXRlTWF0cml4WzRdID0gY0FuZztcbiAgICByZXR1cm4gbWF0My5tdWx0aXBseShyb3RhdGVNYXRyaXgsIHRoaXMubV9zdGFja1t0aGlzLmNfc3RhY2tdKTtcbiAgfTtcblxuICByZXR1cm4gVHJhbnNmb3JtO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zZm9ybTtcbiIsInZhciBtYXQzO1xuXG5tYXQzID0ge1xuICBpZGVudGl0eTogWzEuMCwgMC4wLCAwLjAsIDAuMCwgMS4wLCAwLjAsIDAuMCwgMC4wLCAxLjBdLFxuICBtdWx0aXBseTogZnVuY3Rpb24obTEsIG0yKSB7XG4gICAgdmFyIG0xMCwgbTExLCBtMTIsIG0xMywgbTE0LCBtMTUsIG0xNiwgbTE3LCBtMTgsIG0yMCwgbTIxLCBtMjIsIG0yMywgbTI0LCBtMjUsIG0yNiwgbTI3LCBtMjg7XG4gICAgbTEwID0gbTFbMF07XG4gICAgbTExID0gbTFbMV07XG4gICAgbTEyID0gbTFbMl07XG4gICAgbTEzID0gbTFbM107XG4gICAgbTE0ID0gbTFbNF07XG4gICAgbTE1ID0gbTFbNV07XG4gICAgbTE2ID0gbTFbNl07XG4gICAgbTE3ID0gbTFbN107XG4gICAgbTE4ID0gbTFbOF07XG4gICAgbTIwID0gbTJbMF07XG4gICAgbTIxID0gbTJbMV07XG4gICAgbTIyID0gbTJbMl07XG4gICAgbTIzID0gbTJbM107XG4gICAgbTI0ID0gbTJbNF07XG4gICAgbTI1ID0gbTJbNV07XG4gICAgbTI2ID0gbTJbNl07XG4gICAgbTI3ID0gbTJbN107XG4gICAgbTI4ID0gbTJbOF07XG4gICAgbTJbMF0gPSBtMjAgKiBtMTAgKyBtMjMgKiBtMTEgKyBtMjYgKiBtMTI7XG4gICAgbTJbMV0gPSBtMjEgKiBtMTAgKyBtMjQgKiBtMTEgKyBtMjcgKiBtMTI7XG4gICAgbTJbMl0gPSBtMjIgKiBtMTAgKyBtMjUgKiBtMTEgKyBtMjggKiBtMTI7XG4gICAgbTJbM10gPSBtMjAgKiBtMTMgKyBtMjMgKiBtMTQgKyBtMjYgKiBtMTU7XG4gICAgbTJbNF0gPSBtMjEgKiBtMTMgKyBtMjQgKiBtMTQgKyBtMjcgKiBtMTU7XG4gICAgbTJbNV0gPSBtMjIgKiBtMTMgKyBtMjUgKiBtMTQgKyBtMjggKiBtMTU7XG4gICAgbTJbNl0gPSBtMjAgKiBtMTYgKyBtMjMgKiBtMTcgKyBtMjYgKiBtMTg7XG4gICAgbTJbN10gPSBtMjEgKiBtMTYgKyBtMjQgKiBtMTcgKyBtMjcgKiBtMTg7XG4gICAgcmV0dXJuIG0yWzhdID0gbTIyICogbTE2ICsgbTI1ICogbTE3ICsgbTI4ICogbTE4O1xuICB9LFxuICB2ZWMyX211bHRpcGx5OiBmdW5jdGlvbihtMSwgbTIpIHtcbiAgICB2YXIgbU91dDtcbiAgICBtT3V0ID0gW107XG4gICAgbU91dFswXSA9IG0yWzBdICogbTFbMF0gKyBtMlszXSAqIG0xWzFdICsgbTJbNl07XG4gICAgbU91dFsxXSA9IG0yWzFdICogbTFbMF0gKyBtMls0XSAqIG0xWzFdICsgbTJbN107XG4gICAgcmV0dXJuIG1PdXQ7XG4gIH0sXG4gIHRyYW5zcG9zZTogZnVuY3Rpb24obSkge1xuICAgIHJldHVybiBbbVswXSwgbVszXSwgbVs2XSwgbVsxXSwgbVs0XSwgbVs3XSwgbVsyXSwgbVs1XSwgbVs4XV07XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWF0MztcbiIsInZhciBnZXRGcmFnbWVudFNoYWRlclNvdXJjZTtcblxuZ2V0RnJhZ21lbnRTaGFkZXJTb3VyY2UgPSBmdW5jdGlvbihzTWFzaywgc2hhZGVyTWFzaykge1xuICB2YXIgZnNTb3VyY2U7XG4gIGZzU291cmNlID0gW1wiI2lmZGVmIEdMX0VTXCIsIFwicHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1wiLCBcIiNlbmRpZlwiLCBcIiNkZWZpbmUgaGFzVGV4dHVyZSBcIiArIChzTWFzayAmIHNoYWRlck1hc2sudGV4dHVyZSA/IFwiMVwiIDogXCIwXCIpLCBcIiNkZWZpbmUgaGFzQ3JvcCBcIiArIChzTWFzayAmIHNoYWRlck1hc2suY3JvcCA/IFwiMVwiIDogXCIwXCIpLCBcInZhcnlpbmcgdmVjNCB2Q29sb3I7XCIsIFwiI2lmIGhhc1RleHR1cmVcIiwgXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIiwgXCJ1bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcIiwgXCIjaWYgaGFzQ3JvcFwiLCBcInVuaWZvcm0gdmVjNCB1Q3JvcFNvdXJjZTtcIiwgXCIjZW5kaWZcIiwgXCIjZW5kaWZcIiwgXCJ2b2lkIG1haW4odm9pZCkge1wiLCBcIiNpZiBoYXNUZXh0dXJlXCIsIFwiI2lmIGhhc0Nyb3BcIiwgXCJnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54ICogdUNyb3BTb3VyY2UueiwgdlRleHR1cmVDb29yZC55ICogdUNyb3BTb3VyY2UudykgKyB1Q3JvcFNvdXJjZS54eSk7XCIsIFwiI2Vsc2VcIiwgXCJnbF9GcmFnQ29sb3IgPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZUZXh0dXJlQ29vcmQpO1wiLCBcIiNlbmRpZlwiLCBcIiNlbHNlXCIsIFwiZ2xfRnJhZ0NvbG9yID0gdkNvbG9yO1wiLCBcIiNlbmRpZlwiLCBcIn1cIl0uam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIGZzU291cmNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBnZXRGcmFnbWVudFNoYWRlclNvdXJjZTtcbiIsInZhciBnZXRWZXJ0ZXhTaGFkZXJTb3VyY2U7XG5cbmdldFZlcnRleFNoYWRlclNvdXJjZSA9IGZ1bmN0aW9uKHN0YWNrRGVwdGgsIHNNYXNrLCBzaGFkZXJNYXNrLCBjYW52YXMpIHtcbiAgdmFyIGgsIHZzU291cmNlLCB3O1xuICB3ID0gMiAvIGNhbnZhcy53aWR0aDtcbiAgaCA9IC0yIC8gY2FudmFzLmhlaWdodDtcbiAgc3RhY2tEZXB0aCA9IHN0YWNrRGVwdGggfHwgMTtcbiAgdnNTb3VyY2UgPSBbXCIjZGVmaW5lIGhhc1RleHR1cmUgXCIgKyAoc01hc2sgJiBzaGFkZXJNYXNrLnRleHR1cmUgPyBcIjFcIiA6IFwiMFwiKSwgXCJhdHRyaWJ1dGUgdmVjNCBhVmVydGV4UG9zaXRpb247XCIsIFwiI2lmIGhhc1RleHR1cmVcIiwgXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcIiwgXCIjZW5kaWZcIiwgXCJ1bmlmb3JtIHZlYzQgdUNvbG9yO1wiLCBcInVuaWZvcm0gbWF0MyB1VHJhbnNmb3Jtc1tcIiArIHN0YWNrRGVwdGggKyBcIl07XCIsIFwidmFyeWluZyB2ZWM0IHZDb2xvcjtcIiwgXCJjb25zdCBtYXQ0IHBNYXRyaXggPSBtYXQ0KFwiICsgdyArIFwiLDAsMCwwLCAwLFwiICsgaCArIFwiLDAsMCwgMCwwLDEuMCwxLjAsIC0xLjAsMS4wLDAsMCk7XCIsIFwibWF0MyBjcnVuY2hTdGFjayh2b2lkKSB7XCIsIFwibWF0MyByZXN1bHQgPSB1VHJhbnNmb3Jtc1swXTtcIiwgXCJmb3IgKGludCBpID0gMTsgaSA8IFwiICsgc3RhY2tEZXB0aCArIFwiOyArK2kpIHtcIiwgXCJyZXN1bHQgPSB1VHJhbnNmb3Jtc1tpXSAqIHJlc3VsdDtcIiwgXCJ9XCIsIFwicmV0dXJuIHJlc3VsdDtcIiwgXCJ9XCIsIFwidm9pZCBtYWluKHZvaWQpIHtcIiwgXCJ2ZWMzIHBvc2l0aW9uID0gY3J1bmNoU3RhY2soKSAqIHZlYzMoYVZlcnRleFBvc2l0aW9uLngsIGFWZXJ0ZXhQb3NpdGlvbi55LCAxLjApO1wiLCBcImdsX1Bvc2l0aW9uID0gcE1hdHJpeCAqIHZlYzQocG9zaXRpb24sIDEuMCk7XCIsIFwidkNvbG9yID0gdUNvbG9yO1wiLCBcIiNpZiBoYXNUZXh0dXJlXCIsIFwidlRleHR1cmVDb29yZCA9IGFWZXJ0ZXhQb3NpdGlvbi56dztcIiwgXCIjZW5kaWZcIiwgXCJ9XCJdLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiB2c1NvdXJjZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0VmVydGV4U2hhZGVyU291cmNlO1xuIiwidmFyIGNvbG9yLCB1dGlsO1xuXG5jb2xvciA9IHJlcXVpcmUoJ29uZWNvbG9yJyk7XG5cbnV0aWwgPSB7XG4gIGNvbG9yU3RyaW5nVG9WZWM0OiBmdW5jdGlvbihjb2xvclN0cmluZykge1xuICAgIHZhciBjb2xvclBhcnNlZDtcbiAgICBjb2xvclBhcnNlZCA9IGNvbG9yKGNvbG9yU3RyaW5nKTtcbiAgICByZXR1cm4gW2NvbG9yUGFyc2VkLnJlZCgpLCBjb2xvclBhcnNlZC5ncmVlbigpLCBjb2xvclBhcnNlZC5ibHVlKCksIGNvbG9yUGFyc2VkLmFscGhhKCldO1xuICB9LFxuICBjb2xvclZlY1RvU3RyaW5nOiBmdW5jdGlvbihjb2xvclZlYykge1xuICAgIHZhciBjb2xvclJHQkE7XG4gICAgY29sb3JSR0JBID0gbmV3IGNvbG9yLlJHQihjb2xvclZlY1swXSwgY29sb3JWZWNbMV0sIGNvbG9yVmVjWzJdLCBjb2xvclZlY1szXSk7XG4gICAgcmV0dXJuIGNvbG9yUkdCQS5jc3NhKCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIihmdW5jdGlvbigpIHtcbiAgdmFyIEV4Y2x1ZGVkQ2xhc3NQcm9wZXJ0aWVzLCBFeGNsdWRlZFByb3RvdHlwZVByb3BlcnRpZXMsIE1peGluLCBuYW1lO1xuXG4gIG1vZHVsZS5leHBvcnRzID0gTWl4aW4gPSAoZnVuY3Rpb24oKSB7XG4gICAgTWl4aW4uaW5jbHVkZUludG8gPSBmdW5jdGlvbihjb25zdHJ1Y3Rvcikge1xuICAgICAgdmFyIG5hbWUsIHZhbHVlLCBfcmVmO1xuICAgICAgdGhpcy5leHRlbmQoY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgIGZvciAobmFtZSBpbiB0aGlzKSB7XG4gICAgICAgIHZhbHVlID0gdGhpc1tuYW1lXTtcbiAgICAgICAgaWYgKEV4Y2x1ZGVkQ2xhc3NQcm9wZXJ0aWVzLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgaWYgKCFjb25zdHJ1Y3Rvci5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgY29uc3RydWN0b3JbbmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAoX3JlZiA9IHRoaXMuaW5jbHVkZWQpICE9IG51bGwgPyBfcmVmLmNhbGwoY29uc3RydWN0b3IpIDogdm9pZCAwO1xuICAgIH07XG5cbiAgICBNaXhpbi5leHRlbmQgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgIHZhciBuYW1lLCBfaSwgX2xlbiwgX3JlZiwgX3JlZjE7XG4gICAgICBfcmVmID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5wcm90b3R5cGUpO1xuICAgICAgZm9yIChfaSA9IDAsIF9sZW4gPSBfcmVmLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICAgIG5hbWUgPSBfcmVmW19pXTtcbiAgICAgICAgaWYgKEV4Y2x1ZGVkUHJvdG90eXBlUHJvcGVydGllcy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xuICAgICAgICAgIGlmICghb2JqZWN0Lmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICBvYmplY3RbbmFtZV0gPSB0aGlzLnByb3RvdHlwZVtuYW1lXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAoX3JlZjEgPSB0aGlzLnByb3RvdHlwZS5leHRlbmRlZCkgIT0gbnVsbCA/IF9yZWYxLmNhbGwob2JqZWN0KSA6IHZvaWQgMDtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gTWl4aW4oKSB7XG4gICAgICBpZiAodHlwZW9mIHRoaXMuZXh0ZW5kZWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aGlzLmV4dGVuZGVkKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIE1peGluO1xuXG4gIH0pKCk7XG5cbiAgRXhjbHVkZWRDbGFzc1Byb3BlcnRpZXMgPSBbJ19fc3VwZXJfXyddO1xuXG4gIGZvciAobmFtZSBpbiBNaXhpbikge1xuICAgIEV4Y2x1ZGVkQ2xhc3NQcm9wZXJ0aWVzLnB1c2gobmFtZSk7XG4gIH1cblxuICBFeGNsdWRlZFByb3RvdHlwZVByb3BlcnRpZXMgPSBbJ2NvbnN0cnVjdG9yJywgJ2V4dGVuZGVkJ107XG5cbn0pLmNhbGwodGhpcyk7XG4iLCIvKmpzaGludCBldmlsOnRydWUsIG9uZXZhcjpmYWxzZSovXG4vKmdsb2JhbCBkZWZpbmUqL1xudmFyIGluc3RhbGxlZENvbG9yU3BhY2VzID0gW10sXG4gICAgbmFtZWRDb2xvcnMgPSB7fSxcbiAgICB1bmRlZiA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnO1xuICAgIH0sXG4gICAgY2hhbm5lbFJlZ0V4cCA9IC9cXHMqKFxcLlxcZCt8XFxkKyg/OlxcLlxcZCspPykoJSk/XFxzKi8sXG4gICAgYWxwaGFDaGFubmVsUmVnRXhwID0gL1xccyooXFwuXFxkK3xcXGQrKD86XFwuXFxkKyk/KVxccyovLFxuICAgIGNzc0NvbG9yUmVnRXhwID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIl4ocmdifGhzbHxoc3YpYT9cIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJcXFxcKFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbFJlZ0V4cC5zb3VyY2UgKyBcIixcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWxSZWdFeHAuc291cmNlICsgXCIsXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsUmVnRXhwLnNvdXJjZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiKD86LFwiICsgYWxwaGFDaGFubmVsUmVnRXhwLnNvdXJjZSArIFwiKT9cIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCJcXFxcKSRcIiwgXCJpXCIpO1xuXG5mdW5jdGlvbiBPTkVDT0xPUihvYmopIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShvYmopID09PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqWzBdID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgT05FQ09MT1Jbb2JqWzBdXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gQXNzdW1lZCBhcnJheSBmcm9tIC50b0pTT04oKVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUltvYmpbMF1dKG9iai5zbGljZSgxLCBvYmoubGVuZ3RoKSk7XG4gICAgICAgIH0gZWxzZSBpZiAob2JqLmxlbmd0aCA9PT0gNCkge1xuICAgICAgICAgICAgLy8gQXNzdW1lZCA0IGVsZW1lbnQgaW50IFJHQiBhcnJheSBmcm9tIGNhbnZhcyB3aXRoIGFsbCBjaGFubmVscyBbMDsyNTVdXG4gICAgICAgICAgICByZXR1cm4gbmV3IE9ORUNPTE9SLlJHQihvYmpbMF0gLyAyNTUsIG9ialsxXSAvIDI1NSwgb2JqWzJdIC8gMjU1LCBvYmpbM10gLyAyNTUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgbG93ZXJDYXNlZCA9IG9iai50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAobmFtZWRDb2xvcnNbbG93ZXJDYXNlZF0pIHtcbiAgICAgICAgICAgIG9iaiA9ICcjJyArIG5hbWVkQ29sb3JzW2xvd2VyQ2FzZWRdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb3dlckNhc2VkID09PSAndHJhbnNwYXJlbnQnKSB7XG4gICAgICAgICAgICBvYmogPSAncmdiYSgwLDAsMCwwKSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBmb3IgQ1NTIHJnYiguLi4uKSBzdHJpbmdcbiAgICAgICAgdmFyIG1hdGNoQ3NzU3ludGF4ID0gb2JqLm1hdGNoKGNzc0NvbG9yUmVnRXhwKTtcbiAgICAgICAgaWYgKG1hdGNoQ3NzU3ludGF4KSB7XG4gICAgICAgICAgICB2YXIgY29sb3JTcGFjZU5hbWUgPSBtYXRjaENzc1N5bnRheFsxXS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgICAgIGFscGhhID0gdW5kZWYobWF0Y2hDc3NTeW50YXhbOF0pID8gbWF0Y2hDc3NTeW50YXhbOF0gOiBwYXJzZUZsb2F0KG1hdGNoQ3NzU3ludGF4WzhdKSxcbiAgICAgICAgICAgICAgICBoYXNIdWUgPSBjb2xvclNwYWNlTmFtZVswXSA9PT0gJ0gnLFxuICAgICAgICAgICAgICAgIGZpcnN0Q2hhbm5lbERpdmlzb3IgPSBtYXRjaENzc1N5bnRheFszXSA/IDEwMCA6IChoYXNIdWUgPyAzNjAgOiAyNTUpLFxuICAgICAgICAgICAgICAgIHNlY29uZENoYW5uZWxEaXZpc29yID0gKG1hdGNoQ3NzU3ludGF4WzVdIHx8IGhhc0h1ZSkgPyAxMDAgOiAyNTUsXG4gICAgICAgICAgICAgICAgdGhpcmRDaGFubmVsRGl2aXNvciA9IChtYXRjaENzc1N5bnRheFs3XSB8fCBoYXNIdWUpID8gMTAwIDogMjU1O1xuICAgICAgICAgICAgaWYgKHVuZGVmKE9ORUNPTE9SW2NvbG9yU3BhY2VOYW1lXSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbmUuY29sb3IuXCIgKyBjb2xvclNwYWNlTmFtZSArIFwiIGlzIG5vdCBpbnN0YWxsZWQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUltjb2xvclNwYWNlTmFtZV0oXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChtYXRjaENzc1N5bnRheFsyXSkgLyBmaXJzdENoYW5uZWxEaXZpc29yLFxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQobWF0Y2hDc3NTeW50YXhbNF0pIC8gc2Vjb25kQ2hhbm5lbERpdmlzb3IsXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChtYXRjaENzc1N5bnRheFs2XSkgLyB0aGlyZENoYW5uZWxEaXZpc29yLFxuICAgICAgICAgICAgICAgIGFscGhhXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFzc3VtZSBoZXggc3ludGF4XG4gICAgICAgIGlmIChvYmoubGVuZ3RoIDwgNikge1xuICAgICAgICAgICAgLy8gQWxsb3cgQ1NTIHNob3J0aGFuZFxuICAgICAgICAgICAgb2JqID0gb2JqLnJlcGxhY2UoL14jPyhbMC05YS1mXSkoWzAtOWEtZl0pKFswLTlhLWZdKSQvaSwgJyQxJDEkMiQyJDMkMycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNwbGl0IG9iaiBpbnRvIHJlZCwgZ3JlZW4sIGFuZCBibHVlIGNvbXBvbmVudHNcbiAgICAgICAgdmFyIGhleE1hdGNoID0gb2JqLm1hdGNoKC9eIz8oWzAtOWEtZl1bMC05YS1mXSkoWzAtOWEtZl1bMC05YS1mXSkoWzAtOWEtZl1bMC05YS1mXSkkL2kpO1xuICAgICAgICBpZiAoaGV4TWF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgT05FQ09MT1IuUkdCKFxuICAgICAgICAgICAgICAgIHBhcnNlSW50KGhleE1hdGNoWzFdLCAxNikgLyAyNTUsXG4gICAgICAgICAgICAgICAgcGFyc2VJbnQoaGV4TWF0Y2hbMl0sIDE2KSAvIDI1NSxcbiAgICAgICAgICAgICAgICBwYXJzZUludChoZXhNYXRjaFszXSwgMTYpIC8gMjU1XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiBvYmouaXNDb2xvcikge1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGluc3RhbGxDb2xvclNwYWNlKGNvbG9yU3BhY2VOYW1lLCBwcm9wZXJ0eU5hbWVzLCBjb25maWcpIHtcbiAgICBPTkVDT0xPUltjb2xvclNwYWNlTmFtZV0gPSBuZXcgRnVuY3Rpb24ocHJvcGVydHlOYW1lcy5qb2luKFwiLFwiKSxcbiAgICAgICAgLy8gQWxsb3cgcGFzc2luZyBhbiBhcnJheSB0byB0aGUgY29uc3RydWN0b3I6XG4gICAgICAgIFwiaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkoXCIgKyBwcm9wZXJ0eU5hbWVzWzBdICsgXCIpID09PSAnW29iamVjdCBBcnJheV0nKSB7XCIgK1xuICAgICAgICAgICAgcHJvcGVydHlOYW1lcy5tYXAoZnVuY3Rpb24gKHByb3BlcnR5TmFtZSwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eU5hbWUgKyBcIj1cIiArIHByb3BlcnR5TmFtZXNbMF0gKyBcIltcIiArIGkgKyBcIl07XCI7XG4gICAgICAgICAgICB9KS5yZXZlcnNlKCkuam9pbihcIlwiKSArXG4gICAgICAgIFwifVwiICtcbiAgICAgICAgXCJpZiAoXCIgKyBwcm9wZXJ0eU5hbWVzLmZpbHRlcihmdW5jdGlvbiAocHJvcGVydHlOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcGVydHlOYW1lICE9PSAnYWxwaGEnO1xuICAgICAgICB9KS5tYXAoZnVuY3Rpb24gKHByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiaXNOYU4oXCIgKyBwcm9wZXJ0eU5hbWUgKyBcIilcIjtcbiAgICAgICAgfSkuam9pbihcInx8XCIpICsgXCIpe1wiICsgXCJ0aHJvdyBuZXcgRXJyb3IoXFxcIltcIiArIGNvbG9yU3BhY2VOYW1lICsgXCJdOiBJbnZhbGlkIGNvbG9yOiAoXFxcIitcIiArIHByb3BlcnR5TmFtZXMuam9pbihcIitcXFwiLFxcXCIrXCIpICsgXCIrXFxcIilcXFwiKTt9XCIgK1xuICAgICAgICBwcm9wZXJ0eU5hbWVzLm1hcChmdW5jdGlvbiAocHJvcGVydHlOYW1lKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydHlOYW1lID09PSAnaHVlJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBcInRoaXMuX2h1ZT1odWU8MD9odWUtTWF0aC5mbG9vcihodWUpOmh1ZSUxXCI7IC8vIFdyYXBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lID09PSAnYWxwaGEnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidGhpcy5fYWxwaGE9KGlzTmFOKGFscGhhKXx8YWxwaGE+MSk/MTooYWxwaGE8MD8wOmFscGhhKTtcIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidGhpcy5fXCIgKyBwcm9wZXJ0eU5hbWUgKyBcIj1cIiArIHByb3BlcnR5TmFtZSArIFwiPDA/MDooXCIgKyBwcm9wZXJ0eU5hbWUgKyBcIj4xPzE6XCIgKyBwcm9wZXJ0eU5hbWUgKyBcIilcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuam9pbihcIjtcIikgKyBcIjtcIlxuICAgICk7XG4gICAgT05FQ09MT1JbY29sb3JTcGFjZU5hbWVdLnByb3BlcnR5TmFtZXMgPSBwcm9wZXJ0eU5hbWVzO1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IE9ORUNPTE9SW2NvbG9yU3BhY2VOYW1lXS5wcm90b3R5cGU7XG5cbiAgICBbJ3ZhbHVlT2YnLCAnaGV4JywgJ2hleGEnLCAnY3NzJywgJ2Nzc2EnXS5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XG4gICAgICAgIHByb3RvdHlwZVttZXRob2ROYW1lXSA9IHByb3RvdHlwZVttZXRob2ROYW1lXSB8fCAoY29sb3JTcGFjZU5hbWUgPT09ICdSR0InID8gcHJvdG90eXBlLmhleCA6IG5ldyBGdW5jdGlvbihcInJldHVybiB0aGlzLnJnYigpLlwiICsgbWV0aG9kTmFtZSArIFwiKCk7XCIpKTtcbiAgICB9KTtcblxuICAgIHByb3RvdHlwZS5pc0NvbG9yID0gdHJ1ZTtcblxuICAgIHByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAob3RoZXJDb2xvciwgZXBzaWxvbikge1xuICAgICAgICBpZiAodW5kZWYoZXBzaWxvbikpIHtcbiAgICAgICAgICAgIGVwc2lsb24gPSAxZS0xMDtcbiAgICAgICAgfVxuXG4gICAgICAgIG90aGVyQ29sb3IgPSBvdGhlckNvbG9yW2NvbG9yU3BhY2VOYW1lLnRvTG93ZXJDYXNlKCldKCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0eU5hbWVzLmxlbmd0aDsgaSA9IGkgKyAxKSB7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnModGhpc1snXycgKyBwcm9wZXJ0eU5hbWVzW2ldXSAtIG90aGVyQ29sb3JbJ18nICsgcHJvcGVydHlOYW1lc1tpXV0pID4gZXBzaWxvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICBwcm90b3R5cGUudG9KU09OID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgICBcInJldHVybiBbJ1wiICsgY29sb3JTcGFjZU5hbWUgKyBcIicsIFwiICtcbiAgICAgICAgICAgIHByb3BlcnR5TmFtZXMubWFwKGZ1bmN0aW9uIChwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0aGlzLl9cIiArIHByb3BlcnR5TmFtZTtcbiAgICAgICAgICAgIH0sIHRoaXMpLmpvaW4oXCIsIFwiKSArXG4gICAgICAgIFwiXTtcIlxuICAgICk7XG5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eU5hbWUgaW4gY29uZmlnKSB7XG4gICAgICAgIGlmIChjb25maWcuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgdmFyIG1hdGNoRnJvbUNvbG9yU3BhY2UgPSBwcm9wZXJ0eU5hbWUubWF0Y2goL15mcm9tKC4qKSQvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaEZyb21Db2xvclNwYWNlKSB7XG4gICAgICAgICAgICAgICAgT05FQ09MT1JbbWF0Y2hGcm9tQ29sb3JTcGFjZVsxXS50b1VwcGVyQ2FzZSgpXS5wcm90b3R5cGVbY29sb3JTcGFjZU5hbWUudG9Mb3dlckNhc2UoKV0gPSBjb25maWdbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvdG90eXBlW3Byb3BlcnR5TmFtZV0gPSBjb25maWdbcHJvcGVydHlOYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEl0IGlzIHByZXR0eSBlYXN5IHRvIGltcGxlbWVudCB0aGUgY29udmVyc2lvbiB0byB0aGUgc2FtZSBjb2xvciBzcGFjZTpcbiAgICBwcm90b3R5cGVbY29sb3JTcGFjZU5hbWUudG9Mb3dlckNhc2UoKV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgcHJvdG90eXBlLnRvU3RyaW5nID0gbmV3IEZ1bmN0aW9uKFwicmV0dXJuIFxcXCJbb25lLmNvbG9yLlwiICsgY29sb3JTcGFjZU5hbWUgKyBcIjpcXFwiK1wiICsgcHJvcGVydHlOYW1lcy5tYXAoZnVuY3Rpb24gKHByb3BlcnR5TmFtZSwgaSkge1xuICAgICAgICByZXR1cm4gXCJcXFwiIFwiICsgcHJvcGVydHlOYW1lc1tpXSArIFwiPVxcXCIrdGhpcy5fXCIgKyBwcm9wZXJ0eU5hbWU7XG4gICAgfSkuam9pbihcIitcIikgKyBcIitcXFwiXVxcXCI7XCIpO1xuXG4gICAgLy8gR2VuZXJhdGUgZ2V0dGVycyBhbmQgc2V0dGVyc1xuICAgIHByb3BlcnR5TmFtZXMuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHlOYW1lLCBpKSB7XG4gICAgICAgIHByb3RvdHlwZVtwcm9wZXJ0eU5hbWVdID0gcHJvdG90eXBlW3Byb3BlcnR5TmFtZSA9PT0gJ2JsYWNrJyA/ICdrJyA6IHByb3BlcnR5TmFtZVswXV0gPSBuZXcgRnVuY3Rpb24oXCJ2YWx1ZVwiLCBcImlzRGVsdGFcIixcbiAgICAgICAgICAgIC8vIFNpbXBsZSBnZXR0ZXIgbW9kZTogY29sb3IucmVkKClcbiAgICAgICAgICAgIFwiaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcIiArXG4gICAgICAgICAgICAgICAgXCJyZXR1cm4gdGhpcy5fXCIgKyBwcm9wZXJ0eU5hbWUgKyBcIjtcIiArXG4gICAgICAgICAgICBcIn1cIiArXG4gICAgICAgICAgICAvLyBBZGp1c3RlcjogY29sb3IucmVkKCsuMiwgdHJ1ZSlcbiAgICAgICAgICAgIFwiaWYgKGlzRGVsdGEpIHtcIiArXG4gICAgICAgICAgICAgICAgXCJyZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IoXCIgKyBwcm9wZXJ0eU5hbWVzLm1hcChmdW5jdGlvbiAob3RoZXJQcm9wZXJ0eU5hbWUsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidGhpcy5fXCIgKyBvdGhlclByb3BlcnR5TmFtZSArIChwcm9wZXJ0eU5hbWUgPT09IG90aGVyUHJvcGVydHlOYW1lID8gXCIrdmFsdWVcIiA6IFwiXCIpO1xuICAgICAgICAgICAgICAgIH0pLmpvaW4oXCIsIFwiKSArIFwiKTtcIiArXG4gICAgICAgICAgICBcIn1cIiArXG4gICAgICAgICAgICAvLyBTZXR0ZXI6IGNvbG9yLnJlZCguMik7XG4gICAgICAgICAgICBcInJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvcihcIiArIHByb3BlcnR5TmFtZXMubWFwKGZ1bmN0aW9uIChvdGhlclByb3BlcnR5TmFtZSwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eU5hbWUgPT09IG90aGVyUHJvcGVydHlOYW1lID8gXCJ2YWx1ZVwiIDogXCJ0aGlzLl9cIiArIG90aGVyUHJvcGVydHlOYW1lO1xuICAgICAgICAgICAgfSkuam9pbihcIiwgXCIpICsgXCIpO1wiKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGluc3RhbGxGb3JlaWduTWV0aG9kcyh0YXJnZXRDb2xvclNwYWNlTmFtZSwgc291cmNlQ29sb3JTcGFjZU5hbWUpIHtcbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmpbc291cmNlQ29sb3JTcGFjZU5hbWUudG9Mb3dlckNhc2UoKV0gPSBuZXcgRnVuY3Rpb24oXCJyZXR1cm4gdGhpcy5yZ2IoKS5cIiArIHNvdXJjZUNvbG9yU3BhY2VOYW1lLnRvTG93ZXJDYXNlKCkgKyBcIigpO1wiKTsgLy8gRmFsbGJhY2tcbiAgICAgICAgT05FQ09MT1Jbc291cmNlQ29sb3JTcGFjZU5hbWVdLnByb3BlcnR5TmFtZXMuZm9yRWFjaChmdW5jdGlvbiAocHJvcGVydHlOYW1lLCBpKSB7XG4gICAgICAgICAgICBvYmpbcHJvcGVydHlOYW1lXSA9IG9ialtwcm9wZXJ0eU5hbWUgPT09ICdibGFjaycgPyAnaycgOiBwcm9wZXJ0eU5hbWVbMF1dID0gbmV3IEZ1bmN0aW9uKFwidmFsdWVcIiwgXCJpc0RlbHRhXCIsIFwicmV0dXJuIHRoaXMuXCIgKyBzb3VyY2VDb2xvclNwYWNlTmFtZS50b0xvd2VyQ2FzZSgpICsgXCIoKS5cIiArIHByb3BlcnR5TmFtZSArIFwiKHZhbHVlLCBpc0RlbHRhKTtcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSAmJiBPTkVDT0xPUlt0YXJnZXRDb2xvclNwYWNlTmFtZV0ucHJvdG90eXBlW3Byb3BdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBPTkVDT0xPUlt0YXJnZXRDb2xvclNwYWNlTmFtZV0ucHJvdG90eXBlW3Byb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaW5zdGFsbGVkQ29sb3JTcGFjZXMuZm9yRWFjaChmdW5jdGlvbiAob3RoZXJDb2xvclNwYWNlTmFtZSkge1xuICAgICAgICBpbnN0YWxsRm9yZWlnbk1ldGhvZHMoY29sb3JTcGFjZU5hbWUsIG90aGVyQ29sb3JTcGFjZU5hbWUpO1xuICAgICAgICBpbnN0YWxsRm9yZWlnbk1ldGhvZHMob3RoZXJDb2xvclNwYWNlTmFtZSwgY29sb3JTcGFjZU5hbWUpO1xuICAgIH0pO1xuXG4gICAgaW5zdGFsbGVkQ29sb3JTcGFjZXMucHVzaChjb2xvclNwYWNlTmFtZSk7XG59XG5cbk9ORUNPTE9SLmluc3RhbGxNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICBpbnN0YWxsZWRDb2xvclNwYWNlcy5mb3JFYWNoKGZ1bmN0aW9uIChjb2xvclNwYWNlKSB7XG4gICAgICAgIE9ORUNPTE9SW2NvbG9yU3BhY2VdLnByb3RvdHlwZVtuYW1lXSA9IGZuO1xuICAgIH0pO1xufTtcblxuaW5zdGFsbENvbG9yU3BhY2UoJ1JHQicsIFsncmVkJywgJ2dyZWVuJywgJ2JsdWUnLCAnYWxwaGEnXSwge1xuICAgIGhleDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGV4U3RyaW5nID0gKE1hdGgucm91bmQoMjU1ICogdGhpcy5fcmVkKSAqIDB4MTAwMDAgKyBNYXRoLnJvdW5kKDI1NSAqIHRoaXMuX2dyZWVuKSAqIDB4MTAwICsgTWF0aC5yb3VuZCgyNTUgKiB0aGlzLl9ibHVlKSkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gJyMnICsgKCcwMDAwMCcuc3Vic3RyKDAsIDYgLSBoZXhTdHJpbmcubGVuZ3RoKSkgKyBoZXhTdHJpbmc7XG4gICAgfSxcblxuICAgIGhleGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFscGhhU3RyaW5nID0gTWF0aC5yb3VuZCh0aGlzLl9hbHBoYSAqIDI1NSkudG9TdHJpbmcoMTYpO1xuICAgICAgICByZXR1cm4gJyMnICsgJzAwJy5zdWJzdHIoMCwgMiAtIGFscGhhU3RyaW5nLmxlbmd0aCkgKyBhbHBoYVN0cmluZyArIHRoaXMuaGV4KCkuc3Vic3RyKDEsIDYpO1xuICAgIH0sXG5cbiAgICBjc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgTWF0aC5yb3VuZCgyNTUgKiB0aGlzLl9yZWQpICsgXCIsXCIgKyBNYXRoLnJvdW5kKDI1NSAqIHRoaXMuX2dyZWVuKSArIFwiLFwiICsgTWF0aC5yb3VuZCgyNTUgKiB0aGlzLl9ibHVlKSArIFwiKVwiO1xuICAgIH0sXG5cbiAgICBjc3NhOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBcInJnYmEoXCIgKyBNYXRoLnJvdW5kKDI1NSAqIHRoaXMuX3JlZCkgKyBcIixcIiArIE1hdGgucm91bmQoMjU1ICogdGhpcy5fZ3JlZW4pICsgXCIsXCIgKyBNYXRoLnJvdW5kKDI1NSAqIHRoaXMuX2JsdWUpICsgXCIsXCIgKyB0aGlzLl9hbHBoYSArIFwiKVwiO1xuICAgIH1cbn0pO1xuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgIXVuZGVmKGRlZmluZS5hbWQpKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIE9ORUNPTE9SO1xuICAgIH0pO1xufSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAvLyBOb2RlIG1vZHVsZSBleHBvcnRcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE9ORUNPTE9SO1xufSBlbHNlIHtcbiAgICBvbmUgPSB3aW5kb3cub25lIHx8IHt9O1xuICAgIG9uZS5jb2xvciA9IE9ORUNPTE9SO1xufVxuXG5pZiAodHlwZW9mIGpRdWVyeSAhPT0gJ3VuZGVmaW5lZCcgJiYgdW5kZWYoalF1ZXJ5LmNvbG9yKSkge1xuICAgIGpRdWVyeS5jb2xvciA9IE9ORUNPTE9SO1xufVxuXG4vKmdsb2JhbCBuYW1lZENvbG9ycyovXG5uYW1lZENvbG9ycyA9IHtcbiAgICBhbGljZWJsdWU6ICdmMGY4ZmYnLFxuICAgIGFudGlxdWV3aGl0ZTogJ2ZhZWJkNycsXG4gICAgYXF1YTogJzBmZicsXG4gICAgYXF1YW1hcmluZTogJzdmZmZkNCcsXG4gICAgYXp1cmU6ICdmMGZmZmYnLFxuICAgIGJlaWdlOiAnZjVmNWRjJyxcbiAgICBiaXNxdWU6ICdmZmU0YzQnLFxuICAgIGJsYWNrOiAnMDAwJyxcbiAgICBibGFuY2hlZGFsbW9uZDogJ2ZmZWJjZCcsXG4gICAgYmx1ZTogJzAwZicsXG4gICAgYmx1ZXZpb2xldDogJzhhMmJlMicsXG4gICAgYnJvd246ICdhNTJhMmEnLFxuICAgIGJ1cmx5d29vZDogJ2RlYjg4NycsXG4gICAgY2FkZXRibHVlOiAnNWY5ZWEwJyxcbiAgICBjaGFydHJldXNlOiAnN2ZmZjAwJyxcbiAgICBjaG9jb2xhdGU6ICdkMjY5MWUnLFxuICAgIGNvcmFsOiAnZmY3ZjUwJyxcbiAgICBjb3JuZmxvd2VyYmx1ZTogJzY0OTVlZCcsXG4gICAgY29ybnNpbGs6ICdmZmY4ZGMnLFxuICAgIGNyaW1zb246ICdkYzE0M2MnLFxuICAgIGN5YW46ICcwZmYnLFxuICAgIGRhcmtibHVlOiAnMDAwMDhiJyxcbiAgICBkYXJrY3lhbjogJzAwOGI4YicsXG4gICAgZGFya2dvbGRlbnJvZDogJ2I4ODYwYicsXG4gICAgZGFya2dyYXk6ICdhOWE5YTknLFxuICAgIGRhcmtncmV5OiAnYTlhOWE5JyxcbiAgICBkYXJrZ3JlZW46ICcwMDY0MDAnLFxuICAgIGRhcmtraGFraTogJ2JkYjc2YicsXG4gICAgZGFya21hZ2VudGE6ICc4YjAwOGInLFxuICAgIGRhcmtvbGl2ZWdyZWVuOiAnNTU2YjJmJyxcbiAgICBkYXJrb3JhbmdlOiAnZmY4YzAwJyxcbiAgICBkYXJrb3JjaGlkOiAnOTkzMmNjJyxcbiAgICBkYXJrcmVkOiAnOGIwMDAwJyxcbiAgICBkYXJrc2FsbW9uOiAnZTk5NjdhJyxcbiAgICBkYXJrc2VhZ3JlZW46ICc4ZmJjOGYnLFxuICAgIGRhcmtzbGF0ZWJsdWU6ICc0ODNkOGInLFxuICAgIGRhcmtzbGF0ZWdyYXk6ICcyZjRmNGYnLFxuICAgIGRhcmtzbGF0ZWdyZXk6ICcyZjRmNGYnLFxuICAgIGRhcmt0dXJxdW9pc2U6ICcwMGNlZDEnLFxuICAgIGRhcmt2aW9sZXQ6ICc5NDAwZDMnLFxuICAgIGRlZXBwaW5rOiAnZmYxNDkzJyxcbiAgICBkZWVwc2t5Ymx1ZTogJzAwYmZmZicsXG4gICAgZGltZ3JheTogJzY5Njk2OScsXG4gICAgZGltZ3JleTogJzY5Njk2OScsXG4gICAgZG9kZ2VyYmx1ZTogJzFlOTBmZicsXG4gICAgZmlyZWJyaWNrOiAnYjIyMjIyJyxcbiAgICBmbG9yYWx3aGl0ZTogJ2ZmZmFmMCcsXG4gICAgZm9yZXN0Z3JlZW46ICcyMjhiMjInLFxuICAgIGZ1Y2hzaWE6ICdmMGYnLFxuICAgIGdhaW5zYm9ybzogJ2RjZGNkYycsXG4gICAgZ2hvc3R3aGl0ZTogJ2Y4ZjhmZicsXG4gICAgZ29sZDogJ2ZmZDcwMCcsXG4gICAgZ29sZGVucm9kOiAnZGFhNTIwJyxcbiAgICBncmF5OiAnODA4MDgwJyxcbiAgICBncmV5OiAnODA4MDgwJyxcbiAgICBncmVlbjogJzAwODAwMCcsXG4gICAgZ3JlZW55ZWxsb3c6ICdhZGZmMmYnLFxuICAgIGhvbmV5ZGV3OiAnZjBmZmYwJyxcbiAgICBob3RwaW5rOiAnZmY2OWI0JyxcbiAgICBpbmRpYW5yZWQ6ICdjZDVjNWMnLFxuICAgIGluZGlnbzogJzRiMDA4MicsXG4gICAgaXZvcnk6ICdmZmZmZjAnLFxuICAgIGtoYWtpOiAnZjBlNjhjJyxcbiAgICBsYXZlbmRlcjogJ2U2ZTZmYScsXG4gICAgbGF2ZW5kZXJibHVzaDogJ2ZmZjBmNScsXG4gICAgbGF3bmdyZWVuOiAnN2NmYzAwJyxcbiAgICBsZW1vbmNoaWZmb246ICdmZmZhY2QnLFxuICAgIGxpZ2h0Ymx1ZTogJ2FkZDhlNicsXG4gICAgbGlnaHRjb3JhbDogJ2YwODA4MCcsXG4gICAgbGlnaHRjeWFuOiAnZTBmZmZmJyxcbiAgICBsaWdodGdvbGRlbnJvZHllbGxvdzogJ2ZhZmFkMicsXG4gICAgbGlnaHRncmF5OiAnZDNkM2QzJyxcbiAgICBsaWdodGdyZXk6ICdkM2QzZDMnLFxuICAgIGxpZ2h0Z3JlZW46ICc5MGVlOTAnLFxuICAgIGxpZ2h0cGluazogJ2ZmYjZjMScsXG4gICAgbGlnaHRzYWxtb246ICdmZmEwN2EnLFxuICAgIGxpZ2h0c2VhZ3JlZW46ICcyMGIyYWEnLFxuICAgIGxpZ2h0c2t5Ymx1ZTogJzg3Y2VmYScsXG4gICAgbGlnaHRzbGF0ZWdyYXk6ICc3ODknLFxuICAgIGxpZ2h0c2xhdGVncmV5OiAnNzg5JyxcbiAgICBsaWdodHN0ZWVsYmx1ZTogJ2IwYzRkZScsXG4gICAgbGlnaHR5ZWxsb3c6ICdmZmZmZTAnLFxuICAgIGxpbWU6ICcwZjAnLFxuICAgIGxpbWVncmVlbjogJzMyY2QzMicsXG4gICAgbGluZW46ICdmYWYwZTYnLFxuICAgIG1hZ2VudGE6ICdmMGYnLFxuICAgIG1hcm9vbjogJzgwMDAwMCcsXG4gICAgbWVkaXVtYXF1YW1hcmluZTogJzY2Y2RhYScsXG4gICAgbWVkaXVtYmx1ZTogJzAwMDBjZCcsXG4gICAgbWVkaXVtb3JjaGlkOiAnYmE1NWQzJyxcbiAgICBtZWRpdW1wdXJwbGU6ICc5MzcwZDgnLFxuICAgIG1lZGl1bXNlYWdyZWVuOiAnM2NiMzcxJyxcbiAgICBtZWRpdW1zbGF0ZWJsdWU6ICc3YjY4ZWUnLFxuICAgIG1lZGl1bXNwcmluZ2dyZWVuOiAnMDBmYTlhJyxcbiAgICBtZWRpdW10dXJxdW9pc2U6ICc0OGQxY2MnLFxuICAgIG1lZGl1bXZpb2xldHJlZDogJ2M3MTU4NScsXG4gICAgbWlkbmlnaHRibHVlOiAnMTkxOTcwJyxcbiAgICBtaW50Y3JlYW06ICdmNWZmZmEnLFxuICAgIG1pc3R5cm9zZTogJ2ZmZTRlMScsXG4gICAgbW9jY2FzaW46ICdmZmU0YjUnLFxuICAgIG5hdmFqb3doaXRlOiAnZmZkZWFkJyxcbiAgICBuYXZ5OiAnMDAwMDgwJyxcbiAgICBvbGRsYWNlOiAnZmRmNWU2JyxcbiAgICBvbGl2ZTogJzgwODAwMCcsXG4gICAgb2xpdmVkcmFiOiAnNmI4ZTIzJyxcbiAgICBvcmFuZ2U6ICdmZmE1MDAnLFxuICAgIG9yYW5nZXJlZDogJ2ZmNDUwMCcsXG4gICAgb3JjaGlkOiAnZGE3MGQ2JyxcbiAgICBwYWxlZ29sZGVucm9kOiAnZWVlOGFhJyxcbiAgICBwYWxlZ3JlZW46ICc5OGZiOTgnLFxuICAgIHBhbGV0dXJxdW9pc2U6ICdhZmVlZWUnLFxuICAgIHBhbGV2aW9sZXRyZWQ6ICdkODcwOTMnLFxuICAgIHBhcGF5YXdoaXA6ICdmZmVmZDUnLFxuICAgIHBlYWNocHVmZjogJ2ZmZGFiOScsXG4gICAgcGVydTogJ2NkODUzZicsXG4gICAgcGluazogJ2ZmYzBjYicsXG4gICAgcGx1bTogJ2RkYTBkZCcsXG4gICAgcG93ZGVyYmx1ZTogJ2IwZTBlNicsXG4gICAgcHVycGxlOiAnODAwMDgwJyxcbiAgICByZWJlY2NhcHVycGxlOiAnNjM5JyxcbiAgICByZWQ6ICdmMDAnLFxuICAgIHJvc3licm93bjogJ2JjOGY4ZicsXG4gICAgcm95YWxibHVlOiAnNDE2OWUxJyxcbiAgICBzYWRkbGVicm93bjogJzhiNDUxMycsXG4gICAgc2FsbW9uOiAnZmE4MDcyJyxcbiAgICBzYW5keWJyb3duOiAnZjRhNDYwJyxcbiAgICBzZWFncmVlbjogJzJlOGI1NycsXG4gICAgc2Vhc2hlbGw6ICdmZmY1ZWUnLFxuICAgIHNpZW5uYTogJ2EwNTIyZCcsXG4gICAgc2lsdmVyOiAnYzBjMGMwJyxcbiAgICBza3libHVlOiAnODdjZWViJyxcbiAgICBzbGF0ZWJsdWU6ICc2YTVhY2QnLFxuICAgIHNsYXRlZ3JheTogJzcwODA5MCcsXG4gICAgc2xhdGVncmV5OiAnNzA4MDkwJyxcbiAgICBzbm93OiAnZmZmYWZhJyxcbiAgICBzcHJpbmdncmVlbjogJzAwZmY3ZicsXG4gICAgc3RlZWxibHVlOiAnNDY4MmI0JyxcbiAgICB0YW46ICdkMmI0OGMnLFxuICAgIHRlYWw6ICcwMDgwODAnLFxuICAgIHRoaXN0bGU6ICdkOGJmZDgnLFxuICAgIHRvbWF0bzogJ2ZmNjM0NycsXG4gICAgdHVycXVvaXNlOiAnNDBlMGQwJyxcbiAgICB2aW9sZXQ6ICdlZTgyZWUnLFxuICAgIHdoZWF0OiAnZjVkZWIzJyxcbiAgICB3aGl0ZTogJ2ZmZicsXG4gICAgd2hpdGVzbW9rZTogJ2Y1ZjVmNScsXG4gICAgeWVsbG93OiAnZmYwJyxcbiAgICB5ZWxsb3dncmVlbjogJzlhY2QzMidcbn07XG5cbi8qZ2xvYmFsIElOQ0xVREUsIGluc3RhbGxDb2xvclNwYWNlLCBPTkVDT0xPUiovXG5cbmluc3RhbGxDb2xvclNwYWNlKCdYWVonLCBbJ3gnLCAneScsICd6JywgJ2FscGhhJ10sIHtcbiAgICBmcm9tUmdiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIGh0dHA6Ly93d3cuZWFzeXJnYi5jb20vaW5kZXgucGhwP1g9TUFUSCZIPTAyI3RleHQyXG4gICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hhbm5lbCA+IDAuMDQwNDUgP1xuICAgICAgICAgICAgICAgICAgICBNYXRoLnBvdygoY2hhbm5lbCArIDAuMDU1KSAvIDEuMDU1LCAyLjQpIDpcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbCAvIDEyLjkyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHIgPSBjb252ZXJ0KHRoaXMuX3JlZCksXG4gICAgICAgICAgICBnID0gY29udmVydCh0aGlzLl9ncmVlbiksXG4gICAgICAgICAgICBiID0gY29udmVydCh0aGlzLl9ibHVlKTtcblxuICAgICAgICAvLyBSZWZlcmVuY2Ugd2hpdGUgcG9pbnQgc1JHQiBENjU6XG4gICAgICAgIC8vIGh0dHA6Ly93d3cuYnJ1Y2VsaW5kYmxvb20uY29tL2luZGV4Lmh0bWw/RXFuX1JHQl9YWVpfTWF0cml4Lmh0bWxcbiAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5YWVooXG4gICAgICAgICAgICByICogMC40MTI0NTY0ICsgZyAqIDAuMzU3NTc2MSArIGIgKiAwLjE4MDQzNzUsXG4gICAgICAgICAgICByICogMC4yMTI2NzI5ICsgZyAqIDAuNzE1MTUyMiArIGIgKiAwLjA3MjE3NTAsXG4gICAgICAgICAgICByICogMC4wMTkzMzM5ICsgZyAqIDAuMTE5MTkyMCArIGIgKiAwLjk1MDMwNDEsXG4gICAgICAgICAgICB0aGlzLl9hbHBoYVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICByZ2I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gaHR0cDovL3d3dy5lYXN5cmdiLmNvbS9pbmRleC5waHA/WD1NQVRIJkg9MDEjdGV4dDFcbiAgICAgICAgdmFyIHggPSB0aGlzLl94LFxuICAgICAgICAgICAgeSA9IHRoaXMuX3ksXG4gICAgICAgICAgICB6ID0gdGhpcy5feixcbiAgICAgICAgICAgIGNvbnZlcnQgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFubmVsID4gMC4wMDMxMzA4ID9cbiAgICAgICAgICAgICAgICAgICAgMS4wNTUgKiBNYXRoLnBvdyhjaGFubmVsLCAxIC8gMi40KSAtIDAuMDU1IDpcbiAgICAgICAgICAgICAgICAgICAgMTIuOTIgKiBjaGFubmVsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAvLyBSZWZlcmVuY2Ugd2hpdGUgcG9pbnQgc1JHQiBENjU6XG4gICAgICAgIC8vIGh0dHA6Ly93d3cuYnJ1Y2VsaW5kYmxvb20uY29tL2luZGV4Lmh0bWw/RXFuX1JHQl9YWVpfTWF0cml4Lmh0bWxcbiAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5SR0IoXG4gICAgICAgICAgICBjb252ZXJ0KHggKiAgMy4yNDA0NTQyICsgeSAqIC0xLjUzNzEzODUgKyB6ICogLTAuNDk4NTMxNCksXG4gICAgICAgICAgICBjb252ZXJ0KHggKiAtMC45NjkyNjYwICsgeSAqICAxLjg3NjAxMDggKyB6ICogIDAuMDQxNTU2MCksXG4gICAgICAgICAgICBjb252ZXJ0KHggKiAgMC4wNTU2NDM0ICsgeSAqIC0wLjIwNDAyNTkgKyB6ICogIDEuMDU3MjI1MiksXG4gICAgICAgICAgICB0aGlzLl9hbHBoYVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICBsYWI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gaHR0cDovL3d3dy5lYXN5cmdiLmNvbS9pbmRleC5waHA/WD1NQVRIJkg9MDcjdGV4dDdcbiAgICAgICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAoY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGFubmVsID4gMC4wMDg4NTYgP1xuICAgICAgICAgICAgICAgICAgICBNYXRoLnBvdyhjaGFubmVsLCAxIC8gMykgOlxuICAgICAgICAgICAgICAgICAgICA3Ljc4NzAzNyAqIGNoYW5uZWwgKyA0IC8gMjk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgeCA9IGNvbnZlcnQodGhpcy5feCAvICA5NS4wNDcpLFxuICAgICAgICAgICAgeSA9IGNvbnZlcnQodGhpcy5feSAvIDEwMC4wMDApLFxuICAgICAgICAgICAgeiA9IGNvbnZlcnQodGhpcy5feiAvIDEwOC44ODMpO1xuXG4gICAgICAgIHJldHVybiBuZXcgT05FQ09MT1IuTEFCKFxuICAgICAgICAgICAgKDExNiAqIHkpIC0gMTYsXG4gICAgICAgICAgICA1MDAgKiAoeCAtIHkpLFxuICAgICAgICAgICAgMjAwICogKHkgLSB6KSxcbiAgICAgICAgICAgIHRoaXMuX2FscGhhXG4gICAgICAgICk7XG4gICAgfVxufSk7XG5cbi8qZ2xvYmFsIElOQ0xVREUsIGluc3RhbGxDb2xvclNwYWNlLCBPTkVDT0xPUiovXG5cbmluc3RhbGxDb2xvclNwYWNlKCdMQUInLCBbJ2wnLCAnYScsICdiJywgJ2FscGhhJ10sIHtcbiAgICBmcm9tUmdiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnh5eigpLmxhYigpO1xuICAgIH0sXG5cbiAgICByZ2I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueHl6KCkucmdiKCk7XG4gICAgfSxcblxuICAgIHh5ejogZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBodHRwOi8vd3d3LmVhc3lyZ2IuY29tL2luZGV4LnBocD9YPU1BVEgmSD0wOCN0ZXh0OFxuICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvdyA9IE1hdGgucG93KGNoYW5uZWwsIDMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBwb3cgPiAwLjAwODg1NiA/XG4gICAgICAgICAgICAgICAgICAgIHBvdyA6XG4gICAgICAgICAgICAgICAgICAgIChjaGFubmVsIC0gMTYgLyAxMTYpIC8gNy44NztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB5ID0gKHRoaXMuX2wgKyAxNikgLyAxMTYsXG4gICAgICAgICAgICB4ID0gdGhpcy5fYSAvIDUwMCArIHksXG4gICAgICAgICAgICB6ID0geSAtIHRoaXMuX2IgLyAyMDA7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5YWVooXG4gICAgICAgICAgICBjb252ZXJ0KHgpICogIDk1LjA0NyxcbiAgICAgICAgICAgIGNvbnZlcnQoeSkgKiAxMDAuMDAwLFxuICAgICAgICAgICAgY29udmVydCh6KSAqIDEwOC44ODMsXG4gICAgICAgICAgICB0aGlzLl9hbHBoYVxuICAgICAgICApO1xuICAgIH1cbn0pO1xuXG4vKmdsb2JhbCBvbmUqL1xuXG5pbnN0YWxsQ29sb3JTcGFjZSgnSFNWJywgWydodWUnLCAnc2F0dXJhdGlvbicsICd2YWx1ZScsICdhbHBoYSddLCB7XG4gICAgcmdiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBodWUgPSB0aGlzLl9odWUsXG4gICAgICAgICAgICBzYXR1cmF0aW9uID0gdGhpcy5fc2F0dXJhdGlvbixcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5fdmFsdWUsXG4gICAgICAgICAgICBpID0gTWF0aC5taW4oNSwgTWF0aC5mbG9vcihodWUgKiA2KSksXG4gICAgICAgICAgICBmID0gaHVlICogNiAtIGksXG4gICAgICAgICAgICBwID0gdmFsdWUgKiAoMSAtIHNhdHVyYXRpb24pLFxuICAgICAgICAgICAgcSA9IHZhbHVlICogKDEgLSBmICogc2F0dXJhdGlvbiksXG4gICAgICAgICAgICB0ID0gdmFsdWUgKiAoMSAtICgxIC0gZikgKiBzYXR1cmF0aW9uKSxcbiAgICAgICAgICAgIHJlZCxcbiAgICAgICAgICAgIGdyZWVuLFxuICAgICAgICAgICAgYmx1ZTtcbiAgICAgICAgc3dpdGNoIChpKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgIHJlZCA9IHZhbHVlO1xuICAgICAgICAgICAgZ3JlZW4gPSB0O1xuICAgICAgICAgICAgYmx1ZSA9IHA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgcmVkID0gcTtcbiAgICAgICAgICAgIGdyZWVuID0gdmFsdWU7XG4gICAgICAgICAgICBibHVlID0gcDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICByZWQgPSBwO1xuICAgICAgICAgICAgZ3JlZW4gPSB2YWx1ZTtcbiAgICAgICAgICAgIGJsdWUgPSB0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIHJlZCA9IHA7XG4gICAgICAgICAgICBncmVlbiA9IHE7XG4gICAgICAgICAgICBibHVlID0gdmFsdWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgcmVkID0gdDtcbiAgICAgICAgICAgIGdyZWVuID0gcDtcbiAgICAgICAgICAgIGJsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICByZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgIGdyZWVuID0gcDtcbiAgICAgICAgICAgIGJsdWUgPSBxO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5SR0IocmVkLCBncmVlbiwgYmx1ZSwgdGhpcy5fYWxwaGEpO1xuICAgIH0sXG5cbiAgICBoc2w6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGwgPSAoMiAtIHRoaXMuX3NhdHVyYXRpb24pICogdGhpcy5fdmFsdWUsXG4gICAgICAgICAgICBzdiA9IHRoaXMuX3NhdHVyYXRpb24gKiB0aGlzLl92YWx1ZSxcbiAgICAgICAgICAgIHN2RGl2aXNvciA9IGwgPD0gMSA/IGwgOiAoMiAtIGwpLFxuICAgICAgICAgICAgc2F0dXJhdGlvbjtcblxuICAgICAgICAvLyBBdm9pZCBkaXZpc2lvbiBieSB6ZXJvIHdoZW4gbGlnaHRuZXNzIGFwcHJvYWNoZXMgemVybzpcbiAgICAgICAgaWYgKHN2RGl2aXNvciA8IDFlLTkpIHtcbiAgICAgICAgICAgIHNhdHVyYXRpb24gPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2F0dXJhdGlvbiA9IHN2IC8gc3ZEaXZpc29yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgT05FQ09MT1IuSFNMKHRoaXMuX2h1ZSwgc2F0dXJhdGlvbiwgbCAvIDIsIHRoaXMuX2FscGhhKTtcbiAgICB9LFxuXG4gICAgZnJvbVJnYjogZnVuY3Rpb24gKCkgeyAvLyBCZWNvbWVzIG9uZS5jb2xvci5SR0IucHJvdG90eXBlLmhzdlxuICAgICAgICB2YXIgcmVkID0gdGhpcy5fcmVkLFxuICAgICAgICAgICAgZ3JlZW4gPSB0aGlzLl9ncmVlbixcbiAgICAgICAgICAgIGJsdWUgPSB0aGlzLl9ibHVlLFxuICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgocmVkLCBncmVlbiwgYmx1ZSksXG4gICAgICAgICAgICBtaW4gPSBNYXRoLm1pbihyZWQsIGdyZWVuLCBibHVlKSxcbiAgICAgICAgICAgIGRlbHRhID0gbWF4IC0gbWluLFxuICAgICAgICAgICAgaHVlLFxuICAgICAgICAgICAgc2F0dXJhdGlvbiA9IChtYXggPT09IDApID8gMCA6IChkZWx0YSAvIG1heCksXG4gICAgICAgICAgICB2YWx1ZSA9IG1heDtcbiAgICAgICAgaWYgKGRlbHRhID09PSAwKSB7XG4gICAgICAgICAgICBodWUgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3dpdGNoIChtYXgpIHtcbiAgICAgICAgICAgIGNhc2UgcmVkOlxuICAgICAgICAgICAgICAgIGh1ZSA9IChncmVlbiAtIGJsdWUpIC8gZGVsdGEgLyA2ICsgKGdyZWVuIDwgYmx1ZSA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgZ3JlZW46XG4gICAgICAgICAgICAgICAgaHVlID0gKGJsdWUgLSByZWQpIC8gZGVsdGEgLyA2ICsgMSAvIDM7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGJsdWU6XG4gICAgICAgICAgICAgICAgaHVlID0gKHJlZCAtIGdyZWVuKSAvIGRlbHRhIC8gNiArIDIgLyAzO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgT05FQ09MT1IuSFNWKGh1ZSwgc2F0dXJhdGlvbiwgdmFsdWUsIHRoaXMuX2FscGhhKTtcbiAgICB9XG59KTtcblxuLypnbG9iYWwgb25lKi9cblxuXG5pbnN0YWxsQ29sb3JTcGFjZSgnSFNMJywgWydodWUnLCAnc2F0dXJhdGlvbicsICdsaWdodG5lc3MnLCAnYWxwaGEnXSwge1xuICAgIGhzdjogZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBBbGdvcml0aG0gYWRhcHRlZCBmcm9tIGh0dHA6Ly93aWtpLnNlY29uZGxpZmUuY29tL3dpa2kvQ29sb3JfY29udmVyc2lvbl9zY3JpcHRzXG4gICAgICAgIHZhciBsID0gdGhpcy5fbGlnaHRuZXNzICogMixcbiAgICAgICAgICAgIHMgPSB0aGlzLl9zYXR1cmF0aW9uICogKChsIDw9IDEpID8gbCA6IDIgLSBsKSxcbiAgICAgICAgICAgIHNhdHVyYXRpb247XG5cbiAgICAgICAgLy8gQXZvaWQgZGl2aXNpb24gYnkgemVybyB3aGVuIGwgKyBzIGlzIHZlcnkgc21hbGwgKGFwcHJvYWNoaW5nIGJsYWNrKTpcbiAgICAgICAgaWYgKGwgKyBzIDwgMWUtOSkge1xuICAgICAgICAgICAgc2F0dXJhdGlvbiA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzYXR1cmF0aW9uID0gKDIgKiBzKSAvIChsICsgcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IE9ORUNPTE9SLkhTVih0aGlzLl9odWUsIHNhdHVyYXRpb24sIChsICsgcykgLyAyLCB0aGlzLl9hbHBoYSk7XG4gICAgfSxcblxuICAgIHJnYjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oc3YoKS5yZ2IoKTtcbiAgICB9LFxuXG4gICAgZnJvbVJnYjogZnVuY3Rpb24gKCkgeyAvLyBCZWNvbWVzIG9uZS5jb2xvci5SR0IucHJvdG90eXBlLmhzdlxuICAgICAgICByZXR1cm4gdGhpcy5oc3YoKS5oc2woKTtcbiAgICB9XG59KTtcblxuLypnbG9iYWwgb25lKi9cblxuaW5zdGFsbENvbG9yU3BhY2UoJ0NNWUsnLCBbJ2N5YW4nLCAnbWFnZW50YScsICd5ZWxsb3cnLCAnYmxhY2snLCAnYWxwaGEnXSwge1xuICAgIHJnYjogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE9ORUNPTE9SLlJHQigoMSAtIHRoaXMuX2N5YW4gKiAoMSAtIHRoaXMuX2JsYWNrKSAtIHRoaXMuX2JsYWNrKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgxIC0gdGhpcy5fbWFnZW50YSAqICgxIC0gdGhpcy5fYmxhY2spIC0gdGhpcy5fYmxhY2spLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDEgLSB0aGlzLl95ZWxsb3cgKiAoMSAtIHRoaXMuX2JsYWNrKSAtIHRoaXMuX2JsYWNrKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2FscGhhKTtcbiAgICB9LFxuXG4gICAgZnJvbVJnYjogZnVuY3Rpb24gKCkgeyAvLyBCZWNvbWVzIG9uZS5jb2xvci5SR0IucHJvdG90eXBlLmNteWtcbiAgICAgICAgLy8gQWRhcHRlZCBmcm9tIGh0dHA6Ly93d3cuamF2YXNjcmlwdGVyLm5ldC9mYXEvcmdiMmNteWsuaHRtXG4gICAgICAgIHZhciByZWQgPSB0aGlzLl9yZWQsXG4gICAgICAgICAgICBncmVlbiA9IHRoaXMuX2dyZWVuLFxuICAgICAgICAgICAgYmx1ZSA9IHRoaXMuX2JsdWUsXG4gICAgICAgICAgICBjeWFuID0gMSAtIHJlZCxcbiAgICAgICAgICAgIG1hZ2VudGEgPSAxIC0gZ3JlZW4sXG4gICAgICAgICAgICB5ZWxsb3cgPSAxIC0gYmx1ZSxcbiAgICAgICAgICAgIGJsYWNrID0gMTtcbiAgICAgICAgaWYgKHJlZCB8fCBncmVlbiB8fCBibHVlKSB7XG4gICAgICAgICAgICBibGFjayA9IE1hdGgubWluKGN5YW4sIE1hdGgubWluKG1hZ2VudGEsIHllbGxvdykpO1xuICAgICAgICAgICAgY3lhbiA9IChjeWFuIC0gYmxhY2spIC8gKDEgLSBibGFjayk7XG4gICAgICAgICAgICBtYWdlbnRhID0gKG1hZ2VudGEgLSBibGFjaykgLyAoMSAtIGJsYWNrKTtcbiAgICAgICAgICAgIHllbGxvdyA9ICh5ZWxsb3cgLSBibGFjaykgLyAoMSAtIGJsYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJsYWNrID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IE9ORUNPTE9SLkNNWUsoY3lhbiwgbWFnZW50YSwgeWVsbG93LCBibGFjaywgdGhpcy5fYWxwaGEpO1xuICAgIH1cbn0pO1xuXG5PTkVDT0xPUi5pbnN0YWxsTWV0aG9kKCdjbGVhcmVyJywgZnVuY3Rpb24gKGFtb3VudCkge1xuICAgIHJldHVybiB0aGlzLmFscGhhKGlzTmFOKGFtb3VudCkgPyAtMC4xIDogLWFtb3VudCwgdHJ1ZSk7XG59KTtcblxuXG5PTkVDT0xPUi5pbnN0YWxsTWV0aG9kKCdkYXJrZW4nLCBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMubGlnaHRuZXNzKGlzTmFOKGFtb3VudCkgPyAtMC4xIDogLWFtb3VudCwgdHJ1ZSk7XG59KTtcblxuXG5PTkVDT0xPUi5pbnN0YWxsTWV0aG9kKCdkZXNhdHVyYXRlJywgZnVuY3Rpb24gKGFtb3VudCkge1xuICAgIHJldHVybiB0aGlzLnNhdHVyYXRpb24oaXNOYU4oYW1vdW50KSA/IC0wLjEgOiAtYW1vdW50LCB0cnVlKTtcbn0pO1xuXG5mdW5jdGlvbiBncyAoKSB7XG4gICAgdmFyIHJnYiA9IHRoaXMucmdiKCksXG4gICAgICAgIHZhbCA9IHJnYi5fcmVkICogMC4zICsgcmdiLl9ncmVlbiAqIDAuNTkgKyByZ2IuX2JsdWUgKiAwLjExO1xuXG4gICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5SR0IodmFsLCB2YWwsIHZhbCwgdGhpcy5fYWxwaGEpO1xufTtcblxuT05FQ09MT1IuaW5zdGFsbE1ldGhvZCgnZ3JleXNjYWxlJywgZ3MpO1xuT05FQ09MT1IuaW5zdGFsbE1ldGhvZCgnZ3JheXNjYWxlJywgZ3MpO1xuXG5cbk9ORUNPTE9SLmluc3RhbGxNZXRob2QoJ2xpZ2h0ZW4nLCBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMubGlnaHRuZXNzKGlzTmFOKGFtb3VudCkgPyAwLjEgOiBhbW91bnQsIHRydWUpO1xufSk7XG5cbk9ORUNPTE9SLmluc3RhbGxNZXRob2QoJ21peCcsIGZ1bmN0aW9uIChvdGhlckNvbG9yLCB3ZWlnaHQpIHtcbiAgICBvdGhlckNvbG9yID0gT05FQ09MT1Iob3RoZXJDb2xvcikucmdiKCk7XG4gICAgd2VpZ2h0ID0gMSAtIChpc05hTih3ZWlnaHQpID8gMC41IDogd2VpZ2h0KTtcblxuICAgIHZhciB3ID0gd2VpZ2h0ICogMiAtIDEsXG4gICAgICAgIGEgPSB0aGlzLl9hbHBoYSAtIG90aGVyQ29sb3IuX2FscGhhLFxuICAgICAgICB3ZWlnaHQxID0gKCgodyAqIGEgPT09IC0xKSA/IHcgOiAodyArIGEpIC8gKDEgKyB3ICogYSkpICsgMSkgLyAyLFxuICAgICAgICB3ZWlnaHQyID0gMSAtIHdlaWdodDEsXG4gICAgICAgIHJnYiA9IHRoaXMucmdiKCk7XG5cbiAgICByZXR1cm4gbmV3IE9ORUNPTE9SLlJHQihcbiAgICAgICAgcmdiLl9yZWQgKiB3ZWlnaHQxICsgb3RoZXJDb2xvci5fcmVkICogd2VpZ2h0MixcbiAgICAgICAgcmdiLl9ncmVlbiAqIHdlaWdodDEgKyBvdGhlckNvbG9yLl9ncmVlbiAqIHdlaWdodDIsXG4gICAgICAgIHJnYi5fYmx1ZSAqIHdlaWdodDEgKyBvdGhlckNvbG9yLl9ibHVlICogd2VpZ2h0MixcbiAgICAgICAgcmdiLl9hbHBoYSAqIHdlaWdodCArIG90aGVyQ29sb3IuX2FscGhhICogKDEgLSB3ZWlnaHQpXG4gICAgKTtcbn0pO1xuXG5PTkVDT0xPUi5pbnN0YWxsTWV0aG9kKCduZWdhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJnYiA9IHRoaXMucmdiKCk7XG4gICAgcmV0dXJuIG5ldyBPTkVDT0xPUi5SR0IoMSAtIHJnYi5fcmVkLCAxIC0gcmdiLl9ncmVlbiwgMSAtIHJnYi5fYmx1ZSwgdGhpcy5fYWxwaGEpO1xufSk7XG5cbk9ORUNPTE9SLmluc3RhbGxNZXRob2QoJ29wYXF1ZXInLCBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMuYWxwaGEoaXNOYU4oYW1vdW50KSA/IDAuMSA6IGFtb3VudCwgdHJ1ZSk7XG59KTtcblxuT05FQ09MT1IuaW5zdGFsbE1ldGhvZCgncm90YXRlJywgZnVuY3Rpb24gKGRlZ3JlZXMpIHtcbiAgICByZXR1cm4gdGhpcy5odWUoKGRlZ3JlZXMgfHwgMCkgLyAzNjAsIHRydWUpO1xufSk7XG5cblxuT05FQ09MT1IuaW5zdGFsbE1ldGhvZCgnc2F0dXJhdGUnLCBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgcmV0dXJuIHRoaXMuc2F0dXJhdGlvbihpc05hTihhbW91bnQpID8gMC4xIDogYW1vdW50LCB0cnVlKTtcbn0pO1xuXG4vLyBBZGFwdGVkIGZyb20gaHR0cDovL2dpbXAuc291cmNlYXJjaGl2ZS5jb20vZG9jdW1lbnRhdGlvbi8yLjYuNi0xdWJ1bnR1MS9jb2xvci10by1hbHBoYV84Yy1zb3VyY2UuaHRtbFxuLypcbiAgICB0b0FscGhhIHJldHVybnMgYSBjb2xvciB3aGVyZSB0aGUgdmFsdWVzIG9mIHRoZSBhcmd1bWVudCBoYXZlIGJlZW4gY29udmVydGVkIHRvIGFscGhhXG4qL1xuT05FQ09MT1IuaW5zdGFsbE1ldGhvZCgndG9BbHBoYScsIGZ1bmN0aW9uIChjb2xvcikge1xuICAgIHZhciBtZSA9IHRoaXMucmdiKCksXG4gICAgICAgIG90aGVyID0gT05FQ09MT1IoY29sb3IpLnJnYigpLFxuICAgICAgICBlcHNpbG9uID0gMWUtMTAsXG4gICAgICAgIGEgPSBuZXcgT05FQ09MT1IuUkdCKDAsIDAsIDAsIG1lLl9hbHBoYSksXG4gICAgICAgIGNoYW5uZWxzID0gWydfcmVkJywgJ19ncmVlbicsICdfYmx1ZSddO1xuXG4gICAgY2hhbm5lbHMuZm9yRWFjaChmdW5jdGlvbiAoY2hhbm5lbCkge1xuICAgICAgICBpZiAobWVbY2hhbm5lbF0gPCBlcHNpbG9uKSB7XG4gICAgICAgICAgICBhW2NoYW5uZWxdID0gbWVbY2hhbm5lbF07XG4gICAgICAgIH0gZWxzZSBpZiAobWVbY2hhbm5lbF0gPiBvdGhlcltjaGFubmVsXSkge1xuICAgICAgICAgICAgYVtjaGFubmVsXSA9IChtZVtjaGFubmVsXSAtIG90aGVyW2NoYW5uZWxdKSAvICgxIC0gb3RoZXJbY2hhbm5lbF0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1lW2NoYW5uZWxdID4gb3RoZXJbY2hhbm5lbF0pIHtcbiAgICAgICAgICAgIGFbY2hhbm5lbF0gPSAob3RoZXJbY2hhbm5lbF0gLSBtZVtjaGFubmVsXSkgLyBvdGhlcltjaGFubmVsXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFbY2hhbm5lbF0gPSAwO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoYS5fcmVkID4gYS5fZ3JlZW4pIHtcbiAgICAgICAgaWYgKGEuX3JlZCA+IGEuX2JsdWUpIHtcbiAgICAgICAgICAgIG1lLl9hbHBoYSA9IGEuX3JlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1lLl9hbHBoYSA9IGEuX2JsdWU7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGEuX2dyZWVuID4gYS5fYmx1ZSkge1xuICAgICAgICBtZS5fYWxwaGEgPSBhLl9ncmVlbjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBtZS5fYWxwaGEgPSBhLl9ibHVlO1xuICAgIH1cblxuICAgIGlmIChtZS5fYWxwaGEgPCBlcHNpbG9uKSB7XG4gICAgICAgIHJldHVybiBtZTtcbiAgICB9XG5cbiAgICBjaGFubmVscy5mb3JFYWNoKGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgIG1lW2NoYW5uZWxdID0gKG1lW2NoYW5uZWxdIC0gb3RoZXJbY2hhbm5lbF0pIC8gbWUuX2FscGhhICsgb3RoZXJbY2hhbm5lbF07XG4gICAgfSk7XG4gICAgbWUuX2FscGhhICo9IGEuX2FscGhhO1xuXG4gICAgcmV0dXJuIG1lO1xufSk7XG5cbi8qZ2xvYmFsIG9uZSovXG5cbi8vIFRoaXMgZmlsZSBpcyBwdXJlbHkgZm9yIHRoZSBidWlsZCBzeXN0ZW1cblxuLy8gT3JkZXIgaXMgaW1wb3J0YW50IHRvIHByZXZlbnQgY2hhbm5lbCBuYW1lIGNsYXNoZXMuIExhYiA8LT4gaHNMXG5cbi8vIENvbnZlbmllbmNlIGZ1bmN0aW9uc1xuXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4oZnVuY3Rpb24oKSB7XG4gIHZhciBNaXhpbiwgUHJvcGVydHlBY2Nlc3NvcnMsIFdlYWtNYXAsIF9yZWYsIF9yZWYxLFxuICAgIF9faGFzUHJvcCA9IHt9Lmhhc093blByb3BlcnR5LFxuICAgIF9fZXh0ZW5kcyA9IGZ1bmN0aW9uKGNoaWxkLCBwYXJlbnQpIHsgZm9yICh2YXIga2V5IGluIHBhcmVudCkgeyBpZiAoX19oYXNQcm9wLmNhbGwocGFyZW50LCBrZXkpKSBjaGlsZFtrZXldID0gcGFyZW50W2tleV07IH0gZnVuY3Rpb24gY3RvcigpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9IGN0b3IucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTsgY2hpbGQucHJvdG90eXBlID0gbmV3IGN0b3IoKTsgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTsgcmV0dXJuIGNoaWxkOyB9O1xuXG4gIE1peGluID0gcmVxdWlyZSgnbWl4dG8nKTtcblxuICBXZWFrTWFwID0gKF9yZWYgPSBnbG9iYWwuV2Vha01hcCkgIT0gbnVsbCA/IF9yZWYgOiByZXF1aXJlKCdoYXJtb255LWNvbGxlY3Rpb25zJykuV2Vha01hcDtcblxuICBtb2R1bGUuZXhwb3J0cyA9IFByb3BlcnR5QWNjZXNzb3JzID0gKGZ1bmN0aW9uKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhQcm9wZXJ0eUFjY2Vzc29ycywgX3N1cGVyKTtcblxuICAgIGZ1bmN0aW9uIFByb3BlcnR5QWNjZXNzb3JzKCkge1xuICAgICAgX3JlZjEgPSBQcm9wZXJ0eUFjY2Vzc29ycy5fX3N1cGVyX18uY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfcmVmMTtcbiAgICB9XG5cbiAgICBQcm9wZXJ0eUFjY2Vzc29ycy5wcm90b3R5cGUuYWNjZXNzb3IgPSBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgICBpZiAodHlwZW9mIGRlZmluaXRpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGVmaW5pdGlvbiA9IHtcbiAgICAgICAgICBnZXQ6IGRlZmluaXRpb25cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgbmFtZSwgZGVmaW5pdGlvbik7XG4gICAgfTtcblxuICAgIFByb3BlcnR5QWNjZXNzb3JzLnByb3RvdHlwZS5hZHZpc2VkQWNjZXNzb3IgPSBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgICB2YXIgZ2V0QWR2aWNlLCBzZXRBZHZpY2UsIHZhbHVlcztcbiAgICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBnZXRBZHZpY2UgPSBkZWZpbml0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZ2V0QWR2aWNlID0gZGVmaW5pdGlvbi5nZXQ7XG4gICAgICAgIHNldEFkdmljZSA9IGRlZmluaXRpb24uc2V0O1xuICAgICAgfVxuICAgICAgdmFsdWVzID0gbmV3IFdlYWtNYXA7XG4gICAgICByZXR1cm4gdGhpcy5hY2Nlc3NvcihuYW1lLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGdldEFkdmljZSAhPSBudWxsKSB7XG4gICAgICAgICAgICBnZXRBZHZpY2UuY2FsbCh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5nZXQodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24obmV3VmFsdWUpIHtcbiAgICAgICAgICBpZiAoc2V0QWR2aWNlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHNldEFkdmljZS5jYWxsKHRoaXMsIG5ld1ZhbHVlLCB2YWx1ZXMuZ2V0KHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlcy5zZXQodGhpcywgbmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgUHJvcGVydHlBY2Nlc3NvcnMucHJvdG90eXBlLmxhenlBY2Nlc3NvciA9IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICB2YWx1ZXMgPSBuZXcgV2Vha01hcDtcbiAgICAgIHJldHVybiB0aGlzLmFjY2Vzc29yKG5hbWUsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodmFsdWVzLmhhcyh0aGlzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcy5nZXQodGhpcyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlcy5zZXQodGhpcywgZGVmaW5pdGlvbi5jYWxsKHRoaXMpKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXMuZ2V0KHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZXMuc2V0KHRoaXMsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBQcm9wZXJ0eUFjY2Vzc29ycztcblxuICB9KShNaXhpbik7XG5cbn0pLmNhbGwodGhpcyk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qIChUaGUgTUlUIExpY2Vuc2UpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEyIEJyYW5kb24gQmVudmllIDxodHRwOi8vYmJlbnZpZS5jb20+XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZFxuICogYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLFxuICogc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIHdpdGggYWxsIGNvcGllcyBvclxuICogc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElOR1xuICogQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gKiBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZICBDTEFJTSxcbiAqIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICovXG5cbi8vIE9yaWdpbmFsIFdlYWtNYXAgaW1wbGVtZW50YXRpb24gYnkgR296YWxhIEAgaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vMTI2OTk5MVxuLy8gVXBkYXRlZCBhbmQgYnVnZml4ZWQgYnkgUmF5bm9zIEAgaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vMTYzODA1OVxuLy8gRXhwYW5kZWQgYnkgQmVudmllIEAgaHR0cHM6Ly9naXRodWIuY29tL0JlbnZpZS9oYXJtb255LWNvbGxlY3Rpb25zXG5cbnZvaWQgZnVuY3Rpb24oc3RyaW5nXywgb2JqZWN0XywgZnVuY3Rpb25fLCBwcm90b3R5cGVfLCB0b1N0cmluZ18sXG4gICAgICAgICAgICAgIEFycmF5LCBPYmplY3QsIEZ1bmN0aW9uLCBGUCwgZ2xvYmFsLCBleHBvcnRzLCB1bmRlZmluZWRfLCB1bmRlZmluZWQpe1xuXG4gIHZhciBnZXRQcm9wZXJ0aWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgICBlczUgPSB0eXBlb2YgZ2V0UHJvcGVydGllcyA9PT0gZnVuY3Rpb25fICYmICEocHJvdG90eXBlXyBpbiBnZXRQcm9wZXJ0aWVzKTtcblxuICB2YXIgY2FsbGJpbmQgPSBGUC5iaW5kXG4gICAgPyBGUC5iaW5kLmJpbmQoRlAuY2FsbClcbiAgICA6IChmdW5jdGlvbihjYWxsKXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGZ1bmMpe1xuICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIGNhbGwuYXBwbHkoZnVuYywgYXJndW1lbnRzKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgICAgfShGUC5jYWxsKSk7XG5cbiAgdmFyIGZ1bmN0aW9uVG9TdHJpbmcgPSBjYWxsYmluZChGUFt0b1N0cmluZ19dKSxcbiAgICAgIG9iamVjdFRvU3RyaW5nID0gY2FsbGJpbmQoe31bdG9TdHJpbmdfXSksXG4gICAgICBudW1iZXJUb1N0cmluZyA9IGNhbGxiaW5kKC4wLnRvU3RyaW5nKSxcbiAgICAgIGNhbGwgPSBjYWxsYmluZChGUC5jYWxsKSxcbiAgICAgIGFwcGx5ID0gY2FsbGJpbmQoRlAuYXBwbHkpLFxuICAgICAgaGFzT3duID0gY2FsbGJpbmQoe30uaGFzT3duUHJvcGVydHkpLFxuICAgICAgcHVzaCA9IGNhbGxiaW5kKFtdLnB1c2gpLFxuICAgICAgc3BsaWNlID0gY2FsbGJpbmQoW10uc3BsaWNlKTtcblxuICB2YXIgbmFtZSA9IGZ1bmN0aW9uKGZ1bmMpe1xuICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gZnVuY3Rpb25fKVxuICAgICAgcmV0dXJuICcnO1xuICAgIGVsc2UgaWYgKCduYW1lJyBpbiBmdW5jKVxuICAgICAgcmV0dXJuIGZ1bmMubmFtZTtcblxuICAgIHJldHVybiBmdW5jdGlvblRvU3RyaW5nKGZ1bmMpLm1hdGNoKC9eXFxuP2Z1bmN0aW9uXFxzPyhcXHcqKT9fP1xcKC8pWzFdO1xuICB9O1xuXG4gIHZhciBjcmVhdGUgPSBlczVcbiAgICA/IE9iamVjdC5jcmVhdGVcbiAgICA6IGZ1bmN0aW9uKHByb3RvLCBkZXNjcyl7XG4gICAgICAgIHZhciBDdG9yID0gZnVuY3Rpb24oKXt9O1xuICAgICAgICBDdG9yW3Byb3RvdHlwZV9dID0gT2JqZWN0KHByb3RvKTtcbiAgICAgICAgdmFyIG9iamVjdCA9IG5ldyBDdG9yO1xuXG4gICAgICAgIGlmIChkZXNjcylcbiAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGVzY3MpXG4gICAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwgZGVzY3Nba10pO1xuXG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICB9O1xuXG5cbiAgZnVuY3Rpb24gSGFzaCgpe31cblxuICBpZiAoZXM1IHx8IHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZvaWQgZnVuY3Rpb24oT2JqZWN0Q3JlYXRlKXtcbiAgICAgIEhhc2gucHJvdG90eXBlID0gT2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgZnVuY3Rpb24gaW5oZXJpdChvYmope1xuICAgICAgICByZXR1cm4gT2JqZWN0Q3JlYXRlKG9iaik7XG4gICAgICB9XG4gICAgICBIYXNoLmluaGVyaXQgPSBpbmhlcml0O1xuICAgIH0oT2JqZWN0LmNyZWF0ZSk7XG4gIH0gZWxzZSB7XG4gICAgdm9pZCBmdW5jdGlvbihGKXtcbiAgICAgIHZhciBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgIGlmcmFtZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChpZnJhbWUpO1xuICAgICAgaWZyYW1lLnNyYyA9ICdqYXZhc2NyaXB0OidcbiAgICAgIEhhc2gucHJvdG90eXBlID0gaWZyYW1lLmNvbnRlbnRXaW5kb3cuT2JqZWN0LnByb3RvdHlwZTtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaWZyYW1lKTtcbiAgICAgIGlmcmFtZSA9IG51bGw7XG5cbiAgICAgIHZhciBwcm9wcyA9IFsnY29uc3RydWN0b3InLCAnaGFzT3duUHJvcGVydHknLCAncHJvcGVydHlJc0VudW1lcmFibGUnLFxuICAgICAgICAgICAgICAgICAgICdpc1Byb3RveXBlT2YnLCAndG9Mb2NhbGVTdHJpbmcnLCAndG9TdHJpbmcnLCAndmFsdWVPZiddO1xuXG4gICAgICBmb3IgKHZhciBpPTA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKylcbiAgICAgICAgZGVsZXRlIEhhc2gucHJvdG90eXBlW3Byb3BzW2ldXTtcblxuICAgICAgZnVuY3Rpb24gaW5oZXJpdChvYmope1xuICAgICAgICBGLnByb3RvdHlwZSA9IG9iajtcbiAgICAgICAgb2JqID0gbmV3IEY7XG4gICAgICAgIEYucHJvdG90eXBlID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgIH1cblxuICAgICAgSGFzaC5pbmhlcml0ID0gaW5oZXJpdDtcbiAgICB9KGZ1bmN0aW9uKCl7fSk7XG4gIH1cblxuICB2YXIgZGVmaW5lUHJvcGVydHkgPSBlczVcbiAgICA/IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuICAgIDogZnVuY3Rpb24ob2JqZWN0LCBrZXksIGRlc2MpIHtcbiAgICAgICAgb2JqZWN0W2tleV0gPSBkZXNjLnZhbHVlO1xuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgfTtcblxuICB2YXIgZGVmaW5lID0gZnVuY3Rpb24ob2JqZWN0LCBrZXksIHZhbHVlKXtcbiAgICBpZiAodHlwZW9mIGtleSA9PT0gZnVuY3Rpb25fKSB7XG4gICAgICB2YWx1ZSA9IGtleTtcbiAgICAgIGtleSA9IG5hbWUodmFsdWUpLnJlcGxhY2UoL18kLywgJycpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwgeyBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gIH07XG5cbiAgdmFyIGlzQXJyYXkgPSBlczVcbiAgICA/IChmdW5jdGlvbihpc0FycmF5KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG8pe1xuICAgICAgICAgIHJldHVybiBpc0FycmF5KG8pIHx8IG8gaW5zdGFuY2VvZiBBcnJheTtcbiAgICAgICAgfTtcbiAgICAgIH0pKEFycmF5LmlzQXJyYXkpXG4gICAgOiBmdW5jdGlvbihvKXtcbiAgICAgICAgcmV0dXJuIG8gaW5zdGFuY2VvZiBBcnJheSB8fCBvYmplY3RUb1N0cmluZyhvKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgIH07XG5cbiAgLy8gIyMjIyMjIyMjIyMjXG4gIC8vICMjIyBEYXRhICMjI1xuICAvLyAjIyMjIyMjIyMjIyNcblxuICB2YXIgYnVpbHRpbldlYWtNYXAgPSAnV2Vha01hcCcgaW4gZ2xvYmFsO1xuXG4gIHZhciBNYXBEYXRhID0gYnVpbHRpbldlYWtNYXBcbiAgICA/IChmdW5jdGlvbigpe1xuICAgICAgdmFyIEJ1aWx0aW5XZWFrTWFwID0gZ2xvYmFsLldlYWtNYXAsXG4gICAgICAgICAgd21nZXQgPSBjYWxsYmluZChCdWlsdGluV2Vha01hcFtwcm90b3R5cGVfXS5nZXQpLFxuICAgICAgICAgIHdtc2V0ID0gY2FsbGJpbmQoQnVpbHRpbldlYWtNYXBbcHJvdG90eXBlX10uc2V0KSxcbiAgICAgICAgICB3bWhhcyA9IGNhbGxiaW5kKEJ1aWx0aW5XZWFrTWFwW3Byb3RvdHlwZV9dLmhhcyk7XG5cbiAgICAgIGZ1bmN0aW9uIE1hcERhdGEobmFtZSl7XG4gICAgICAgIHZhciBtYXAgPSBuZXcgQnVpbHRpbldlYWtNYXA7XG5cbiAgICAgICAgdGhpcy5nZXQgPSBmdW5jdGlvbihvKXtcbiAgICAgICAgICByZXR1cm4gd21nZXQobWFwLCBvKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5zZXQgPSBmdW5jdGlvbihvLCB2KXtcbiAgICAgICAgICB3bXNldChtYXAsIG8sIHYpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgdGhpcy53cmFwID0gZnVuY3Rpb24obywgdil7XG4gICAgICAgICAgICBpZiAod21oYXMobWFwLCBvKSlcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBpcyBhbHJlYWR5IGEgXCIgKyBuYW1lKTtcbiAgICAgICAgICAgIHdtc2V0KG1hcCwgbywgdik7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB0aGlzLnVud3JhcCA9IGZ1bmN0aW9uKG8pe1xuICAgICAgICAgICAgdmFyIHN0b3JhZ2UgPSB3bWdldChtYXAsIG8pO1xuICAgICAgICAgICAgaWYgKCFzdG9yYWdlKVxuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG5hbWUgKyBcIiBpcyBub3QgZ2VuZXJpY1wiKTtcbiAgICAgICAgICAgIHJldHVybiBzdG9yYWdlO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIE1hcERhdGE7XG4gICAgfSkoKVxuICAgIDogKGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgbG9ja2VyID0gJ3JldHVybiBmdW5jdGlvbihrKXtpZihrPT09cylyZXR1cm4gbH0nLFxuICAgICAgICAgIHJhbmRvbSA9IE1hdGgucmFuZG9tLFxuICAgICAgICAgIHVpZHMgPSBuZXcgSGFzaCxcbiAgICAgICAgICBzbGljZSA9IGNhbGxiaW5kKCcnLnNsaWNlKSxcbiAgICAgICAgICBpbmRleE9mID0gY2FsbGJpbmQoW10uaW5kZXhPZik7XG5cbiAgICAgIHZhciBjcmVhdGVVSUQgPSBmdW5jdGlvbigpe1xuICAgICAgICB2YXIga2V5ID0gc2xpY2UobnVtYmVyVG9TdHJpbmcocmFuZG9tKCksIDM2KSwgMik7XG4gICAgICAgIHJldHVybiBrZXkgaW4gdWlkcyA/IGNyZWF0ZVVJRCgpIDogdWlkc1trZXldID0ga2V5O1xuICAgICAgfTtcblxuICAgICAgdmFyIGdsb2JhbElEID0gY3JlYXRlVUlEKCk7XG5cbiAgICAgIC8vIGNvbW1vbiBwZXItb2JqZWN0IHN0b3JhZ2UgYXJlYSBtYWRlIHZpc2libGUgYnkgcGF0Y2hpbmcgZ2V0T3duUHJvcGVydHlOYW1lcydcbiAgICAgIGZ1bmN0aW9uIGdldE93blByb3BlcnR5TmFtZXMob2JqKXtcbiAgICAgICAgdmFyIHByb3BzID0gZ2V0UHJvcGVydGllcyhvYmopO1xuICAgICAgICBpZiAoaGFzT3duKG9iaiwgZ2xvYmFsSUQpKVxuICAgICAgICAgIHNwbGljZShwcm9wcywgaW5kZXhPZihwcm9wcywgZ2xvYmFsSUQpLCAxKTtcbiAgICAgICAgcmV0dXJuIHByb3BzO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXM1KSB7XG4gICAgICAgIC8vIGNoZWNrIGZvciB0aGUgcmFuZG9tIGtleSBvbiBhbiBvYmplY3QsIGNyZWF0ZSBuZXcgc3RvcmFnZSBpZiBtaXNzaW5nLCByZXR1cm4gaXRcbiAgICAgICAgdmFyIHN0b3JhZ2UgPSBmdW5jdGlvbihvYmope1xuICAgICAgICAgIGlmICghaGFzT3duKG9iaiwgZ2xvYmFsSUQpKVxuICAgICAgICAgICAgZGVmaW5lUHJvcGVydHkob2JqLCBnbG9iYWxJRCwgeyB2YWx1ZTogbmV3IEhhc2ggfSk7XG4gICAgICAgICAgcmV0dXJuIG9ialtnbG9iYWxJRF07XG4gICAgICAgIH07XG5cbiAgICAgICAgZGVmaW5lKE9iamVjdCwgZ2V0T3duUHJvcGVydHlOYW1lcyk7XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIHZhciB0b1N0cmluZ1RvU3RyaW5nID0gZnVuY3Rpb24ocyl7XG4gICAgICAgICAgZnVuY3Rpb24gdG9TdHJpbmcoKXsgcmV0dXJuIHMgfVxuICAgICAgICAgIHJldHVybiB0b1N0cmluZ1t0b1N0cmluZ19dID0gdG9TdHJpbmc7XG4gICAgICAgIH0oT2JqZWN0W3Byb3RvdHlwZV9dW3RvU3RyaW5nX10rJycpO1xuXG4gICAgICAgIC8vIHN0b3JlIHRoZSB2YWx1ZXMgb24gYSBjdXN0b20gdmFsdWVPZiBpbiBvcmRlciB0byBoaWRlIHRoZW0gYnV0IHN0b3JlIHRoZW0gbG9jYWxseVxuICAgICAgICB2YXIgc3RvcmFnZSA9IGZ1bmN0aW9uKG9iail7XG4gICAgICAgICAgaWYgKGhhc093bihvYmosIHRvU3RyaW5nXykgJiYgZ2xvYmFsSUQgaW4gb2JqW3RvU3RyaW5nX10pXG4gICAgICAgICAgICByZXR1cm4gb2JqW3RvU3RyaW5nX11bZ2xvYmFsSURdO1xuXG4gICAgICAgICAgaWYgKCEodG9TdHJpbmdfIGluIG9iaikpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBzdG9yZSB2YWx1ZXMgZm9yIFwiK29iaik7XG5cbiAgICAgICAgICB2YXIgb2xkVG9TdHJpbmcgPSBvYmpbdG9TdHJpbmdfXTtcbiAgICAgICAgICBmdW5jdGlvbiB0b1N0cmluZygpeyByZXR1cm4gb2xkVG9TdHJpbmcuY2FsbCh0aGlzKSB9XG4gICAgICAgICAgb2JqW3RvU3RyaW5nX10gPSB0b1N0cmluZztcbiAgICAgICAgICB0b1N0cmluZ1t0b1N0cmluZ19dID0gdG9TdHJpbmdUb1N0cmluZztcbiAgICAgICAgICByZXR1cm4gdG9TdHJpbmdbZ2xvYmFsSURdID0ge307XG4gICAgICAgIH07XG4gICAgICB9XG5cblxuXG4gICAgICAvLyBzaGltIGZvciBbW01hcERhdGFdXSBmcm9tIGVzNiBzcGVjLCBhbmQgcHVsbHMgZG91YmxlIGR1dHkgYXMgV2Vha01hcCBzdG9yYWdlXG4gICAgICBmdW5jdGlvbiBNYXBEYXRhKG5hbWUpe1xuICAgICAgICB2YXIgcHVpZCA9IGNyZWF0ZVVJRCgpLFxuICAgICAgICAgICAgaXVpZCA9IGNyZWF0ZVVJRCgpLFxuICAgICAgICAgICAgc2VjcmV0ID0geyB2YWx1ZTogdW5kZWZpbmVkLCB3cml0YWJsZTogdHJ1ZSB9O1xuXG4gICAgICAgIHZhciBhdHRhY2ggPSBmdW5jdGlvbihvYmope1xuICAgICAgICAgIHZhciBzdG9yZSA9IHN0b3JhZ2Uob2JqKTtcbiAgICAgICAgICBpZiAoaGFzT3duKHN0b3JlLCBwdWlkKSlcbiAgICAgICAgICAgIHJldHVybiBzdG9yZVtwdWlkXShzZWNyZXQpO1xuXG4gICAgICAgICAgdmFyIGxvY2tib3ggPSBuZXcgSGFzaDtcbiAgICAgICAgICBkZWZpbmVQcm9wZXJ0eShsb2NrYm94LCBpdWlkLCBzZWNyZXQpO1xuICAgICAgICAgIGRlZmluZVByb3BlcnR5KHN0b3JlLCBwdWlkLCB7XG4gICAgICAgICAgICB2YWx1ZTogbmV3IEZ1bmN0aW9uKCdzJywgJ2wnLCBsb2NrZXIpKHNlY3JldCwgbG9ja2JveClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbG9ja2JveDtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldCA9IGZ1bmN0aW9uKG8pe1xuICAgICAgICAgIHJldHVybiBhdHRhY2gobylbaXVpZF07XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V0ID0gZnVuY3Rpb24obywgdil7XG4gICAgICAgICAgYXR0YWNoKG8pW2l1aWRdID0gdjtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgIHRoaXMud3JhcCA9IGZ1bmN0aW9uKG8sIHYpe1xuICAgICAgICAgICAgdmFyIGxvY2tib3ggPSBhdHRhY2gobyk7XG4gICAgICAgICAgICBpZiAobG9ja2JveFtpdWlkXSlcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBpcyBhbHJlYWR5IGEgXCIgKyBuYW1lKTtcbiAgICAgICAgICAgIGxvY2tib3hbaXVpZF0gPSB2O1xuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy51bndyYXAgPSBmdW5jdGlvbihvKXtcbiAgICAgICAgICAgIHZhciBzdG9yYWdlID0gYXR0YWNoKG8pW2l1aWRdO1xuICAgICAgICAgICAgaWYgKCFzdG9yYWdlKVxuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG5hbWUgKyBcIiBpcyBub3QgZ2VuZXJpY1wiKTtcbiAgICAgICAgICAgIHJldHVybiBzdG9yYWdlO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIE1hcERhdGE7XG4gICAgfSgpKTtcblxuICB2YXIgZXhwb3J0ZXIgPSAoZnVuY3Rpb24oKXtcbiAgICAvLyBbbmF0aXZlIGNvZGVdIGxvb2tzIHNsaWdodGx5IGRpZmZlcmVudCBpbiBlYWNoIGVuZ2luZVxuICAgIHZhciBzcmMgPSAoJycrT2JqZWN0KS5zcGxpdCgnT2JqZWN0Jyk7XG5cbiAgICAvLyBmYWtlIFtuYXRpdmUgY29kZV1cbiAgICBmdW5jdGlvbiB0b1N0cmluZygpe1xuICAgICAgcmV0dXJuIHNyY1swXSArIG5hbWUodGhpcykgKyBzcmNbMV07XG4gICAgfVxuXG4gICAgZGVmaW5lKHRvU3RyaW5nLCB0b1N0cmluZyk7XG5cbiAgICAvLyBhdHRlbXB0IHRvIHVzZSBfX3Byb3RvX18gc28gdGhlIG1ldGhvZHMgZG9uJ3QgYWxsIGhhdmUgYW4gb3duIHRvU3RyaW5nXG4gICAgdmFyIHByZXBGdW5jdGlvbiA9IHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXlcbiAgICAgID8gZnVuY3Rpb24oZnVuYyl7IGZ1bmMuX19wcm90b19fID0gdG9TdHJpbmcgfVxuICAgICAgOiBmdW5jdGlvbihmdW5jKXsgZGVmaW5lKGZ1bmMsIHRvU3RyaW5nKSB9O1xuXG4gICAgLy8gYXNzZW1ibGUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zIGludG8gYSBmdWxseSBmb3JtZWQgY2xhc3NcbiAgICB2YXIgcHJlcGFyZSA9IGZ1bmN0aW9uKG1ldGhvZHMpe1xuICAgICAgdmFyIEN0b3IgPSBtZXRob2RzLnNoaWZ0KCksXG4gICAgICAgICAgYnJhbmQgPSAnW29iamVjdCAnICsgbmFtZShDdG9yKSArICddJztcblxuICAgICAgZnVuY3Rpb24gdG9TdHJpbmcoKXsgcmV0dXJuIGJyYW5kIH1cbiAgICAgIG1ldGhvZHMucHVzaCh0b1N0cmluZyk7XG4gICAgICBwcmVwRnVuY3Rpb24oQ3Rvcik7XG5cbiAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcHJlcEZ1bmN0aW9uKG1ldGhvZHNbaV0pO1xuICAgICAgICBkZWZpbmUoQ3Rvcltwcm90b3R5cGVfXSwgbWV0aG9kc1tpXSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBDdG9yO1xuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24obmFtZSwgaW5pdCl7XG4gICAgICBpZiAobmFtZSBpbiBleHBvcnRzKVxuICAgICAgICByZXR1cm4gZXhwb3J0c1tuYW1lXTtcblxuICAgICAgdmFyIGRhdGEgPSBuZXcgTWFwRGF0YShuYW1lKTtcblxuICAgICAgcmV0dXJuIGV4cG9ydHNbbmFtZV0gPSBwcmVwYXJlKGluaXQoXG4gICAgICAgIGZ1bmN0aW9uKGNvbGxlY3Rpb24sIHZhbHVlKXtcbiAgICAgICAgICBkYXRhLndyYXAoY29sbGVjdGlvbiwgdmFsdWUpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbihjb2xsZWN0aW9uKXtcbiAgICAgICAgICByZXR1cm4gZGF0YS51bndyYXAoY29sbGVjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgIH07XG4gIH0oKSk7XG5cblxuICAvLyBpbml0aWFsaXplIGNvbGxlY3Rpb24gd2l0aCBhbiBpdGVyYWJsZSwgY3VycmVudGx5IG9ubHkgc3VwcG9ydHMgZm9yRWFjaCBmdW5jdGlvblxuICB2YXIgaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGl0ZXJhYmxlLCBjYWxsYmFjayl7XG4gICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIHR5cGVvZiBpdGVyYWJsZSA9PT0gb2JqZWN0XyAmJiB0eXBlb2YgaXRlcmFibGUuZm9yRWFjaCA9PT0gZnVuY3Rpb25fKSB7XG4gICAgICBpdGVyYWJsZS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGkpe1xuICAgICAgICBpZiAoaXNBcnJheShpdGVtKSAmJiBpdGVtLmxlbmd0aCA9PT0gMilcbiAgICAgICAgICBjYWxsYmFjayhpdGVyYWJsZVtpXVswXSwgaXRlcmFibGVbaV1bMV0pO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2soaXRlcmFibGVbaV0sIGkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gYXR0ZW1wdCB0byBmaXggdGhlIG5hbWUgb2YgXCJkZWxldGVfXCIgbWV0aG9kcywgc2hvdWxkIHdvcmsgaW4gVjggYW5kIHNwaWRlcm1vbmtleVxuICB2YXIgZml4RGVsZXRlID0gZnVuY3Rpb24oZnVuYywgc2NvcGVOYW1lcywgc2NvcGVWYWx1ZXMpe1xuICAgIHRyeSB7XG4gICAgICBzY29wZU5hbWVzW3Njb3BlTmFtZXMubGVuZ3RoXSA9ICgncmV0dXJuICcrZnVuYykucmVwbGFjZSgnZV8nLCAnXFxcXHUwMDY1Jyk7XG4gICAgICByZXR1cm4gRnVuY3Rpb24uYXBwbHkoMCwgc2NvcGVOYW1lcykuYXBwbHkoMCwgc2NvcGVWYWx1ZXMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmdW5jO1xuICAgIH1cbiAgfVxuXG4gIHZhciBXTSwgSE0sIE07XG5cbiAgLy8gIyMjIyMjIyMjIyMjIyMjXG4gIC8vICMjIyBXZWFrTWFwICMjI1xuICAvLyAjIyMjIyMjIyMjIyMjIyNcblxuICBXTSA9IGJ1aWx0aW5XZWFrTWFwID8gKGV4cG9ydHMuV2Vha01hcCA9IGdsb2JhbC5XZWFrTWFwKSA6IGV4cG9ydGVyKCdXZWFrTWFwJywgZnVuY3Rpb24od3JhcCwgdW53cmFwKXtcbiAgICB2YXIgcHJvdG90eXBlID0gV2Vha01hcFtwcm90b3R5cGVfXTtcbiAgICB2YXIgdmFsaWRhdGUgPSBmdW5jdGlvbihrZXkpe1xuICAgICAgaWYgKGtleSA9PSBudWxsIHx8IHR5cGVvZiBrZXkgIT09IG9iamVjdF8gJiYgdHlwZW9mIGtleSAhPT0gZnVuY3Rpb25fKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBXZWFrTWFwIGtleVwiKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQGNsYXNzICAgICAgICBXZWFrTWFwXG4gICAgICogQGRlc2NyaXB0aW9uICBDb2xsZWN0aW9uIHVzaW5nIG9iamVjdHMgd2l0aCB1bmlxdWUgaWRlbnRpdGllcyBhcyBrZXlzIHRoYXQgZGlzYWxsb3dzIGVudW1lcmF0aW9uXG4gICAgICogICAgICAgICAgICAgICBhbmQgYWxsb3dzIGZvciBiZXR0ZXIgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICAgICAqIEBwYXJhbSAgICAgICAge0l0ZXJhYmxlfSBbaXRlcmFibGVdICBBbiBpdGVtIHRvIHBvcHVsYXRlIHRoZSBjb2xsZWN0aW9uIHdpdGguXG4gICAgICovXG4gICAgZnVuY3Rpb24gV2Vha01hcChpdGVyYWJsZSl7XG4gICAgICBpZiAodGhpcyA9PT0gZ2xvYmFsIHx8IHRoaXMgPT0gbnVsbCB8fCB0aGlzID09PSBwcm90b3R5cGUpXG4gICAgICAgIHJldHVybiBuZXcgV2Vha01hcChpdGVyYWJsZSk7XG5cbiAgICAgIHdyYXAodGhpcywgbmV3IE1hcERhdGEpO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBpdGVyYWJsZSAmJiBpbml0aWFsaXplKGl0ZXJhYmxlLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgICAgY2FsbChzZXQsIHNlbGYsIHZhbHVlLCBrZXkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgICAgICAgPGdldD5cbiAgICAgKiBAZGVzY3JpcHRpb24gIFJldHJpZXZlIHRoZSB2YWx1ZSBpbiB0aGUgY29sbGVjdGlvbiB0aGF0IG1hdGNoZXMga2V5XG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSBrZXlcbiAgICAgKiBAcmV0dXJuICAgICAgIHtBbnl9XG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0KGtleSl7XG4gICAgICB2YWxpZGF0ZShrZXkpO1xuICAgICAgdmFyIHZhbHVlID0gdW53cmFwKHRoaXMpLmdldChrZXkpO1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWRfID8gdW5kZWZpbmVkIDogdmFsdWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgICAgICAgPHNldD5cbiAgICAgKiBAZGVzY3JpcHRpb24gIEFkZCBvciB1cGRhdGUgYSBwYWlyIGluIHRoZSBjb2xsZWN0aW9uLiBFbmZvcmNlcyB1bmlxdWVuZXNzIGJ5IG92ZXJ3cml0aW5nLlxuICAgICAqIEBwYXJhbSAgICAgICAge0FueX0ga2V5XG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSB2YWxcbiAgICAgKiovXG4gICAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpe1xuICAgICAgdmFsaWRhdGUoa2V5KTtcbiAgICAgIC8vIHN0b3JlIGEgdG9rZW4gZm9yIGV4cGxpY2l0IHVuZGVmaW5lZCBzbyB0aGF0IFwiaGFzXCIgd29ya3MgY29ycmVjdGx5XG4gICAgICB1bndyYXAodGhpcykuc2V0KGtleSwgdmFsdWUgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZF8gOiB2YWx1ZSk7XG4gICAgfVxuICAgIC8qXG4gICAgICogQG1ldGhvZCAgICAgICA8aGFzPlxuICAgICAqIEBkZXNjcmlwdGlvbiAgQ2hlY2sgaWYga2V5IGlzIGluIHRoZSBjb2xsZWN0aW9uXG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSBrZXlcbiAgICAgKiBAcmV0dXJuICAgICAgIHtCb29sZWFufVxuICAgICAqKi9cbiAgICBmdW5jdGlvbiBoYXMoa2V5KXtcbiAgICAgIHZhbGlkYXRlKGtleSk7XG4gICAgICByZXR1cm4gdW53cmFwKHRoaXMpLmdldChrZXkpICE9PSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgICAgICAgPGRlbGV0ZT5cbiAgICAgKiBAZGVzY3JpcHRpb24gIFJlbW92ZSBrZXkgYW5kIG1hdGNoaW5nIHZhbHVlIGlmIGZvdW5kXG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSBrZXlcbiAgICAgKiBAcmV0dXJuICAgICAgIHtCb29sZWFufSB0cnVlIGlmIGl0ZW0gd2FzIGluIGNvbGxlY3Rpb25cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWxldGVfKGtleSl7XG4gICAgICB2YWxpZGF0ZShrZXkpO1xuICAgICAgdmFyIGRhdGEgPSB1bndyYXAodGhpcyk7XG5cbiAgICAgIGlmIChkYXRhLmdldChrZXkpID09PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgZGF0YS5zZXQoa2V5LCB1bmRlZmluZWQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZGVsZXRlXyA9IGZpeERlbGV0ZShkZWxldGVfLCBbJ3ZhbGlkYXRlJywgJ3Vud3JhcCddLCBbdmFsaWRhdGUsIHVud3JhcF0pO1xuICAgIHJldHVybiBbV2Vha01hcCwgZ2V0LCBzZXQsIGhhcywgZGVsZXRlX107XG4gIH0pO1xuXG5cbiAgLy8gIyMjIyMjIyMjIyMjIyMjXG4gIC8vICMjIyBIYXNoTWFwICMjI1xuICAvLyAjIyMjIyMjIyMjIyMjIyNcblxuICBITSA9IGV4cG9ydGVyKCdIYXNoTWFwJywgZnVuY3Rpb24od3JhcCwgdW53cmFwKXtcbiAgICAvLyBzZXBhcmF0ZSBudW1iZXJzLCBzdHJpbmdzLCBhbmQgYXRvbXMgdG8gY29tcGVuc2F0ZSBmb3Iga2V5IGNvZXJjaW9uIHRvIHN0cmluZ1xuXG4gICAgdmFyIHByb3RvdHlwZSA9IEhhc2hNYXBbcHJvdG90eXBlX10sXG4gICAgICAgIFNUUklORyA9IDAsIE5VTUJFUiA9IDEsIE9USEVSID0gMixcbiAgICAgICAgb3RoZXJzID0geyAndHJ1ZSc6IHRydWUsICdmYWxzZSc6IGZhbHNlLCAnbnVsbCc6IG51bGwsIDA6IC0wIH07XG5cbiAgICB2YXIgcHJvdG8gPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKTtcblxuICAgIHZhciBjb2VyY2UgPSBmdW5jdGlvbihrZXkpe1xuICAgICAgcmV0dXJuIGtleSA9PT0gJ19fcHJvdG9fXycgPyBwcm90byA6IGtleTtcbiAgICB9O1xuXG4gICAgdmFyIHVuY29lcmNlID0gZnVuY3Rpb24odHlwZSwga2V5KXtcbiAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFNUUklORzogcmV0dXJuIGtleSA9PT0gcHJvdG8gPyAnX19wcm90b19fJyA6IGtleTtcbiAgICAgICAgY2FzZSBOVU1CRVI6IHJldHVybiAra2V5O1xuICAgICAgICBjYXNlIE9USEVSOiByZXR1cm4gb3RoZXJzW2tleV07XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICB2YXIgdmFsaWRhdGUgPSBmdW5jdGlvbihrZXkpe1xuICAgICAgaWYgKGtleSA9PSBudWxsKSByZXR1cm4gT1RIRVI7XG4gICAgICBzd2l0Y2ggKHR5cGVvZiBrZXkpIHtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6IHJldHVybiBPVEhFUjtcbiAgICAgICAgY2FzZSBzdHJpbmdfOiByZXR1cm4gU1RSSU5HO1xuICAgICAgICAvLyBuZWdhdGl2ZSB6ZXJvIGhhcyB0byBiZSBleHBsaWNpdGx5IGFjY291bnRlZCBmb3JcbiAgICAgICAgY2FzZSAnbnVtYmVyJzogcmV0dXJuIGtleSA9PT0gMCAmJiBJbmZpbml0eSAvIGtleSA9PT0gLUluZmluaXR5ID8gT1RIRVIgOiBOVU1CRVI7XG4gICAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIEhhc2hNYXAga2V5XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBjbGFzcyAgICAgICAgICBIYXNoTWFwXG4gICAgICogQGRlc2NyaXB0aW9uICAgIENvbGxlY3Rpb24gdGhhdCBvbmx5IGFsbG93cyBwcmltaXRpdmVzIHRvIGJlIGtleXMuXG4gICAgICogQHBhcmFtICAgICAgICAgIHtJdGVyYWJsZX0gW2l0ZXJhYmxlXSAgQW4gaXRlbSB0byBwb3B1bGF0ZSB0aGUgY29sbGVjdGlvbiB3aXRoLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIEhhc2hNYXAoaXRlcmFibGUpe1xuICAgICAgaWYgKHRoaXMgPT09IGdsb2JhbCB8fCB0aGlzID09IG51bGwgfHwgdGhpcyA9PT0gcHJvdG90eXBlKVxuICAgICAgICByZXR1cm4gbmV3IEhhc2hNYXAoaXRlcmFibGUpO1xuXG4gICAgICB3cmFwKHRoaXMsIHtcbiAgICAgICAgc2l6ZTogMCxcbiAgICAgICAgMDogbmV3IEhhc2gsXG4gICAgICAgIDE6IG5ldyBIYXNoLFxuICAgICAgICAyOiBuZXcgSGFzaFxuICAgICAgfSk7XG5cbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIGl0ZXJhYmxlICYmIGluaXRpYWxpemUoaXRlcmFibGUsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpe1xuICAgICAgICBjYWxsKHNldCwgc2VsZiwgdmFsdWUsIGtleSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQG1ldGhvZCAgICAgICA8Z2V0PlxuICAgICAqIEBkZXNjcmlwdGlvbiAgUmV0cmlldmUgdGhlIHZhbHVlIGluIHRoZSBjb2xsZWN0aW9uIHRoYXQgbWF0Y2hlcyBrZXlcbiAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IGtleVxuICAgICAqIEByZXR1cm4gICAgICAge0FueX1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXQoa2V5KXtcbiAgICAgIHJldHVybiB1bndyYXAodGhpcylbdmFsaWRhdGUoa2V5KV1bY29lcmNlKGtleSldO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAbWV0aG9kICAgICAgIDxzZXQ+XG4gICAgICogQGRlc2NyaXB0aW9uICBBZGQgb3IgdXBkYXRlIGEgcGFpciBpbiB0aGUgY29sbGVjdGlvbi4gRW5mb3JjZXMgdW5pcXVlbmVzcyBieSBvdmVyd3JpdGluZy5cbiAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IGtleVxuICAgICAqIEBwYXJhbSAgICAgICAge0FueX0gdmFsXG4gICAgICoqL1xuICAgIGZ1bmN0aW9uIHNldChrZXksIHZhbHVlKXtcbiAgICAgIHZhciBpdGVtcyA9IHVud3JhcCh0aGlzKSxcbiAgICAgICAgICBkYXRhID0gaXRlbXNbdmFsaWRhdGUoa2V5KV07XG5cbiAgICAgIGtleSA9IGNvZXJjZShrZXkpO1xuICAgICAga2V5IGluIGRhdGEgfHwgaXRlbXMuc2l6ZSsrO1xuICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgICAgICAgPGhhcz5cbiAgICAgKiBAZGVzY3JpcHRpb24gIENoZWNrIGlmIGtleSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSBrZXlcbiAgICAgKiBAcmV0dXJuICAgICAgIHtCb29sZWFufSBpcyBpbiBjb2xsZWN0aW9uXG4gICAgICoqL1xuICAgIGZ1bmN0aW9uIGhhcyhrZXkpe1xuICAgICAgcmV0dXJuIGNvZXJjZShrZXkpIGluIHVud3JhcCh0aGlzKVt2YWxpZGF0ZShrZXkpXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQG1ldGhvZCAgICAgICA8ZGVsZXRlPlxuICAgICAqIEBkZXNjcmlwdGlvbiAgUmVtb3ZlIGtleSBhbmQgbWF0Y2hpbmcgdmFsdWUgaWYgZm91bmRcbiAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IGtleVxuICAgICAqIEByZXR1cm4gICAgICAge0Jvb2xlYW59IHRydWUgaWYgaXRlbSB3YXMgaW4gY29sbGVjdGlvblxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRlbGV0ZV8oa2V5KXtcbiAgICAgIHZhciBpdGVtcyA9IHVud3JhcCh0aGlzKSxcbiAgICAgICAgICBkYXRhID0gaXRlbXNbdmFsaWRhdGUoa2V5KV07XG5cbiAgICAgIGtleSA9IGNvZXJjZShrZXkpO1xuICAgICAgaWYgKGtleSBpbiBkYXRhKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICAgIGl0ZW1zLnNpemUtLTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQG1ldGhvZCAgICAgICA8c2l6ZT5cbiAgICAgKiBAZGVzY3JpcHRpb24gIFJldHJpZXZlIHRoZSBhbW91bnQgb2YgaXRlbXMgaW4gdGhlIGNvbGxlY3Rpb25cbiAgICAgKiBAcmV0dXJuICAgICAgIHtOdW1iZXJ9XG4gICAgICovXG4gICAgZnVuY3Rpb24gc2l6ZSgpe1xuICAgICAgcmV0dXJuIHVud3JhcCh0aGlzKS5zaXplO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAbWV0aG9kICAgICAgIDxmb3JFYWNoPlxuICAgICAqIEBkZXNjcmlwdGlvbiAgTG9vcCB0aHJvdWdoIHRoZSBjb2xsZWN0aW9uIHJhaXNpbmcgY2FsbGJhY2sgZm9yIGVhY2hcbiAgICAgKiBAcGFyYW0gICAgICAgIHtGdW5jdGlvbn0gY2FsbGJhY2sgIGBjYWxsYmFjayh2YWx1ZSwga2V5KWBcbiAgICAgKiBAcGFyYW0gICAgICAgIHtPYmplY3R9ICAgY29udGV4dCAgICBUaGUgYHRoaXNgIGJpbmRpbmcgZm9yIGNhbGxiYWNrcywgZGVmYXVsdCBudWxsXG4gICAgICovXG4gICAgZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFjaywgY29udGV4dCl7XG4gICAgICB2YXIgZGF0YSA9IHVud3JhcCh0aGlzKTtcbiAgICAgIGNvbnRleHQgPSBjb250ZXh0ID09IG51bGwgPyBnbG9iYWwgOiBjb250ZXh0O1xuICAgICAgZm9yICh2YXIgaT0wOyBpIDwgMzsgaSsrKVxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YVtpXSlcbiAgICAgICAgICBjYWxsKGNhbGxiYWNrLCBjb250ZXh0LCBkYXRhW2ldW2tleV0sIHVuY29lcmNlKGksIGtleSksIHRoaXMpO1xuICAgIH1cblxuICAgIGRlbGV0ZV8gPSBmaXhEZWxldGUoZGVsZXRlXywgWyd2YWxpZGF0ZScsICd1bndyYXAnLCAnY29lcmNlJ10sIFt2YWxpZGF0ZSwgdW53cmFwLCBjb2VyY2VdKTtcbiAgICByZXR1cm4gW0hhc2hNYXAsIGdldCwgc2V0LCBoYXMsIGRlbGV0ZV8sIHNpemUsIGZvckVhY2hdO1xuICB9KTtcblxuXG4gIC8vICMjIyMjIyMjIyMjXG4gIC8vICMjIyBNYXAgIyMjXG4gIC8vICMjIyMjIyMjIyMjXG5cbiAgLy8gaWYgYSBmdWxseSBpbXBsZW1lbnRlZCBNYXAgZXhpc3RzIHRoZW4gdXNlIGl0XG4gIGlmICgnTWFwJyBpbiBnbG9iYWwgJiYgJ2ZvckVhY2gnIGluIGdsb2JhbC5NYXAucHJvdG90eXBlKSB7XG4gICAgTSA9IGV4cG9ydHMuTWFwID0gZ2xvYmFsLk1hcDtcbiAgfSBlbHNlIHtcbiAgICBNID0gZXhwb3J0ZXIoJ01hcCcsIGZ1bmN0aW9uKHdyYXAsIHVud3JhcCl7XG4gICAgICAvLyBhdHRlbXB0IHRvIHVzZSBhbiBleGlzdGluZyBwYXJ0aWFsbHkgaW1wbGVtZW50ZWQgTWFwXG4gICAgICB2YXIgQnVpbHRpbk1hcCA9IGdsb2JhbC5NYXAsXG4gICAgICAgICAgcHJvdG90eXBlID0gTWFwW3Byb3RvdHlwZV9dLFxuICAgICAgICAgIHdtID0gV01bcHJvdG90eXBlX10sXG4gICAgICAgICAgaG0gPSAoQnVpbHRpbk1hcCB8fCBITSlbcHJvdG90eXBlX10sXG4gICAgICAgICAgbWdldCAgICA9IFtjYWxsYmluZChobS5nZXQpLCBjYWxsYmluZCh3bS5nZXQpXSxcbiAgICAgICAgICBtc2V0ICAgID0gW2NhbGxiaW5kKGhtLnNldCksIGNhbGxiaW5kKHdtLnNldCldLFxuICAgICAgICAgIG1oYXMgICAgPSBbY2FsbGJpbmQoaG0uaGFzKSwgY2FsbGJpbmQod20uaGFzKV0sXG4gICAgICAgICAgbWRlbGV0ZSA9IFtjYWxsYmluZChobVsnZGVsZXRlJ10pLCBjYWxsYmluZCh3bVsnZGVsZXRlJ10pXTtcblxuICAgICAgdmFyIHR5cGUgPSBCdWlsdGluTWFwXG4gICAgICAgID8gZnVuY3Rpb24oKXsgcmV0dXJuIDAgfVxuICAgICAgICA6IGZ1bmN0aW9uKG8peyByZXR1cm4gKyh0eXBlb2YgbyA9PT0gb2JqZWN0XyA/IG8gIT09IG51bGwgOiB0eXBlb2YgbyA9PT0gZnVuY3Rpb25fKSB9XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgYSBidWlsdGluIE1hcCB3ZSBjYW4gbGV0IGl0IGRvIG1vc3Qgb2YgdGhlIGhlYXZ5IGxpZnRpbmdcbiAgICAgIHZhciBpbml0ID0gQnVpbHRpbk1hcFxuICAgICAgICA/IGZ1bmN0aW9uKCl7IHJldHVybiB7IDA6IG5ldyBCdWlsdGluTWFwIH0gfVxuICAgICAgICA6IGZ1bmN0aW9uKCl7IHJldHVybiB7IDA6IG5ldyBITSwgMTogbmV3IFdNIH0gfTtcblxuICAgICAgLyoqXG4gICAgICAgKiBAY2xhc3MgICAgICAgICBNYXBcbiAgICAgICAqIEBkZXNjcmlwdGlvbiAgIENvbGxlY3Rpb24gdGhhdCBhbGxvd3MgYW55IGtpbmQgb2YgdmFsdWUgdG8gYmUgYSBrZXkuXG4gICAgICAgKiBAcGFyYW0gICAgICAgICB7SXRlcmFibGV9IFtpdGVyYWJsZV0gIEFuIGl0ZW0gdG8gcG9wdWxhdGUgdGhlIGNvbGxlY3Rpb24gd2l0aC5cbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gTWFwKGl0ZXJhYmxlKXtcbiAgICAgICAgaWYgKHRoaXMgPT09IGdsb2JhbCB8fCB0aGlzID09IG51bGwgfHwgdGhpcyA9PT0gcHJvdG90eXBlKVxuICAgICAgICAgIHJldHVybiBuZXcgTWFwKGl0ZXJhYmxlKTtcblxuICAgICAgICB2YXIgZGF0YSA9IGluaXQoKTtcbiAgICAgICAgZGF0YS5rZXlzID0gW107XG4gICAgICAgIGRhdGEudmFsdWVzID0gW107XG4gICAgICAgIHdyYXAodGhpcywgZGF0YSk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBpdGVyYWJsZSAmJiBpbml0aWFsaXplKGl0ZXJhYmxlLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgICAgICBjYWxsKHNldCwgc2VsZiwgdmFsdWUsIGtleSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBAbWV0aG9kICAgICAgIDxnZXQ+XG4gICAgICAgKiBAZGVzY3JpcHRpb24gIFJldHJpZXZlIHRoZSB2YWx1ZSBpbiB0aGUgY29sbGVjdGlvbiB0aGF0IG1hdGNoZXMga2V5XG4gICAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IGtleVxuICAgICAgICogQHJldHVybiAgICAgICB7QW55fVxuICAgICAgICovXG4gICAgICBmdW5jdGlvbiBnZXQoa2V5KXtcbiAgICAgICAgdmFyIGRhdGEgPSB1bndyYXAodGhpcyksXG4gICAgICAgICAgICB0ID0gdHlwZShrZXkpO1xuICAgICAgICByZXR1cm4gZGF0YS52YWx1ZXNbbWdldFt0XShkYXRhW3RdLCBrZXkpXTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQG1ldGhvZCAgICAgICA8c2V0PlxuICAgICAgICogQGRlc2NyaXB0aW9uICBBZGQgb3IgdXBkYXRlIGEgcGFpciBpbiB0aGUgY29sbGVjdGlvbi4gRW5mb3JjZXMgdW5pcXVlbmVzcyBieSBvdmVyd3JpdGluZy5cbiAgICAgICAqIEBwYXJhbSAgICAgICAge0FueX0ga2V5XG4gICAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IHZhbFxuICAgICAgICoqL1xuICAgICAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpe1xuICAgICAgICB2YXIgZGF0YSA9IHVud3JhcCh0aGlzKSxcbiAgICAgICAgICAgIHQgPSB0eXBlKGtleSksXG4gICAgICAgICAgICBpbmRleCA9IG1nZXRbdF0oZGF0YVt0XSwga2V5KTtcblxuICAgICAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG1zZXRbdF0oZGF0YVt0XSwga2V5LCBkYXRhLmtleXMubGVuZ3RoKTtcbiAgICAgICAgICBwdXNoKGRhdGEua2V5cywga2V5KTtcbiAgICAgICAgICBwdXNoKGRhdGEudmFsdWVzLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGF0YS5rZXlzW2luZGV4XSA9IGtleTtcbiAgICAgICAgICBkYXRhLnZhbHVlc1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBAbWV0aG9kICAgICAgIDxoYXM+XG4gICAgICAgKiBAZGVzY3JpcHRpb24gIENoZWNrIGlmIGtleSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICAgKiBAcGFyYW0gICAgICAgIHtBbnl9IGtleVxuICAgICAgICogQHJldHVybiAgICAgICB7Qm9vbGVhbn0gaXMgaW4gY29sbGVjdGlvblxuICAgICAgICoqL1xuICAgICAgZnVuY3Rpb24gaGFzKGtleSl7XG4gICAgICAgIHZhciB0ID0gdHlwZShrZXkpO1xuICAgICAgICByZXR1cm4gbWhhc1t0XSh1bndyYXAodGhpcylbdF0sIGtleSk7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEBtZXRob2QgICAgICAgPGRlbGV0ZT5cbiAgICAgICAqIEBkZXNjcmlwdGlvbiAgUmVtb3ZlIGtleSBhbmQgbWF0Y2hpbmcgdmFsdWUgaWYgZm91bmRcbiAgICAgICAqIEBwYXJhbSAgICAgICAge0FueX0ga2V5XG4gICAgICAgKiBAcmV0dXJuICAgICAgIHtCb29sZWFufSB0cnVlIGlmIGl0ZW0gd2FzIGluIGNvbGxlY3Rpb25cbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gZGVsZXRlXyhrZXkpe1xuICAgICAgICB2YXIgZGF0YSA9IHVud3JhcCh0aGlzKSxcbiAgICAgICAgICAgIHQgPSB0eXBlKGtleSksXG4gICAgICAgICAgICBpbmRleCA9IG1nZXRbdF0oZGF0YVt0XSwga2V5KTtcblxuICAgICAgICBpZiAoaW5kZXggPT09IHVuZGVmaW5lZClcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgbWRlbGV0ZVt0XShkYXRhW3RdLCBrZXkpO1xuICAgICAgICBzcGxpY2UoZGF0YS5rZXlzLCBpbmRleCwgMSk7XG4gICAgICAgIHNwbGljZShkYXRhLnZhbHVlcywgaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQG1ldGhvZCAgICAgICA8c2l6ZT5cbiAgICAgICAqIEBkZXNjcmlwdGlvbiAgUmV0cmlldmUgdGhlIGFtb3VudCBvZiBpdGVtcyBpbiB0aGUgY29sbGVjdGlvblxuICAgICAgICogQHJldHVybiAgICAgICB7TnVtYmVyfVxuICAgICAgICovXG4gICAgICBmdW5jdGlvbiBzaXplKCl7XG4gICAgICAgIHJldHVybiB1bndyYXAodGhpcykua2V5cy5sZW5ndGg7XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEBtZXRob2QgICAgICAgPGZvckVhY2g+XG4gICAgICAgKiBAZGVzY3JpcHRpb24gIExvb3AgdGhyb3VnaCB0aGUgY29sbGVjdGlvbiByYWlzaW5nIGNhbGxiYWNrIGZvciBlYWNoXG4gICAgICAgKiBAcGFyYW0gICAgICAgIHtGdW5jdGlvbn0gY2FsbGJhY2sgIGBjYWxsYmFjayh2YWx1ZSwga2V5KWBcbiAgICAgICAqIEBwYXJhbSAgICAgICAge09iamVjdH0gICBjb250ZXh0ICAgIFRoZSBgdGhpc2AgYmluZGluZyBmb3IgY2FsbGJhY2tzLCBkZWZhdWx0IG51bGxcbiAgICAgICAqL1xuICAgICAgZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFjaywgY29udGV4dCl7XG4gICAgICAgIHZhciBkYXRhID0gdW53cmFwKHRoaXMpLFxuICAgICAgICAgICAga2V5cyA9IGRhdGEua2V5cyxcbiAgICAgICAgICAgIHZhbHVlcyA9IGRhdGEudmFsdWVzO1xuXG4gICAgICAgIGNvbnRleHQgPSBjb250ZXh0ID09IG51bGwgPyBnbG9iYWwgOiBjb250ZXh0O1xuXG4gICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgY2FsbChjYWxsYmFjaywgY29udGV4dCwgdmFsdWVzW2ldLCBrZXlzW2ldLCB0aGlzKTtcbiAgICAgIH1cblxuICAgICAgZGVsZXRlXyA9IGZpeERlbGV0ZShkZWxldGVfLFxuICAgICAgICBbJ3R5cGUnLCAndW53cmFwJywgJ2NhbGwnLCAnc3BsaWNlJ10sXG4gICAgICAgIFt0eXBlLCB1bndyYXAsIGNhbGwsIHNwbGljZV1cbiAgICAgICk7XG4gICAgICByZXR1cm4gW01hcCwgZ2V0LCBzZXQsIGhhcywgZGVsZXRlXywgc2l6ZSwgZm9yRWFjaF07XG4gICAgfSk7XG4gIH1cblxuXG4gIC8vICMjIyMjIyMjIyMjXG4gIC8vICMjIyBTZXQgIyMjXG4gIC8vICMjIyMjIyMjIyMjXG5cbiAgZXhwb3J0ZXIoJ1NldCcsIGZ1bmN0aW9uKHdyYXAsIHVud3JhcCl7XG4gICAgdmFyIHByb3RvdHlwZSA9IFNldFtwcm90b3R5cGVfXSxcbiAgICAgICAgbSA9IE1bcHJvdG90eXBlX10sXG4gICAgICAgIG1zaXplID0gY2FsbGJpbmQobS5zaXplKSxcbiAgICAgICAgbWZvckVhY2ggPSBjYWxsYmluZChtLmZvckVhY2gpLFxuICAgICAgICBtZ2V0ID0gY2FsbGJpbmQobS5nZXQpLFxuICAgICAgICBtc2V0ID0gY2FsbGJpbmQobS5zZXQpLFxuICAgICAgICBtaGFzID0gY2FsbGJpbmQobS5oYXMpLFxuICAgICAgICBtZGVsZXRlID0gY2FsbGJpbmQobVsnZGVsZXRlJ10pO1xuXG4gICAgLyoqXG4gICAgICogQGNsYXNzICAgICAgICBTZXRcbiAgICAgKiBAZGVzY3JpcHRpb24gIENvbGxlY3Rpb24gb2YgdmFsdWVzIHRoYXQgZW5mb3JjZXMgdW5pcXVlbmVzcy5cbiAgICAgKiBAcGFyYW0gICAgICAgIHtJdGVyYWJsZX0gW2l0ZXJhYmxlXSAgQW4gaXRlbSB0byBwb3B1bGF0ZSB0aGUgY29sbGVjdGlvbiB3aXRoLlxuICAgICAqKi9cbiAgICBmdW5jdGlvbiBTZXQoaXRlcmFibGUpe1xuICAgICAgaWYgKHRoaXMgPT09IGdsb2JhbCB8fCB0aGlzID09IG51bGwgfHwgdGhpcyA9PT0gcHJvdG90eXBlKVxuICAgICAgICByZXR1cm4gbmV3IFNldChpdGVyYWJsZSk7XG5cbiAgICAgIHdyYXAodGhpcywgbmV3IE0pO1xuXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBpdGVyYWJsZSAmJiBpbml0aWFsaXplKGl0ZXJhYmxlLCBmdW5jdGlvbih2YWx1ZSwga2V5KXtcbiAgICAgICAgY2FsbChhZGQsIHNlbGYsIGtleSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQG1ldGhvZCAgICAgICA8YWRkPlxuICAgICAqIEBkZXNjcmlwdGlvbiAgSW5zZXJ0IHZhbHVlIGlmIG5vdCBmb3VuZCwgZW5mb3JjaW5nIHVuaXF1ZW5lc3MuXG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSB2YWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBhZGQoa2V5KXtcbiAgICAgIG1zZXQodW53cmFwKHRoaXMpLCBrZXksIGtleSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBtZXRob2QgICAgICAgPGhhcz5cbiAgICAgKiBAZGVzY3JpcHRpb24gIENoZWNrIGlmIGtleSBleGlzdHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICogQHBhcmFtICAgICAgICB7QW55fSBrZXlcbiAgICAgKiBAcmV0dXJuICAgICAgIHtCb29sZWFufSBpcyBpbiBjb2xsZWN0aW9uXG4gICAgICoqL1xuICAgIGZ1bmN0aW9uIGhhcyhrZXkpe1xuICAgICAgcmV0dXJuIG1oYXModW53cmFwKHRoaXMpLCBrZXkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAbWV0aG9kICAgICAgIDxkZWxldGU+XG4gICAgICogQGRlc2NyaXB0aW9uICBSZW1vdmUga2V5IGFuZCBtYXRjaGluZyB2YWx1ZSBpZiBmb3VuZFxuICAgICAqIEBwYXJhbSAgICAgICAge0FueX0ga2V5XG4gICAgICogQHJldHVybiAgICAgICB7Qm9vbGVhbn0gdHJ1ZSBpZiBpdGVtIHdhcyBpbiBjb2xsZWN0aW9uXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVsZXRlXyhrZXkpe1xuICAgICAgcmV0dXJuIG1kZWxldGUodW53cmFwKHRoaXMpLCBrZXkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAbWV0aG9kICAgICAgIDxzaXplPlxuICAgICAqIEBkZXNjcmlwdGlvbiAgUmV0cmlldmUgdGhlIGFtb3VudCBvZiBpdGVtcyBpbiB0aGUgY29sbGVjdGlvblxuICAgICAqIEByZXR1cm4gICAgICAge051bWJlcn1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzaXplKCl7XG4gICAgICByZXR1cm4gbXNpemUodW53cmFwKHRoaXMpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQG1ldGhvZCAgICAgICA8Zm9yRWFjaD5cbiAgICAgKiBAZGVzY3JpcHRpb24gIExvb3AgdGhyb3VnaCB0aGUgY29sbGVjdGlvbiByYWlzaW5nIGNhbGxiYWNrIGZvciBlYWNoLiBJbmRleCBpcyBzaW1wbHkgdGhlIGNvdW50ZXIgZm9yIHRoZSBjdXJyZW50IGl0ZXJhdGlvbi5cbiAgICAgKiBAcGFyYW0gICAgICAgIHtGdW5jdGlvbn0gY2FsbGJhY2sgIGBjYWxsYmFjayh2YWx1ZSwgaW5kZXgpYFxuICAgICAqIEBwYXJhbSAgICAgICAge09iamVjdH0gICBjb250ZXh0ICAgIFRoZSBgdGhpc2AgYmluZGluZyBmb3IgY2FsbGJhY2tzLCBkZWZhdWx0IG51bGxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrLCBjb250ZXh0KXtcbiAgICAgIHZhciBpbmRleCA9IDAsXG4gICAgICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICBtZm9yRWFjaCh1bndyYXAodGhpcyksIGZ1bmN0aW9uKGtleSl7XG4gICAgICAgIGNhbGwoY2FsbGJhY2ssIHRoaXMsIGtleSwgaW5kZXgrKywgc2VsZik7XG4gICAgICB9LCBjb250ZXh0KTtcbiAgICB9XG5cbiAgICBkZWxldGVfID0gZml4RGVsZXRlKGRlbGV0ZV8sIFsnbWRlbGV0ZScsICd1bndyYXAnXSwgW21kZWxldGUsIHVud3JhcF0pO1xuICAgIHJldHVybiBbU2V0LCBhZGQsIGhhcywgZGVsZXRlXywgc2l6ZSwgZm9yRWFjaF07XG4gIH0pO1xufSgnc3RyaW5nJywgJ29iamVjdCcsICdmdW5jdGlvbicsICdwcm90b3R5cGUnLCAndG9TdHJpbmcnLFxuICBBcnJheSwgT2JqZWN0LCBGdW5jdGlvbiwgRnVuY3Rpb24ucHJvdG90eXBlLCAoMCwgZXZhbCkoJ3RoaXMnKSxcbiAgdHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gdGhpcyA6IGV4cG9ydHMsIHt9KTtcbiJdfQ==
