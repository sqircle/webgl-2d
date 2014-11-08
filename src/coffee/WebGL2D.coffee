Drawing   = require('./webgl2d/Drawing')
Transform = require('./webgl2d/math/Transform')
PropertyAccessors = require 'property-accessors'

getFragmentShaderSource = require('./webgl2d/shaders/fragment')
getVertexShaderSource   = require('./webgl2d/shaders/vertex')

util  = require('./webgl2d/util')

colorVecToString  = util.colorVecToString
colorStringToVec4 = util.colorStringToVec4

class WebGL2D
  Drawing.includeInto(this)
  PropertyAccessors.includeInto(this)

  constructor: (canvas, options) ->
    @canvas  = canvas
    @options = options or {}

    @gl            = canvas.getContext("webgl")
    @fs            = undefined
    @vs            = undefined
    @shaderProgram = undefined
    @shaderPool    = []

    @transform      = new Transform()
    @maxTextureSize = undefined

    textCanvas        = document.createElement("canvas")
    textCanvas.width  = @canvas.width
    textCanvas.height = @canvas.height
    @textCtx          = textCanvas.getContext("2d")

    @shaderMask =
      texture: 1
      crop: 2
      path: 4
    
    @initShaders()
    @initBuffers()
    
    # Init the drawing API 
    @initDrawing()
    @gl.viewport 0, 0, @canvas.width, @canvas.height
    
    # Default white background
    @gl.clearColor 1, 1, 1, 1
    @gl.clear @gl.COLOR_BUFFER_BIT
    
    # Disables writing to dest-alpha
    @gl.colorMask 1, 1, 1, 0
    
    # Blending options
    @gl.enable @gl.BLEND
    @gl.blendFunc @gl.SRC_ALPHA, @gl.ONE_MINUS_SRC_ALPHA
    @maxTextureSize = @gl.getParameter(@gl.MAX_TEXTURE_SIZE)

  initShaders: (transformStackDepth, sMask) ->
    gl                  = @gl
    transformStackDepth = transformStackDepth or 1
    sMask               = sMask or 0

    storedShader = @shaderPool[transformStackDepth]
    storedShader = @shaderPool[transformStackDepth] = [] unless storedShader

    storedShader = storedShader[sMask]
    if storedShader
      gl.useProgram storedShader
      @shaderProgram = storedShader
      storedShader
    else
      fs = @fs = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource @fs, getFragmentShaderSource(sMask, @shaderMask)
      gl.compileShader @fs

      unless gl.getShaderParameter(@fs, gl.COMPILE_STATUS)
        throw "fragment shader error: " + gl.getShaderInfoLog(@fs) 

      vs = @vs = gl.createShader(gl.VERTEX_SHADER)
      gl.shaderSource @vs, getVertexShaderSource(transformStackDepth, sMask, @shaderMask, @canvas)
      gl.compileShader @vs

      unless gl.getShaderParameter(@vs, gl.COMPILE_STATUS)
        throw "vertex shader error: " + gl.getShaderInfoLog(@vs)
      
      shaderProgram = @shaderProgram = gl.createProgram()
      shaderProgram.stackDepth = transformStackDepth

      gl.attachShader shaderProgram, fs
      gl.attachShader shaderProgram, vs

      gl.linkProgram shaderProgram

      unless gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)
        throw "Could not initialise shaders."

      gl.useProgram shaderProgram
      shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition")
      gl.enableVertexAttribArray shaderProgram.vertexPositionAttribute

      shaderProgram.uColor      = gl.getUniformLocation(shaderProgram, "uColor")
      shaderProgram.uSampler    = gl.getUniformLocation(shaderProgram, "uSampler")
      shaderProgram.uCropSource = gl.getUniformLocation(shaderProgram, "uCropSource")
      shaderProgram.uTransforms = []

      i = 0
      while i < transformStackDepth
        shaderProgram.uTransforms[i] = gl.getUniformLocation(shaderProgram, "uTransforms[" + i + "]")
        ++i

      @shaderPool[transformStackDepth][sMask] = shaderProgram
      
      shaderProgram

  initBuffers: ->
    gl = @gl

    @rectVerts = new Float32Array([
      0,0, 0,0,
      0,1, 0,1,
      1,1, 1,1,
      1,0, 1,0
    ])
    
    @rectVertexPositionBuffer = gl.createBuffer()
    @rectVertexColorBuffer    = gl.createBuffer()
    @pathVertexPositionBuffer = gl.createBuffer()
    @pathVertexColorBuffer    = gl.createBuffer()

    gl.bindBuffer gl.ARRAY_BUFFER, @rectVertexPositionBuffer
    gl.bufferData gl.ARRAY_BUFFER, @rectVerts, gl.STATIC_DRAW

  @::accessor 'fillStyle',
    get: ->
      colorVecToString(@drawState.fillStyle)
    set: (color) ->
      @drawState.fillStyle = colorStringToVec4(color)

  @::accessor 'strokeStyle',
    get: ->
      colorVecToString(@drawState.strokeStyle)
    set: (color) ->
      @drawState.strokeStyle = colorStringToVec4(color)
  
  @::accessor 'lineWidth',
    get: ->
      @drawState.lineWidth
    set: (lineWidth) ->
      @gl.lineWidth(lineWidth)
      @drawState.lineWidth = lineWidth

  @::accessor 'lineCap',
    get: ->
      @drawState.lineCap
    set: (lineCap) ->
      @drawState.lineCap = lineCap
  
  @::accessor 'lineJoin',
    get: ->
      @drawState.lineJoin
    set: (lineJoin) ->
      @drawState.lineJoin = lineJoin

  @::accessor 'miterLimit',
    get: ->
      @drawState.miterLimit
    set: (miterLimit) ->
      @drawState.miterLimit = miterLimit

  @::accessor 'shadowOffsetX',
    get: ->
      @drawState.shadowOffsetX
    set: (shadowOffsetX) ->
      @drawState.shadowOffsetX = shadowOffsetX

  @::accessor 'shadowOffsetY',
    get: ->
      @drawState.shadowOffsetY
    set: (shadowOffsetY) ->
      @drawState.shadowOffsetY = shadowOffsetY

  @::accessor 'shadowBlur',
    get: ->
      @drawState.shadowBlur
    set: (shadowBlur) ->
      @drawState.shadowBlur = shadowBlur

  @::accessor 'shadowColor',
    get: ->
      @drawState.shadowColor
    set: (shadowColor) ->
      @drawState.shadowColor = shadowColor

  @::accessor 'font',
    get: ->
      @drawState.font
    set: (font) ->
      @textCtx.font   = font
      @drawState.font = font

  @::accessor 'textAlign',
    get: ->
      @drawState.textAlign
    set: (textAlign) ->
      @drawState.textAlign = textAlign
  
  @::accessor 'textBaseline',
    get: ->
      @drawState.textBaseline
    set: (textBaseline) ->
      @drawState.textBaseline = textBaseline

  @::accessor 'globalAlpha',
    get: ->
      @drawState.globalAlpha
    set: (globalAlpha) ->
      @drawState.globalAlpha = globalAlpha

  @::accessor 'globalCompositeOperation',
    get: ->
      @drawState.globalCompositeOperation
    set: (globalCompositeOperation) ->
      @drawState.globalCompositeOperation = globalCompositeOperation

module.exports = WebGL2D
