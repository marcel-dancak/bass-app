
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


var TARGET = 'dist/v26/';

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
    root: [
      './',
      'scripts/',
      'src/',
      devserver.index_dir,
      'static/',
      // '/home/marcel/Shotcut/vue-shotcut/'
    ],
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
  var gulpUtil = require('gulp-util');

  return series(
    series(
      gulp.src([
        'bower_components/swiper/dist/js/swiper.min.js',
        'bower_components/angular/angular.min.js',
        'bower_components/angular-aria/angular-aria.min.js',
        'bower_components/angular-animate/angular-animate.min.js',
        'bower_components/angular-translate/angular-translate.min.js',

        'src/lib/bezier-easing.min.js',
        'src/lib/buffer-loader.js',
        'src/lib/polyfills.js',
        'src/lib/simple-scrollbar.min.js',
        'src/lib/string-format.js',
        'src/lib/angular-native-dragdrop/draganddrop.js',
        'src/lib/angular-resizable/angular-resizable.js',
        'src/lib/tonal.min.js',

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

        'bower_components/angular-material/modules/js/radioButton/radioButton.min.js',
        // 'bower_components/angular-material/modules/js/checkbox/checkbox.min.js',
        'bower_components/angular-material/modules/js/showHide/showHide.min.js',

        // 'bower_components/angular-material/modules/js/slider/slider.min.js',
        // 'bower_components/angular-material/modules/js/tabs/tabs.min.js',
        'bower_components/angular-material/modules/js/content/content.min.js',
        // 'bower_components/angular-material/modules/js/whiteframe/whiteframe.min.js',
        // 'bower_components/angular-material/modules/js/divider/divider.min.js',
        'bower_components/angular-material/modules/js/sidenav/sidenav.min.js',

        'bower_components/hamsterjs/hamster.js',
        'bower_components/angular-mousewheel/mousewheel.js',
        'bower_components/angularjs-slider/dist/rzslider.min.js',
        'bower_components/file-saver/FileSaver.min.js',
        // 'bower_components/angular-scroll/angular-scroll.min.js',
        'bower_components/lz-string/libs/lz-string.min.js',
        // 'bower_components/marked/marked.min.js',
        'bower_components/dot/doT.min.js',


        '!src/js/help/**/*.js',
        '!src/js/mobile/**/*.js',
        'src/js/**/*.module.js',
        'src/js/**/*.js',
        // 'src/js/app/**/*.es6'

        '!src/js/**/drum-editor.js'
      ]),
      gulp.src([
        'src/js/app/**/*.es6',
        'src/js/**/drum-editor.js'
        ])
        .pipe(babel({
          presets: ['es2015']
      }))
    )
    // .pipe(
    //   gulpif(
    //     function (file) {
    //       return file.path.substr(file.cwd.length).startsWith("/src/")
    //     },
    //     babel({
    //       presets: ['es2015']
    //     })
    //   )
    // )
    .pipe(ngAnnotate({ add: true })),
      gulp.src([
        '!src/views/mobile/**/*.html',
        '!src/views/help/**/*.html',
        'src/views/**/*.html'
        ])
        .pipe(templateCache('templateCache.js', {root: 'views/'}))
    )
    // .pipe(uglify())
    .pipe(
      gulpif(
        function (file) {
          return !file.path.endsWith("min.js")
        },
        uglify().on('error', gulpUtil.log)
      )
    )
    .pipe(concat('app.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

gulp.task('upload', function() {
  var gulpif = require('gulp-if');

  return gulp.src([
      'src/lib/pen/pen.js',
      'bower_components/marked/marked.min.js',
    ])
    .pipe(
      gulpif(
        function (file) {
          return !file.path.endsWith("min.js")
        },
        uglify()
      )
    )
    .pipe(concat('upload.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

gulp.task('oggvorbis', function() {
  return gulp.src([
      'src/lib/oggvorbis.js',
    ])
    .pipe(uglify())
    .pipe(concat('oggvorbis.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

gulp.task('help', function() {
  var series = require('stream-series');
  var ngAnnotate = require('gulp-ng-annotate');
  var templateCache = require('gulp-angular-templatecache/');
  var gulpif = require('gulp-if');

  return series(
    gulp.src([
      'bower_components/angular-scroll/angular-scroll.min.js',

      'src/js/help/**/*.module.js',
      'src/js/help/**/*.js'
    ]).pipe(ngAnnotate({ add: true })),

    gulp.src('src/views/help/**/*.html')
      .pipe(templateCache('templateCache.js', {root: 'views/help/'}))
  )
    .pipe(
      gulpif(
        function (file) {
          return !file.path.endsWith("min.js")
        },
        uglify()
      )
    )
    .pipe(concat('help.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});

gulp.task('modules', ['help', 'upload', 'oggvorbis']);

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

      'bower_components/swiper/dist/css/swiper.min.css',
      'bower_components/angularjs-slider/dist/rzslider.css',
      'src/lib/angular-resizable/angular-resizable.css',
      'src/lib/pen/pen.css',

      // '!src/styles/mobile/**/*.css',
      // '!src/styles/screenshot.css',
      // 'src/styles/ui.css',
      // 'src/styles/**/*.css',
      // 'src/styles/css/responsive.css',

      'src/styles/simple-scrollbar.min.css',

      'src/styles/fonts.css',
      'src/styles/ui.css',
      'src/styles/css/toolbar.css',
      'src/styles/css/preferences.css',
      'src/styles/bottom-toolbar.css',
      'src/styles/bar.css',
      'src/styles/css/bass.css',
      'src/styles/bass-sound-form.css',
      'src/styles/drums.css',
      'src/styles/css/fretboard.css',
      'src/styles/piano.css',
      'src/styles/playlist.css',
      'src/styles/help.css',

      'src/styles/css/responsive.css'
    ])
      .pipe(minifyCss())
      .pipe(concat('styles.css'))
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



gulp.task('aac-lib', function() {
  gulp.src([
    'src/lib/aurora.js',
    'src/lib/aac.js',
  ])
    .pipe(uglify())
    .pipe(concat('aac.min.js'))
    .pipe(gulp.dest(TARGET + 'js/'));
});
