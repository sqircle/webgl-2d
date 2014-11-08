mat3 = require('./mat3')

class Transform
  @STACK_DEPTH_LIMIT: 16

  constructor: (mat) ->
    @clearStack mat

  clearStack: (init_mat) ->
    @m_stack = []
    @m_cache = []
    @c_stack = 0
    @valid   = 0
    @result  = null

    i  = 0
    while i < Transform.STACK_DEPTH_LIMIT
      @m_stack[i] = @getIdentity()
      i++

    if init_mat isnt undefined
      @m_stack[0] = init_mat
    else
      @setIdentity()

  setIdentity: ->
    @m_stack[@c_stack] = @getIdentity()
    @valid-- if @valid is @c_stack and @c_stack

  getIdentity: ->
    [1.0, 0.0, 0.0,
     0.0, 1.0, 0.0,
     0.0, 0.0, 1.0]

  getResult: ->
    return @m_stack[0] unless @c_stack

    m      = mat3.identity
    @valid = @c_stack - 1 if @valid > @c_stack - 1

    i = @valid
    while i < @c_stack + 1
      m = mat3.multiply(@m_stack[i], m)
      @m_cache[i] = m
      i++

    @valid  = @c_stack - 1
    @result = @m_cache[@c_stack]
    @result

  pushMatrix: ->
    @c_stack++
    @m_stack[@c_stack] = @getIdentity()

  popMatrix:  ->
    return if @c_stack is 0
    @c_stack--

  translate: (x, y) ->
    translateMatrix = @getIdentity()
    translateMatrix[6] = x
    translateMatrix[7] = y
    mat3.multiply translateMatrix, @m_stack[@c_stack]

  scale: (x, y) ->
    scaleMatrix = @getIdentity()
    scaleMatrix[0] = x
    scaleMatrix[4] = y
    mat3.multiply scaleMatrix, @m_stack[@c_stack]

  rotate: (ang) ->
    rotateMatrix = @getIdentity()

    sAng = Math.sin(-ang)
    cAng = Math.cos(-ang)
    rotateMatrix[0] = cAng
    rotateMatrix[3] = sAng
    rotateMatrix[1] = -sAng
    rotateMatrix[4] = cAng
    mat3.multiply rotateMatrix, @m_stack[@c_stack]

module.exports = Transform
