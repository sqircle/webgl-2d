var SubPath;

SubPath = (function() {
  function SubPath(x, y) {
    this.closed = false;
    this.verts = [x, y, 0, 0];
  }

  return SubPath;

})();

module.exports = SubPath;
