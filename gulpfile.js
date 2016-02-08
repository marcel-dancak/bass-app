
var gulp = require('gulp');
var rimraf = require('gulp-rimraf');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var watch = require('gulp-watch');
var connect = require('gulp-connect');

var path = require('path');


var TARGET = 'dist/';

var DEV_JS = 'src/js/**/*.js';
var DEV_HTML = 'src/views/**/*.html';
var DEV_CSS = 'src/styles/**/*.css';

/**
 * Tasks for development
 */

gulp.task('devserver', function() {
  connect.server({
    root: ['./', 'src/'],
    port: 3000,
    livereload: true
  });
});

gulp.task('dev-js', function () {
  gulp.src(DEV_JS)
    .pipe(connect.reload());
});

gulp.task('dev-styles', function () {
  gulp.src(DEV_CSS)
    .pipe(connect.reload());
});

gulp.task('dev-templates', function () {
  gulp.src(DEV_HTML)
    .pipe(connect.reload());
});

gulp.task('dev-index', function () {
  gulp.src('src/index.html')
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(DEV_JS, ['dev-js']);
  gulp.watch(DEV_HTML, ['dev-templates']);
  gulp.watch(DEV_CSS, ['dev-styles']);
  gulp.watch('src/index.html', ['dev-index']);
});

/**
 * Start development server on http://localhost:3000 with live reloading
 */
gulp.task('serve', ['devserver', 'watch']);


/**
 * Compile all JavaScript and HTML templates files into single minified file
 */
gulp.task('uglify', function() {
  var series = require('stream-series');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');

  return series(
    gulp.src([
      'bower_components/angular/angular.min.js',
      'bower_components/angular-aria/angular-aria.min.js',
      'bower_components/angular-animate/angular-animate.min.js',
      'bower_components/angular-sanitize/angular-sanitize.min.js',
      'bower_components/angular-material/angular-material.js',

      'src/**/*.module.js',
      'src/**/*.js',
    ]).pipe(ngAnnotate({ add: true })),
    gulp.src('src/**/*.html')
      .pipe(templateCache())
  )
    .pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

/**
 * Minify all css files
 */
gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');
  return gulp.src([
    'bower_components/angular-material/angular-material.css',
    'src/styles/**/*.css'
  ])
    .pipe(minifyCss())
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));
});

/**
 * Copy index.html file into target directory
 */
gulp.task('index-page', function() {
  return gulp.src('src/index-deploy.html')
    .pipe(concat('index.html'))
    .pipe(gulp.dest(TARGET));
});

gulp.task('build', ['index-page', 'uglify', 'csss']);


gulp.task('serve-deploy', function() {
  connect.server({
    root: ['dist/'],
    port: 3000,
    livereload: true
  });
});