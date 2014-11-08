class SubPath
  constructor: (x,y) ->
    @closed = false
    @verts  = [x, y, 0, 0]

module.exports = SubPath
