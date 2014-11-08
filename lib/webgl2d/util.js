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
