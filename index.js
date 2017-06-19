"use strict";

const util = require("util");
const EventEmitter = require("events").EventEmitter;
const functionize = require("./lib/functionize");
const planTasks = require("./lib/plan-tasks");
const Preset = require("./lib/preset");
const clear = require("./lib/clear");

const express = require("express");

const Resizer = function (publicDir) {
    if (!this instanceof Resizer) throw "Resizer must be invoked with new";
    const self = this;
    this.app = express();
    this.presets = [];
    this.publicDir = publicDir;
    this.app.on("mount", function () {
        self.addHelpers();
        self.addUpdateHelpers();
    });
};

util.inherits(Resizer, EventEmitter);

Resizer.prototype.attach = function (name) {
    const self = this;
    const preset = new Preset(name);
    preset.publicDir(this.publicDir);

    preset.once("done", function (preset) {
        if (!preset.target) throw "Preset needs a target to write to";

        self.generateRoute(preset);
        self.presets.push(preset);
    });

    return preset;
};

Resizer.prototype.generateRoute = function (preset) {
    this.app.get(preset.target + "/*", planTasks(preset));
};

Resizer.prototype.addHelpers = function () {
    const self = this;
    this.presets.forEach(function (preset) {
        self.app.parent.locals[functionize(preset.name) + "Path"] = function (src) {
            return src.replace(preset.from, preset.target, src);
        };
        self.app.parent.locals[functionize(preset.name) + "Image"] = function (src, alt) {
            return "<img src=\"" + src.replace(preset.from, preset.target, src) + "\” alt=\"" + alt + "\">";
        };
    });
};

Resizer.prototype.addUpdateHelpers = function () {
    const self = this;
    if (self.app.parent.resizer) {
        throw "Resizre can not add deletion und update helpers because resizer is already defined in app.";
    }

    self.app.parent.resizer = {};

    this.presets.forEach(function (preset) {
        self.app.parent.resizer["clear" + functionize(preset.name, true)] = clear.all(preset);
    });
    self.app.parent.resizer.clear = clear.file(this.presets);
};


module.exports = Resizer;
