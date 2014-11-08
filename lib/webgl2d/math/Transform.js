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
