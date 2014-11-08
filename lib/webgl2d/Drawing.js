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
