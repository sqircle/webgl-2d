var math;

math = {
  M_PI: 3.1415926535897932384626433832795028841968,
  M_TWO_PI: 2.0 * M_PI,
  M_HALF_PI: M_PI / 2.0,
  isPOT: function(value) {
    return value > 0 && ((value - 1) & value) === 0;
  }
};
