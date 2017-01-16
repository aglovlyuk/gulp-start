'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var autoprefixer = require('autoprefixer');
var browserSync = require("browser-sync");
//var cssmin = require('gulp-minify-css');
var del = require('del');
var imagemin = require('gulp-imagemin');
var imageminPngquant = require('imagemin-pngquant');
//var prefixer = require('gulp-autoprefixer');
var path = require('path');
var plumber = require('gulp-plumber');
var posthtmlAttrsSorter = require('posthtml-attrs-sorter');
//var postcssSorting = require('postcss-sorting');
var rigger = require('gulp-rigger');
var runSequence = require('run-sequence');
var stylefmt = require('stylefmt');
var sass = require('gulp-sass');
// var svgSymbols = require('gulp-svg-symbols');

var reload = browserSync.reload;

// Plugins options
var options = {
  build: { //Тут мы укажем куда складывать готовые после сборки файлы
    html: 'build/',
    js: 'build/js/',
    css: 'build/css/',
    img: 'build/images/',
    fonts: 'build/fonts/'
  },
  src: { //Пути откуда брать исходники
    html: 'src/*.html', //Синтаксис src/*.html говорит gulp что мы хотим взять все файлы с расширением .html
    js: 'src/js/main.js',//В стилях и скриптах нам понадобятся только main файлы
    style: './src/scss/main.scss',
    img: 'src/images/**/*.*', //Синтаксис images/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
    svg: 'src/images/svg-icons/*.svg', //Синтаксис images/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
    fonts: 'src/fonts/**/*.*'
  },
  watch: { //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
    html: 'src/**/*.html',
    js: 'src/js/**/*.js',
    style: 'src/scss/**/*.scss',
    img: 'src/images/**/*.*',
    svg: 'src/images/svg-icons/*.svg', //Синтаксис images/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
    fonts: 'src/fonts/**/*.*'
  },

  svgSprite: {
      title: false,
      id: '%f',
      className: '%f',
      svgClassname: 'icons-sprite',
      templates: [
      path.join(__dirname, 'src/template-icon/icons-template.scss'),
      path.join(__dirname, 'src/template-icon/icons-template.svg')
    ]
  },

  imagemin: {
    images: [
      $.imagemin.gifsicle({
        interlaced: true,
        optimizationLevel: 3
      }),
      $.imagemin.jpegtran({
        progressive: true
      }),
      imageminPngquant(),
      $.imagemin.svgo({
        plugins: [
          { cleanupIDs: false },
          { removeViewBox: false },
          { convertPathData: false },
          { mergePaths: false }
        ]
      })
    ],

    icons: [
      $.imagemin.svgo({
        plugins: [
          { removeTitle: true },
          { removeStyleElement: true },
          { removeAttrs: { attrs: [ 'id', 'class', 'data-name', 'fill', 'fill-rule' ] } },
          { removeEmptyContainers: true },
          { sortAttrs: true },
          { removeUselessDefs: true },
          { removeEmptyText: true },
          { removeEditorsNSData: true },
          { removeEmptyAttrs: true },
          { removeHiddenElems: true },
          { transformsWithOnePath: true }
        ]
      })
    ],

    del: [
      'dest',
      'tmp'
    ],

    plumber: {
      errorHandler: errorHandler
    }
  },

  posthtml: {
    plugins: [
      posthtmlAttrsSorter({
        order: [
          'class',
          'id',
          'name',
          'data',
          'ng',
          'src',
          'for',
          'type',
          'href',
          'values',
          'title',
          'alt',
          'role',
          'aria'
        ]
      })
    ],
    options: {}
  },

  postcss: [
    autoprefixer({
      cascade: false
    }),
    stylefmt({
      configFile: '.stylelintrc'
    })
  ],

  server: {
    baseDir: "./build"
  },
  tunnel: true,
  host: 'localhost',
  port: 9000,
  logPrefix: "Frontend_Devil"
};

// configuration for localhost
var config = {
  server: {
    baseDir: "./build"
  },
  tunnel: true,
  host: 'localhost',
  port: 9000,
  logPrefix: "Frontend_Devil"
};

/* All tasks */

// Error handler for gulp-plumber
function errorHandler(err) {
  $.util.log([ (err.name + ' in ' + err.plugin).bold.red, '', err.message, '' ].join('\n'));

  this.emit('end');
}

function correctNumber(number) {
  return number < 10 ? '0' + number : number;
}

// Return timestamp
function getDateTime() {
  var now = new Date();
  var year = now.getFullYear();
  var month = correctNumber(now.getMonth() + 1);
  var day = correctNumber(now.getDate());
  var hours = correctNumber(now.getHours());
  var minutes = correctNumber(now.getMinutes());
  return year + '-' + month + '-' + day + '-' + hours + minutes;
}

gulp.task('cleanup', function(cb) {
  return del(options.del, cb);
});

// livereload
gulp.task('webserver', function () {
  browserSync(config);
});

//task for js build
gulp.task('js:build', function () {
  return gulp.src(options.src.js) //Найдем наш main файл
    .pipe(rigger()) //Прогоним через rigger
    .pipe($.sourcemaps.init()) //Инициализируем sourcemap
    .pipe($.uglify()) //Сожмем наш js
    .pipe($.sourcemaps.write()) //Пропишем карты
    .pipe(gulp.dest(options.build.js)) //Выплюнем готовый файл в build
    .pipe(reload({stream: true})); //И перезагрузим сервер
});

//task for style build
gulp.task('style:build', function () {
  return gulp.src(options.src.style) //Выберем наш main.scss
    .pipe(plumber())
    //.pipe($.sourcemaps.init()) //То же самое что и с js
    .pipe(sass().on('error', sass.logError)) //Скомпилируем
    //.pipe($.prefixer()) //Добавим вендорные префиксы
    //.pipe($.cssmin()) //минификация
    .pipe($.combineMq({ beautify: true })) //совмещение media-запросов
    .pipe(plumber.stop())
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(options.build.css)) //И в build
    .pipe(reload({stream: true}));
});

gulp.task('html:build', function() {
  return gulp.src(options.src.html) //Выберем файлы по нужному пути
    .pipe(rigger()) //Прогоним через rigger
    .pipe($.posthtml(options.posthtml.plugins, options.posthtml.options))
    .pipe($.prettify(options.htmlPrettify))
    .pipe(gulp.dest(options.build.html)) //Выплюнем их в папку build
    .pipe(reload({stream: true})); //И перезагрузим наш сервер для обновлений
});

gulp.task('icons:build', function() {
  return gulp.src([ '**/*.svg', '!**/_*.svg' ], { cwd: 'src/images/svg-icons' })
    .pipe($.plumber(options.plumber))
    .pipe($.imagemin(options.imagemin.icons))
    .pipe($.svgSymbols(options.svgSprite))
    .pipe($.if(/\.svg$/, $.rename('icons.svg')))
    .pipe($.if(/\.svg$/, gulp.dest('build/images')));
});

gulp.task('image:build', function() {
  return gulp.src('**/*.{jpg,gif,png}', { cwd: 'src/images' })
    .pipe($.plumber(options.plumber))
    //.pipe($.changed('build/images'))
    .pipe($.imagemin(options.imagemin.images))
    //.pipe($.flatten())
    .pipe(gulp.dest('build/images/'))
    .pipe(reload({stream: true}));
});

//task for fonts copy
gulp.task('fonts:build', function() {
  return gulp.src(options.src.fonts)
    .pipe(gulp.dest(options.build.fonts))
});

gulp.task('build:zip', function() {
  var datetime = '-' + getDateTime();
  var zipName = 'dist' + datetime + '.zip';

  return gulp.src('build/**/*')
    .pipe($.zip(zipName))
    .pipe(gulp.dest('zip'));
});

gulp.task('cleanup', function(cb) {
  return del(options.del, cb);
});

// Main tasks
gulp.task('build', function(cb) {
  return runSequence(
    'cleanup',
    'html:build',
    'js:build',
    'style:build',
    'image:build',
    'icons:build',
    'fonts:build',
    cb
  );
});

gulp.task('zip', function(cb) {
  return runSequence(
    'build',
    'build:zip',
    cb
  );
});

gulp.task('deploy', function(cb) {
  return runSequence(
    'build',
    'deploy:publish',
    cb
  );
});

//
// main watch task
gulp.task('watch', function(){
  $.watch([options.watch.html], function() {
    gulp.start('html:build');
  });
  $.watch([options.watch.style], function() {
    gulp.start('style:build');
  });
  $.watch([options.watch.js], function() {
    gulp.start('js:build');
  });
  $.watch([options.watch.img], function() {
    gulp.start('image:build');
  });
  $.watch([options.watch.svg], function() {
    gulp.start('icons:build');
  });
  $.watch([options.watch.fonts], function() {
    gulp.start('fonts:build');
  });
});

// main default task
gulp.task('default', function(cb) {
  return runSequence(
    'build',
    [
      'webserver',
      'watch'
    ],
    cb
  );
});
