'use strict'
gulp           = require 'gulp'
gp             = (require 'gulp-load-plugins') lazy: false
path           = require 'path'
browserify     = require 'browserify'
coffee         = require 'gulp-coffee'
source         = require 'vinyl-source-stream'
mochaPhantomJS = require('gulp-mocha-phantomjs')
concat         = require('gulp-concat')
runSequence    = require('run-sequence')
hamlc          = require('gulp-haml-coffee')

# Compile 
gulp.task "coffeeit", ->
  gulp.src('src/coffee/**/*.coffee')
    .pipe coffee(bare: true)
    .pipe gulp.dest('./lib')

# Build JS for distribution/bower
gulp.task 'dist:js', ->
  browserify
    debug: true
    entries: ['./index.js']
    extensions: ['.js']
    standalone: "Webgl2d"
  .transform 'debowerify'
  .bundle()

  # Pass desired file name to browserify with vinyl
  .pipe source 'webgl2d.js'

  # Start piping stream to tasks!
  .pipe gulp.dest 'dist/js'

# Build CSS for distribution/bower
gulp.task 'dist:css', ->
  gulp.src 'assets/css/**/*.sass'
    .pipe gp.plumber()
    .pipe gp.rubySass style: 'compressed', loadPath: ['bower_components', '.']
    .pipe gp.cssmin keepSpecialComments: 0
    .pipe gulp.dest 'dist/css'

# Move Images to dist folder
gulp.task 'dist:images', ->
  gulp.src 'assets/images/*'
    .pipe gulp.dest 'dist/images'

# Testing
gulp.task "test", ->
  browserify
    entries: ['./spec/spec.coffee']
    extensions: ['.coffee', '.js']
  .transform 'coffeeify'
  .bundle()
  .pipe source 'spec.js'
  .pipe gulp.dest 'test/spec'

  gulp.src("test/runner.html").pipe mochaPhantomJS(
    reporter: "spec",
    phantomjs: {
      'webSecurityEnabled': false    
    }
  )

# Register Tasks
gulp.task 'build', ->
  runSequence(['dist:images', 'dist:css'], 'coffeeit', 'dist:js')

gulp.task 'spec', ->
  runSequence('coffeeit', 'dist:js', 'test')

gulp.task 'default', ['spec']

# # Watching You!
# gulp.watch(['src/**/*.coffee', 'assets/css/**/*.sass'], ['default'])
# 