Mixin     = require 'mixto'
SubPath   = require('./SubPath')
Texture   = require('./Texture')
Transform = require('./math/Transform')
util      = require('./util')

colorVecToString  = util.colorVecToString
colorStringToVec4 = util.colorStringToVec4

class Drawing extends Mixin
  restoreDrawState: ->
    @drawState = @drawStateStack.pop() if @drawStateStack.length

  initDrawing: ->
    @gl2d           = this
    @subPaths       = []
    @imageCache     = []
    @textureCache   = []
    @drawStateStack = []
    @drawState      = {}

    tempCanvas = document.createElement('canvas')
    @tempCtx   = tempCanvas.getContext('2d')

    @drawState.fillStyle   = [0, 0, 0, 1]
    @drawState.strokeStyle = [0, 0, 0, 1]

    @drawState.lineWidth                = 1.0
    @drawState.lineCap                  = 'butt'
    @drawState.lineJoin                 = "miter"
    @drawState.miterLimit               = 10
    @drawState.shadowOffsetX            = 0
    @drawState.shadowOffsetY            = 0
    @drawState.shadowBlur               = 0
    @drawState.shadowColor              = "rgba(0, 0, 0, 0.0)"
    @drawState.font                     = "10px sans-serif"
    @drawState.textAlign                = "start"
    @drawState.textBaseline             = "alphabetic"
    @drawState.globalAlpha              = 1.0
    @drawState.globalCompositeOperation = "source-over"

  fillText: (text, x, y) ->
    # stub

  strokeText: ->
    # stub

  measureText: ->
    # stub8

  save: ->
    @gl2d.transform.pushMatrix()
    @saveDrawState()

  restore: ->
    @gl2d.transform.popMatrix()
    @restoreDrawState()

  translate: (x, y) ->
    @gl2d.transform.translate(x, y)

  rotate: (a) ->
    @gl2d.transform.rotate(a)

  scale: (x, y) ->
    @gl2d.transform.scale(x, y)

  createImageData: (width, height) ->
    @tempCtx.createImageData(width, height)
  
  getImageData: (x, y, width, height) ->
    data   = @tempCtx.createImageData(width, height)
    buffer = new Uint8Array(width * height * 4)

    @gl.readPixels x, y, width, height, @gl.RGBA, @gl.UNSIGNED_BYTE, buffer
    
    w    = width * 4
    h    = height
    i    = 0
    maxI = h / 2
    while i < maxI
      j    = 0
      maxJ = w

      while j < maxJ
        index1 = i * w + j
        index2 = (h - i - 1) * w + j
        data.data[index1] = buffer[index2]
        data.data[index2] = buffer[index1]
        ++j
      ++i

    data

  putImageData: (imageData, x, y) ->
    @drawImage(imageData, x, y)

  transform: (m11, m12, m21, m22, dx, dy) ->
    m = @gl2d.transform.m_stack[@gl2d.transform.c_stack]
    m[0] *= m11
    m[1] *= m21
    m[2] *= dx
    m[3] *= m12
    m[4] *= m22
    m[5] *= dy
    m[6] = 0
    m[7] = 0

  sendTransformStack: (sp) ->
    stack = @gl2d.transform.m_stack

    i    = 0
    maxI = @gl2d.transform.c_stack + 1
    while i < maxI
      @gl.uniformMatrix3fv sp.uTransforms[i], false, stack[maxI - 1 - i]
      ++i

  setTransform: (m11, m12, m21, m22, dx, dy) ->
    @gl2d.transform.setIdentity()
    @transform.apply this, arguments

  fillRect: (x, y, width, height) ->
    gl = @gl
    transform     = @gl2d.transform
    shaderProgram = @gl2d.initShaders(transform.c_stack + 2, 0)
  
    gl.bindBuffer gl.ARRAY_BUFFER, @rectVertexPositionBuffer
    gl.vertexAttribPointer shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0
    
    transform.pushMatrix()

    transform.translate x, y
    transform.scale width, height

    @sendTransformStack shaderProgram
    
    gl.uniform4f(shaderProgram.uColor, 
                 @drawState.fillStyle[0], 
                 @drawState.fillStyle[1], 
                 @drawState.fillStyle[2],
                 @drawState.fillStyle[3])
    gl.drawArrays gl.TRIANGLE_FAN, 0, 4
    
    transform.popMatrix()

  strokeRect: (x, y, width, height) ->
    gl = @gl

    transform     = @gl2d.transform
    shaderProgram = @gl2d.initShaders(transform.c_stack + 2, 0)
   
    gl.bindBuffer gl.ARRAY_BUFFER, @gl2d.rectVertexPositionBuffer
    gl.vertexAttribPointer shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0
    
    transform.pushMatrix()

    transform.translate x, y
    transform.scale width, height

    @sendTransformStack shaderProgram
    
    gl.uniform4f(shaderProgram.uColor, 
                 @drawState.strokeStyle[0], 
                 @drawState.strokeStyle[1], 
                 @drawState.strokeStyle[2], 
                 @drawState.strokeStyle[3])
    gl.drawArrays gl.LINE_LOOP, 0, 4
    
    transform.popMatrix()

  clearRect: (x, y, width, height) ->
    # stub

  beginPath: () ->
    @subPaths.length = 0

  closePath: ->
    if @subPaths.length
      # Mark last subpath closed.
      prevPath = @subPaths[@subPaths.length - 1]

      startX = prevPath.verts[0]
      startY = prevPath.verts[1]
      prevPath.closed = true
      
      # Create new subpath using the starting position of previous subpath
      newPath = new SubPath(startX, startY)
      @subPaths.push newPath

  moveTo: (x, y) ->
    @subPaths.push(new SubPath(x, y))

  lineTo: (x, y) ->
    if @subPaths.length
      @subPaths[@subPaths.length - 1].verts.push x, y, 0, 0
    else
      # Create a new subpath if none currently exist
      @moveTo x, y

  quadraticCurveTo: (cp1x, cp1y, x, y) ->
    # stubbed

  bezierCurveTo: (cp1x, cp1y, cp2x, cp2y, x, y) ->
    # stubbed
  
  arcTo: ->
    # stubbed

  rect: (x, y, w, h) ->
    @moveTo(x, y)
    @lineTo(x + w, y)
    @lineTo(x + w, y + h)
    @lineTo(x, y + h)
    @closePath()

  arc: (x, y, radius, startAngle, endAngle, anticlockwise) ->
    # stubbed

  fillSubPath: (index) ->
    gl = @gl
    transform     = @gl2d.transform
    shaderProgram = @gl2d.initShaders(transform.c_stack + 2, 0)

    subPath = @subPaths[index]
    verts   = subPath.verts

    gl.bindBuffer gl.ARRAY_BUFFER, @gl2d.pathVertexPositionBuffer
    gl.bufferData gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW
    
    gl.vertexAttribPointer shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0
    
    transform.pushMatrix()
    
    @sendTransformStack shaderProgram

    gl.uniform4f(shaderProgram.uColor, 
                @drawState.fillStyle[0], 
                @drawState.fillStyle[1], 
                @drawState.fillStyle[2], 
                @drawState.fillStyle[3])
    gl.drawArrays gl.TRIANGLE_FAN, 0, verts.length / 4
    
    transform.popMatrix()

  fill: ->
    i = 0
    while i < @subPaths.length
      @fillSubPath(i)
      i++

  strokeSubPath: (index) ->
    gl            = @gl
    transform     = @gl2d.transform
    shaderProgram = @gl2d.initShaders(transform.c_stack + 2, 0)
    
    subPath = @subPaths[index]
    verts   = subPath.verts
    
    gl.bindBuffer gl.ARRAY_BUFFER, @gl2d.pathVertexPositionBuffer
    gl.bufferData gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW
    
    gl.vertexAttribPointer shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0
    
    transform.pushMatrix()
    
    @sendTransformStack shaderProgram
    
    gl.uniform4f(shaderProgram.uColor, 
                 @drawState.strokeStyle[0], 
                 @drawState.strokeStyle[1], 
                 @drawState.strokeStyle[2], 
                 @drawState.strokeStyle[3])
    
    if subPath.closed
      gl.drawArrays gl.LINE_LOOP, 0, verts.length / 4
    else
      gl.drawArrays gl.LINE_STRIP, 0, verts.length / 4

    transform.popMatrix()
   
  stroke: ->
    i = 0
    while i < @subPaths.length
      @strokeSubPath(i)
      i++

  clip: ->
    # stubbed

  isPointInPath: ->
    # stubbed

  drawFocusRing: ->
    # stubbed

  drawImage: (image, a, b, c, d, e, f, g, h) ->
    gl        = @gl
    transform = @gl2d.transform

    transform.pushMatrix()

    sMask = @shaderMask.texture
    doCrop = false

    # drawImage(image, dx, dy)
    if arguments.length is 3
      transform.translate a, b
      transform.scale image.width, image.height

    # drawImage(image, dx, dy, dw, dh)
    else if arguments.length is 5
      transform.translate a, b
      transform.scale c, d

    # drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
    else if arguments.length is 9
      transform.translate e, f
      transform.scale g, h

      sMask  = sMask | @shaderMask.crop
      doCrop = true

    shaderProgram = @gl2d.initShaders(transform.c_stack, sMask)
    texture       = undefined
    cacheIndex    = @imageCache.indexOf(image)

    if cacheIndex isnt -1
      texture = @textureCache[cacheIndex]
    else
      texture = new Texture(image, this)

    if doCrop
      gl.uniform4f shaderProgram.uCropSource, a / image.width, b / image.height, c / image.width, d / image.height
  
    gl.bindBuffer gl.ARRAY_BUFFER, @gl2d.rectVertexPositionBuffer
    gl.vertexAttribPointer shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0
    
    gl.bindTexture gl.TEXTURE_2D, texture.obj
    gl.activeTexture gl.TEXTURE0

    gl.uniform1i shaderProgram.uSampler, 0

    @sendTransformStack shaderProgram

    gl.drawArrays gl.TRIANGLE_FAN, 0, 4
    transform.popMatrix()

  saveDrawState: ->
    bakedDrawState =
      fillStyle: [
        @drawState.fillStyle[0]
        @drawState.fillStyle[1]
        @drawState.fillStyle[2]
        @drawState.fillStyle[3]
      ]
      strokeStyle: [
        @drawState.strokeStyle[0]
        @drawState.strokeStyle[1]
        @drawState.strokeStyle[2]
        @drawState.strokeStyle[3]
      ]
      globalAlpha:              @drawState.globalAlpha
      globalCompositeOperation: @drawState.globalCompositeOperation
      lineCap:                  @drawState.lineCap
      lineJoin:                 @drawState.lineJoin
      lineWidth:                @drawState.lineWidth
      miterLimit:               @drawState.miterLimit
      shadowColor:              @drawState.shadowColor
      shadowBlur:               @drawState.shadowBlur
      shadowOffsetX:            @drawState.shadowOffsetX
      shadowOffsetY:            @drawState.shadowOffsetY
      textAlign:                @drawState.textAlign
      font:                     @drawState.font
      textBaseline:             @drawState.textBaseline

    @drawStateStack.push bakedDrawState

module.exports = Drawing
