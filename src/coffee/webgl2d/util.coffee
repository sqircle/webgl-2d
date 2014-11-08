color = require('onecolor')

util =
  colorStringToVec4: (colorString) ->
    colorParsed = color(colorString)
    [colorParsed.red(), colorParsed.green(), colorParsed.blue(), colorParsed.alpha()]

  colorVecToString: (colorVec) ->
    colorRGBA = new color.RGB(colorVec[0], colorVec[1], colorVec[2], colorVec[3])
    colorRGBA.cssa()

module.exports = util