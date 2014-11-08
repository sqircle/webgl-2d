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
