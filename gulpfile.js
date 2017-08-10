
var gulp = require('gulp');
var rimraf = require('gulp-rimraf');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var merge = require('merge-stream');
var path = require('path');
var babel = require('gulp-babel');
var sass = require('gulp-sass');


var TARGET = 'dist/v21/';

var DEV_JS = ['src/js/**/*.js', 'src/js/**/*.es6'];
var DEV_HTML = 'src/views/**/*.html';
var DEV_CSS = 'src/styles/**/*.css';
var DEV_SCSS = 'src/styles/**/*.scss';

/**
 * Tasks for development
 */

var devserver = {
  index_dir: '',
};

gulp.task('devserver', function() {
  var port = 3000;
  var portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex != -1) {
    port = parseInt(process.argv[portArgIndex+1]);
  }
  connect.server({
    root: ['./', 'scripts/', 'src/', devserver.index_dir],
    port: port,
    // livereload: true
    livereload: {
      port: 33333
    }
  });
});

gulp.task('dev-js', function () {
  gulp.src(DEV_JS)
    .pipe(connect.reload());
});

gulp.task('dev-scss', function () {
  return gulp.src(DEV_SCSS)
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(gulp.dest('src/styles/css'))
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
  var index = devserver.index_dir+'index.html';
  gulp.src(index)
    .pipe(connect.reload());
});

gulp.task('watch', function () {
  var index = devserver.index_dir+'index.html';
  gulp.watch(DEV_JS, ['dev-js']);
  gulp.watch(DEV_HTML, ['dev-templates']);
  gulp.watch(DEV_CSS, ['dev-styles']);
  gulp.watch(DEV_SCSS, ['dev-scss']);
  gulp.watch(index, ['dev-index']);
});

/**
 * Start development server on http://localhost:3000 with live reloading
 */
// gulp.task('serve', ['devserver', 'watch']);

gulp.task('serve', function() {
  devserver.index_dir = 'src/dev/desktop/';
gulp.start('devserver', 'watch');
});

gulp.task('serve-mobile', function() {
  devserver.index_dir = 'src/dev/mobile/';
  gulp.start('devserver', 'watch');
});

/**
 * Compile all JavaScript and HTML templates files into single minified file
 */
gulp.task('uglify', function() {
  var series = require('stream-series');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');
  var gulpif = require('gulp-if');

  return series(
    series(
      gulp.src([
        'bower_components/swiper/dist/js/swiper.min.js',
        'bower_components/angular/angular.min.js',
        'bower_components/angular-aria/angular-aria.min.js',
        'bower_components/angular-animate/angular-animate.min.js',
        'bower_components/angular-translate/angular-translate.min.js',

        '!src/lib/fft/*.js',
        '!src/lib/midi/*.js',
        'src/lib/bezier-easing.min.js',
        'src/lib/**/*.js',

        // 'bower_components/angular-material/angular-material.js',

        'src/angular-material.module.js',
        'bower_components/angular-material/modules/js/core/core.min.js',
        // 'bower_components/angular-material/modules/js/core/default-theme.js',
        'bower_components/angular-material/modules/js/backdrop/backdrop.min.js',
        'bower_components/angular-material/modules/js/button/button.min.js',
        'bower_components/angular-material/modules/js/checkbox/checkbox.min.js',
        'bower_components/angular-material/modules/js/icon/icon.min.js',
        'bower_components/angular-material/modules/js/input/input.min.js',
        'bower_components/angular-material/modules/js/textField/textField.min.js',
        'bower_components/angular-material/modules/js/list/list.min.js',
        'bower_components/angular-material/modules/js/menu/menu.min.js',
        'bower_components/angular-material/modules/js/menuBar/menuBar.min.js',
        'bower_components/angular-material/modules/js/select/select.min.js',
        'bower_components/angular-material/modules/js/tooltip/tooltip.min.js',
        'bower_components/angular-material/modules/js/toast/toast.min.js',
        'bower_components/angular-material/modules/js/panel/panel.min.js',
        'bower_components/angular-material/modules/js/dialog/dialog.min.js',
        'bower_components/angular-material/modules/js/subheader/subheader.min.js',
        'bower_components/angular-material/modules/js/sticky/sticky.min.js',
        'bower_components/angular-material/modules/js/chips/chips.min.js',
        'bower_components/angular-material/modules/js/autocomplete/autocomplete.min.js',
        'bower_components/angular-material/modules/js/virtualRepeat/virtualRepeat.min.js',
        'bower_components/angular-material/modules/js/progressCircular/progressCircular.min.js',

        // 'bower_components/angular-material/modules/js/radioButton/radioButton.min.js',
        // 'bower_components/angular-material/modules/js/checkbox/checkbox.min.js',
        'bower_components/angular-material/modules/js/showHide/showHide.min.js',

        // 'bower_components/angular-material/modules/js/slider/slider.min.js',
        // 'bower_components/angular-material/modules/js/tabs/tabs.min.js',
        'bower_components/angular-material/modules/js/content/content.min.js',
        // 'bower_components/angular-material/modules/js/whiteframe/whiteframe.min.js',
        // 'bower_components/angular-material/modules/js/divider/divider.min.js',

        'bower_components/angular-resizable/src/angular-resizable.js',
        'bower_components/hamsterjs/hamster.js',
        'bower_components/angular-mousewheel/mousewheel.js',
        'bower_components/angularjs-slider/dist/rzslider.min.js',
        'bower_components/file-saver/FileSaver.min.js',
        'bower_components/angular-scroll/angular-scroll.min.js',
        'bower_components/marked/marked.min.js',
        'bower_components/dot/doT.min.js',


        '!src/js/mobile/**/*.js',
        'src/js/**/*.module.js',
        'src/js/**/*.js'
      ]),
      gulp.src('src/js/app/**/*.es6')
        .pipe(babel({
          presets: ['es2015']
      }))
    ).pipe(ngAnnotate({ add: true })),
    gulp.src('src/views/**/*.html')
      .pipe(templateCache('templateCache.js', {root: 'views/'}))
  )
    // .pipe(uglify())
    .pipe(
      gulpif(
        function (file) {
          return !file.path.endsWith("min.js")
        },
        uglify()
      )
    )
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

/**
 * Minify all css files
 */
gulp.task('csss', function() {
  var minifyCss = require('gulp-minify-css');
  return merge(
      gulp.src([
       'bower_components/angular-material/angular-material.css',
       /*
      'src/angular-material.css',
      'bower_components/angular-material/modules/css/angular-material-layouts.css',
      'bower_components/angular-material/modules/js/backdrop/backdrop.min.css',
      'bower_components/angular-material/modules/js/button/button.min.css',
      'bower_components/angular-material/modules/js/checkbox/checkbox.min.css',

      'bower_components/angular-material/modules/js/icon/icon.min.css',
      'bower_components/angular-material/modules/js/input/input.min.css',
      'bower_components/angular-material/modules/js/textField/textField.min.css',
      'bower_components/angular-material/modules/js/menu/menu.min.css',
      'bower_components/angular-material/modules/js/select/select.min.css',
      // 'bower_components/angular-material/modules/js/slider/slider.min.css',
      'bower_components/angular-material/modules/js/tabs/tabs.min.css',
      'bower_components/angular-material/modules/js/whiteframe/whiteframe.min.css',
      'bower_components/angular-material/modules/js/divider/divider.min.css',
      'bower_components/angular-material/modules/js/list/list.min.css',
      */

      'bower_components/angular-resizable/src/angular-resizable.css',
      'bower_components/swiper/dist/css/swiper.min.css',
      'bower_components/angularjs-slider/dist/rzslider.css',
      'src/lib/pen/pen.css',

      '!src/styles/mobile/**/*.css',
      '!src/styles/screenshot.css',
      'src/styles/ui.css',
      'src/styles/**/*.css'
    ])
      .pipe(minifyCss())
      .pipe(concat('styles.min.css'))
      .pipe(gulp.dest(TARGET + 'styles')),

    gulp.src('src/styles/*.svg')
      .pipe(gulp.dest(TARGET + 'styles')),

    gulp.src('src/favicon-16x16.png')
      .pipe(gulp.dest(TARGET)),

    gulp.src('src/styles/fonts/*')
      .pipe(gulp.dest(TARGET + 'styles/fonts')),

    gulp.src('src/lib/pen/fonts/*')
      .pipe(gulp.dest(TARGET + 'styles/fonts'))
  );
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
    root: [TARGET],
    port: 3000,
    livereload: true
  });
});


/**
 * Create SVG sprite file from separated files (compatibile with Angular Material library)
 */
gulp.task('icons', function() {
  var svgmin = require('gulp-svgmin');
  var svgng = require('gulp-svg-ngmaterial');
  var cheerio = require('gulp-cheerio');

  return gulp
    .src('icons/*.svg')
    .pipe(svgmin())
    .pipe(cheerio({
      run: function($) {
        $('[fill]').removeAttr('fill');
      },
      parserOptions: { xmlMode: true }
    }))
    .pipe(svgng({ filename : "icons.svg"}))
    .pipe(gulp.dest('src/styles/'));
    //.pipe(gzip({append: true,gzipOptions: { level: 9 }}))
    //.pipe(gulp.dest('src/web/styles/'));
});


gulp.task('drum-icons', function() {
  var svgmin = require('gulp-svgmin');
  var svgng = require('gulp-svg-ngmaterial');

  return gulp
    .src('svg/drums/*.svg')
    .pipe(svgmin())
    .pipe(svgng({ filename : "drums.svg"}))
    .pipe(gulp.dest('src/styles/'));
});


/**
 * Minify all css files
 */
gulp.task('mobile-csss', function() {
  var minifyCss = require('gulp-minify-css');
  return gulp.src([
    'bower_components/angular-material/angular-material.css',

    'bower_components/swiper/dist/css/swiper.min.css',
    'bower_components/angularjs-slider/dist/rzslider.css',
    'src/styles/ui.css',
    'src/styles/**/*.css',
    'src/styles/moible/viewer.css'
  ])
    .pipe(minifyCss())
    .pipe(concat('mobile.min.css'))
    .pipe(gulp.dest(TARGET + 'styles'));
});

/**
 * Compile all JavaScript and HTML templates files into single minified file
 */
gulp.task('mobile-uglify', function() {
  var series = require('stream-series');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');

  return series(
    series(
      gulp.src([
        'bower_components/swiper/dist/js/swiper.js',
        'bower_components/angular/angular.min.js',
        'bower_components/angular-aria/angular-aria.min.js',
        'bower_components/angular-animate/angular-animate.min.js',
        'bower_components/angular-translate/angular-translate.min.js',

        '!src/lib/fft/*.js',
        '!src/lib/scalyr.js',
        '!src/lib/bezier-easing.min.js',
        'src/lib/*.js',

        'src/angular-material.module.js',
        'bower_components/angular-material/modules/js/core/core.min.js',
        'bower_components/angular-material/modules/js/backdrop/backdrop.min.js',
        'bower_components/angular-material/modules/js/button/button.min.js',
        'bower_components/angular-material/modules/js/checkbox/checkbox.min.js',
        'bower_components/angular-material/modules/js/icon/icon.min.js',
        'bower_components/angular-material/modules/js/input/input.min.js',
        'bower_components/angular-material/modules/js/textField/textField.min.js',
        'bower_components/angular-material/modules/js/list/list.min.js',
        'bower_components/angular-material/modules/js/menu/menu.min.js',
        'bower_components/angular-material/modules/js/menuBar/menuBar.min.js',
        'bower_components/angular-material/modules/js/select/select.min.js',
        'bower_components/angular-material/modules/js/tooltip/tooltip.min.js',
        'bower_components/angular-material/modules/js/toast/toast.min.js',
        'bower_components/angular-material/modules/js/panel/panel.min.js',
        'bower_components/angular-material/modules/js/dialog/dialog.min.js',
        'bower_components/angular-material/modules/js/subheader/subheader.min.js',
        'bower_components/angular-material/modules/js/sticky/sticky.min.js',
        'bower_components/angular-material/modules/js/progressCircular/progressCircular.min.js',
        'bower_components/angular-material/modules/js/content/content.min.js',

        'bower_components/angularjs-slider/dist/rzslider.min.js',

        '!src/js/app/app.module.js',
        '!src/js/app/playlist/**/*.js',
        '!src/js/app/editor/**/*.js',
        'src/js/**/*.module.js',
        'src/js/**/*.js'
      ]),
      gulp.src('src/js/app/**/*.es6')
        .pipe(babel({
          presets: ['es2015']
      }))
    ).pipe(ngAnnotate({ add: true })),
    gulp.src([
      '!src/views/editor/**/*.html',
      '!src/views/playlist/**/*.html',
      '!src/views/help/**/*.html',
      '!src/views/app.html',
      'src/views/**/*.html',
    ])
      .pipe(templateCache('templateCache.js', {root: 'views/'}))
  )
    .pipe(uglify())
    .pipe(concat('mobile.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

gulp.task('mobile-index-page', function() {
  return gulp.src('src/index-mobile.html')
    .pipe(concat('mobile.html'))
    .pipe(gulp.dest(TARGET));
});
gulp.task('build-mobile', ['mobile-index-page', 'mobile-uglify', 'mobile-csss']);