'use strict';

const browserSync = require('browser-sync').create();
const del = require('del');
const env = require('gulp-util').env;
const gulp = require('gulp');
const handlebars = require('gulp-compile-handlebars');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
//const filter = require('gulp-filter');
//const rev = require('gulp-rev');
//const revRewrite = require('gulp-rev-rewrite');
const revAll = require("gulp-rev-all");
const awspublish = require('gulp-awspublish');
const cloudfront = require("gulp-cloudfront");

const config = {
  static: './static',
  src: './src',
  staging: './stage',
  dest: './dist',
  watchers: [
    {
      match: ['./src/**/*.hbs'],
      tasks: ['html']
    }
  ],
  aws: {
    params: {
        Bucket: "readytoflycoaching"
    },
    distributionId: "E3J7TSA09K68FQ",
    region: "us-west-2",
  },
  headers: { "Cache-Control": "max-age=315360000, no-transform, public" }
};

const publisher = awspublish.create(config.aws);

function clean() {
    return del(config.dest) && del(config.staging);
}
gulp.task(clean);

function copy() {
    return gulp.src([`${config.static}/**/*`], {
        base: 'static'
    }).pipe(gulp.dest(config.staging));
}
gulp.task(copy);

function minifyCSS() {
  return gulp.src(`${config.static}/css/*.css`)
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest(`${config.staging}/css`));
}
gulp.task(minifyCSS);

function html() {
  return gulp.src(`${config.src}/pages/*.hbs`)
    .pipe(handlebars({}, {
      ignorePartials: true,
      batch: [`${config.src}/partials`]
    }))
    .pipe(rename({
      extname: '.html'
    }))
    .pipe(gulp.dest(config.staging));
}
gulp.task(html);

//function revision() {
//  const assetFilter = filter(['**/*.html', '**/css/*', '**/js/*', '**/images/*'],
//    { restore: true });
//
//  return gulp.src([`${config.staging}/**`])
//    .pipe(assetFilter)
//    .pipe(rev()) // Rename all files except index.html
//    .pipe(assetFilter.restore)
//    .pipe(revRewrite()) // Substitute in new filenames
//    .pipe(gulp.dest(config.dest));
//}
//gulp.task(revision);

function revisionAll() {
  return gulp.src(`${config.staging}/**`)
    .pipe(revAll.revision())
    .pipe(gulp.dest(config.dest));
}

function serve() {
  browserSync.init({
    open: false,
    notify: false,
    files: [`${config.dest}/**/*`],
    server: config.dest
  });
}
gulp.task(serve);

function watch() {
  config.watchers.forEach(item => {
    gulp.watch(item.match, item.tasks);
  });
}
gulp.task(watch);

function awspub() {
  return gulp.src(`${config.dest}/**`)
    .pipe(awspublish.gzip())
    .pipe(publisher.publish(config.headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter())
    .pipe(cloudfront(config.aws));
}
gulp.task(awspub);

gulp.task('publish', gulp.series(clean, copy, minifyCSS, html, revisionAll, awspub));
gulp.task('serve', gulp.series(clean, copy, minifyCSS, html, revisionAll, serve, watch));
gulp.task('default', gulp.series(clean, copy, minifyCSS, html, revisionAll));