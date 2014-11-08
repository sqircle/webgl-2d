var math;

math = {
  isPOT: function(value) {
    return value > 0 && ((value - 1) & value) === 0;
  }
};

module.exports = math;
