"use strict";
const path = require("path");
const fs = require("fs");
const async = require("async");

const walk = function (dir, done) {
    let results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        let i = 0;
        (function next() {
            let file = list[i++];
            if (!file) return done(null, results);
            file = dir + "/" + file;
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(file);
                    next();
                }
            });
        })();
    });
};

module.exports.all = function (preset) {
    return function (cb) {
        const target = path.join(preset.basePath, preset.target);
        const time = Date.now();

        walk(target, function (err, results) {
            cb && cb(err);
        });
    };
};

module.exports.file = function (presets) {
    return function (file, cb) {
        const time = Date.now();

        async.parallelLimit(
            presets.map(function (preset) {
                return function () {
                    const targetPath = path.join(
                        preset.basePath,
                        file.replace(preset.from, preset.target));
                        fs.stat(targetPath, function (err, stats) {
                            if (err) return cb && cb(err);
                            if (stats.ctime > time) return;
                            fs.unlink(targetPath, function (err) {
                                cb && cb(err);
                            });
                        });
                };
            }),
            5,
        cb);
    };
};
