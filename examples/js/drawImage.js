$(document).ready(function() {
  var ctx2D, cvs2D, cvsGL, draw, height, img, webgl2d, width;
  cvs2D = document.getElementById("canvas2D");
  cvsGL = document.getElementById("canvasGL");
  width = cvs2D.width;
  height = cvs2D.height;
  webgl2d = new WebGL2D(cvsGL);
  ctx2D = cvs2D.getContext("2d");
  img = new Image();
  img.src = "images/spin0000.png";
  img.src = "";
  img.src = "images/spin0000.png";
  img.onload = function() {
    draw(webgl2d);
    return draw(ctx2D);
  };
  return draw = function(ctx) {
    var col, row, scale, _results;
    col = 0;
    while (col < width / img.width) {
      ctx.drawImage(img, col * img.width, 0);
      col++;
    }
    row = 1;
    _results = [];
    while (row < height / img.height) {
      col = 0;
      while (col < width / img.width) {
        scale = row + col;
        ctx.drawImage(img, col * img.width + scale / 2, row * img.height + scale / 2, img.width - scale, img.height - scale);
        col++;
      }
      _results.push(row++);
    }
    return _results;
  };
});
