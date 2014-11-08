$(document).ready ->
  cvs2D = document.getElementById("canvas2D")
  cvsGL = document.getElementById("canvasGL")
  width  = cvs2D.width
  height = cvs2D.height

  webgl2d = new WebGL2D(cvsGL) 
  ctx2D   = cvs2D.getContext("2d")

  img = new Image()
  img.src = "images/spin0000.png"
  img.src = ""
  img.src = "images/spin0000.png"
  img.onload = ->
    draw(webgl2d)
    draw(ctx2D)

  draw = (ctx) ->
    col = 0

    while col < width / img.width
      ctx.drawImage img, col * img.width, 0
      col++
    row = 1

    while row < height / img.height
      col = 0

      while col < width / img.width
        scale = row + col
        ctx.drawImage img, col * img.width + scale / 2, row * img.height + scale / 2, img.width - scale, img.height - scale
        col++
      row++
