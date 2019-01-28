const gulp = require('gulp');
const browserify = require("browserify");
const watchify = require("watchify");
const source = require("vinyl-source-stream");
const tsify = require("tsify");
const buffer = require("vinyl-buffer");

let bundler = browserify({
    debug: true,
    entries: ['src/index.ts'],
    extensions: [".babel"],
    cache: {},
    packageCache: {},
});

const bundle = () => {
    return bundler.plugin(tsify)
           .transform("brfs")
           .transform("babelify", {
               presets: ["@babel/env"],
               extensions: [".ts"],
               minified: true,
           })
           .bundle()
           .on("error", (error) => {
               console.log(error.message);
           })
           .pipe(source("index.js"))
           .pipe(buffer())
           .pipe(gulp.dest('dist/js'));
};


gulp.task('scripts', function() {
    return bundle();
});

gulp.task('watch', function() {
    bundler = watchify(bundler);
    bundler.on('update', bundle);
    
    return bundle();
});
