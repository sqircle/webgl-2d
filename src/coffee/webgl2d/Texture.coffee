math  = require('./math')
isPOT = math.isPOT

class Texture
  constructor: (image, @gl2d) ->
    gl     = @gl2d.gl
    @obj   = gl.createTexture()
    @index = @gl2d.textureCache.push(this)

    @gl2d.imageCache.push image

    # TODO: tiling
    if image.width > @gl2d.maxTextureSize or image.height > @gl2d.maxTextureSize
      canvas = document.createElement("canvas")
     
      canvas.width  = (if (image.width  > @gl2d.maxTextureSize) then @gl2d.maxTextureSize else image.width)
      canvas.height = (if (image.height > @gl2d.maxTextureSize)  then @gl2d.maxTextureSize else image.height)
     
      ctx = canvas.getContext("2d")
      ctx.drawImage image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height
      
      image = canvas

    gl.bindTexture gl.TEXTURE_2D, @obj
    gl.texImage2D gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE
    gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR
    
    # Enable Mip mapping on power-of-2 textures
    if math.isPOT(image.width) and math.isPOT(image.height)
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR
      gl.generateMipmap gl.TEXTURE_2D
    else
      gl.texParameteri gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR
    
    # Unbind texture
    gl.bindTexture gl.TEXTURE_2D, null

module.exports = Texture
