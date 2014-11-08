$(document).ready ->
  cvs2D = document.getElementById("canvas2D")
  cvsGL = document.getElementById("canvasGL")
  width  = cvs2D.width
  height = cvs2D.height

  webgl2d = new WebGL2D(cvsGL) 
  ctx2D   = cvs2D.getContext("2d")

  draw = (ctx) ->
    ctx.fillStyle = "rgb(0, 0, 0)"
    ctx.fillRect 0, 0, width, height
    ctx.fillStyle = "rgb(255, 200, 255)"
    ctx.strokeStyle = "rgba(50, 255, 255, 0.5)"
    ctx.beginPath()
    ctx.lineTo 100, 100
    ctx.lineTo 200, 200
    ctx.lineTo 200, 100
    ctx.lineTo 100, 100
    ctx.stroke()
    ctx.beginPath()
    ctx.strokeStyle = "rgba(50, 0, 255, 0.5)"
    ctx.moveTo width - 10, height - 10
    ctx.lineTo width - 120, height - 120
    ctx.lineTo width - 120, height - 20
    ctx.closePath()
    ctx.lineWidth = 4
    ctx.moveTo 240, 100
    ctx.lineTo 340, 100
    ctx.lineTo 340, 200
    ctx.lineTo 240, 200
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.translate 100, 100
    ctx.rotate Math.PI / 4
    ctx.rect 0, 0, 140, 100
    ctx.stroke()

  draw(webgl2d)
  draw(ctx2D)
