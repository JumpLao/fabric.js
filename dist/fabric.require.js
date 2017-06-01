var fabric = fabric || {
    version: "2.0.0-beta1"
};

if (typeof exports !== "undefined") {
    exports.fabric = fabric;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
    fabric.document = document;
    fabric.window = window;
    window.fabric = fabric;
} else {
    fabric.document = require("jsdom").jsdom(decodeURIComponent("%3C!DOCTYPE%20html%3E%3Chtml%3E%3Chead%3E%3C%2Fhead%3E%3Cbody%3E%3C%2Fbody%3E%3C%2Fhtml%3E"), {
        features: {
            FetchExternalResources: [ "img" ]
        }
    });
    fabric.window = fabric.document.defaultView;
}

fabric.isTouchSupported = "ontouchstart" in fabric.document.documentElement;

fabric.isLikelyNode = typeof Buffer !== "undefined" && typeof window === "undefined";

fabric.DPI = 96;

fabric.reNum = "(?:[-+]?(?:\\d+|\\d*\\.\\d+)(?:e[-+]?\\d+)?)";

fabric.fontPaths = {};

fabric.iMatrix = [ 1, 0, 0, 1, 0, 0 ];

fabric.canvasModule = "canvas-prebuilt";

fabric.charWidthsCache = {};

fabric.textureSize = 2048;

fabric.enableGLFiltering = true;

fabric.devicePixelRatio = fabric.window.devicePixelRatio || fabric.window.webkitDevicePixelRatio || fabric.window.mozDevicePixelRatio || 1;

fabric.initFilterBackend = function() {
    if (fabric.isWebglSupported && fabric.isWebglSupported(fabric.textureSize) && fabric.enableGLFiltering) {
        console.log("max texture size: " + fabric.maxTextureSize);
        return new fabric.WebglFilterBackend({
            tileSize: fabric.textureSize
        });
    } else if (fabric.Canvas2dFilterBackend) {
        return new fabric.Canvas2dFilterBackend();
    }
};

(function() {
    function _removeEventListener(eventName, handler) {
        if (!this.__eventListeners[eventName]) {
            return;
        }
        var eventListener = this.__eventListeners[eventName];
        if (handler) {
            eventListener[eventListener.indexOf(handler)] = false;
        } else {
            fabric.util.array.fill(eventListener, false);
        }
    }
    function observe(eventName, handler) {
        if (!this.__eventListeners) {
            this.__eventListeners = {};
        }
        if (arguments.length === 1) {
            for (var prop in eventName) {
                this.on(prop, eventName[prop]);
            }
        } else {
            if (!this.__eventListeners[eventName]) {
                this.__eventListeners[eventName] = [];
            }
            this.__eventListeners[eventName].push(handler);
        }
        return this;
    }
    function stopObserving(eventName, handler) {
        if (!this.__eventListeners) {
            return;
        }
        if (arguments.length === 0) {
            for (eventName in this.__eventListeners) {
                _removeEventListener.call(this, eventName);
            }
        } else if (arguments.length === 1 && typeof arguments[0] === "object") {
            for (var prop in eventName) {
                _removeEventListener.call(this, prop, eventName[prop]);
            }
        } else {
            _removeEventListener.call(this, eventName, handler);
        }
        return this;
    }
    function fire(eventName, options) {
        if (!this.__eventListeners) {
            return;
        }
        var listenersForEvent = this.__eventListeners[eventName];
        if (!listenersForEvent) {
            return;
        }
        for (var i = 0, len = listenersForEvent.length; i < len; i++) {
            listenersForEvent[i] && listenersForEvent[i].call(this, options || {});
        }
        this.__eventListeners[eventName] = listenersForEvent.filter(function(value) {
            return value !== false;
        });
        return this;
    }
    fabric.Observable = {
        observe: observe,
        stopObserving: stopObserving,
        fire: fire,
        on: observe,
        off: stopObserving,
        trigger: fire
    };
})();

fabric.Collection = {
    _objects: [],
    add: function() {
        this._objects.push.apply(this._objects, arguments);
        if (this._onObjectAdded) {
            for (var i = 0, length = arguments.length; i < length; i++) {
                this._onObjectAdded(arguments[i]);
            }
        }
        this.renderOnAddRemove && this.renderAll();
        return this;
    },
    insertAt: function(object, index, nonSplicing) {
        var objects = this.getObjects();
        if (nonSplicing) {
            objects[index] = object;
        } else {
            objects.splice(index, 0, object);
        }
        this._onObjectAdded && this._onObjectAdded(object);
        this.renderOnAddRemove && this.renderAll();
        return this;
    },
    remove: function() {
        var objects = this.getObjects(), index, somethingRemoved = false;
        for (var i = 0, length = arguments.length; i < length; i++) {
            index = objects.indexOf(arguments[i]);
            if (index !== -1) {
                somethingRemoved = true;
                objects.splice(index, 1);
                this._onObjectRemoved && this._onObjectRemoved(arguments[i]);
            }
        }
        this.renderOnAddRemove && somethingRemoved && this.renderAll();
        return this;
    },
    forEachObject: function(callback, context) {
        var objects = this.getObjects();
        for (var i = 0, len = objects.length; i < len; i++) {
            callback.call(context, objects[i], i, objects);
        }
        return this;
    },
    getObjects: function(type) {
        if (typeof type === "undefined") {
            return this._objects;
        }
        return this._objects.filter(function(o) {
            return o.type === type;
        });
    },
    item: function(index) {
        return this.getObjects()[index];
    },
    isEmpty: function() {
        return this.getObjects().length === 0;
    },
    size: function() {
        return this.getObjects().length;
    },
    contains: function(object) {
        return this.getObjects().indexOf(object) > -1;
    },
    complexity: function() {
        return this.getObjects().reduce(function(memo, current) {
            memo += current.complexity ? current.complexity() : 0;
            return memo;
        }, 0);
    }
};

fabric.CommonMethods = {
    _setOptions: function(options) {
        for (var prop in options) {
            this.set(prop, options[prop]);
        }
    },
    _initGradient: function(filler, property) {
        if (filler && filler.colorStops && !(filler instanceof fabric.Gradient)) {
            this.set(property, new fabric.Gradient(filler));
        }
    },
    _initPattern: function(filler, property, callback) {
        if (filler && filler.source && !(filler instanceof fabric.Pattern)) {
            this.set(property, new fabric.Pattern(filler, callback));
        } else {
            callback && callback();
        }
    },
    _initClipping: function(options) {
        if (!options.clipTo || typeof options.clipTo !== "string") {
            return;
        }
        var functionBody = fabric.util.getFunctionBody(options.clipTo);
        if (typeof functionBody !== "undefined") {
            this.clipTo = new Function("ctx", functionBody);
        }
    },
    _setObject: function(obj) {
        for (var prop in obj) {
            this._set(prop, obj[prop]);
        }
    },
    set: function(key, value) {
        if (typeof key === "object") {
            this._setObject(key);
        } else {
            if (typeof value === "function" && key !== "clipTo") {
                this._set(key, value(this.get(key)));
            } else {
                this._set(key, value);
            }
        }
        return this;
    },
    _set: function(key, value) {
        this[key] = value;
    },
    toggle: function(property) {
        var value = this.get(property);
        if (typeof value === "boolean") {
            this.set(property, !value);
        }
        return this;
    },
    get: function(property) {
        return this[property];
    }
};

(function(global) {
    var sqrt = Math.sqrt, atan2 = Math.atan2, pow = Math.pow, abs = Math.abs, PiBy180 = Math.PI / 180;
    fabric.util = {
        removeFromArray: function(array, value) {
            var idx = array.indexOf(value);
            if (idx !== -1) {
                array.splice(idx, 1);
            }
            return array;
        },
        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        degreesToRadians: function(degrees) {
            return degrees * PiBy180;
        },
        radiansToDegrees: function(radians) {
            return radians / PiBy180;
        },
        rotatePoint: function(point, origin, radians) {
            point.subtractEquals(origin);
            var v = fabric.util.rotateVector(point, radians);
            return new fabric.Point(v.x, v.y).addEquals(origin);
        },
        rotateVector: function(vector, radians) {
            var sin = Math.sin(radians), cos = Math.cos(radians), rx = vector.x * cos - vector.y * sin, ry = vector.x * sin + vector.y * cos;
            return {
                x: rx,
                y: ry
            };
        },
        transformPoint: function(p, t, ignoreOffset) {
            if (ignoreOffset) {
                return new fabric.Point(t[0] * p.x + t[2] * p.y, t[1] * p.x + t[3] * p.y);
            }
            return new fabric.Point(t[0] * p.x + t[2] * p.y + t[4], t[1] * p.x + t[3] * p.y + t[5]);
        },
        makeBoundingBoxFromPoints: function(points) {
            var xPoints = [ points[0].x, points[1].x, points[2].x, points[3].x ], minX = fabric.util.array.min(xPoints), maxX = fabric.util.array.max(xPoints), width = Math.abs(minX - maxX), yPoints = [ points[0].y, points[1].y, points[2].y, points[3].y ], minY = fabric.util.array.min(yPoints), maxY = fabric.util.array.max(yPoints), height = Math.abs(minY - maxY);
            return {
                left: minX,
                top: minY,
                width: width,
                height: height
            };
        },
        invertTransform: function(t) {
            var a = 1 / (t[0] * t[3] - t[1] * t[2]), r = [ a * t[3], -a * t[1], -a * t[2], a * t[0] ], o = fabric.util.transformPoint({
                x: t[4],
                y: t[5]
            }, r, true);
            r[4] = -o.x;
            r[5] = -o.y;
            return r;
        },
        toFixed: function(number, fractionDigits) {
            return parseFloat(Number(number).toFixed(fractionDigits));
        },
        parseUnit: function(value, fontSize) {
            var unit = /\D{0,2}$/.exec(value), number = parseFloat(value);
            if (!fontSize) {
                fontSize = fabric.Text.DEFAULT_SVG_FONT_SIZE;
            }
            switch (unit[0]) {
              case "mm":
                return number * fabric.DPI / 25.4;

              case "cm":
                return number * fabric.DPI / 2.54;

              case "in":
                return number * fabric.DPI;

              case "pt":
                return number * fabric.DPI / 72;

              case "pc":
                return number * fabric.DPI / 72 * 12;

              case "em":
                return number * fontSize;

              default:
                return number;
            }
        },
        falseFunction: function() {
            return false;
        },
        getKlass: function(type, namespace) {
            type = fabric.util.string.camelize(type.charAt(0).toUpperCase() + type.slice(1));
            return fabric.util.resolveNamespace(namespace)[type];
        },
        resolveNamespace: function(namespace) {
            if (!namespace) {
                return fabric;
            }
            var parts = namespace.split("."), len = parts.length, i, obj = global || fabric.window;
            for (i = 0; i < len; ++i) {
                obj = obj[parts[i]];
            }
            return obj;
        },
        loadImage: function(url, callback, context, crossOrigin) {
            if (!url) {
                callback && callback.call(context, url);
                return;
            }
            var img = fabric.util.createImage();
            img.onload = function() {
                callback && callback.call(context, img);
                img = img.onload = img.onerror = null;
            };
            img.onerror = function() {
                fabric.log("Error loading " + img.src);
                callback && callback.call(context, null, true);
                img = img.onload = img.onerror = null;
            };
            if (url.indexOf("data") !== 0 && crossOrigin) {
                img.crossOrigin = crossOrigin;
            }
            img.src = url;
        },
        enlivenObjects: function(objects, callback, namespace, reviver) {
            objects = objects || [];
            function onLoaded() {
                if (++numLoadedObjects === numTotalObjects) {
                    callback && callback(enlivenedObjects);
                }
            }
            var enlivenedObjects = [], numLoadedObjects = 0, numTotalObjects = objects.length, forceAsync = true;
            if (!numTotalObjects) {
                callback && callback(enlivenedObjects);
                return;
            }
            objects.forEach(function(o, index) {
                if (!o || !o.type) {
                    onLoaded();
                    return;
                }
                var klass = fabric.util.getKlass(o.type, namespace);
                klass.fromObject(o, function(obj, error) {
                    error || (enlivenedObjects[index] = obj);
                    reviver && reviver(o, obj, error);
                    onLoaded();
                }, forceAsync);
            });
        },
        enlivenPatterns: function(patterns, callback) {
            patterns = patterns || [];
            function onLoaded() {
                if (++numLoadedPatterns === numPatterns) {
                    callback && callback(enlivenedPatterns);
                }
            }
            var enlivenedPatterns = [], numLoadedPatterns = 0, numPatterns = patterns.length;
            if (!numPatterns) {
                callback && callback(enlivenedPatterns);
                return;
            }
            patterns.forEach(function(p, index) {
                if (p && p.source) {
                    new fabric.Pattern(p, function(pattern) {
                        enlivenedPatterns[index] = pattern;
                        onLoaded();
                    });
                } else {
                    enlivenedPatterns[index] = p;
                    onLoaded();
                }
            });
        },
        groupSVGElements: function(elements, options, path) {
            var object;
            object = new fabric.PathGroup(elements, options);
            if (typeof path !== "undefined") {
                object.sourcePath = path;
            }
            return object;
        },
        populateWithProperties: function(source, destination, properties) {
            if (properties && Object.prototype.toString.call(properties) === "[object Array]") {
                for (var i = 0, len = properties.length; i < len; i++) {
                    if (properties[i] in source) {
                        destination[properties[i]] = source[properties[i]];
                    }
                }
            }
        },
        drawDashedLine: function(ctx, x, y, x2, y2, da) {
            var dx = x2 - x, dy = y2 - y, len = sqrt(dx * dx + dy * dy), rot = atan2(dy, dx), dc = da.length, di = 0, draw = true;
            ctx.save();
            ctx.translate(x, y);
            ctx.moveTo(0, 0);
            ctx.rotate(rot);
            x = 0;
            while (len > x) {
                x += da[di++ % dc];
                if (x > len) {
                    x = len;
                }
                ctx[draw ? "lineTo" : "moveTo"](x, 0);
                draw = !draw;
            }
            ctx.restore();
        },
        createCanvasElement: function(canvasEl) {
            canvasEl || (canvasEl = fabric.document.createElement("canvas"));
            return canvasEl;
        },
        createImage: function() {
            return fabric.document.createElement("img");
        },
        createAccessors: function(klass) {
            var proto = klass.prototype, i, propName, capitalizedPropName, setterName, getterName;
            for (i = proto.stateProperties.length; i--; ) {
                propName = proto.stateProperties[i];
                capitalizedPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
                setterName = "set" + capitalizedPropName;
                getterName = "get" + capitalizedPropName;
                if (!proto[getterName]) {
                    proto[getterName] = function(property) {
                        return new Function('return this.get("' + property + '")');
                    }(propName);
                }
                if (!proto[setterName]) {
                    proto[setterName] = function(property) {
                        return new Function("value", 'return this.set("' + property + '", value)');
                    }(propName);
                }
            }
        },
        clipContext: function(receiver, ctx) {
            ctx.save();
            ctx.beginPath();
            receiver.clipTo(ctx);
            ctx.clip();
        },
        multiplyTransformMatrices: function(a, b, is2x2) {
            return [ a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], is2x2 ? 0 : a[0] * b[4] + a[2] * b[5] + a[4], is2x2 ? 0 : a[1] * b[4] + a[3] * b[5] + a[5] ];
        },
        qrDecompose: function(a) {
            var angle = atan2(a[1], a[0]), denom = pow(a[0], 2) + pow(a[1], 2), scaleX = sqrt(denom), scaleY = (a[0] * a[3] - a[2] * a[1]) / scaleX, skewX = atan2(a[0] * a[2] + a[1] * a[3], denom);
            return {
                angle: angle / PiBy180,
                scaleX: scaleX,
                scaleY: scaleY,
                skewX: skewX / PiBy180,
                skewY: 0,
                translateX: a[4],
                translateY: a[5]
            };
        },
        customTransformMatrix: function(scaleX, scaleY, skewX) {
            var skewMatrixX = [ 1, 0, abs(Math.tan(skewX * PiBy180)), 1 ], scaleMatrix = [ abs(scaleX), 0, 0, abs(scaleY) ];
            return fabric.util.multiplyTransformMatrices(scaleMatrix, skewMatrixX, true);
        },
        resetObjectTransform: function(target) {
            target.scaleX = 1;
            target.scaleY = 1;
            target.skewX = 0;
            target.skewY = 0;
            target.flipX = false;
            target.flipY = false;
            target.setAngle(0);
        },
        getFunctionBody: function(fn) {
            return (String(fn).match(/function[^{]*\{([\s\S]*)\}/) || {})[1];
        },
        isTransparent: function(ctx, x, y, tolerance) {
            if (tolerance > 0) {
                if (x > tolerance) {
                    x -= tolerance;
                } else {
                    x = 0;
                }
                if (y > tolerance) {
                    y -= tolerance;
                } else {
                    y = 0;
                }
            }
            var _isTransparent = true, i, temp, imageData = ctx.getImageData(x, y, tolerance * 2 || 1, tolerance * 2 || 1), l = imageData.data.length;
            for (i = 3; i < l; i += 4) {
                temp = imageData.data[i];
                _isTransparent = temp <= 0;
                if (_isTransparent === false) {
                    break;
                }
            }
            imageData = null;
            return _isTransparent;
        },
        parsePreserveAspectRatioAttribute: function(attribute) {
            var meetOrSlice = "meet", alignX = "Mid", alignY = "Mid", aspectRatioAttrs = attribute.split(" "), align;
            if (aspectRatioAttrs && aspectRatioAttrs.length) {
                meetOrSlice = aspectRatioAttrs.pop();
                if (meetOrSlice !== "meet" && meetOrSlice !== "slice") {
                    align = meetOrSlice;
                    meetOrSlice = "meet";
                } else if (aspectRatioAttrs.length) {
                    align = aspectRatioAttrs.pop();
                }
            }
            alignX = align !== "none" ? align.slice(1, 4) : "none";
            alignY = align !== "none" ? align.slice(5, 8) : "none";
            return {
                meetOrSlice: meetOrSlice,
                alignX: alignX,
                alignY: alignY
            };
        },
        clearFabricFontCache: function(fontFamily) {
            if (!fontFamily) {
                fabric.charWidthsCache = {};
            } else if (fabric.charWidthsCache[fontFamily]) {
                delete fabric.charWidthsCache[fontFamily];
            }
        }
    };
})(typeof exports !== "undefined" ? exports : this);

(function() {
    var arcToSegmentsCache = {}, segmentToBezierCache = {}, boundsOfCurveCache = {}, _join = Array.prototype.join;
    function arcToSegments(toX, toY, rx, ry, large, sweep, rotateX) {
        var argsString = _join.call(arguments);
        if (arcToSegmentsCache[argsString]) {
            return arcToSegmentsCache[argsString];
        }
        var PI = Math.PI, th = rotateX * PI / 180, sinTh = Math.sin(th), cosTh = Math.cos(th), fromX = 0, fromY = 0;
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        var px = -cosTh * toX * .5 - sinTh * toY * .5, py = -cosTh * toY * .5 + sinTh * toX * .5, rx2 = rx * rx, ry2 = ry * ry, py2 = py * py, px2 = px * px, pl = rx2 * ry2 - rx2 * py2 - ry2 * px2, root = 0;
        if (pl < 0) {
            var s = Math.sqrt(1 - pl / (rx2 * ry2));
            rx *= s;
            ry *= s;
        } else {
            root = (large === sweep ? -1 : 1) * Math.sqrt(pl / (rx2 * py2 + ry2 * px2));
        }
        var cx = root * rx * py / ry, cy = -root * ry * px / rx, cx1 = cosTh * cx - sinTh * cy + toX * .5, cy1 = sinTh * cx + cosTh * cy + toY * .5, mTheta = calcVectorAngle(1, 0, (px - cx) / rx, (py - cy) / ry), dtheta = calcVectorAngle((px - cx) / rx, (py - cy) / ry, (-px - cx) / rx, (-py - cy) / ry);
        if (sweep === 0 && dtheta > 0) {
            dtheta -= 2 * PI;
        } else if (sweep === 1 && dtheta < 0) {
            dtheta += 2 * PI;
        }
        var segments = Math.ceil(Math.abs(dtheta / PI * 2)), result = [], mDelta = dtheta / segments, mT = 8 / 3 * Math.sin(mDelta / 4) * Math.sin(mDelta / 4) / Math.sin(mDelta / 2), th3 = mTheta + mDelta;
        for (var i = 0; i < segments; i++) {
            result[i] = segmentToBezier(mTheta, th3, cosTh, sinTh, rx, ry, cx1, cy1, mT, fromX, fromY);
            fromX = result[i][4];
            fromY = result[i][5];
            mTheta = th3;
            th3 += mDelta;
        }
        arcToSegmentsCache[argsString] = result;
        return result;
    }
    function segmentToBezier(th2, th3, cosTh, sinTh, rx, ry, cx1, cy1, mT, fromX, fromY) {
        var argsString2 = _join.call(arguments);
        if (segmentToBezierCache[argsString2]) {
            return segmentToBezierCache[argsString2];
        }
        var costh2 = Math.cos(th2), sinth2 = Math.sin(th2), costh3 = Math.cos(th3), sinth3 = Math.sin(th3), toX = cosTh * rx * costh3 - sinTh * ry * sinth3 + cx1, toY = sinTh * rx * costh3 + cosTh * ry * sinth3 + cy1, cp1X = fromX + mT * (-cosTh * rx * sinth2 - sinTh * ry * costh2), cp1Y = fromY + mT * (-sinTh * rx * sinth2 + cosTh * ry * costh2), cp2X = toX + mT * (cosTh * rx * sinth3 + sinTh * ry * costh3), cp2Y = toY + mT * (sinTh * rx * sinth3 - cosTh * ry * costh3);
        segmentToBezierCache[argsString2] = [ cp1X, cp1Y, cp2X, cp2Y, toX, toY ];
        return segmentToBezierCache[argsString2];
    }
    function calcVectorAngle(ux, uy, vx, vy) {
        var ta = Math.atan2(uy, ux), tb = Math.atan2(vy, vx);
        if (tb >= ta) {
            return tb - ta;
        } else {
            return 2 * Math.PI - (ta - tb);
        }
    }
    fabric.util.drawArc = function(ctx, fx, fy, coords) {
        var rx = coords[0], ry = coords[1], rot = coords[2], large = coords[3], sweep = coords[4], tx = coords[5], ty = coords[6], segs = [ [], [], [], [] ], segsNorm = arcToSegments(tx - fx, ty - fy, rx, ry, large, sweep, rot);
        for (var i = 0, len = segsNorm.length; i < len; i++) {
            segs[i][0] = segsNorm[i][0] + fx;
            segs[i][1] = segsNorm[i][1] + fy;
            segs[i][2] = segsNorm[i][2] + fx;
            segs[i][3] = segsNorm[i][3] + fy;
            segs[i][4] = segsNorm[i][4] + fx;
            segs[i][5] = segsNorm[i][5] + fy;
            ctx.bezierCurveTo.apply(ctx, segs[i]);
        }
    };
    fabric.util.getBoundsOfArc = function(fx, fy, rx, ry, rot, large, sweep, tx, ty) {
        var fromX = 0, fromY = 0, bound, bounds = [], segs = arcToSegments(tx - fx, ty - fy, rx, ry, large, sweep, rot);
        for (var i = 0, len = segs.length; i < len; i++) {
            bound = getBoundsOfCurve(fromX, fromY, segs[i][0], segs[i][1], segs[i][2], segs[i][3], segs[i][4], segs[i][5]);
            bounds.push({
                x: bound[0].x + fx,
                y: bound[0].y + fy
            });
            bounds.push({
                x: bound[1].x + fx,
                y: bound[1].y + fy
            });
            fromX = segs[i][4];
            fromY = segs[i][5];
        }
        return bounds;
    };
    function getBoundsOfCurve(x0, y0, x1, y1, x2, y2, x3, y3) {
        var argsString = _join.call(arguments);
        if (boundsOfCurveCache[argsString]) {
            return boundsOfCurveCache[argsString];
        }
        var sqrt = Math.sqrt, min = Math.min, max = Math.max, abs = Math.abs, tvalues = [], bounds = [ [], [] ], a, b, c, t, t1, t2, b2ac, sqrtb2ac;
        b = 6 * x0 - 12 * x1 + 6 * x2;
        a = -3 * x0 + 9 * x1 - 9 * x2 + 3 * x3;
        c = 3 * x1 - 3 * x0;
        for (var i = 0; i < 2; ++i) {
            if (i > 0) {
                b = 6 * y0 - 12 * y1 + 6 * y2;
                a = -3 * y0 + 9 * y1 - 9 * y2 + 3 * y3;
                c = 3 * y1 - 3 * y0;
            }
            if (abs(a) < 1e-12) {
                if (abs(b) < 1e-12) {
                    continue;
                }
                t = -c / b;
                if (0 < t && t < 1) {
                    tvalues.push(t);
                }
                continue;
            }
            b2ac = b * b - 4 * c * a;
            if (b2ac < 0) {
                continue;
            }
            sqrtb2ac = sqrt(b2ac);
            t1 = (-b + sqrtb2ac) / (2 * a);
            if (0 < t1 && t1 < 1) {
                tvalues.push(t1);
            }
            t2 = (-b - sqrtb2ac) / (2 * a);
            if (0 < t2 && t2 < 1) {
                tvalues.push(t2);
            }
        }
        var x, y, j = tvalues.length, jlen = j, mt;
        while (j--) {
            t = tvalues[j];
            mt = 1 - t;
            x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
            bounds[0][j] = x;
            y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
            bounds[1][j] = y;
        }
        bounds[0][jlen] = x0;
        bounds[1][jlen] = y0;
        bounds[0][jlen + 1] = x3;
        bounds[1][jlen + 1] = y3;
        var result = [ {
            x: min.apply(null, bounds[0]),
            y: min.apply(null, bounds[1])
        }, {
            x: max.apply(null, bounds[0]),
            y: max.apply(null, bounds[1])
        } ];
        boundsOfCurveCache[argsString] = result;
        return result;
    }
    fabric.util.getBoundsOfCurve = getBoundsOfCurve;
})();

(function() {
    var slice = Array.prototype.slice;
    function invoke(array, method) {
        var args = slice.call(arguments, 2), result = [];
        for (var i = 0, len = array.length; i < len; i++) {
            result[i] = args.length ? array[i][method].apply(array[i], args) : array[i][method].call(array[i]);
        }
        return result;
    }
    function max(array, byProperty) {
        return find(array, byProperty, function(value1, value2) {
            return value1 >= value2;
        });
    }
    function min(array, byProperty) {
        return find(array, byProperty, function(value1, value2) {
            return value1 < value2;
        });
    }
    function fill(array, value) {
        var k = array.length;
        while (k--) {
            array[k] = value;
        }
        return array;
    }
    function find(array, byProperty, condition) {
        if (!array || array.length === 0) {
            return;
        }
        var i = array.length - 1, result = byProperty ? array[i][byProperty] : array[i];
        if (byProperty) {
            while (i--) {
                if (condition(array[i][byProperty], result)) {
                    result = array[i][byProperty];
                }
            }
        } else {
            while (i--) {
                if (condition(array[i], result)) {
                    result = array[i];
                }
            }
        }
        return result;
    }
    fabric.util.array = {
        fill: fill,
        invoke: invoke,
        min: min,
        max: max
    };
})();

(function() {
    function extend(destination, source, deep) {
        if (deep) {
            if (!fabric.isLikelyNode && source instanceof Element) {
                destination = source;
            } else if (source instanceof Array) {
                destination = [];
                for (var i = 0, len = source.length; i < len; i++) {
                    destination[i] = extend({}, source[i], deep);
                }
            } else if (source && typeof source === "object") {
                for (var property in source) {
                    if (source.hasOwnProperty(property)) {
                        destination[property] = extend({}, source[property], deep);
                    }
                }
            } else {
                destination = source;
            }
        } else {
            for (var property in source) {
                destination[property] = source[property];
            }
        }
        return destination;
    }
    function clone(object, deep) {
        return extend({}, object, deep);
    }
    fabric.util.object = {
        extend: extend,
        clone: clone
    };
})();

(function() {
    function camelize(string) {
        return string.replace(/-+(.)?/g, function(match, character) {
            return character ? character.toUpperCase() : "";
        });
    }
    function capitalize(string, firstLetterOnly) {
        return string.charAt(0).toUpperCase() + (firstLetterOnly ? string.slice(1) : string.slice(1).toLowerCase());
    }
    function escapeXml(string) {
        return string.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function graphemeSplit(textstring) {
        var i = 0, graphemes = [];
        for (var i = 0, chr; i < textstring.length; i++) {
            if ((chr = getWholeChar(textstring, i)) === false) {
                continue;
            }
            graphemes.push(chr);
        }
        return graphemes;
    }
    function getWholeChar(str, i) {
        var code = str.charCodeAt(i);
        if (isNaN(code)) {
            return "";
        }
        if (code < 55296 || code > 57343) {
            return str.charAt(i);
        }
        if (55296 <= code && code <= 56319) {
            if (str.length <= i + 1) {
                throw "High surrogate without following low surrogate";
            }
            var next = str.charCodeAt(i + 1);
            if (56320 > next || next > 57343) {
                throw "High surrogate without following low surrogate";
            }
            return str.charAt(i) + str.charAt(i + 1);
        }
        if (i === 0) {
            throw "Low surrogate without preceding high surrogate";
        }
        var prev = str.charCodeAt(i - 1);
        if (55296 > prev || prev > 56319) {
            throw "Low surrogate without preceding high surrogate";
        }
        return false;
    }
    fabric.util.string = {
        camelize: camelize,
        capitalize: capitalize,
        escapeXml: escapeXml,
        graphemeSplit: graphemeSplit
    };
})();

(function() {
    var slice = Array.prototype.slice, emptyFunction = function() {}, IS_DONTENUM_BUGGY = function() {
        for (var p in {
            toString: 1
        }) {
            if (p === "toString") {
                return false;
            }
        }
        return true;
    }(), addMethods = function(klass, source, parent) {
        for (var property in source) {
            if (property in klass.prototype && typeof klass.prototype[property] === "function" && (source[property] + "").indexOf("callSuper") > -1) {
                klass.prototype[property] = function(property) {
                    return function() {
                        var superclass = this.constructor.superclass;
                        this.constructor.superclass = parent;
                        var returnValue = source[property].apply(this, arguments);
                        this.constructor.superclass = superclass;
                        if (property !== "initialize") {
                            return returnValue;
                        }
                    };
                }(property);
            } else {
                klass.prototype[property] = source[property];
            }
            if (IS_DONTENUM_BUGGY) {
                if (source.toString !== Object.prototype.toString) {
                    klass.prototype.toString = source.toString;
                }
                if (source.valueOf !== Object.prototype.valueOf) {
                    klass.prototype.valueOf = source.valueOf;
                }
            }
        }
    };
    function Subclass() {}
    function callSuper(methodName) {
        var parentMethod = null, _this = this;
        while (_this.constructor.superclass) {
            var superClassMethod = _this.constructor.superclass.prototype[methodName];
            if (_this[methodName] !== superClassMethod) {
                parentMethod = superClassMethod;
                break;
            }
            _this = _this.constructor.superclass.prototype;
        }
        if (!parentMethod) {
            return console.log("tried to callSuper " + methodName + ", method not found in prototype chain", this);
        }
        return arguments.length > 1 ? parentMethod.apply(this, slice.call(arguments, 1)) : parentMethod.call(this);
    }
    function createClass() {
        var parent = null, properties = slice.call(arguments, 0);
        if (typeof properties[0] === "function") {
            parent = properties.shift();
        }
        function klass() {
            this.initialize.apply(this, arguments);
        }
        klass.superclass = parent;
        klass.subclasses = [];
        if (parent) {
            Subclass.prototype = parent.prototype;
            klass.prototype = new Subclass();
            parent.subclasses.push(klass);
        }
        for (var i = 0, length = properties.length; i < length; i++) {
            addMethods(klass, properties[i], parent);
        }
        if (!klass.prototype.initialize) {
            klass.prototype.initialize = emptyFunction;
        }
        klass.prototype.constructor = klass;
        klass.prototype.callSuper = callSuper;
        return klass;
    }
    fabric.util.createClass = createClass;
})();

(function() {
    var unknown = "unknown";
    function areHostMethods(object) {
        var methodNames = Array.prototype.slice.call(arguments, 1), t, i, len = methodNames.length;
        for (i = 0; i < len; i++) {
            t = typeof object[methodNames[i]];
            if (!/^(?:function|object|unknown)$/.test(t)) {
                return false;
            }
        }
        return true;
    }
    var getElement, setElement, getUniqueId = function() {
        var uid = 0;
        return function(element) {
            return element.__uniqueID || (element.__uniqueID = "uniqueID__" + uid++);
        };
    }();
    (function() {
        var elements = {};
        getElement = function(uid) {
            return elements[uid];
        };
        setElement = function(uid, element) {
            elements[uid] = element;
        };
    })();
    function createListener(uid, handler) {
        return {
            handler: handler,
            wrappedHandler: createWrappedHandler(uid, handler)
        };
    }
    function createWrappedHandler(uid, handler) {
        return function(e) {
            handler.call(getElement(uid), e || fabric.window.event);
        };
    }
    function createDispatcher(uid, eventName) {
        return function(e) {
            if (handlers[uid] && handlers[uid][eventName]) {
                var handlersForEvent = handlers[uid][eventName];
                for (var i = 0, len = handlersForEvent.length; i < len; i++) {
                    handlersForEvent[i].call(this, e || fabric.window.event);
                }
            }
        };
    }
    var shouldUseAddListenerRemoveListener = areHostMethods(fabric.document.documentElement, "addEventListener", "removeEventListener") && areHostMethods(fabric.window, "addEventListener", "removeEventListener"), shouldUseAttachEventDetachEvent = areHostMethods(fabric.document.documentElement, "attachEvent", "detachEvent") && areHostMethods(fabric.window, "attachEvent", "detachEvent"), listeners = {}, handlers = {}, addListener, removeListener;
    if (shouldUseAddListenerRemoveListener) {
        addListener = function(element, eventName, handler, options) {
            element.addEventListener(eventName, handler, shouldUseAttachEventDetachEvent ? false : options);
        };
        removeListener = function(element, eventName, handler, options) {
            element.removeEventListener(eventName, handler, shouldUseAttachEventDetachEvent ? false : options);
        };
    } else if (shouldUseAttachEventDetachEvent) {
        addListener = function(element, eventName, handler) {
            var uid = getUniqueId(element);
            setElement(uid, element);
            if (!listeners[uid]) {
                listeners[uid] = {};
            }
            if (!listeners[uid][eventName]) {
                listeners[uid][eventName] = [];
            }
            var listener = createListener(uid, handler);
            listeners[uid][eventName].push(listener);
            element.attachEvent("on" + eventName, listener.wrappedHandler);
        };
        removeListener = function(element, eventName, handler) {
            var uid = getUniqueId(element), listener;
            if (listeners[uid] && listeners[uid][eventName]) {
                for (var i = 0, len = listeners[uid][eventName].length; i < len; i++) {
                    listener = listeners[uid][eventName][i];
                    if (listener && listener.handler === handler) {
                        element.detachEvent("on" + eventName, listener.wrappedHandler);
                        listeners[uid][eventName][i] = null;
                    }
                }
            }
        };
    } else {
        addListener = function(element, eventName, handler) {
            var uid = getUniqueId(element);
            if (!handlers[uid]) {
                handlers[uid] = {};
            }
            if (!handlers[uid][eventName]) {
                handlers[uid][eventName] = [];
                var existingHandler = element["on" + eventName];
                if (existingHandler) {
                    handlers[uid][eventName].push(existingHandler);
                }
                element["on" + eventName] = createDispatcher(uid, eventName);
            }
            handlers[uid][eventName].push(handler);
        };
        removeListener = function(element, eventName, handler) {
            var uid = getUniqueId(element);
            if (handlers[uid] && handlers[uid][eventName]) {
                var handlersForEvent = handlers[uid][eventName];
                for (var i = 0, len = handlersForEvent.length; i < len; i++) {
                    if (handlersForEvent[i] === handler) {
                        handlersForEvent.splice(i, 1);
                    }
                }
            }
        };
    }
    fabric.util.addListener = addListener;
    fabric.util.removeListener = removeListener;
    function getPointer(event) {
        event || (event = fabric.window.event);
        var element = event.target || (typeof event.srcElement !== unknown ? event.srcElement : null), scroll = fabric.util.getScrollLeftTop(element);
        return {
            x: pointerX(event) + scroll.left,
            y: pointerY(event) + scroll.top
        };
    }
    var pointerX = function(event) {
        return event.clientX;
    }, pointerY = function(event) {
        return event.clientY;
    };
    function _getPointer(event, pageProp, clientProp) {
        var touchProp = event.type === "touchend" ? "changedTouches" : "touches";
        return event[touchProp] && event[touchProp][0] ? event[touchProp][0][pageProp] - (event[touchProp][0][pageProp] - event[touchProp][0][clientProp]) || event[clientProp] : event[clientProp];
    }
    if (fabric.isTouchSupported) {
        pointerX = function(event) {
            return _getPointer(event, "pageX", "clientX");
        };
        pointerY = function(event) {
            return _getPointer(event, "pageY", "clientY");
        };
    }
    fabric.util.getPointer = getPointer;
    fabric.util.object.extend(fabric.util, fabric.Observable);
})();

(function() {
    function setStyle(element, styles) {
        var elementStyle = element.style;
        if (!elementStyle) {
            return element;
        }
        if (typeof styles === "string") {
            element.style.cssText += ";" + styles;
            return styles.indexOf("opacity") > -1 ? setOpacity(element, styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
        }
        for (var property in styles) {
            if (property === "opacity") {
                setOpacity(element, styles[property]);
            } else {
                var normalizedProperty = property === "float" || property === "cssFloat" ? typeof elementStyle.styleFloat === "undefined" ? "cssFloat" : "styleFloat" : property;
                elementStyle[normalizedProperty] = styles[property];
            }
        }
        return element;
    }
    var parseEl = fabric.document.createElement("div"), supportsOpacity = typeof parseEl.style.opacity === "string", supportsFilters = typeof parseEl.style.filter === "string", reOpacity = /alpha\s*\(\s*opacity\s*=\s*([^\)]+)\)/, setOpacity = function(element) {
        return element;
    };
    if (supportsOpacity) {
        setOpacity = function(element, value) {
            element.style.opacity = value;
            return element;
        };
    } else if (supportsFilters) {
        setOpacity = function(element, value) {
            var es = element.style;
            if (element.currentStyle && !element.currentStyle.hasLayout) {
                es.zoom = 1;
            }
            if (reOpacity.test(es.filter)) {
                value = value >= .9999 ? "" : "alpha(opacity=" + value * 100 + ")";
                es.filter = es.filter.replace(reOpacity, value);
            } else {
                es.filter += " alpha(opacity=" + value * 100 + ")";
            }
            return element;
        };
    }
    fabric.util.setStyle = setStyle;
})();

(function() {
    var _slice = Array.prototype.slice;
    function getById(id) {
        return typeof id === "string" ? fabric.document.getElementById(id) : id;
    }
    var sliceCanConvertNodelists, toArray = function(arrayLike) {
        return _slice.call(arrayLike, 0);
    };
    try {
        sliceCanConvertNodelists = toArray(fabric.document.childNodes) instanceof Array;
    } catch (err) {}
    if (!sliceCanConvertNodelists) {
        toArray = function(arrayLike) {
            var arr = new Array(arrayLike.length), i = arrayLike.length;
            while (i--) {
                arr[i] = arrayLike[i];
            }
            return arr;
        };
    }
    function makeElement(tagName, attributes) {
        var el = fabric.document.createElement(tagName);
        for (var prop in attributes) {
            if (prop === "class") {
                el.className = attributes[prop];
            } else if (prop === "for") {
                el.htmlFor = attributes[prop];
            } else {
                el.setAttribute(prop, attributes[prop]);
            }
        }
        return el;
    }
    function addClass(element, className) {
        if (element && (" " + element.className + " ").indexOf(" " + className + " ") === -1) {
            element.className += (element.className ? " " : "") + className;
        }
    }
    function wrapElement(element, wrapper, attributes) {
        if (typeof wrapper === "string") {
            wrapper = makeElement(wrapper, attributes);
        }
        if (element.parentNode) {
            element.parentNode.replaceChild(wrapper, element);
        }
        wrapper.appendChild(element);
        return wrapper;
    }
    function getScrollLeftTop(element) {
        var left = 0, top = 0, docElement = fabric.document.documentElement, body = fabric.document.body || {
            scrollLeft: 0,
            scrollTop: 0
        };
        while (element && (element.parentNode || element.host)) {
            element = element.parentNode || element.host;
            if (element === fabric.document) {
                left = body.scrollLeft || docElement.scrollLeft || 0;
                top = body.scrollTop || docElement.scrollTop || 0;
            } else {
                left += element.scrollLeft || 0;
                top += element.scrollTop || 0;
            }
            if (element.nodeType === 1 && fabric.util.getElementStyle(element, "position") === "fixed") {
                break;
            }
        }
        return {
            left: left,
            top: top
        };
    }
    function getElementOffset(element) {
        var docElem, doc = element && element.ownerDocument, box = {
            left: 0,
            top: 0
        }, offset = {
            left: 0,
            top: 0
        }, scrollLeftTop, offsetAttributes = {
            borderLeftWidth: "left",
            borderTopWidth: "top",
            paddingLeft: "left",
            paddingTop: "top"
        };
        if (!doc) {
            return offset;
        }
        for (var attr in offsetAttributes) {
            offset[offsetAttributes[attr]] += parseInt(getElementStyle(element, attr), 10) || 0;
        }
        docElem = doc.documentElement;
        if (typeof element.getBoundingClientRect !== "undefined") {
            box = element.getBoundingClientRect();
        }
        scrollLeftTop = getScrollLeftTop(element);
        return {
            left: box.left + scrollLeftTop.left - (docElem.clientLeft || 0) + offset.left,
            top: box.top + scrollLeftTop.top - (docElem.clientTop || 0) + offset.top
        };
    }
    var getElementStyle;
    if (fabric.document.defaultView && fabric.document.defaultView.getComputedStyle) {
        getElementStyle = function(element, attr) {
            var style = fabric.document.defaultView.getComputedStyle(element, null);
            return style ? style[attr] : undefined;
        };
    } else {
        getElementStyle = function(element, attr) {
            var value = element.style[attr];
            if (!value && element.currentStyle) {
                value = element.currentStyle[attr];
            }
            return value;
        };
    }
    (function() {
        var style = fabric.document.documentElement.style, selectProp = "userSelect" in style ? "userSelect" : "MozUserSelect" in style ? "MozUserSelect" : "WebkitUserSelect" in style ? "WebkitUserSelect" : "KhtmlUserSelect" in style ? "KhtmlUserSelect" : "";
        function makeElementUnselectable(element) {
            if (typeof element.onselectstart !== "undefined") {
                element.onselectstart = fabric.util.falseFunction;
            }
            if (selectProp) {
                element.style[selectProp] = "none";
            } else if (typeof element.unselectable === "string") {
                element.unselectable = "on";
            }
            return element;
        }
        function makeElementSelectable(element) {
            if (typeof element.onselectstart !== "undefined") {
                element.onselectstart = null;
            }
            if (selectProp) {
                element.style[selectProp] = "";
            } else if (typeof element.unselectable === "string") {
                element.unselectable = "";
            }
            return element;
        }
        fabric.util.makeElementUnselectable = makeElementUnselectable;
        fabric.util.makeElementSelectable = makeElementSelectable;
    })();
    (function() {
        function getScript(url, callback) {
            var headEl = fabric.document.getElementsByTagName("head")[0], scriptEl = fabric.document.createElement("script"), loading = true;
            scriptEl.onload = scriptEl.onreadystatechange = function(e) {
                if (loading) {
                    if (typeof this.readyState === "string" && this.readyState !== "loaded" && this.readyState !== "complete") {
                        return;
                    }
                    loading = false;
                    callback(e || fabric.window.event);
                    scriptEl = scriptEl.onload = scriptEl.onreadystatechange = null;
                }
            };
            scriptEl.src = url;
            headEl.appendChild(scriptEl);
        }
        fabric.util.getScript = getScript;
    })();
    fabric.util.getById = getById;
    fabric.util.toArray = toArray;
    fabric.util.makeElement = makeElement;
    fabric.util.addClass = addClass;
    fabric.util.wrapElement = wrapElement;
    fabric.util.getScrollLeftTop = getScrollLeftTop;
    fabric.util.getElementOffset = getElementOffset;
    fabric.util.getElementStyle = getElementStyle;
})();

(function() {
    function addParamToUrl(url, param) {
        return url + (/\?/.test(url) ? "&" : "?") + param;
    }
    var makeXHR = function() {
        var factories = [ function() {
            return new ActiveXObject("Microsoft.XMLHTTP");
        }, function() {
            return new ActiveXObject("Msxml2.XMLHTTP");
        }, function() {
            return new ActiveXObject("Msxml2.XMLHTTP.3.0");
        }, function() {
            return new XMLHttpRequest();
        } ];
        for (var i = factories.length; i--; ) {
            try {
                var req = factories[i]();
                if (req) {
                    return factories[i];
                }
            } catch (err) {}
        }
    }();
    function emptyFn() {}
    function request(url, options) {
        options || (options = {});
        var method = options.method ? options.method.toUpperCase() : "GET", onComplete = options.onComplete || function() {}, xhr = makeXHR(), body = options.body || options.parameters;
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                onComplete(xhr);
                xhr.onreadystatechange = emptyFn;
            }
        };
        if (method === "GET") {
            body = null;
            if (typeof options.parameters === "string") {
                url = addParamToUrl(url, options.parameters);
            }
        }
        xhr.open(method, url, true);
        if (method === "POST" || method === "PUT") {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        }
        xhr.send(body);
        return xhr;
    }
    fabric.util.request = request;
})();

fabric.log = function() {};

fabric.warn = function() {};

if (typeof console !== "undefined") {
    [ "log", "warn" ].forEach(function(methodName) {
        if (typeof console[methodName] !== "undefined" && typeof console[methodName].apply === "function") {
            fabric[methodName] = function() {
                return console[methodName].apply(console, arguments);
            };
        }
    });
}

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {});
    if (fabric.Point) {
        fabric.warn("fabric.Point is already defined");
        return;
    }
    fabric.Point = Point;
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype = {
        type: "point",
        constructor: Point,
        add: function(that) {
            return new Point(this.x + that.x, this.y + that.y);
        },
        addEquals: function(that) {
            this.x += that.x;
            this.y += that.y;
            return this;
        },
        scalarAdd: function(scalar) {
            return new Point(this.x + scalar, this.y + scalar);
        },
        scalarAddEquals: function(scalar) {
            this.x += scalar;
            this.y += scalar;
            return this;
        },
        subtract: function(that) {
            return new Point(this.x - that.x, this.y - that.y);
        },
        subtractEquals: function(that) {
            this.x -= that.x;
            this.y -= that.y;
            return this;
        },
        scalarSubtract: function(scalar) {
            return new Point(this.x - scalar, this.y - scalar);
        },
        scalarSubtractEquals: function(scalar) {
            this.x -= scalar;
            this.y -= scalar;
            return this;
        },
        multiply: function(scalar) {
            return new Point(this.x * scalar, this.y * scalar);
        },
        multiplyEquals: function(scalar) {
            this.x *= scalar;
            this.y *= scalar;
            return this;
        },
        divide: function(scalar) {
            return new Point(this.x / scalar, this.y / scalar);
        },
        divideEquals: function(scalar) {
            this.x /= scalar;
            this.y /= scalar;
            return this;
        },
        eq: function(that) {
            return this.x === that.x && this.y === that.y;
        },
        lt: function(that) {
            return this.x < that.x && this.y < that.y;
        },
        lte: function(that) {
            return this.x <= that.x && this.y <= that.y;
        },
        gt: function(that) {
            return this.x > that.x && this.y > that.y;
        },
        gte: function(that) {
            return this.x >= that.x && this.y >= that.y;
        },
        lerp: function(that, t) {
            if (typeof t === "undefined") {
                t = .5;
            }
            t = Math.max(Math.min(1, t), 0);
            return new Point(this.x + (that.x - this.x) * t, this.y + (that.y - this.y) * t);
        },
        distanceFrom: function(that) {
            var dx = this.x - that.x, dy = this.y - that.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        midPointFrom: function(that) {
            return this.lerp(that);
        },
        min: function(that) {
            return new Point(Math.min(this.x, that.x), Math.min(this.y, that.y));
        },
        max: function(that) {
            return new Point(Math.max(this.x, that.x), Math.max(this.y, that.y));
        },
        toString: function() {
            return this.x + "," + this.y;
        },
        setXY: function(x, y) {
            this.x = x;
            this.y = y;
            return this;
        },
        setX: function(x) {
            this.x = x;
            return this;
        },
        setY: function(y) {
            this.y = y;
            return this;
        },
        setFromPoint: function(that) {
            this.x = that.x;
            this.y = that.y;
            return this;
        },
        swap: function(that) {
            var x = this.x, y = this.y;
            this.x = that.x;
            this.y = that.y;
            that.x = x;
            that.y = y;
        },
        clone: function() {
            return new Point(this.x, this.y);
        }
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {});
    if (fabric.Intersection) {
        fabric.warn("fabric.Intersection is already defined");
        return;
    }
    function Intersection(status) {
        this.status = status;
        this.points = [];
    }
    fabric.Intersection = Intersection;
    fabric.Intersection.prototype = {
        constructor: Intersection,
        appendPoint: function(point) {
            this.points.push(point);
            return this;
        },
        appendPoints: function(points) {
            this.points = this.points.concat(points);
            return this;
        }
    };
    fabric.Intersection.intersectLineLine = function(a1, a2, b1, b2) {
        var result, uaT = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x), ubT = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x), uB = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
        if (uB !== 0) {
            var ua = uaT / uB, ub = ubT / uB;
            if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
                result = new Intersection("Intersection");
                result.appendPoint(new fabric.Point(a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)));
            } else {
                result = new Intersection();
            }
        } else {
            if (uaT === 0 || ubT === 0) {
                result = new Intersection("Coincident");
            } else {
                result = new Intersection("Parallel");
            }
        }
        return result;
    };
    fabric.Intersection.intersectLinePolygon = function(a1, a2, points) {
        var result = new Intersection(), length = points.length, b1, b2, inter;
        for (var i = 0; i < length; i++) {
            b1 = points[i];
            b2 = points[(i + 1) % length];
            inter = Intersection.intersectLineLine(a1, a2, b1, b2);
            result.appendPoints(inter.points);
        }
        if (result.points.length > 0) {
            result.status = "Intersection";
        }
        return result;
    };
    fabric.Intersection.intersectPolygonPolygon = function(points1, points2) {
        var result = new Intersection(), length = points1.length;
        for (var i = 0; i < length; i++) {
            var a1 = points1[i], a2 = points1[(i + 1) % length], inter = Intersection.intersectLinePolygon(a1, a2, points2);
            result.appendPoints(inter.points);
        }
        if (result.points.length > 0) {
            result.status = "Intersection";
        }
        return result;
    };
    fabric.Intersection.intersectPolygonRectangle = function(points, r1, r2) {
        var min = r1.min(r2), max = r1.max(r2), topRight = new fabric.Point(max.x, min.y), bottomLeft = new fabric.Point(min.x, max.y), inter1 = Intersection.intersectLinePolygon(min, topRight, points), inter2 = Intersection.intersectLinePolygon(topRight, max, points), inter3 = Intersection.intersectLinePolygon(max, bottomLeft, points), inter4 = Intersection.intersectLinePolygon(bottomLeft, min, points), result = new Intersection();
        result.appendPoints(inter1.points);
        result.appendPoints(inter2.points);
        result.appendPoints(inter3.points);
        result.appendPoints(inter4.points);
        if (result.points.length > 0) {
            result.status = "Intersection";
        }
        return result;
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {});
    if (fabric.Color) {
        fabric.warn("fabric.Color is already defined.");
        return;
    }
    function Color(color) {
        if (!color) {
            this.setSource([ 0, 0, 0, 1 ]);
        } else {
            this._tryParsingColor(color);
        }
    }
    fabric.Color = Color;
    fabric.Color.prototype = {
        _tryParsingColor: function(color) {
            var source;
            if (color in Color.colorNameMap) {
                color = Color.colorNameMap[color];
            }
            if (color === "transparent") {
                source = [ 255, 255, 255, 0 ];
            }
            if (!source) {
                source = Color.sourceFromHex(color);
            }
            if (!source) {
                source = Color.sourceFromRgb(color);
            }
            if (!source) {
                source = Color.sourceFromHsl(color);
            }
            if (!source) {
                source = [ 0, 0, 0, 1 ];
            }
            if (source) {
                this.setSource(source);
            }
        },
        _rgbToHsl: function(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;
            var h, s, l, max = fabric.util.array.max([ r, g, b ]), min = fabric.util.array.min([ r, g, b ]);
            l = (max + min) / 2;
            if (max === min) {
                h = s = 0;
            } else {
                var d = max - min;
                s = l > .5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;

                  case g:
                    h = (b - r) / d + 2;
                    break;

                  case b:
                    h = (r - g) / d + 4;
                    break;
                }
                h /= 6;
            }
            return [ Math.round(h * 360), Math.round(s * 100), Math.round(l * 100) ];
        },
        getSource: function() {
            return this._source;
        },
        setSource: function(source) {
            this._source = source;
        },
        toRgb: function() {
            var source = this.getSource();
            return "rgb(" + source[0] + "," + source[1] + "," + source[2] + ")";
        },
        toRgba: function() {
            var source = this.getSource();
            return "rgba(" + source[0] + "," + source[1] + "," + source[2] + "," + source[3] + ")";
        },
        toHsl: function() {
            var source = this.getSource(), hsl = this._rgbToHsl(source[0], source[1], source[2]);
            return "hsl(" + hsl[0] + "," + hsl[1] + "%," + hsl[2] + "%)";
        },
        toHsla: function() {
            var source = this.getSource(), hsl = this._rgbToHsl(source[0], source[1], source[2]);
            return "hsla(" + hsl[0] + "," + hsl[1] + "%," + hsl[2] + "%," + source[3] + ")";
        },
        toHex: function() {
            var source = this.getSource(), r, g, b;
            r = source[0].toString(16);
            r = r.length === 1 ? "0" + r : r;
            g = source[1].toString(16);
            g = g.length === 1 ? "0" + g : g;
            b = source[2].toString(16);
            b = b.length === 1 ? "0" + b : b;
            return r.toUpperCase() + g.toUpperCase() + b.toUpperCase();
        },
        toHexa: function() {
            var source = this.getSource(), a;
            a = source[3] * 255;
            a = a.toString(16);
            a = a.length === 1 ? "0" + a : a;
            return this.toHex() + a.toUpperCase();
        },
        getAlpha: function() {
            return this.getSource()[3];
        },
        setAlpha: function(alpha) {
            var source = this.getSource();
            source[3] = alpha;
            this.setSource(source);
            return this;
        },
        toGrayscale: function() {
            var source = this.getSource(), average = parseInt((source[0] * .3 + source[1] * .59 + source[2] * .11).toFixed(0), 10), currentAlpha = source[3];
            this.setSource([ average, average, average, currentAlpha ]);
            return this;
        },
        toBlackWhite: function(threshold) {
            var source = this.getSource(), average = (source[0] * .3 + source[1] * .59 + source[2] * .11).toFixed(0), currentAlpha = source[3];
            threshold = threshold || 127;
            average = Number(average) < Number(threshold) ? 0 : 255;
            this.setSource([ average, average, average, currentAlpha ]);
            return this;
        },
        overlayWith: function(otherColor) {
            if (!(otherColor instanceof Color)) {
                otherColor = new Color(otherColor);
            }
            var result = [], alpha = this.getAlpha(), otherAlpha = .5, source = this.getSource(), otherSource = otherColor.getSource();
            for (var i = 0; i < 3; i++) {
                result.push(Math.round(source[i] * (1 - otherAlpha) + otherSource[i] * otherAlpha));
            }
            result[3] = alpha;
            this.setSource(result);
            return this;
        }
    };
    fabric.Color.reRGBa = /^rgba?\(\s*(\d{1,3}(?:\.\d+)?\%?)\s*,\s*(\d{1,3}(?:\.\d+)?\%?)\s*,\s*(\d{1,3}(?:\.\d+)?\%?)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)$/;
    fabric.Color.reHSLa = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3}\%)\s*,\s*(\d{1,3}\%)\s*(?:\s*,\s*(\d+(?:\.\d+)?)\s*)?\)$/;
    fabric.Color.reHex = /^#?([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})$/i;
    fabric.Color.colorNameMap = {
        aqua: "#00FFFF",
        black: "#000000",
        blue: "#0000FF",
        fuchsia: "#FF00FF",
        gray: "#808080",
        grey: "#808080",
        green: "#008000",
        lime: "#00FF00",
        maroon: "#800000",
        navy: "#000080",
        olive: "#808000",
        orange: "#FFA500",
        purple: "#800080",
        red: "#FF0000",
        silver: "#C0C0C0",
        teal: "#008080",
        white: "#FFFFFF",
        yellow: "#FFFF00"
    };
    function hue2rgb(p, q, t) {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    }
    fabric.Color.fromRgb = function(color) {
        return Color.fromSource(Color.sourceFromRgb(color));
    };
    fabric.Color.sourceFromRgb = function(color) {
        var match = color.match(Color.reRGBa);
        if (match) {
            var r = parseInt(match[1], 10) / (/%$/.test(match[1]) ? 100 : 1) * (/%$/.test(match[1]) ? 255 : 1), g = parseInt(match[2], 10) / (/%$/.test(match[2]) ? 100 : 1) * (/%$/.test(match[2]) ? 255 : 1), b = parseInt(match[3], 10) / (/%$/.test(match[3]) ? 100 : 1) * (/%$/.test(match[3]) ? 255 : 1);
            return [ parseInt(r, 10), parseInt(g, 10), parseInt(b, 10), match[4] ? parseFloat(match[4]) : 1 ];
        }
    };
    fabric.Color.fromRgba = Color.fromRgb;
    fabric.Color.fromHsl = function(color) {
        return Color.fromSource(Color.sourceFromHsl(color));
    };
    fabric.Color.sourceFromHsl = function(color) {
        var match = color.match(Color.reHSLa);
        if (!match) {
            return;
        }
        var h = (parseFloat(match[1]) % 360 + 360) % 360 / 360, s = parseFloat(match[2]) / (/%$/.test(match[2]) ? 100 : 1), l = parseFloat(match[3]) / (/%$/.test(match[3]) ? 100 : 1), r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            var q = l <= .5 ? l * (s + 1) : l + s - l * s, p = l * 2 - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), match[4] ? parseFloat(match[4]) : 1 ];
    };
    fabric.Color.fromHsla = Color.fromHsl;
    fabric.Color.fromHex = function(color) {
        return Color.fromSource(Color.sourceFromHex(color));
    };
    fabric.Color.sourceFromHex = function(color) {
        if (color.match(Color.reHex)) {
            var value = color.slice(color.indexOf("#") + 1), isShortNotation = value.length === 3 || value.length === 4, isRGBa = value.length === 8 || value.length === 4, r = isShortNotation ? value.charAt(0) + value.charAt(0) : value.substring(0, 2), g = isShortNotation ? value.charAt(1) + value.charAt(1) : value.substring(2, 4), b = isShortNotation ? value.charAt(2) + value.charAt(2) : value.substring(4, 6), a = isRGBa ? isShortNotation ? value.charAt(3) + value.charAt(3) : value.substring(6, 8) : "FF";
            return [ parseInt(r, 16), parseInt(g, 16), parseInt(b, 16), parseFloat((parseInt(a, 16) / 255).toFixed(2)) ];
        }
    };
    fabric.Color.fromSource = function(source) {
        var oColor = new Color();
        oColor.setSource(source);
        return oColor;
    };
})(typeof exports !== "undefined" ? exports : this);

(function() {
    "use strict";
    if (fabric.StaticCanvas) {
        fabric.warn("fabric.StaticCanvas is already defined.");
        return;
    }
    var extend = fabric.util.object.extend, getElementOffset = fabric.util.getElementOffset, removeFromArray = fabric.util.removeFromArray, toFixed = fabric.util.toFixed, transformPoint = fabric.util.transformPoint, invertTransform = fabric.util.invertTransform, CANVAS_INIT_ERROR = new Error("Could not initialize `canvas` element");
    fabric.StaticCanvas = fabric.util.createClass(fabric.CommonMethods, {
        initialize: function(el, options) {
            options || (options = {});
            this._initStatic(el, options);
        },
        backgroundColor: "",
        backgroundImage: null,
        overlayColor: "",
        overlayImage: null,
        includeDefaultValues: true,
        stateful: false,
        renderOnAddRemove: true,
        clipTo: null,
        controlsAboveOverlay: false,
        allowTouchScrolling: false,
        imageSmoothingEnabled: true,
        viewportTransform: fabric.iMatrix.concat(),
        backgroundVpt: true,
        overlayVpt: true,
        onBeforeScaleRotate: function() {},
        enableRetinaScaling: true,
        vptCoords: {},
        skipOffscreen: true,
        _initStatic: function(el, options) {
            var cb = fabric.StaticCanvas.prototype.renderAll.bind(this);
            this._objects = [];
            this._createLowerCanvas(el);
            this._initOptions(options);
            this._setImageSmoothing();
            if (!this.interactive) {
                this._initRetinaScaling();
            }
            if (options.overlayImage) {
                this.setOverlayImage(options.overlayImage, cb);
            }
            if (options.backgroundImage) {
                this.setBackgroundImage(options.backgroundImage, cb);
            }
            if (options.backgroundColor) {
                this.setBackgroundColor(options.backgroundColor, cb);
            }
            if (options.overlayColor) {
                this.setOverlayColor(options.overlayColor, cb);
            }
            this.calcOffset();
        },
        _isRetinaScaling: function() {
            return fabric.devicePixelRatio !== 1 && this.enableRetinaScaling;
        },
        getRetinaScaling: function() {
            return this._isRetinaScaling() ? fabric.devicePixelRatio : 1;
        },
        _initRetinaScaling: function() {
            if (!this._isRetinaScaling()) {
                return;
            }
            this.lowerCanvasEl.setAttribute("width", this.width * fabric.devicePixelRatio);
            this.lowerCanvasEl.setAttribute("height", this.height * fabric.devicePixelRatio);
            this.contextContainer.scale(fabric.devicePixelRatio, fabric.devicePixelRatio);
        },
        calcOffset: function() {
            this._offset = getElementOffset(this.lowerCanvasEl);
            return this;
        },
        setOverlayImage: function(image, callback, options) {
            return this.__setBgOverlayImage("overlayImage", image, callback, options);
        },
        setBackgroundImage: function(image, callback, options) {
            return this.__setBgOverlayImage("backgroundImage", image, callback, options);
        },
        setOverlayColor: function(overlayColor, callback) {
            return this.__setBgOverlayColor("overlayColor", overlayColor, callback);
        },
        setBackgroundColor: function(backgroundColor, callback) {
            return this.__setBgOverlayColor("backgroundColor", backgroundColor, callback);
        },
        _setImageSmoothing: function() {
            var ctx = this.getContext();
            ctx.imageSmoothingEnabled = ctx.imageSmoothingEnabled || ctx.webkitImageSmoothingEnabled || ctx.mozImageSmoothingEnabled || ctx.msImageSmoothingEnabled || ctx.oImageSmoothingEnabled;
            ctx.imageSmoothingEnabled = this.imageSmoothingEnabled;
        },
        __setBgOverlayImage: function(property, image, callback, options) {
            if (typeof image === "string") {
                fabric.util.loadImage(image, function(img) {
                    img && (this[property] = new fabric.Image(img, options));
                    callback && callback(img);
                }, this, options && options.crossOrigin);
            } else {
                options && image.setOptions(options);
                this[property] = image;
                callback && callback(image);
            }
            return this;
        },
        __setBgOverlayColor: function(property, color, callback) {
            this[property] = color;
            this._initGradient(color, property);
            this._initPattern(color, property, callback);
            return this;
        },
        _createCanvasElement: function(canvasEl) {
            var element = fabric.util.createCanvasElement(canvasEl);
            if (!element.style) {
                element.style = {};
            }
            if (!element) {
                throw CANVAS_INIT_ERROR;
            }
            if (typeof element.getContext === "undefined") {
                throw CANVAS_INIT_ERROR;
            }
            return element;
        },
        _initOptions: function(options) {
            this._setOptions(options);
            this.width = this.width || parseInt(this.lowerCanvasEl.width, 10) || 0;
            this.height = this.height || parseInt(this.lowerCanvasEl.height, 10) || 0;
            if (!this.lowerCanvasEl.style) {
                return;
            }
            this.lowerCanvasEl.width = this.width;
            this.lowerCanvasEl.height = this.height;
            this.lowerCanvasEl.style.width = this.width + "px";
            this.lowerCanvasEl.style.height = this.height + "px";
            this.viewportTransform = this.viewportTransform.slice();
        },
        _createLowerCanvas: function(canvasEl) {
            this.lowerCanvasEl = fabric.util.getById(canvasEl) || this._createCanvasElement(canvasEl);
            fabric.util.addClass(this.lowerCanvasEl, "lower-canvas");
            if (this.interactive) {
                this._applyCanvasStyle(this.lowerCanvasEl);
            }
            this.contextContainer = this.lowerCanvasEl.getContext("2d");
        },
        getWidth: function() {
            return this.width;
        },
        getHeight: function() {
            return this.height;
        },
        setWidth: function(value, options) {
            return this.setDimensions({
                width: value
            }, options);
        },
        setHeight: function(value, options) {
            return this.setDimensions({
                height: value
            }, options);
        },
        setDimensions: function(dimensions, options) {
            var cssValue;
            options = options || {};
            for (var prop in dimensions) {
                cssValue = dimensions[prop];
                if (!options.cssOnly) {
                    this._setBackstoreDimension(prop, dimensions[prop]);
                    cssValue += "px";
                }
                if (!options.backstoreOnly) {
                    this._setCssDimension(prop, cssValue);
                }
            }
            this._initRetinaScaling();
            this._setImageSmoothing();
            this.calcOffset();
            if (!options.cssOnly) {
                this.renderAll();
            }
            return this;
        },
        _setBackstoreDimension: function(prop, value) {
            this.lowerCanvasEl[prop] = value;
            if (this.upperCanvasEl) {
                this.upperCanvasEl[prop] = value;
            }
            if (this.cacheCanvasEl) {
                this.cacheCanvasEl[prop] = value;
            }
            this[prop] = value;
            return this;
        },
        _setCssDimension: function(prop, value) {
            this.lowerCanvasEl.style[prop] = value;
            if (this.upperCanvasEl) {
                this.upperCanvasEl.style[prop] = value;
            }
            if (this.wrapperEl) {
                this.wrapperEl.style[prop] = value;
            }
            return this;
        },
        getZoom: function() {
            return this.viewportTransform[0];
        },
        setViewportTransform: function(vpt) {
            var activeGroup = this._activeGroup, object, ingoreVpt = false, skipAbsolute = true;
            this.viewportTransform = vpt;
            for (var i = 0, len = this._objects.length; i < len; i++) {
                object = this._objects[i];
                object.group || object.setCoords(ingoreVpt, skipAbsolute);
            }
            if (activeGroup) {
                activeGroup.setCoords(ingoreVpt, skipAbsolute);
            }
            this.calcViewportBoundaries();
            this.renderAll();
            return this;
        },
        zoomToPoint: function(point, value) {
            var before = point, vpt = this.viewportTransform.slice(0);
            point = transformPoint(point, invertTransform(this.viewportTransform));
            vpt[0] = value;
            vpt[3] = value;
            var after = transformPoint(point, vpt);
            vpt[4] += before.x - after.x;
            vpt[5] += before.y - after.y;
            return this.setViewportTransform(vpt);
        },
        setZoom: function(value) {
            this.zoomToPoint(new fabric.Point(0, 0), value);
            return this;
        },
        absolutePan: function(point) {
            var vpt = this.viewportTransform.slice(0);
            vpt[4] = -point.x;
            vpt[5] = -point.y;
            return this.setViewportTransform(vpt);
        },
        relativePan: function(point) {
            return this.absolutePan(new fabric.Point(-point.x - this.viewportTransform[4], -point.y - this.viewportTransform[5]));
        },
        getElement: function() {
            return this.lowerCanvasEl;
        },
        _onObjectAdded: function(obj) {
            this.stateful && obj.setupState();
            obj._set("canvas", this);
            obj.setCoords();
            this.fire("object:added", {
                target: obj
            });
            obj.fire("added");
        },
        _onObjectRemoved: function(obj) {
            this.fire("object:removed", {
                target: obj
            });
            obj.fire("removed");
            delete obj.canvas;
        },
        clearContext: function(ctx) {
            ctx.clearRect(0, 0, this.width, this.height);
            return this;
        },
        getContext: function() {
            return this.contextContainer;
        },
        clear: function() {
            this._objects.length = 0;
            this.backgroundImage = null;
            this.overlayImage = null;
            this.backgroundColor = "";
            this.overlayColor = "";
            if (this._hasITextHandlers) {
                this.off("mouse:up", this._mouseUpITextHandler);
                this._iTextInstances = null;
                this._hasITextHandlers = false;
            }
            this.clearContext(this.contextContainer);
            this.fire("canvas:cleared");
            this.renderAll();
            return this;
        },
        renderAll: function() {
            var canvasToDrawOn = this.contextContainer;
            this.renderCanvas(canvasToDrawOn, this._objects);
            return this;
        },
        calcViewportBoundaries: function() {
            var points = {}, width = this.getWidth(), height = this.getHeight(), iVpt = invertTransform(this.viewportTransform);
            points.tl = transformPoint({
                x: 0,
                y: 0
            }, iVpt);
            points.br = transformPoint({
                x: width,
                y: height
            }, iVpt);
            points.tr = new fabric.Point(points.br.x, points.tl.y);
            points.bl = new fabric.Point(points.tl.x, points.br.y);
            this.vptCoords = points;
            return points;
        },
        renderCanvas: function(ctx, objects) {
            this.calcViewportBoundaries();
            this.clearContext(ctx);
            this.fire("before:render");
            if (this.clipTo) {
                fabric.util.clipContext(this, ctx);
            }
            this._renderBackground(ctx);
            ctx.save();
            ctx.transform.apply(ctx, this.viewportTransform);
            this._renderObjects(ctx, objects);
            ctx.restore();
            if (!this.controlsAboveOverlay && this.interactive) {
                this.drawControls(ctx);
            }
            if (this.clipTo) {
                ctx.restore();
            }
            this._renderOverlay(ctx);
            if (this.controlsAboveOverlay && this.interactive) {
                this.drawControls(ctx);
            }
            this.fire("after:render");
        },
        _renderObjects: function(ctx, objects) {
            for (var i = 0, length = objects.length; i < length; ++i) {
                objects[i] && objects[i].render(ctx);
            }
        },
        _renderBackgroundOrOverlay: function(ctx, property) {
            var object = this[property + "Color"];
            if (object) {
                ctx.fillStyle = object.toLive ? object.toLive(ctx, this) : object;
                ctx.fillRect(object.offsetX || 0, object.offsetY || 0, this.width, this.height);
            }
            object = this[property + "Image"];
            if (object) {
                if (this[property + "Vpt"]) {
                    ctx.save();
                    ctx.transform.apply(ctx, this.viewportTransform);
                }
                object.render(ctx);
                this[property + "Vpt"] && ctx.restore();
            }
        },
        _renderBackground: function(ctx) {
            this._renderBackgroundOrOverlay(ctx, "background");
        },
        _renderOverlay: function(ctx) {
            this._renderBackgroundOrOverlay(ctx, "overlay");
        },
        getCenter: function() {
            return {
                top: this.getHeight() / 2,
                left: this.getWidth() / 2
            };
        },
        centerObjectH: function(object) {
            return this._centerObject(object, new fabric.Point(this.getCenter().left, object.getCenterPoint().y));
        },
        centerObjectV: function(object) {
            return this._centerObject(object, new fabric.Point(object.getCenterPoint().x, this.getCenter().top));
        },
        centerObject: function(object) {
            var center = this.getCenter();
            return this._centerObject(object, new fabric.Point(center.left, center.top));
        },
        viewportCenterObject: function(object) {
            var vpCenter = this.getVpCenter();
            return this._centerObject(object, vpCenter);
        },
        viewportCenterObjectH: function(object) {
            var vpCenter = this.getVpCenter();
            this._centerObject(object, new fabric.Point(vpCenter.x, object.getCenterPoint().y));
            return this;
        },
        viewportCenterObjectV: function(object) {
            var vpCenter = this.getVpCenter();
            return this._centerObject(object, new fabric.Point(object.getCenterPoint().x, vpCenter.y));
        },
        getVpCenter: function() {
            var center = this.getCenter(), iVpt = invertTransform(this.viewportTransform);
            return transformPoint({
                x: center.left,
                y: center.top
            }, iVpt);
        },
        _centerObject: function(object, center) {
            object.setPositionByOrigin(center, "center", "center");
            this.renderAll();
            return this;
        },
        toDatalessJSON: function(propertiesToInclude) {
            return this.toDatalessObject(propertiesToInclude);
        },
        toObject: function(propertiesToInclude) {
            return this._toObjectMethod("toObject", propertiesToInclude);
        },
        toDatalessObject: function(propertiesToInclude) {
            return this._toObjectMethod("toDatalessObject", propertiesToInclude);
        },
        _toObjectMethod: function(methodName, propertiesToInclude) {
            var data = {
                objects: this._toObjects(methodName, propertiesToInclude)
            };
            extend(data, this.__serializeBgOverlay(methodName, propertiesToInclude));
            fabric.util.populateWithProperties(this, data, propertiesToInclude);
            return data;
        },
        _toObjects: function(methodName, propertiesToInclude) {
            return this.getObjects().filter(function(object) {
                return !object.excludeFromExport;
            }).map(function(instance) {
                return this._toObject(instance, methodName, propertiesToInclude);
            }, this);
        },
        _toObject: function(instance, methodName, propertiesToInclude) {
            var originalValue;
            if (!this.includeDefaultValues) {
                originalValue = instance.includeDefaultValues;
                instance.includeDefaultValues = false;
            }
            var object = instance[methodName](propertiesToInclude);
            if (!this.includeDefaultValues) {
                instance.includeDefaultValues = originalValue;
            }
            return object;
        },
        __serializeBgOverlay: function(methodName, propertiesToInclude) {
            var data = {};
            if (this.backgroundColor) {
                data.background = this.backgroundColor.toObject ? this.backgroundColor.toObject(propertiesToInclude) : this.backgroundColor;
            }
            if (this.overlayColor) {
                data.overlay = this.overlayColor.toObject ? this.overlayColor.toObject(propertiesToInclude) : this.overlayColor;
            }
            if (this.backgroundImage) {
                data.backgroundImage = this._toObject(this.backgroundImage, methodName, propertiesToInclude);
            }
            if (this.overlayImage) {
                data.overlayImage = this._toObject(this.overlayImage, methodName, propertiesToInclude);
            }
            return data;
        },
        svgViewportTransformation: true,
        toSVG: function(options, reviver) {
            options || (options = {});
            var markup = [];
            this._setSVGPreamble(markup, options);
            this._setSVGHeader(markup, options);
            this._setSVGBgOverlayColor(markup, "backgroundColor");
            this._setSVGBgOverlayImage(markup, "backgroundImage", reviver);
            this._setSVGObjects(markup, reviver);
            this._setSVGBgOverlayColor(markup, "overlayColor");
            this._setSVGBgOverlayImage(markup, "overlayImage", reviver);
            markup.push("</svg>");
            return markup.join("");
        },
        _setSVGPreamble: function(markup, options) {
            if (options.suppressPreamble) {
                return;
            }
            markup.push('<?xml version="1.0" encoding="', options.encoding || "UTF-8", '" standalone="no" ?>\n', '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ', '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n');
        },
        _setSVGHeader: function(markup, options) {
            var width = options.width || this.width, height = options.height || this.height, vpt, viewBox = 'viewBox="0 0 ' + this.width + " " + this.height + '" ', NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS;
            if (options.viewBox) {
                viewBox = 'viewBox="' + options.viewBox.x + " " + options.viewBox.y + " " + options.viewBox.width + " " + options.viewBox.height + '" ';
            } else {
                if (this.svgViewportTransformation) {
                    vpt = this.viewportTransform;
                    viewBox = 'viewBox="' + toFixed(-vpt[4] / vpt[0], NUM_FRACTION_DIGITS) + " " + toFixed(-vpt[5] / vpt[3], NUM_FRACTION_DIGITS) + " " + toFixed(this.width / vpt[0], NUM_FRACTION_DIGITS) + " " + toFixed(this.height / vpt[3], NUM_FRACTION_DIGITS) + '" ';
                }
            }
            markup.push("<svg ", 'xmlns="http://www.w3.org/2000/svg" ', 'xmlns:xlink="http://www.w3.org/1999/xlink" ', 'version="1.1" ', 'width="', width, '" ', 'height="', height, '" ', viewBox, 'xml:space="preserve">\n', "<desc>Created with Fabric.js ", fabric.version, "</desc>\n", "<defs>\n", this.createSVGFontFacesMarkup(), this.createSVGRefElementsMarkup(), "</defs>\n");
        },
        createSVGRefElementsMarkup: function() {
            var _this = this, markup = [ "backgroundColor", "overlayColor" ].map(function(prop) {
                var fill = _this[prop];
                if (fill && fill.toLive) {
                    return fill.toSVG(_this, false);
                }
            });
            return markup.join("");
        },
        createSVGFontFacesMarkup: function() {
            var markup = "", fontList = {}, obj, fontFamily, style, row, rowIndex, _char, charIndex, fontPaths = fabric.fontPaths, objects = this.getObjects();
            for (var i = 0, len = objects.length; i < len; i++) {
                obj = objects[i];
                fontFamily = obj.fontFamily;
                if (obj.type.indexOf("text") === -1 || fontList[fontFamily] || !fontPaths[fontFamily]) {
                    continue;
                }
                fontList[fontFamily] = true;
                if (!obj.styles) {
                    continue;
                }
                style = obj.styles;
                for (rowIndex in style) {
                    row = style[rowIndex];
                    for (charIndex in row) {
                        _char = row[charIndex];
                        fontFamily = _char.fontFamily;
                        if (!fontList[fontFamily] && fontPaths[fontFamily]) {
                            fontList[fontFamily] = true;
                        }
                    }
                }
            }
            for (var j in fontList) {
                markup += [ "\t\t@font-face {\n", "\t\t\tfont-family: '", j, "';\n", "\t\t\tsrc: url('", fontPaths[j], "');\n", "\t\t}\n" ].join("");
            }
            if (markup) {
                markup = [ '\t<style type="text/css">', "<![CDATA[\n", markup, "]]>", "</style>\n" ].join("");
            }
            return markup;
        },
        _setSVGObjects: function(markup, reviver) {
            var instance;
            for (var i = 0, objects = this.getObjects(), len = objects.length; i < len; i++) {
                instance = objects[i];
                if (instance.excludeFromExport) {
                    continue;
                }
                this._setSVGObject(markup, instance, reviver);
            }
        },
        _setSVGObject: function(markup, instance, reviver) {
            markup.push(instance.toSVG(reviver));
        },
        _setSVGBgOverlayImage: function(markup, property, reviver) {
            if (this[property] && this[property].toSVG) {
                markup.push(this[property].toSVG(reviver));
            }
        },
        _setSVGBgOverlayColor: function(markup, property) {
            var filler = this[property];
            if (!filler) {
                return;
            }
            if (filler.toLive) {
                var repeat = filler.repeat;
                markup.push('<rect transform="translate(', this.width / 2, ",", this.height / 2, ')"', ' x="', filler.offsetX - this.width / 2, '" y="', filler.offsetY - this.height / 2, '" ', 'width="', repeat === "repeat-y" || repeat === "no-repeat" ? filler.source.width : this.width, '" height="', repeat === "repeat-x" || repeat === "no-repeat" ? filler.source.height : this.height, '" fill="url(#SVGID_' + filler.id + ')"', "></rect>\n");
            } else {
                markup.push('<rect x="0" y="0" ', 'width="', this.width, '" height="', this.height, '" fill="', this[property], '"', "></rect>\n");
            }
        },
        sendToBack: function(object) {
            if (!object) {
                return this;
            }
            var activeGroup = this._activeGroup, i, obj, objs;
            if (object === activeGroup) {
                objs = activeGroup._objects;
                for (i = objs.length; i--; ) {
                    obj = objs[i];
                    removeFromArray(this._objects, obj);
                    this._objects.unshift(obj);
                }
            } else {
                removeFromArray(this._objects, object);
                this._objects.unshift(object);
            }
            return this.renderAll && this.renderAll();
        },
        bringToFront: function(object) {
            if (!object) {
                return this;
            }
            var activeGroup = this._activeGroup, i, obj, objs;
            if (object === activeGroup) {
                objs = activeGroup._objects;
                for (i = 0; i < objs.length; i++) {
                    obj = objs[i];
                    removeFromArray(this._objects, obj);
                    this._objects.push(obj);
                }
            } else {
                removeFromArray(this._objects, object);
                this._objects.push(object);
            }
            return this.renderAll && this.renderAll();
        },
        sendBackwards: function(object, intersecting) {
            if (!object) {
                return this;
            }
            var activeGroup = this._activeGroup, i, obj, idx, newIdx, objs;
            if (object === activeGroup) {
                objs = activeGroup._objects;
                for (i = 0; i < objs.length; i++) {
                    obj = objs[i];
                    idx = this._objects.indexOf(obj);
                    if (idx !== 0) {
                        newIdx = idx - 1;
                        removeFromArray(this._objects, obj);
                        this._objects.splice(newIdx, 0, obj);
                    }
                }
            } else {
                idx = this._objects.indexOf(object);
                if (idx !== 0) {
                    newIdx = this._findNewLowerIndex(object, idx, intersecting);
                    removeFromArray(this._objects, object);
                    this._objects.splice(newIdx, 0, object);
                }
            }
            this.renderAll && this.renderAll();
            return this;
        },
        _findNewLowerIndex: function(object, idx, intersecting) {
            var newIdx;
            if (intersecting) {
                newIdx = idx;
                for (var i = idx - 1; i >= 0; --i) {
                    var isIntersecting = object.intersectsWithObject(this._objects[i]) || object.isContainedWithinObject(this._objects[i]) || this._objects[i].isContainedWithinObject(object);
                    if (isIntersecting) {
                        newIdx = i;
                        break;
                    }
                }
            } else {
                newIdx = idx - 1;
            }
            return newIdx;
        },
        bringForward: function(object, intersecting) {
            if (!object) {
                return this;
            }
            var activeGroup = this._activeGroup, i, obj, idx, newIdx, objs;
            if (object === activeGroup) {
                objs = activeGroup._objects;
                for (i = objs.length; i--; ) {
                    obj = objs[i];
                    idx = this._objects.indexOf(obj);
                    if (idx !== this._objects.length - 1) {
                        newIdx = idx + 1;
                        removeFromArray(this._objects, obj);
                        this._objects.splice(newIdx, 0, obj);
                    }
                }
            } else {
                idx = this._objects.indexOf(object);
                if (idx !== this._objects.length - 1) {
                    newIdx = this._findNewUpperIndex(object, idx, intersecting);
                    removeFromArray(this._objects, object);
                    this._objects.splice(newIdx, 0, object);
                }
            }
            this.renderAll && this.renderAll();
            return this;
        },
        _findNewUpperIndex: function(object, idx, intersecting) {
            var newIdx;
            if (intersecting) {
                newIdx = idx;
                for (var i = idx + 1; i < this._objects.length; ++i) {
                    var isIntersecting = object.intersectsWithObject(this._objects[i]) || object.isContainedWithinObject(this._objects[i]) || this._objects[i].isContainedWithinObject(object);
                    if (isIntersecting) {
                        newIdx = i;
                        break;
                    }
                }
            } else {
                newIdx = idx + 1;
            }
            return newIdx;
        },
        moveTo: function(object, index) {
            removeFromArray(this._objects, object);
            this._objects.splice(index, 0, object);
            return this.renderAll && this.renderAll();
        },
        dispose: function() {
            this.clear();
            return this;
        },
        toString: function() {
            return "#<fabric.Canvas (" + this.complexity() + "): " + "{ objects: " + this.getObjects().length + " }>";
        }
    });
    extend(fabric.StaticCanvas.prototype, fabric.Observable);
    extend(fabric.StaticCanvas.prototype, fabric.Collection);
    extend(fabric.StaticCanvas.prototype, fabric.DataURLExporter);
    extend(fabric.StaticCanvas, {
        EMPTY_JSON: '{"objects": [], "background": "white"}',
        supports: function(methodName) {
            var el = fabric.util.createCanvasElement();
            if (!el || !el.getContext) {
                return null;
            }
            var ctx = el.getContext("2d");
            if (!ctx) {
                return null;
            }
            switch (methodName) {
              case "getImageData":
                return typeof ctx.getImageData !== "undefined";

              case "setLineDash":
                return typeof ctx.setLineDash !== "undefined";

              case "toDataURL":
                return typeof el.toDataURL !== "undefined";

              case "toDataURLWithQuality":
                try {
                    el.toDataURL("image/jpeg", 0);
                    return true;
                } catch (e) {}
                return false;

              default:
                return null;
            }
        }
    });
    fabric.StaticCanvas.prototype.toJSON = fabric.StaticCanvas.prototype.toObject;
})();

(function() {
    var supportQuality = fabric.StaticCanvas.supports("toDataURLWithQuality");
    fabric.util.object.extend(fabric.StaticCanvas.prototype, {
        toDataURL: function(options) {
            options || (options = {});
            var format = options.format || "png", quality = options.quality || 1, multiplier = options.multiplier || 1, cropping = {
                left: options.left || 0,
                top: options.top || 0,
                width: options.width || 0,
                height: options.height || 0
            };
            return this.__toDataURLWithMultiplier(format, quality, cropping, multiplier);
        },
        __toDataURLWithMultiplier: function(format, quality, cropping, multiplier) {
            var origWidth = this.getWidth(), origHeight = this.getHeight(), scaledWidth = (cropping.width || this.getWidth()) * multiplier, scaledHeight = (cropping.height || this.getHeight()) * multiplier, zoom = this.getZoom(), newZoom = zoom * multiplier, vp = this.viewportTransform, translateX = (vp[4] - cropping.left) * multiplier, translateY = (vp[5] - cropping.top) * multiplier, newVp = [ newZoom, 0, 0, newZoom, translateX, translateY ], originalInteractive = this.interactive;
            this.viewportTransform = newVp;
            this.interactive && (this.interactive = false);
            if (origWidth !== scaledWidth || origHeight !== scaledHeight) {
                this.setDimensions({
                    width: scaledWidth,
                    height: scaledHeight
                });
            } else {
                this.renderAll();
            }
            var data = this.__toDataURL(format, quality, cropping);
            originalInteractive && (this.interactive = originalInteractive);
            this.viewportTransform = vp;
            this.setDimensions({
                width: origWidth,
                height: origHeight
            });
            return data;
        },
        __toDataURL: function(format, quality) {
            var canvasEl = this.contextContainer.canvas;
            if (format === "jpg") {
                format = "jpeg";
            }
            var data = supportQuality ? canvasEl.toDataURL("image/" + format, quality) : canvasEl.toDataURL("image/" + format);
            return data;
        },
        toDataURLWithMultiplier: function(format, multiplier, quality) {
            return this.toDataURL({
                format: format,
                multiplier: multiplier,
                quality: quality
            });
        }
    });
})();

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend, clone = fabric.util.object.clone, toFixed = fabric.util.toFixed, capitalize = fabric.util.string.capitalize, degreesToRadians = fabric.util.degreesToRadians, supportsLineDash = fabric.StaticCanvas.supports("setLineDash"), objectCaching = !fabric.isLikelyNode;
    if (fabric.Object) {
        return;
    }
    fabric.Object = fabric.util.createClass(fabric.CommonMethods, {
        type: "object",
        originX: "left",
        originY: "top",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        opacity: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        cornerSize: 13,
        transparentCorners: true,
        hoverCursor: null,
        moveCursor: null,
        padding: 0,
        borderColor: "rgba(102,153,255,0.75)",
        borderDashArray: null,
        cornerColor: "rgba(102,153,255,0.5)",
        cornerStrokeColor: null,
        cornerStyle: "rect",
        cornerDashArray: null,
        centeredScaling: false,
        centeredRotation: true,
        fill: "rgb(0,0,0)",
        fillRule: "nonzero",
        globalCompositeOperation: "source-over",
        backgroundColor: "",
        selectionBackgroundColor: "",
        stroke: null,
        strokeWidth: 1,
        strokeDashArray: null,
        strokeLineCap: "butt",
        strokeLineJoin: "miter",
        strokeMiterLimit: 10,
        shadow: null,
        borderOpacityWhenMoving: .4,
        borderScaleFactor: 1,
        transformMatrix: null,
        minScaleLimit: .01,
        selectable: true,
        evented: true,
        visible: true,
        hasControls: true,
        hasBorders: true,
        hasRotatingPoint: true,
        rotatingPointOffset: 40,
        perPixelTargetFind: false,
        includeDefaultValues: true,
        clipTo: null,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        lockSkewingX: false,
        lockSkewingY: false,
        lockScalingFlip: false,
        excludeFromExport: false,
        objectCaching: objectCaching,
        statefullCache: false,
        noScaleCache: true,
        dirty: true,
        needsItsOwnCache: false,
        stateProperties: ("top left width height scaleX scaleY flipX flipY originX originY transformMatrix " + "stroke strokeWidth strokeDashArray strokeLineCap strokeLineJoin strokeMiterLimit " + "angle opacity fill fillRule globalCompositeOperation shadow clipTo visible backgroundColor " + "skewX skewY").split(" "),
        cacheProperties: ("fill stroke strokeWidth strokeDashArray width height stroke strokeWidth strokeDashArray" + " strokeLineCap strokeLineJoin strokeMiterLimit fillRule backgroundColor").split(" "),
        initialize: function(options) {
            options = options || {};
            if (options) {
                this.setOptions(options);
            }
            if (this.objectCaching) {
                this._createCacheCanvas();
            }
        },
        _createCacheCanvas: function() {
            this._cacheProperties = {};
            this._cacheCanvas = fabric.document.createElement("canvas");
            this._cacheContext = this._cacheCanvas.getContext("2d");
            this._updateCacheCanvas();
        },
        _getCacheCanvasDimensions: function() {
            var zoom = this.canvas && this.canvas.getZoom() || 1, objectScale = this.getObjectScaling(), dim = this._getNonTransformedDimensions(), retina = this.canvas && this.canvas._isRetinaScaling() ? fabric.devicePixelRatio : 1, zoomX = objectScale.scaleX * zoom * retina, zoomY = objectScale.scaleY * zoom * retina, width = dim.x * zoomX, height = dim.y * zoomY;
            return {
                width: width + 2,
                height: height + 2,
                zoomX: zoomX,
                zoomY: zoomY
            };
        },
        _updateCacheCanvas: function() {
            if (this.noScaleCache && this.canvas && this.canvas._currentTransform) {
                var action = this.canvas._currentTransform.action;
                if (action.slice(0, 5) === "scale") {
                    return false;
                }
            }
            var dims = this._getCacheCanvasDimensions(), width = dims.width, height = dims.height, zoomX = dims.zoomX, zoomY = dims.zoomY;
            if (width !== this.cacheWidth || height !== this.cacheHeight) {
                this._cacheCanvas.width = Math.ceil(width);
                this._cacheCanvas.height = Math.ceil(height);
                this._cacheContext.translate(width / 2, height / 2);
                this._cacheContext.scale(zoomX, zoomY);
                this.cacheWidth = width;
                this.cacheHeight = height;
                this.zoomX = zoomX;
                this.zoomY = zoomY;
                return true;
            }
            return false;
        },
        setOptions: function(options) {
            this._setOptions(options);
            this._initGradient(options.fill, "fill");
            this._initGradient(options.stroke, "stroke");
            this._initClipping(options);
            this._initPattern(options.fill, "fill");
            this._initPattern(options.stroke, "stroke");
        },
        transform: function(ctx, fromLeft) {
            if (this.group && !this.group._transformDone) {
                this.group.transform(ctx);
            }
            var center = fromLeft ? this._getLeftTopCoords() : this.getCenterPoint();
            ctx.translate(center.x, center.y);
            this.angle && ctx.rotate(degreesToRadians(this.angle));
            ctx.scale(this.scaleX * (this.flipX ? -1 : 1), this.scaleY * (this.flipY ? -1 : 1));
            this.skewX && ctx.transform(1, 0, Math.tan(degreesToRadians(this.skewX)), 1, 0, 0);
            this.skewY && ctx.transform(1, Math.tan(degreesToRadians(this.skewY)), 0, 1, 0, 0);
        },
        toObject: function(propertiesToInclude) {
            var NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS, object = {
                type: this.type,
                originX: this.originX,
                originY: this.originY,
                left: toFixed(this.left, NUM_FRACTION_DIGITS),
                top: toFixed(this.top, NUM_FRACTION_DIGITS),
                width: toFixed(this.width, NUM_FRACTION_DIGITS),
                height: toFixed(this.height, NUM_FRACTION_DIGITS),
                fill: this.fill && this.fill.toObject ? this.fill.toObject() : this.fill,
                stroke: this.stroke && this.stroke.toObject ? this.stroke.toObject() : this.stroke,
                strokeWidth: toFixed(this.strokeWidth, NUM_FRACTION_DIGITS),
                strokeDashArray: this.strokeDashArray ? this.strokeDashArray.concat() : this.strokeDashArray,
                strokeLineCap: this.strokeLineCap,
                strokeLineJoin: this.strokeLineJoin,
                strokeMiterLimit: toFixed(this.strokeMiterLimit, NUM_FRACTION_DIGITS),
                scaleX: toFixed(this.scaleX, NUM_FRACTION_DIGITS),
                scaleY: toFixed(this.scaleY, NUM_FRACTION_DIGITS),
                angle: toFixed(this.getAngle(), NUM_FRACTION_DIGITS),
                flipX: this.flipX,
                flipY: this.flipY,
                opacity: toFixed(this.opacity, NUM_FRACTION_DIGITS),
                shadow: this.shadow && this.shadow.toObject ? this.shadow.toObject() : this.shadow,
                visible: this.visible,
                clipTo: this.clipTo && String(this.clipTo),
                backgroundColor: this.backgroundColor,
                fillRule: this.fillRule,
                globalCompositeOperation: this.globalCompositeOperation,
                transformMatrix: this.transformMatrix ? this.transformMatrix.concat() : null,
                skewX: toFixed(this.skewX, NUM_FRACTION_DIGITS),
                skewY: toFixed(this.skewY, NUM_FRACTION_DIGITS)
            };
            fabric.util.populateWithProperties(this, object, propertiesToInclude);
            if (!this.includeDefaultValues) {
                object = this._removeDefaultValues(object);
            }
            return object;
        },
        toDatalessObject: function(propertiesToInclude) {
            return this.toObject(propertiesToInclude);
        },
        _removeDefaultValues: function(object) {
            var prototype = fabric.util.getKlass(object.type).prototype, stateProperties = prototype.stateProperties;
            stateProperties.forEach(function(prop) {
                if (object[prop] === prototype[prop]) {
                    delete object[prop];
                }
                var isArray = Object.prototype.toString.call(object[prop]) === "[object Array]" && Object.prototype.toString.call(prototype[prop]) === "[object Array]";
                if (isArray && object[prop].length === 0 && prototype[prop].length === 0) {
                    delete object[prop];
                }
            });
            return object;
        },
        toString: function() {
            return "#<fabric." + capitalize(this.type) + ">";
        },
        getObjectScaling: function() {
            var scaleX = this.scaleX, scaleY = this.scaleY;
            if (this.group) {
                var scaling = this.group.getObjectScaling();
                scaleX *= scaling.scaleX;
                scaleY *= scaling.scaleY;
            }
            return {
                scaleX: scaleX,
                scaleY: scaleY
            };
        },
        getObjectOpacity: function() {
            var opacity = this.opacity;
            if (this.group) {
                opacity *= this.group.getObjectOpacity();
            }
            return opacity;
        },
        _set: function(key, value) {
            var shouldConstrainValue = key === "scaleX" || key === "scaleY";
            if (shouldConstrainValue) {
                value = this._constrainScale(value);
            }
            if (key === "scaleX" && value < 0) {
                this.flipX = !this.flipX;
                value *= -1;
            } else if (key === "scaleY" && value < 0) {
                this.flipY = !this.flipY;
                value *= -1;
            } else if (key === "shadow" && value && !(value instanceof fabric.Shadow)) {
                value = new fabric.Shadow(value);
            } else if (key === "dirty" && this.group) {
                this.group.set("dirty", value);
            }
            this[key] = value;
            if (this.cacheProperties.indexOf(key) > -1) {
                if (this.group) {
                    this.group.set("dirty", true);
                }
                this.dirty = true;
            }
            if (this.group && this.stateProperties.indexOf(key) > -1) {
                this.group.set("dirty", true);
            }
            if (key === "width" || key === "height") {
                this.minScaleLimit = Math.min(.1, 1 / Math.max(this.width, this.height));
            }
            return this;
        },
        setOnGroup: function() {},
        getViewportTransform: function() {
            if (this.canvas && this.canvas.viewportTransform) {
                return this.canvas.viewportTransform;
            }
            return fabric.iMatrix.concat();
        },
        render: function(ctx, noTransform) {
            if (this.width === 0 && this.height === 0 || !this.visible) {
                return;
            }
            if (this.canvas && this.canvas.skipOffscreen && !this.group && !this.isOnScreen()) {
                return;
            }
            ctx.save();
            this._setupCompositeOperation(ctx);
            this.drawSelectionBackground(ctx);
            if (!noTransform) {
                this.transform(ctx);
            }
            this._setOpacity(ctx);
            this._setShadow(ctx, this);
            if (this.transformMatrix) {
                ctx.transform.apply(ctx, this.transformMatrix);
            }
            this.clipTo && fabric.util.clipContext(this, ctx);
            if (this.shouldCache()) {
                if (!this._cacheCanvas) {
                    this._createCacheCanvas();
                }
                if (this.isCacheDirty(noTransform)) {
                    this.statefullCache && this.saveState({
                        propertySet: "cacheProperties"
                    });
                    this.drawObject(this._cacheContext, noTransform);
                    this.dirty = false;
                }
                this.drawCacheOnCanvas(ctx);
            } else {
                this.drawObject(ctx, noTransform);
                if (noTransform && this.objectCaching && this.statefullCache) {
                    this.saveState({
                        propertySet: "cacheProperties"
                    });
                }
            }
            this.clipTo && ctx.restore();
            ctx.restore();
        },
        shouldCache: function() {
            return this.objectCaching && (!this.group || this.needsItsOwnCache || !this.group.isCaching());
        },
        willDrawShadow: function() {
            return !!this.shadow;
        },
        drawObject: function(ctx, noTransform) {
            this._renderBackground(ctx);
            this._setStrokeStyles(ctx, this);
            this._setFillStyles(ctx, this);
            this._render(ctx, noTransform);
        },
        drawCacheOnCanvas: function(ctx) {
            ctx.scale(1 / this.zoomX, 1 / this.zoomY);
            ctx.drawImage(this._cacheCanvas, -this.cacheWidth / 2, -this.cacheHeight / 2);
        },
        isCacheDirty: function(skipCanvas) {
            if (!skipCanvas && this._updateCacheCanvas()) {
                return true;
            } else {
                if (this.dirty || this.statefullCache && this.hasStateChanged("cacheProperties")) {
                    if (!skipCanvas) {
                        var width = this.cacheWidth / this.zoomX;
                        var height = this.cacheHeight / this.zoomY;
                        this._cacheContext.clearRect(-width / 2, -height / 2, width, height);
                    }
                    return true;
                }
            }
            return false;
        },
        _renderBackground: function(ctx) {
            if (!this.backgroundColor) {
                return;
            }
            var dim = this._getNonTransformedDimensions();
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(-dim.x / 2, -dim.y / 2, dim.x, dim.y);
            this._removeShadow(ctx);
        },
        _setOpacity: function(ctx) {
            if (this.group && !this.group.transformDone) {
                ctx.globalAlpha = this.getObjectOpacity();
            } else {
                ctx.globalAlpha *= this.opacity;
            }
        },
        _setStrokeStyles: function(ctx, decl) {
            if (decl.stroke) {
                ctx.lineWidth = decl.strokeWidth;
                ctx.lineCap = decl.strokeLineCap;
                ctx.lineJoin = decl.strokeLineJoin;
                ctx.miterLimit = decl.strokeMiterLimit;
                ctx.strokeStyle = decl.stroke.toLive ? decl.stroke.toLive(ctx, this) : decl.stroke;
            }
        },
        _setFillStyles: function(ctx, decl) {
            if (decl.fill) {
                ctx.fillStyle = decl.fill.toLive ? decl.fill.toLive(ctx, this) : decl.fill;
            }
        },
        _setLineDash: function(ctx, dashArray, alternative) {
            if (!dashArray) {
                return;
            }
            if (1 & dashArray.length) {
                dashArray.push.apply(dashArray, dashArray);
            }
            if (supportsLineDash) {
                ctx.setLineDash(dashArray);
            } else {
                alternative && alternative(ctx);
            }
        },
        _renderControls: function(ctx, styleOverride) {
            var vpt = this.getViewportTransform(), matrix = this.calcTransformMatrix(), options;
            styleOverride = styleOverride || {};
            matrix = fabric.util.multiplyTransformMatrices(vpt, matrix);
            options = fabric.util.qrDecompose(matrix);
            ctx.save();
            ctx.translate(options.translateX, options.translateY);
            ctx.lineWidth = 1 * this.borderScaleFactor;
            if (!this.group) {
                ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
            }
            if (this.group && this.group === this.canvas.getActiveGroup()) {
                ctx.rotate(degreesToRadians(options.angle));
                (this.hasBorders || styleOverride.hasBorders) && this.drawBordersInGroup(ctx, options, styleOverride);
            } else {
                ctx.rotate(degreesToRadians(this.angle));
                (this.hasBorders || styleOverride.hasBorders) && this.drawBorders(ctx, styleOverride);
            }
            (this.hasControls || styleOverride.hasControls) && this.drawControls(ctx, styleOverride);
            ctx.restore();
        },
        _setShadow: function(ctx) {
            if (!this.shadow) {
                return;
            }
            var multX = this.canvas && this.canvas.viewportTransform[0] || 1, multY = this.canvas && this.canvas.viewportTransform[3] || 1, scaling = this.getObjectScaling();
            if (this.canvas && this.canvas._isRetinaScaling()) {
                multX *= fabric.devicePixelRatio;
                multY *= fabric.devicePixelRatio;
            }
            ctx.shadowColor = this.shadow.color;
            ctx.shadowBlur = this.shadow.blur * (multX + multY) * (scaling.scaleX + scaling.scaleY) / 4;
            ctx.shadowOffsetX = this.shadow.offsetX * multX * scaling.scaleX;
            ctx.shadowOffsetY = this.shadow.offsetY * multY * scaling.scaleY;
        },
        _removeShadow: function(ctx) {
            if (!this.shadow) {
                return;
            }
            ctx.shadowColor = "";
            ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
        },
        _applyPatternGradientTransform: function(ctx, filler) {
            if (!filler.toLive) {
                return;
            }
            var transform = filler.gradientTransform || filler.patternTransform;
            if (transform) {
                ctx.transform.apply(ctx, transform);
            }
            var offsetX = -this.width / 2 + filler.offsetX || 0, offsetY = -this.height / 2 + filler.offsetY || 0;
            ctx.translate(offsetX, offsetY);
        },
        _renderFill: function(ctx) {
            if (!this.fill) {
                return;
            }
            ctx.save();
            this._applyPatternGradientTransform(ctx, this.fill);
            if (this.fillRule === "evenodd") {
                ctx.fill("evenodd");
            } else {
                ctx.fill();
            }
            ctx.restore();
        },
        _renderStroke: function(ctx) {
            if (!this.stroke || this.strokeWidth === 0) {
                return;
            }
            if (this.shadow && !this.shadow.affectStroke) {
                this._removeShadow(ctx);
            }
            ctx.save();
            this._setLineDash(ctx, this.strokeDashArray, this._renderDashedStroke);
            this._applyPatternGradientTransform(ctx, this.stroke);
            ctx.stroke();
            ctx.restore();
        },
        clone: function(callback, propertiesToInclude) {
            if (this.constructor.fromObject) {
                return this.constructor.fromObject(this.toObject(propertiesToInclude), callback);
            }
            return new fabric.Object(this.toObject(propertiesToInclude));
        },
        cloneAsImage: function(callback, options) {
            var dataUrl = this.toDataURL(options);
            fabric.util.loadImage(dataUrl, function(img) {
                if (callback) {
                    callback(new fabric.Image(img));
                }
            });
            return this;
        },
        toDataURL: function(options) {
            options || (options = {});
            var el = fabric.util.createCanvasElement(), boundingRect = this.getBoundingRect();
            el.width = boundingRect.width;
            el.height = boundingRect.height;
            fabric.util.wrapElement(el, "div");
            var canvas = new fabric.StaticCanvas(el, {
                enableRetinaScaling: options.enableRetinaScaling
            });
            if (options.format === "jpg") {
                options.format = "jpeg";
            }
            if (options.format === "jpeg") {
                canvas.backgroundColor = "#fff";
            }
            var origParams = {
                active: this.get("active"),
                left: this.getLeft(),
                top: this.getTop()
            };
            this.set("active", false);
            this.setPositionByOrigin(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), "center", "center");
            var originalCanvas = this.canvas;
            canvas.add(this);
            var data = canvas.toDataURL(options);
            this.set(origParams).setCoords();
            this.canvas = originalCanvas;
            canvas.dispose();
            canvas = null;
            return data;
        },
        isType: function(type) {
            return this.type === type;
        },
        complexity: function() {
            return 1;
        },
        toJSON: function(propertiesToInclude) {
            return this.toObject(propertiesToInclude);
        },
        setGradient: function(property, options) {
            options || (options = {});
            var gradient = {
                colorStops: []
            };
            gradient.type = options.type || (options.r1 || options.r2 ? "radial" : "linear");
            gradient.coords = {
                x1: options.x1,
                y1: options.y1,
                x2: options.x2,
                y2: options.y2
            };
            if (options.r1 || options.r2) {
                gradient.coords.r1 = options.r1;
                gradient.coords.r2 = options.r2;
            }
            gradient.gradientTransform = options.gradientTransform;
            fabric.Gradient.prototype.addColorStop.call(gradient, options.colorStops);
            return this.set(property, fabric.Gradient.forObject(this, gradient));
        },
        setPatternFill: function(options) {
            return this.set("fill", new fabric.Pattern(options));
        },
        setShadow: function(options) {
            return this.set("shadow", options ? new fabric.Shadow(options) : null);
        },
        setColor: function(color) {
            this.set("fill", color);
            return this;
        },
        setAngle: function(angle) {
            var shouldCenterOrigin = (this.originX !== "center" || this.originY !== "center") && this.centeredRotation;
            if (shouldCenterOrigin) {
                this._setOriginToCenter();
            }
            this.set("angle", angle);
            if (shouldCenterOrigin) {
                this._resetOrigin();
            }
            return this;
        },
        centerH: function() {
            this.canvas && this.canvas.centerObjectH(this);
            return this;
        },
        viewportCenterH: function() {
            this.canvas && this.canvas.viewportCenterObjectH(this);
            return this;
        },
        centerV: function() {
            this.canvas && this.canvas.centerObjectV(this);
            return this;
        },
        viewportCenterV: function() {
            this.canvas && this.canvas.viewportCenterObjectV(this);
            return this;
        },
        center: function() {
            this.canvas && this.canvas.centerObject(this);
            return this;
        },
        viewportCenter: function() {
            this.canvas && this.canvas.viewportCenterObject(this);
            return this;
        },
        remove: function() {
            this.canvas && this.canvas.remove(this);
            return this;
        },
        getLocalPointer: function(e, pointer) {
            pointer = pointer || this.canvas.getPointer(e);
            var pClicked = new fabric.Point(pointer.x, pointer.y), objectLeftTop = this._getLeftTopCoords();
            if (this.angle) {
                pClicked = fabric.util.rotatePoint(pClicked, objectLeftTop, degreesToRadians(-this.angle));
            }
            return {
                x: pClicked.x - objectLeftTop.x,
                y: pClicked.y - objectLeftTop.y
            };
        },
        _setupCompositeOperation: function(ctx) {
            if (this.globalCompositeOperation) {
                ctx.globalCompositeOperation = this.globalCompositeOperation;
            }
        }
    });
    fabric.util.createAccessors(fabric.Object);
    fabric.Object.prototype.rotate = fabric.Object.prototype.setAngle;
    extend(fabric.Object.prototype, fabric.Observable);
    fabric.Object.NUM_FRACTION_DIGITS = 2;
    fabric.Object._fromObject = function(className, object, callback, forceAsync, extraParam) {
        var klass = fabric[className];
        object = clone(object, true);
        if (forceAsync) {
            fabric.util.enlivenPatterns([ object.fill, object.stroke ], function(patterns) {
                if (typeof patterns[0] !== "undefined") {
                    object.fill = patterns[0];
                }
                if (typeof patterns[1] !== "undefined") {
                    object.stroke = patterns[1];
                }
                var instance = extraParam ? new klass(object[extraParam], object) : new klass(object);
                callback && callback(instance);
            });
        } else {
            var instance = extraParam ? new klass(object[extraParam], object) : new klass(object);
            callback && callback(instance);
            return instance;
        }
    };
    fabric.Object.__uid = 0;
})(typeof exports !== "undefined" ? exports : this);

(function() {
    var degreesToRadians = fabric.util.degreesToRadians, originXOffset = {
        left: -.5,
        center: 0,
        right: .5
    }, originYOffset = {
        top: -.5,
        center: 0,
        bottom: .5
    };
    fabric.util.object.extend(fabric.Object.prototype, {
        translateToGivenOrigin: function(point, fromOriginX, fromOriginY, toOriginX, toOriginY) {
            var x = point.x, y = point.y, offsetX, offsetY, dim;
            if (typeof fromOriginX === "string") {
                fromOriginX = originXOffset[fromOriginX];
            } else {
                fromOriginX -= .5;
            }
            if (typeof toOriginX === "string") {
                toOriginX = originXOffset[toOriginX];
            } else {
                toOriginX -= .5;
            }
            offsetX = toOriginX - fromOriginX;
            if (typeof fromOriginY === "string") {
                fromOriginY = originYOffset[fromOriginY];
            } else {
                fromOriginY -= .5;
            }
            if (typeof toOriginY === "string") {
                toOriginY = originYOffset[toOriginY];
            } else {
                toOriginY -= .5;
            }
            offsetY = toOriginY - fromOriginY;
            if (offsetX || offsetY) {
                dim = this._getTransformedDimensions();
                x = point.x + offsetX * dim.x;
                y = point.y + offsetY * dim.y;
            }
            return new fabric.Point(x, y);
        },
        translateToCenterPoint: function(point, originX, originY) {
            var p = this.translateToGivenOrigin(point, originX, originY, "center", "center");
            if (this.angle) {
                return fabric.util.rotatePoint(p, point, degreesToRadians(this.angle));
            }
            return p;
        },
        translateToOriginPoint: function(center, originX, originY) {
            var p = this.translateToGivenOrigin(center, "center", "center", originX, originY);
            if (this.angle) {
                return fabric.util.rotatePoint(p, center, degreesToRadians(this.angle));
            }
            return p;
        },
        getCenterPoint: function() {
            var leftTop = new fabric.Point(this.left, this.top);
            return this.translateToCenterPoint(leftTop, this.originX, this.originY);
        },
        getPointByOrigin: function(originX, originY) {
            var center = this.getCenterPoint();
            return this.translateToOriginPoint(center, originX, originY);
        },
        toLocalPoint: function(point, originX, originY) {
            var center = this.getCenterPoint(), p, p2;
            if (typeof originX !== "undefined" && typeof originY !== "undefined") {
                p = this.translateToGivenOrigin(center, "center", "center", originX, originY);
            } else {
                p = new fabric.Point(this.left, this.top);
            }
            p2 = new fabric.Point(point.x, point.y);
            if (this.angle) {
                p2 = fabric.util.rotatePoint(p2, center, -degreesToRadians(this.angle));
            }
            return p2.subtractEquals(p);
        },
        setPositionByOrigin: function(pos, originX, originY) {
            var center = this.translateToCenterPoint(pos, originX, originY), position = this.translateToOriginPoint(center, this.originX, this.originY);
            this.set("left", position.x);
            this.set("top", position.y);
        },
        adjustPosition: function(to) {
            var angle = degreesToRadians(this.angle), hypotFull = this.getWidth(), xFull = Math.cos(angle) * hypotFull, yFull = Math.sin(angle) * hypotFull, offsetFrom, offsetTo;
            if (typeof this.originX === "string") {
                offsetFrom = originXOffset[this.originX];
            } else {
                offsetFrom = this.originX - .5;
            }
            if (typeof to === "string") {
                offsetTo = originXOffset[to];
            } else {
                offsetTo = to - .5;
            }
            this.left += xFull * (offsetTo - offsetFrom);
            this.top += yFull * (offsetTo - offsetFrom);
            this.setCoords();
            this.originX = to;
        },
        _setOriginToCenter: function() {
            this._originalOriginX = this.originX;
            this._originalOriginY = this.originY;
            var center = this.getCenterPoint();
            this.originX = "center";
            this.originY = "center";
            this.left = center.x;
            this.top = center.y;
        },
        _resetOrigin: function() {
            var originPoint = this.translateToOriginPoint(this.getCenterPoint(), this._originalOriginX, this._originalOriginY);
            this.originX = this._originalOriginX;
            this.originY = this._originalOriginY;
            this.left = originPoint.x;
            this.top = originPoint.y;
            this._originalOriginX = null;
            this._originalOriginY = null;
        },
        _getLeftTopCoords: function() {
            return this.translateToOriginPoint(this.getCenterPoint(), "left", "top");
        },
        onDeselect: function() {}
    });
})();

(function() {
    function getCoords(coords) {
        return [ new fabric.Point(coords.tl.x, coords.tl.y), new fabric.Point(coords.tr.x, coords.tr.y), new fabric.Point(coords.br.x, coords.br.y), new fabric.Point(coords.bl.x, coords.bl.y) ];
    }
    var degreesToRadians = fabric.util.degreesToRadians, multiplyMatrices = fabric.util.multiplyTransformMatrices;
    fabric.util.object.extend(fabric.Object.prototype, {
        oCoords: null,
        aCoords: null,
        getCoords: function(absolute, calculate) {
            if (!this.oCoords) {
                this.setCoords();
            }
            var coords = absolute ? this.aCoords : this.oCoords;
            return getCoords(calculate ? this.calcCoords(absolute) : coords);
        },
        intersectsWithRect: function(pointTL, pointBR, absolute, calculate) {
            var coords = this.getCoords(absolute, calculate), intersection = fabric.Intersection.intersectPolygonRectangle(coords, pointTL, pointBR);
            return intersection.status === "Intersection";
        },
        intersectsWithObject: function(other, absolute, calculate) {
            var intersection = fabric.Intersection.intersectPolygonPolygon(this.getCoords(absolute, calculate), other.getCoords(absolute, calculate));
            return intersection.status === "Intersection" || other.isContainedWithinObject(this, absolute, calculate) || this.isContainedWithinObject(other, absolute, calculate);
        },
        isContainedWithinObject: function(other, absolute, calculate) {
            var points = this.getCoords(absolute, calculate), i = 0, lines = other._getImageLines(calculate ? other.calcCoords(absolute) : absolute ? other.aCoords : other.oCoords);
            for (;i < 4; i++) {
                if (!other.containsPoint(points[i], lines)) {
                    return false;
                }
            }
            return true;
        },
        isContainedWithinRect: function(pointTL, pointBR, absolute, calculate) {
            var boundingRect = this.getBoundingRect(absolute, calculate);
            return boundingRect.left >= pointTL.x && boundingRect.left + boundingRect.width <= pointBR.x && boundingRect.top >= pointTL.y && boundingRect.top + boundingRect.height <= pointBR.y;
        },
        containsPoint: function(point, lines, absolute, calculate) {
            var lines = lines || this._getImageLines(calculate ? this.calcCoords(absolute) : absolute ? this.aCoords : this.oCoords), xPoints = this._findCrossPoints(point, lines);
            return xPoints !== 0 && xPoints % 2 === 1;
        },
        isOnScreen: function(calculate) {
            if (!this.canvas) {
                return false;
            }
            var pointTL = this.canvas.vptCoords.tl, pointBR = this.canvas.vptCoords.br;
            var points = this.getCoords(true, calculate), point;
            for (var i = 0; i < 4; i++) {
                point = points[i];
                if (point.x <= pointBR.x && point.x >= pointTL.x && point.y <= pointBR.y && point.y >= pointTL.y) {
                    return true;
                }
            }
            if (this.intersectsWithRect(pointTL, pointBR, true)) {
                return true;
            }
            var centerPoint = {
                x: (pointTL.x + pointBR.x) / 2,
                y: (pointTL.y + pointBR.y) / 2
            };
            if (this.containsPoint(centerPoint, null, true)) {
                return true;
            }
            return false;
        },
        _getImageLines: function(oCoords) {
            return {
                topline: {
                    o: oCoords.tl,
                    d: oCoords.tr
                },
                rightline: {
                    o: oCoords.tr,
                    d: oCoords.br
                },
                bottomline: {
                    o: oCoords.br,
                    d: oCoords.bl
                },
                leftline: {
                    o: oCoords.bl,
                    d: oCoords.tl
                }
            };
        },
        _findCrossPoints: function(point, lines) {
            var b1, b2, a1, a2, xi, xcount = 0, iLine;
            for (var lineKey in lines) {
                iLine = lines[lineKey];
                if (iLine.o.y < point.y && iLine.d.y < point.y) {
                    continue;
                }
                if (iLine.o.y >= point.y && iLine.d.y >= point.y) {
                    continue;
                }
                if (iLine.o.x === iLine.d.x && iLine.o.x >= point.x) {
                    xi = iLine.o.x;
                } else {
                    b1 = 0;
                    b2 = (iLine.d.y - iLine.o.y) / (iLine.d.x - iLine.o.x);
                    a1 = point.y - b1 * point.x;
                    a2 = iLine.o.y - b2 * iLine.o.x;
                    xi = -(a1 - a2) / (b1 - b2);
                }
                if (xi >= point.x) {
                    xcount += 1;
                }
                if (xcount === 2) {
                    break;
                }
            }
            return xcount;
        },
        getBoundingRectWidth: function() {
            return this.getBoundingRect().width;
        },
        getBoundingRectHeight: function() {
            return this.getBoundingRect().height;
        },
        getBoundingRect: function(absolute, calculate) {
            var coords = this.getCoords(absolute, calculate);
            return fabric.util.makeBoundingBoxFromPoints(coords);
        },
        getWidth: function() {
            return this._getTransformedDimensions().x;
        },
        getHeight: function() {
            return this._getTransformedDimensions().y;
        },
        _constrainScale: function(value) {
            if (Math.abs(value) < this.minScaleLimit) {
                if (value < 0) {
                    return -this.minScaleLimit;
                } else {
                    return this.minScaleLimit;
                }
            }
            return value;
        },
        scale: function(value) {
            value = this._constrainScale(value);
            if (value < 0) {
                this.flipX = !this.flipX;
                this.flipY = !this.flipY;
                value *= -1;
            }
            this.scaleX = value;
            this.scaleY = value;
            return this.setCoords();
        },
        scaleToWidth: function(value) {
            var boundingRectFactor = this.getBoundingRect().width / this.getWidth();
            return this.scale(value / this.width / boundingRectFactor);
        },
        scaleToHeight: function(value) {
            var boundingRectFactor = this.getBoundingRect().height / this.getHeight();
            return this.scale(value / this.height / boundingRectFactor);
        },
        calcCoords: function(absolute) {
            var theta = degreesToRadians(this.angle), vpt = this.getViewportTransform(), dim = absolute ? this._getTransformedDimensions() : this._calculateCurrentDimensions(), currentWidth = dim.x, currentHeight = dim.y, sinTh = Math.sin(theta), cosTh = Math.cos(theta), _angle = currentWidth > 0 ? Math.atan(currentHeight / currentWidth) : 0, _hypotenuse = currentWidth / Math.cos(_angle) / 2, offsetX = Math.cos(_angle + theta) * _hypotenuse, offsetY = Math.sin(_angle + theta) * _hypotenuse, center = this.getCenterPoint(), coords = absolute ? center : fabric.util.transformPoint(center, vpt), tl = new fabric.Point(coords.x - offsetX, coords.y - offsetY), tr = new fabric.Point(tl.x + currentWidth * cosTh, tl.y + currentWidth * sinTh), bl = new fabric.Point(tl.x - currentHeight * sinTh, tl.y + currentHeight * cosTh), br = new fabric.Point(coords.x + offsetX, coords.y + offsetY);
            if (!absolute) {
                var ml = new fabric.Point((tl.x + bl.x) / 2, (tl.y + bl.y) / 2), mt = new fabric.Point((tr.x + tl.x) / 2, (tr.y + tl.y) / 2), mr = new fabric.Point((br.x + tr.x) / 2, (br.y + tr.y) / 2), mb = new fabric.Point((br.x + bl.x) / 2, (br.y + bl.y) / 2), mtr = new fabric.Point(mt.x + sinTh * this.rotatingPointOffset, mt.y - cosTh * this.rotatingPointOffset);
            }
            var coords = {
                tl: tl,
                tr: tr,
                br: br,
                bl: bl
            };
            if (!absolute) {
                coords.ml = ml;
                coords.mt = mt;
                coords.mr = mr;
                coords.mb = mb;
                coords.mtr = mtr;
            }
            return coords;
        },
        setCoords: function(ignoreZoom, skipAbsolute) {
            this.oCoords = this.calcCoords(ignoreZoom);
            if (!skipAbsolute) {
                this.aCoords = this.calcCoords(true);
            }
            ignoreZoom || this._setCornerCoords && this._setCornerCoords();
            return this;
        },
        _calcRotateMatrix: function() {
            if (this.angle) {
                var theta = degreesToRadians(this.angle), cos = Math.cos(theta), sin = Math.sin(theta);
                if (cos === 6.123233995736766e-17 || cos === -1.8369701987210297e-16) {
                    cos = 0;
                }
                return [ cos, sin, -sin, cos, 0, 0 ];
            }
            return fabric.iMatrix.concat();
        },
        calcTransformMatrix: function(skipGroup) {
            var center = this.getCenterPoint(), translateMatrix = [ 1, 0, 0, 1, center.x, center.y ], rotateMatrix = this._calcRotateMatrix(), dimensionMatrix = this._calcDimensionsTransformMatrix(this.skewX, this.skewY, true), matrix = this.group && !skipGroup ? this.group.calcTransformMatrix() : fabric.iMatrix.concat();
            matrix = multiplyMatrices(matrix, translateMatrix);
            matrix = multiplyMatrices(matrix, rotateMatrix);
            matrix = multiplyMatrices(matrix, dimensionMatrix);
            return matrix;
        },
        _calcDimensionsTransformMatrix: function(skewX, skewY, flipping) {
            var skewMatrixX = [ 1, 0, Math.tan(degreesToRadians(skewX)), 1 ], skewMatrixY = [ 1, Math.tan(degreesToRadians(skewY)), 0, 1 ], scaleX = this.scaleX * (flipping && this.flipX ? -1 : 1), scaleY = this.scaleY * (flipping && this.flipY ? -1 : 1), scaleMatrix = [ scaleX, 0, 0, scaleY ], m = multiplyMatrices(scaleMatrix, skewMatrixX, true);
            return multiplyMatrices(m, skewMatrixY, true);
        },
        _getNonTransformedDimensions: function() {
            var strokeWidth = this.strokeWidth, w = this.width + strokeWidth, h = this.height + strokeWidth;
            return {
                x: w,
                y: h
            };
        },
        _getTransformedDimensions: function(skewX, skewY) {
            if (typeof skewX === "undefined") {
                skewX = this.skewX;
            }
            if (typeof skewY === "undefined") {
                skewY = this.skewY;
            }
            var dimensions = this._getNonTransformedDimensions(), dimX = dimensions.x / 2, dimY = dimensions.y / 2, points = [ {
                x: -dimX,
                y: -dimY
            }, {
                x: dimX,
                y: -dimY
            }, {
                x: -dimX,
                y: dimY
            }, {
                x: dimX,
                y: dimY
            } ], i, transformMatrix = this._calcDimensionsTransformMatrix(skewX, skewY, false), bbox;
            for (i = 0; i < points.length; i++) {
                points[i] = fabric.util.transformPoint(points[i], transformMatrix);
            }
            bbox = fabric.util.makeBoundingBoxFromPoints(points);
            return {
                x: bbox.width,
                y: bbox.height
            };
        },
        _calculateCurrentDimensions: function() {
            var vpt = this.getViewportTransform(), dim = this._getTransformedDimensions(), p = fabric.util.transformPoint(dim, vpt, true);
            return p.scalarAdd(2 * this.padding);
        }
    });
})();

fabric.util.object.extend(fabric.Object.prototype, {
    sendToBack: function() {
        if (this.group) {
            fabric.StaticCanvas.prototype.sendToBack.call(this.group, this);
        } else {
            this.canvas.sendToBack(this);
        }
        return this;
    },
    bringToFront: function() {
        if (this.group) {
            fabric.StaticCanvas.prototype.bringToFront.call(this.group, this);
        } else {
            this.canvas.bringToFront(this);
        }
        return this;
    },
    sendBackwards: function(intersecting) {
        if (this.group) {
            fabric.StaticCanvas.prototype.sendBackwards.call(this.group, this, intersecting);
        } else {
            this.canvas.sendBackwards(this, intersecting);
        }
        return this;
    },
    bringForward: function(intersecting) {
        if (this.group) {
            fabric.StaticCanvas.prototype.bringForward.call(this.group, this, intersecting);
        } else {
            this.canvas.bringForward(this, intersecting);
        }
        return this;
    },
    moveTo: function(index) {
        if (this.group) {
            fabric.StaticCanvas.prototype.moveTo.call(this.group, this, index);
        } else {
            this.canvas.moveTo(this, index);
        }
        return this;
    }
});

(function() {
    var NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS;
    function getSvgColorString(prop, value) {
        if (!value) {
            return prop + ": none; ";
        } else if (value.toLive) {
            return prop + ": url(#SVGID_" + value.id + "); ";
        } else {
            var color = new fabric.Color(value), str = prop + ": " + color.toRgb() + "; ", opacity = color.getAlpha();
            if (opacity !== 1) {
                str += prop + "-opacity: " + opacity.toString() + "; ";
            }
            return str;
        }
    }
    var toFixed = fabric.util.toFixed;
    fabric.util.object.extend(fabric.Object.prototype, {
        getSvgStyles: function(skipShadow) {
            var fillRule = this.fillRule, strokeWidth = this.strokeWidth ? this.strokeWidth : "0", strokeDashArray = this.strokeDashArray ? this.strokeDashArray.join(" ") : "none", strokeLineCap = this.strokeLineCap ? this.strokeLineCap : "butt", strokeLineJoin = this.strokeLineJoin ? this.strokeLineJoin : "miter", strokeMiterLimit = this.strokeMiterLimit ? this.strokeMiterLimit : "4", opacity = typeof this.opacity !== "undefined" ? this.opacity : "1", visibility = this.visible ? "" : " visibility: hidden;", filter = skipShadow ? "" : this.getSvgFilter(), fill = getSvgColorString("fill", this.fill), stroke = getSvgColorString("stroke", this.stroke);
            return [ stroke, "stroke-width: ", strokeWidth, "; ", "stroke-dasharray: ", strokeDashArray, "; ", "stroke-linecap: ", strokeLineCap, "; ", "stroke-linejoin: ", strokeLineJoin, "; ", "stroke-miterlimit: ", strokeMiterLimit, "; ", fill, "fill-rule: ", fillRule, "; ", "opacity: ", opacity, ";", filter, visibility ].join("");
        },
        getSvgSpanStyles: function(style) {
            var strokeWidth = style.strokeWidth ? "stroke-width: " + style.strokeWidth + "; " : "", fontFamily = style.fontFamily ? "font-family: " + style.fontFamily.replace(/"/g, "'") + "; " : "", fontSize = style.fontSize ? "font-size: " + style.fontSize + "; " : "", fontStyle = style.fontStyle ? "font-style: " + style.fontStyle + "; " : "", fontWeight = style.fontWeight ? "font-weight: " + style.fontWeight + "; " : "", fill = style.fill ? getSvgColorString("fill", style.fill) : "", stroke = style.stroke ? getSvgColorString("stroke", style.stroke) : "", textDecoration = this.getSvgTextDecoration(style);
            return [ stroke, strokeWidth, fontFamily, fontSize, fontStyle, fontWeight, textDecoration, fill ].join("");
        },
        getSvgTextDecoration: function(style) {
            if ("overline" in style || "underline" in style || "linethrough" in style) {
                return "text-decoration: " + (style.overline ? "overline " : "") + (style.underline ? "underline " : "") + (style.linethrough ? "line-through " : "") + ";";
            }
            return "";
        },
        getSvgFilter: function() {
            return this.shadow ? "filter: url(#SVGID_" + this.shadow.id + ");" : "";
        },
        getSvgId: function() {
            return this.id ? 'id="' + this.id + '" ' : "";
        },
        getSvgTransform: function() {
            if (this.group && this.group.type === "path-group") {
                return "";
            }
            var angle = this.getAngle(), skewX = this.getSkewX() % 360, skewY = this.getSkewY() % 360, center = this.getCenterPoint(), NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS, translatePart = this.type === "path-group" ? "" : "translate(" + toFixed(center.x, NUM_FRACTION_DIGITS) + " " + toFixed(center.y, NUM_FRACTION_DIGITS) + ")", anglePart = angle !== 0 ? " rotate(" + toFixed(angle, NUM_FRACTION_DIGITS) + ")" : "", scalePart = this.scaleX === 1 && this.scaleY === 1 ? "" : " scale(" + toFixed(this.scaleX, NUM_FRACTION_DIGITS) + " " + toFixed(this.scaleY, NUM_FRACTION_DIGITS) + ")", skewXPart = skewX !== 0 ? " skewX(" + toFixed(skewX, NUM_FRACTION_DIGITS) + ")" : "", skewYPart = skewY !== 0 ? " skewY(" + toFixed(skewY, NUM_FRACTION_DIGITS) + ")" : "", addTranslateX = this.type === "path-group" ? this.width : 0, flipXPart = this.flipX ? " matrix(-1 0 0 1 " + addTranslateX + " 0) " : "", addTranslateY = this.type === "path-group" ? this.height : 0, flipYPart = this.flipY ? " matrix(1 0 0 -1 0 " + addTranslateY + ")" : "";
            return [ translatePart, anglePart, scalePart, flipXPart, flipYPart, skewXPart, skewYPart ].join("");
        },
        getSvgTransformMatrix: function() {
            return this.transformMatrix ? " matrix(" + this.transformMatrix.join(" ") + ") " : "";
        },
        _setSVGBg: function(textBgRects) {
            if (this.backgroundColor) {
                textBgRects.push("\t\t<rect ", this._getFillAttributes(this.backgroundColor), ' x="', toFixed(-this.width / 2, NUM_FRACTION_DIGITS), '" y="', toFixed(-this.height / 2, NUM_FRACTION_DIGITS), '" width="', toFixed(this.width, NUM_FRACTION_DIGITS), '" height="', toFixed(this.height, NUM_FRACTION_DIGITS), '"></rect>\n');
            }
        },
        _createBaseSVGMarkup: function() {
            var markup = [];
            if (this.fill && this.fill.toLive) {
                markup.push(this.fill.toSVG(this, false));
            }
            if (this.stroke && this.stroke.toLive) {
                markup.push(this.stroke.toSVG(this, false));
            }
            if (this.shadow) {
                markup.push(this.shadow.toSVG(this));
            }
            return markup;
        }
    });
})();

(function() {
    var extend = fabric.util.object.extend, originalSet = "stateProperties";
    function saveProps(origin, destination, props) {
        var tmpObj = {}, deep = true;
        props.forEach(function(prop) {
            tmpObj[prop] = origin[prop];
        });
        extend(origin[destination], tmpObj, deep);
    }
    function _isEqual(origValue, currentValue, firstPass) {
        if (!fabric.isLikelyNode && origValue instanceof Element) {
            return origValue === currentValue;
        } else if (origValue instanceof Array) {
            if (origValue.length !== currentValue.length) {
                return false;
            }
            for (var i = 0, len = origValue.length; i < len; i++) {
                if (origValue[i] !== currentValue[i]) {
                    return false;
                }
            }
            return true;
        } else if (origValue && typeof origValue === "object") {
            if (!firstPass && Object.keys(origValue).length !== Object.keys(currentValue).length) {
                return false;
            }
            for (var key in origValue) {
                if (!_isEqual(origValue[key], currentValue[key])) {
                    return false;
                }
            }
            return true;
        } else {
            return origValue === currentValue;
        }
    }
    fabric.util.object.extend(fabric.Object.prototype, {
        hasStateChanged: function(propertySet) {
            propertySet = propertySet || originalSet;
            propertySet = "_" + propertySet;
            if (!Object.keys(this[propertySet]).length) {
                return true;
            }
            return !_isEqual(this[propertySet], this, true);
        },
        saveState: function(options) {
            var propertySet = options && options.propertySet || originalSet, destination = "_" + propertySet;
            if (!this[destination]) {
                return this.setupState(options);
            }
            saveProps(this, destination, this[propertySet]);
            if (options && options.stateProperties) {
                saveProps(this, destination, options.stateProperties);
            }
            return this;
        },
        setupState: function(options) {
            options = options || {};
            var propertySet = options.propertySet || originalSet;
            options.propertySet = propertySet;
            this["_" + propertySet] = {};
            this.saveState(options);
            return this;
        }
    });
})();

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend, clone = fabric.util.object.clone, coordProps = {
        x1: 1,
        x2: 1,
        y1: 1,
        y2: 1
    }, supportsLineDash = fabric.StaticCanvas.supports("setLineDash");
    if (fabric.Line) {
        fabric.warn("fabric.Line is already defined");
        return;
    }
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("x1", "x2", "y1", "y2");
    fabric.Line = fabric.util.createClass(fabric.Object, {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        cacheProperties: cacheProperties,
        initialize: function(points, options) {
            if (!points) {
                points = [ 0, 0, 0, 0 ];
            }
            this.callSuper("initialize", options);
            this.set("x1", points[0]);
            this.set("y1", points[1]);
            this.set("x2", points[2]);
            this.set("y2", points[3]);
            this._setWidthHeight(options);
        },
        _setWidthHeight: function(options) {
            options || (options = {});
            this.width = Math.abs(this.x2 - this.x1);
            this.height = Math.abs(this.y2 - this.y1);
            this.left = "left" in options ? options.left : this._getLeftToOriginX();
            this.top = "top" in options ? options.top : this._getTopToOriginY();
        },
        _set: function(key, value) {
            this.callSuper("_set", key, value);
            if (typeof coordProps[key] !== "undefined") {
                this._setWidthHeight();
            }
            return this;
        },
        _getLeftToOriginX: makeEdgeToOriginGetter({
            origin: "originX",
            axis1: "x1",
            axis2: "x2",
            dimension: "width"
        }, {
            nearest: "left",
            center: "center",
            farthest: "right"
        }),
        _getTopToOriginY: makeEdgeToOriginGetter({
            origin: "originY",
            axis1: "y1",
            axis2: "y2",
            dimension: "height"
        }, {
            nearest: "top",
            center: "center",
            farthest: "bottom"
        }),
        _render: function(ctx, noTransform) {
            ctx.beginPath();
            if (noTransform) {
                var cp = this.getCenterPoint(), offset = this.strokeWidth / 2;
                ctx.translate(cp.x - (this.strokeLineCap === "butt" && this.height === 0 ? 0 : offset), cp.y - (this.strokeLineCap === "butt" && this.width === 0 ? 0 : offset));
            }
            if (!this.strokeDashArray || this.strokeDashArray && supportsLineDash) {
                var p = this.calcLinePoints();
                ctx.moveTo(p.x1, p.y1);
                ctx.lineTo(p.x2, p.y2);
            }
            ctx.lineWidth = this.strokeWidth;
            var origStrokeStyle = ctx.strokeStyle;
            ctx.strokeStyle = this.stroke || ctx.fillStyle;
            this.stroke && this._renderStroke(ctx);
            ctx.strokeStyle = origStrokeStyle;
        },
        _renderDashedStroke: function(ctx) {
            var p = this.calcLinePoints();
            ctx.beginPath();
            fabric.util.drawDashedLine(ctx, p.x1, p.y1, p.x2, p.y2, this.strokeDashArray);
            ctx.closePath();
        },
        toObject: function(propertiesToInclude) {
            return extend(this.callSuper("toObject", propertiesToInclude), this.calcLinePoints());
        },
        _getNonTransformedDimensions: function() {
            var dim = this.callSuper("_getNonTransformedDimensions");
            if (this.strokeLineCap === "butt") {
                if (this.width === 0) {
                    dim.y -= this.strokeWidth;
                }
                if (this.height === 0) {
                    dim.x -= this.strokeWidth;
                }
            }
            return dim;
        },
        calcLinePoints: function() {
            var xMult = this.x1 <= this.x2 ? -1 : 1, yMult = this.y1 <= this.y2 ? -1 : 1, x1 = xMult * this.width * .5, y1 = yMult * this.height * .5, x2 = xMult * this.width * -.5, y2 = yMult * this.height * -.5;
            return {
                x1: x1,
                x2: x2,
                y1: y1,
                y2: y2
            };
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), p = {
                x1: this.x1,
                x2: this.x2,
                y1: this.y1,
                y2: this.y2
            };
            if (!(this.group && this.group.type === "path-group")) {
                p = this.calcLinePoints();
            }
            markup.push("<line ", this.getSvgId(), 'x1="', p.x1, '" y1="', p.y1, '" x2="', p.x2, '" y2="', p.y2, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), this.getSvgTransformMatrix(), '"/>\n');
            return reviver ? reviver(markup.join("")) : markup.join("");
        }
    });
    fabric.Line.fromObject = function(object, callback, forceAsync) {
        function _callback(instance) {
            delete instance.points;
            callback && callback(instance);
        }
        var options = clone(object, true);
        options.points = [ object.x1, object.y1, object.x2, object.y2 ];
        var line = fabric.Object._fromObject("Line", options, _callback, forceAsync, "points");
        if (line) {
            delete line.points;
        }
        return line;
    };
    function makeEdgeToOriginGetter(propertyNames, originValues) {
        var origin = propertyNames.origin, axis1 = propertyNames.axis1, axis2 = propertyNames.axis2, dimension = propertyNames.dimension, nearest = originValues.nearest, center = originValues.center, farthest = originValues.farthest;
        return function() {
            switch (this.get(origin)) {
              case nearest:
                return Math.min(this.get(axis1), this.get(axis2));

              case center:
                return Math.min(this.get(axis1), this.get(axis2)) + .5 * this.get(dimension);

              case farthest:
                return Math.max(this.get(axis1), this.get(axis2));
            }
        };
    }
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), pi = Math.PI, extend = fabric.util.object.extend;
    if (fabric.Circle) {
        fabric.warn("fabric.Circle is already defined.");
        return;
    }
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("radius");
    fabric.Circle = fabric.util.createClass(fabric.Object, {
        type: "circle",
        radius: 0,
        startAngle: 0,
        endAngle: pi * 2,
        cacheProperties: cacheProperties,
        initialize: function(options) {
            this.callSuper("initialize", options);
            this.set("radius", options && options.radius || 0);
        },
        _set: function(key, value) {
            this.callSuper("_set", key, value);
            if (key === "radius") {
                this.setRadius(value);
            }
            return this;
        },
        toObject: function(propertiesToInclude) {
            return this.callSuper("toObject", [ "radius", "startAngle", "endAngle" ].concat(propertiesToInclude));
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), x = 0, y = 0, angle = (this.endAngle - this.startAngle) % (2 * pi);
            if (angle === 0) {
                if (this.group && this.group.type === "path-group") {
                    x = this.left + this.radius;
                    y = this.top + this.radius;
                }
                markup.push("<circle ", this.getSvgId(), 'cx="' + x + '" cy="' + y + '" ', 'r="', this.radius, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), " ", this.getSvgTransformMatrix(), '"/>\n');
            } else {
                var startX = Math.cos(this.startAngle) * this.radius, startY = Math.sin(this.startAngle) * this.radius, endX = Math.cos(this.endAngle) * this.radius, endY = Math.sin(this.endAngle) * this.radius, largeFlag = angle > pi ? "1" : "0";
                markup.push('<path d="M ' + startX + " " + startY, " A " + this.radius + " " + this.radius, " 0 ", +largeFlag + " 1", " " + endX + " " + endY, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), " ", this.getSvgTransformMatrix(), '"/>\n');
            }
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        _render: function(ctx, noTransform) {
            ctx.beginPath();
            ctx.arc(noTransform ? this.left + this.radius : 0, noTransform ? this.top + this.radius : 0, this.radius, this.startAngle, this.endAngle, false);
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        getRadiusX: function() {
            return this.get("radius") * this.get("scaleX");
        },
        getRadiusY: function() {
            return this.get("radius") * this.get("scaleY");
        },
        setRadius: function(value) {
            this.radius = value;
            return this.set("width", value * 2).set("height", value * 2);
        }
    });
    fabric.Circle.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Circle", object, callback, forceAsync);
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {});
    if (fabric.Triangle) {
        fabric.warn("fabric.Triangle is already defined");
        return;
    }
    fabric.Triangle = fabric.util.createClass(fabric.Object, {
        type: "triangle",
        initialize: function(options) {
            this.callSuper("initialize", options);
            this.set("width", options && options.width || 100).set("height", options && options.height || 100);
        },
        _render: function(ctx) {
            var widthBy2 = this.width / 2, heightBy2 = this.height / 2;
            ctx.beginPath();
            ctx.moveTo(-widthBy2, heightBy2);
            ctx.lineTo(0, -heightBy2);
            ctx.lineTo(widthBy2, heightBy2);
            ctx.closePath();
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        _renderDashedStroke: function(ctx) {
            var widthBy2 = this.width / 2, heightBy2 = this.height / 2;
            ctx.beginPath();
            fabric.util.drawDashedLine(ctx, -widthBy2, heightBy2, 0, -heightBy2, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, 0, -heightBy2, widthBy2, heightBy2, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, widthBy2, heightBy2, -widthBy2, heightBy2, this.strokeDashArray);
            ctx.closePath();
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), widthBy2 = this.width / 2, heightBy2 = this.height / 2, points = [ -widthBy2 + " " + heightBy2, "0 " + -heightBy2, widthBy2 + " " + heightBy2 ].join(",");
            markup.push("<polygon ", this.getSvgId(), 'points="', points, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), '"/>');
            return reviver ? reviver(markup.join("")) : markup.join("");
        }
    });
    fabric.Triangle.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Triangle", object, callback, forceAsync);
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), piBy2 = Math.PI * 2, extend = fabric.util.object.extend;
    if (fabric.Ellipse) {
        fabric.warn("fabric.Ellipse is already defined.");
        return;
    }
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("rx", "ry");
    fabric.Ellipse = fabric.util.createClass(fabric.Object, {
        type: "ellipse",
        rx: 0,
        ry: 0,
        cacheProperties: cacheProperties,
        initialize: function(options) {
            this.callSuper("initialize", options);
            this.set("rx", options && options.rx || 0);
            this.set("ry", options && options.ry || 0);
        },
        _set: function(key, value) {
            this.callSuper("_set", key, value);
            switch (key) {
              case "rx":
                this.rx = value;
                this.set("width", value * 2);
                break;

              case "ry":
                this.ry = value;
                this.set("height", value * 2);
                break;
            }
            return this;
        },
        getRx: function() {
            return this.get("rx") * this.get("scaleX");
        },
        getRy: function() {
            return this.get("ry") * this.get("scaleY");
        },
        toObject: function(propertiesToInclude) {
            return this.callSuper("toObject", [ "rx", "ry" ].concat(propertiesToInclude));
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), x = 0, y = 0;
            if (this.group && this.group.type === "path-group") {
                x = this.left + this.rx;
                y = this.top + this.ry;
            }
            markup.push("<ellipse ", this.getSvgId(), 'cx="', x, '" cy="', y, '" ', 'rx="', this.rx, '" ry="', this.ry, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), this.getSvgTransformMatrix(), '"/>\n');
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        _render: function(ctx, noTransform) {
            ctx.beginPath();
            ctx.save();
            ctx.transform(1, 0, 0, this.ry / this.rx, 0, 0);
            ctx.arc(noTransform ? this.left + this.rx : 0, noTransform ? (this.top + this.ry) * this.rx / this.ry : 0, this.rx, 0, piBy2, false);
            ctx.restore();
            this._renderFill(ctx);
            this._renderStroke(ctx);
        }
    });
    fabric.Ellipse.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Ellipse", object, callback, forceAsync);
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend;
    if (fabric.Rect) {
        fabric.warn("fabric.Rect is already defined");
        return;
    }
    var stateProperties = fabric.Object.prototype.stateProperties.concat();
    stateProperties.push("rx", "ry");
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("rx", "ry");
    fabric.Rect = fabric.util.createClass(fabric.Object, {
        stateProperties: stateProperties,
        type: "rect",
        rx: 0,
        ry: 0,
        cacheProperties: cacheProperties,
        initialize: function(options) {
            this.callSuper("initialize", options);
            this._initRxRy();
        },
        _initRxRy: function() {
            if (this.rx && !this.ry) {
                this.ry = this.rx;
            } else if (this.ry && !this.rx) {
                this.rx = this.ry;
            }
        },
        _render: function(ctx, noTransform) {
            if (this.width === 1 && this.height === 1) {
                ctx.fillRect(-.5, -.5, 1, 1);
                return;
            }
            var rx = this.rx ? Math.min(this.rx, this.width / 2) : 0, ry = this.ry ? Math.min(this.ry, this.height / 2) : 0, w = this.width, h = this.height, x = noTransform ? this.left : -this.width / 2, y = noTransform ? this.top : -this.height / 2, isRounded = rx !== 0 || ry !== 0, k = 1 - .5522847498;
            ctx.beginPath();
            ctx.moveTo(x + rx, y);
            ctx.lineTo(x + w - rx, y);
            isRounded && ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);
            ctx.lineTo(x + w, y + h - ry);
            isRounded && ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);
            ctx.lineTo(x + rx, y + h);
            isRounded && ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);
            ctx.lineTo(x, y + ry);
            isRounded && ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);
            ctx.closePath();
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        _renderDashedStroke: function(ctx) {
            var x = -this.width / 2, y = -this.height / 2, w = this.width, h = this.height;
            ctx.beginPath();
            fabric.util.drawDashedLine(ctx, x, y, x + w, y, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x + w, y, x + w, y + h, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x + w, y + h, x, y + h, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x, y + h, x, y, this.strokeDashArray);
            ctx.closePath();
        },
        toObject: function(propertiesToInclude) {
            return this.callSuper("toObject", [ "rx", "ry" ].concat(propertiesToInclude));
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), x = this.left, y = this.top;
            if (!(this.group && this.group.type === "path-group")) {
                x = -this.width / 2;
                y = -this.height / 2;
            }
            markup.push("<rect ", this.getSvgId(), 'x="', x, '" y="', y, '" rx="', this.get("rx"), '" ry="', this.get("ry"), '" width="', this.width, '" height="', this.height, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), this.getSvgTransformMatrix(), '"/>\n');
            return reviver ? reviver(markup.join("")) : markup.join("");
        }
    });
    fabric.Rect.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Rect", object, callback, forceAsync);
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend, min = fabric.util.array.min, max = fabric.util.array.max, toFixed = fabric.util.toFixed, NUM_FRACTION_DIGITS = fabric.Object.NUM_FRACTION_DIGITS;
    if (fabric.Polyline) {
        fabric.warn("fabric.Polyline is already defined");
        return;
    }
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("points");
    fabric.Polyline = fabric.util.createClass(fabric.Object, {
        type: "polyline",
        points: null,
        minX: 0,
        minY: 0,
        cacheProperties: cacheProperties,
        initialize: function(points, options) {
            options = options || {};
            this.points = points || [];
            this.callSuper("initialize", options);
            this._calcDimensions();
            if (!("top" in options)) {
                this.top = this.minY;
            }
            if (!("left" in options)) {
                this.left = this.minX;
            }
            this.pathOffset = {
                x: this.minX + this.width / 2,
                y: this.minY + this.height / 2
            };
        },
        _calcDimensions: function() {
            var points = this.points, minX = min(points, "x"), minY = min(points, "y"), maxX = max(points, "x"), maxY = max(points, "y");
            this.width = maxX - minX || 0;
            this.height = maxY - minY || 0;
            this.minX = minX || 0;
            this.minY = minY || 0;
        },
        toObject: function(propertiesToInclude) {
            return extend(this.callSuper("toObject", propertiesToInclude), {
                points: this.points.concat()
            });
        },
        toSVG: function(reviver) {
            var points = [], diffX, diffY, markup = this._createBaseSVGMarkup();
            if (!(this.group && this.group.type === "path-group")) {
                diffX = this.pathOffset.x;
                diffY = this.pathOffset.y;
            }
            for (var i = 0, len = this.points.length; i < len; i++) {
                points.push(toFixed(this.points[i].x - diffX, NUM_FRACTION_DIGITS), ",", toFixed(this.points[i].y - diffY, NUM_FRACTION_DIGITS), " ");
            }
            markup.push("<", this.type, " ", this.getSvgId(), 'points="', points.join(""), '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), " ", this.getSvgTransformMatrix(), '"/>\n');
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        commonRender: function(ctx, noTransform) {
            var point, len = this.points.length, x = noTransform ? 0 : this.pathOffset.x, y = noTransform ? 0 : this.pathOffset.y;
            if (!len || isNaN(this.points[len - 1].y)) {
                return false;
            }
            ctx.beginPath();
            ctx.moveTo(this.points[0].x - x, this.points[0].y - y);
            for (var i = 0; i < len; i++) {
                point = this.points[i];
                ctx.lineTo(point.x - x, point.y - y);
            }
            return true;
        },
        _render: function(ctx, noTransform) {
            if (!this.commonRender(ctx, noTransform)) {
                return;
            }
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        _renderDashedStroke: function(ctx) {
            var p1, p2;
            ctx.beginPath();
            for (var i = 0, len = this.points.length; i < len; i++) {
                p1 = this.points[i];
                p2 = this.points[i + 1] || p1;
                fabric.util.drawDashedLine(ctx, p1.x, p1.y, p2.x, p2.y, this.strokeDashArray);
            }
        },
        complexity: function() {
            return this.get("points").length;
        }
    });
    fabric.Polyline.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Polyline", object, callback, forceAsync, "points");
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend;
    if (fabric.Polygon) {
        fabric.warn("fabric.Polygon is already defined");
        return;
    }
    fabric.Polygon = fabric.util.createClass(fabric.Polyline, {
        type: "polygon",
        _render: function(ctx, noTransform) {
            if (!this.commonRender(ctx, noTransform)) {
                return;
            }
            ctx.closePath();
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        _renderDashedStroke: function(ctx) {
            this.callSuper("_renderDashedStroke", ctx);
            ctx.closePath();
        }
    });
    fabric.Polygon.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Polygon", object, callback, forceAsync, "points");
    };
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), min = fabric.util.array.min, max = fabric.util.array.max, extend = fabric.util.object.extend, _toString = Object.prototype.toString, drawArc = fabric.util.drawArc, commandLengths = {
        m: 2,
        l: 2,
        h: 1,
        v: 1,
        c: 6,
        s: 4,
        q: 4,
        t: 2,
        a: 7
    }, repeatedCommands = {
        m: "l",
        M: "L"
    };
    if (fabric.Path) {
        fabric.warn("fabric.Path is already defined");
        return;
    }
    var cacheProperties = fabric.Object.prototype.cacheProperties.concat();
    cacheProperties.push("path");
    fabric.Path = fabric.util.createClass(fabric.Object, {
        type: "path",
        path: null,
        minX: 0,
        minY: 0,
        cacheProperties: cacheProperties,
        initialize: function(path, options) {
            options = options || {};
            if (options) {
                this.setOptions(options);
            }
            if (!path) {
                path = [];
            }
            var fromArray = _toString.call(path) === "[object Array]";
            this.path = fromArray ? path : path.match && path.match(/[mzlhvcsqta][^mzlhvcsqta]*/gi);
            if (!this.path) {
                return;
            }
            if (!fromArray) {
                this.path = this._parsePath();
            }
            this._setPositionDimensions(options);
            if (this.objectCaching) {
                this._createCacheCanvas();
            }
        },
        _setPositionDimensions: function(options) {
            var calcDim = this._parseDimensions();
            this.minX = calcDim.left;
            this.minY = calcDim.top;
            this.width = calcDim.width;
            this.height = calcDim.height;
            if (typeof options.left === "undefined") {
                this.left = calcDim.left + (this.originX === "center" ? this.width / 2 : this.originX === "right" ? this.width : 0);
            }
            if (typeof options.top === "undefined") {
                this.top = calcDim.top + (this.originY === "center" ? this.height / 2 : this.originY === "bottom" ? this.height : 0);
            }
            this.pathOffset = this.pathOffset || {
                x: this.minX + this.width / 2,
                y: this.minY + this.height / 2
            };
        },
        _renderPathCommands: function(ctx) {
            var current, previous = null, subpathStartX = 0, subpathStartY = 0, x = 0, y = 0, controlX = 0, controlY = 0, tempX, tempY, l = -this.pathOffset.x, t = -this.pathOffset.y;
            if (this.group && this.group.type === "path-group") {
                l = 0;
                t = 0;
            }
            ctx.beginPath();
            for (var i = 0, len = this.path.length; i < len; ++i) {
                current = this.path[i];
                switch (current[0]) {
                  case "l":
                    x += current[1];
                    y += current[2];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "L":
                    x = current[1];
                    y = current[2];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "h":
                    x += current[1];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "H":
                    x = current[1];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "v":
                    y += current[1];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "V":
                    y = current[1];
                    ctx.lineTo(x + l, y + t);
                    break;

                  case "m":
                    x += current[1];
                    y += current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    ctx.moveTo(x + l, y + t);
                    break;

                  case "M":
                    x = current[1];
                    y = current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    ctx.moveTo(x + l, y + t);
                    break;

                  case "c":
                    tempX = x + current[5];
                    tempY = y + current[6];
                    controlX = x + current[3];
                    controlY = y + current[4];
                    ctx.bezierCurveTo(x + current[1] + l, y + current[2] + t, controlX + l, controlY + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    break;

                  case "C":
                    x = current[5];
                    y = current[6];
                    controlX = current[3];
                    controlY = current[4];
                    ctx.bezierCurveTo(current[1] + l, current[2] + t, controlX + l, controlY + t, x + l, y + t);
                    break;

                  case "s":
                    tempX = x + current[3];
                    tempY = y + current[4];
                    if (previous[0].match(/[CcSs]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.bezierCurveTo(controlX + l, controlY + t, x + current[1] + l, y + current[2] + t, tempX + l, tempY + t);
                    controlX = x + current[1];
                    controlY = y + current[2];
                    x = tempX;
                    y = tempY;
                    break;

                  case "S":
                    tempX = current[3];
                    tempY = current[4];
                    if (previous[0].match(/[CcSs]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.bezierCurveTo(controlX + l, controlY + t, current[1] + l, current[2] + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    controlX = current[1];
                    controlY = current[2];
                    break;

                  case "q":
                    tempX = x + current[3];
                    tempY = y + current[4];
                    controlX = x + current[1];
                    controlY = y + current[2];
                    ctx.quadraticCurveTo(controlX + l, controlY + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    break;

                  case "Q":
                    tempX = current[3];
                    tempY = current[4];
                    ctx.quadraticCurveTo(current[1] + l, current[2] + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    controlX = current[1];
                    controlY = current[2];
                    break;

                  case "t":
                    tempX = x + current[1];
                    tempY = y + current[2];
                    if (previous[0].match(/[QqTt]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.quadraticCurveTo(controlX + l, controlY + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    break;

                  case "T":
                    tempX = current[1];
                    tempY = current[2];
                    if (previous[0].match(/[QqTt]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    ctx.quadraticCurveTo(controlX + l, controlY + t, tempX + l, tempY + t);
                    x = tempX;
                    y = tempY;
                    break;

                  case "a":
                    drawArc(ctx, x + l, y + t, [ current[1], current[2], current[3], current[4], current[5], current[6] + x + l, current[7] + y + t ]);
                    x += current[6];
                    y += current[7];
                    break;

                  case "A":
                    drawArc(ctx, x + l, y + t, [ current[1], current[2], current[3], current[4], current[5], current[6] + l, current[7] + t ]);
                    x = current[6];
                    y = current[7];
                    break;

                  case "z":
                  case "Z":
                    x = subpathStartX;
                    y = subpathStartY;
                    ctx.closePath();
                    break;
                }
                previous = current;
            }
        },
        _render: function(ctx) {
            this._renderPathCommands(ctx);
            this._renderFill(ctx);
            this._renderStroke(ctx);
        },
        toString: function() {
            return "#<fabric.Path (" + this.complexity() + '): { "top": ' + this.top + ', "left": ' + this.left + " }>";
        },
        toObject: function(propertiesToInclude) {
            var o = extend(this.callSuper("toObject", [ "sourcePath", "pathOffset" ].concat(propertiesToInclude)), {
                path: this.path.map(function(item) {
                    return item.slice();
                }),
                top: this.top,
                left: this.left
            });
            return o;
        },
        toDatalessObject: function(propertiesToInclude) {
            var o = this.toObject(propertiesToInclude);
            if (this.sourcePath) {
                o.path = this.sourcePath;
            }
            delete o.sourcePath;
            return o;
        },
        toSVG: function(reviver) {
            var chunks = [], markup = this._createBaseSVGMarkup(), addTransform = "";
            for (var i = 0, len = this.path.length; i < len; i++) {
                chunks.push(this.path[i].join(" "));
            }
            var path = chunks.join(" ");
            if (!(this.group && this.group.type === "path-group")) {
                addTransform = " translate(" + -this.pathOffset.x + ", " + -this.pathOffset.y + ") ";
            }
            markup.push("<path ", this.getSvgId(), 'd="', path, '" style="', this.getSvgStyles(), '" transform="', this.getSvgTransform(), addTransform, this.getSvgTransformMatrix(), '" stroke-linecap="round" ', "/>\n");
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        complexity: function() {
            return this.path.length;
        },
        _parsePath: function() {
            var result = [], coords = [], currentPath, parsed, re = /([-+]?((\d+\.\d+)|((\d+)|(\.\d+)))(?:e[-+]?\d+)?)/gi, match, coordsStr;
            for (var i = 0, coordsParsed, len = this.path.length; i < len; i++) {
                currentPath = this.path[i];
                coordsStr = currentPath.slice(1).trim();
                coords.length = 0;
                while (match = re.exec(coordsStr)) {
                    coords.push(match[0]);
                }
                coordsParsed = [ currentPath.charAt(0) ];
                for (var j = 0, jlen = coords.length; j < jlen; j++) {
                    parsed = parseFloat(coords[j]);
                    if (!isNaN(parsed)) {
                        coordsParsed.push(parsed);
                    }
                }
                var command = coordsParsed[0], commandLength = commandLengths[command.toLowerCase()], repeatedCommand = repeatedCommands[command] || command;
                if (coordsParsed.length - 1 > commandLength) {
                    for (var k = 1, klen = coordsParsed.length; k < klen; k += commandLength) {
                        result.push([ command ].concat(coordsParsed.slice(k, k + commandLength)));
                        command = repeatedCommand;
                    }
                } else {
                    result.push(coordsParsed);
                }
            }
            return result;
        },
        _parseDimensions: function() {
            var aX = [], aY = [], current, previous = null, subpathStartX = 0, subpathStartY = 0, x = 0, y = 0, controlX = 0, controlY = 0, tempX, tempY, bounds;
            for (var i = 0, len = this.path.length; i < len; ++i) {
                current = this.path[i];
                switch (current[0]) {
                  case "l":
                    x += current[1];
                    y += current[2];
                    bounds = [];
                    break;

                  case "L":
                    x = current[1];
                    y = current[2];
                    bounds = [];
                    break;

                  case "h":
                    x += current[1];
                    bounds = [];
                    break;

                  case "H":
                    x = current[1];
                    bounds = [];
                    break;

                  case "v":
                    y += current[1];
                    bounds = [];
                    break;

                  case "V":
                    y = current[1];
                    bounds = [];
                    break;

                  case "m":
                    x += current[1];
                    y += current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    bounds = [];
                    break;

                  case "M":
                    x = current[1];
                    y = current[2];
                    subpathStartX = x;
                    subpathStartY = y;
                    bounds = [];
                    break;

                  case "c":
                    tempX = x + current[5];
                    tempY = y + current[6];
                    controlX = x + current[3];
                    controlY = y + current[4];
                    bounds = fabric.util.getBoundsOfCurve(x, y, x + current[1], y + current[2], controlX, controlY, tempX, tempY);
                    x = tempX;
                    y = tempY;
                    break;

                  case "C":
                    controlX = current[3];
                    controlY = current[4];
                    bounds = fabric.util.getBoundsOfCurve(x, y, current[1], current[2], controlX, controlY, current[5], current[6]);
                    x = current[5];
                    y = current[6];
                    break;

                  case "s":
                    tempX = x + current[3];
                    tempY = y + current[4];
                    if (previous[0].match(/[CcSs]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, x + current[1], y + current[2], tempX, tempY);
                    controlX = x + current[1];
                    controlY = y + current[2];
                    x = tempX;
                    y = tempY;
                    break;

                  case "S":
                    tempX = current[3];
                    tempY = current[4];
                    if (previous[0].match(/[CcSs]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, current[1], current[2], tempX, tempY);
                    x = tempX;
                    y = tempY;
                    controlX = current[1];
                    controlY = current[2];
                    break;

                  case "q":
                    tempX = x + current[3];
                    tempY = y + current[4];
                    controlX = x + current[1];
                    controlY = y + current[2];
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, controlX, controlY, tempX, tempY);
                    x = tempX;
                    y = tempY;
                    break;

                  case "Q":
                    controlX = current[1];
                    controlY = current[2];
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, controlX, controlY, current[3], current[4]);
                    x = current[3];
                    y = current[4];
                    break;

                  case "t":
                    tempX = x + current[1];
                    tempY = y + current[2];
                    if (previous[0].match(/[QqTt]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, controlX, controlY, tempX, tempY);
                    x = tempX;
                    y = tempY;
                    break;

                  case "T":
                    tempX = current[1];
                    tempY = current[2];
                    if (previous[0].match(/[QqTt]/) === null) {
                        controlX = x;
                        controlY = y;
                    } else {
                        controlX = 2 * x - controlX;
                        controlY = 2 * y - controlY;
                    }
                    bounds = fabric.util.getBoundsOfCurve(x, y, controlX, controlY, controlX, controlY, tempX, tempY);
                    x = tempX;
                    y = tempY;
                    break;

                  case "a":
                    bounds = fabric.util.getBoundsOfArc(x, y, current[1], current[2], current[3], current[4], current[5], current[6] + x, current[7] + y);
                    x += current[6];
                    y += current[7];
                    break;

                  case "A":
                    bounds = fabric.util.getBoundsOfArc(x, y, current[1], current[2], current[3], current[4], current[5], current[6], current[7]);
                    x = current[6];
                    y = current[7];
                    break;

                  case "z":
                  case "Z":
                    x = subpathStartX;
                    y = subpathStartY;
                    break;
                }
                previous = current;
                bounds.forEach(function(point) {
                    aX.push(point.x);
                    aY.push(point.y);
                });
                aX.push(x);
                aY.push(y);
            }
            var minX = min(aX) || 0, minY = min(aY) || 0, maxX = max(aX) || 0, maxY = max(aY) || 0, deltaX = maxX - minX, deltaY = maxY - minY, o = {
                left: minX,
                top: minY,
                width: deltaX,
                height: deltaY
            };
            return o;
        }
    });
    fabric.Path.fromObject = function(object, callback, forceAsync) {
        return fabric.Object._fromObject("Path", object, callback, forceAsync, "path");
    };
    fabric.Path.async = true;
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend;
    if (fabric.PathGroup) {
        fabric.warn("fabric.PathGroup is already defined");
        return;
    }
    fabric.PathGroup = fabric.util.createClass(fabric.Object, {
        type: "path-group",
        fill: "",
        initialize: function(paths, options) {
            options = options || {};
            this.paths = paths || [];
            for (var i = this.paths.length; i--; ) {
                this.paths[i].group = this;
            }
            if (options.toBeParsed) {
                this.parseDimensionsFromPaths(options);
                delete options.toBeParsed;
            }
            this.setOptions(options);
            this.setCoords();
            if (this.objectCaching) {
                this._createCacheCanvas();
            }
        },
        parseDimensionsFromPaths: function(options) {
            var points, p, xC = [], yC = [], path, height, width, m;
            for (var j = this.paths.length; j--; ) {
                path = this.paths[j];
                height = path.height + path.strokeWidth;
                width = path.width + path.strokeWidth;
                points = [ {
                    x: path.left,
                    y: path.top
                }, {
                    x: path.left + width,
                    y: path.top
                }, {
                    x: path.left,
                    y: path.top + height
                }, {
                    x: path.left + width,
                    y: path.top + height
                } ];
                m = this.paths[j].transformMatrix;
                for (var i = 0; i < points.length; i++) {
                    p = points[i];
                    if (m) {
                        p = fabric.util.transformPoint(p, m, false);
                    }
                    xC.push(p.x);
                    yC.push(p.y);
                }
            }
            options.width = Math.max.apply(null, xC);
            options.height = Math.max.apply(null, yC);
        },
        drawObject: function(ctx) {
            ctx.save();
            ctx.translate(-this.width / 2, -this.height / 2);
            for (var i = 0, l = this.paths.length; i < l; ++i) {
                this.paths[i].render(ctx, true);
            }
            ctx.restore();
        },
        shouldCache: function() {
            var parentCache = this.objectCaching && (!this.group || this.needsItsOwnCache || !this.group.isCaching());
            this.caching = parentCache;
            if (parentCache) {
                for (var i = 0, len = this.paths.length; i < len; i++) {
                    if (this.paths[i].willDrawShadow()) {
                        this.caching = false;
                        return false;
                    }
                }
            }
            return parentCache;
        },
        willDrawShadow: function() {
            if (this.shadow) {
                return true;
            }
            for (var i = 0, len = this.paths.length; i < len; i++) {
                if (this.paths[i].willDrawShadow()) {
                    return true;
                }
            }
            return false;
        },
        isCaching: function() {
            return this.caching || this.group && this.group.isCaching();
        },
        isCacheDirty: function() {
            if (this.callSuper("isCacheDirty")) {
                return true;
            }
            if (!this.statefullCache) {
                return false;
            }
            for (var i = 0, len = this.paths.length; i < len; i++) {
                if (this.paths[i].isCacheDirty(true)) {
                    var dim = this._getNonTransformedDimensions();
                    this._cacheContext.clearRect(-dim.x / 2, -dim.y / 2, dim.x, dim.y);
                    return true;
                }
            }
            return false;
        },
        _set: function(prop, value) {
            if (prop === "fill" && value && this.isSameColor()) {
                var i = this.paths.length;
                while (i--) {
                    this.paths[i]._set(prop, value);
                }
            }
            return this.callSuper("_set", prop, value);
        },
        toObject: function(propertiesToInclude) {
            var pathsToObject = this.paths.map(function(path) {
                var originalDefaults = path.includeDefaultValues;
                path.includeDefaultValues = path.group.includeDefaultValues;
                var obj = path.toObject(propertiesToInclude);
                path.includeDefaultValues = originalDefaults;
                return obj;
            });
            var o = extend(this.callSuper("toObject", [ "sourcePath" ].concat(propertiesToInclude)), {
                paths: pathsToObject
            });
            return o;
        },
        toDatalessObject: function(propertiesToInclude) {
            var o = this.toObject(propertiesToInclude);
            if (this.sourcePath) {
                o.paths = this.sourcePath;
            }
            return o;
        },
        toSVG: function(reviver) {
            var objects = this.getObjects(), p = this.getPointByOrigin("left", "top"), translatePart = "translate(" + p.x + " " + p.y + ")", markup = this._createBaseSVGMarkup();
            markup.push("<g ", this.getSvgId(), 'style="', this.getSvgStyles(), '" ', 'transform="', this.getSvgTransformMatrix(), translatePart, this.getSvgTransform(), '" ', ">\n");
            for (var i = 0, len = objects.length; i < len; i++) {
                markup.push("\t", objects[i].toSVG(reviver));
            }
            markup.push("</g>\n");
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        toString: function() {
            return "#<fabric.PathGroup (" + this.complexity() + "): { top: " + this.top + ", left: " + this.left + " }>";
        },
        isSameColor: function() {
            var firstPathFill = this.getObjects()[0].get("fill") || "";
            if (typeof firstPathFill !== "string") {
                return false;
            }
            firstPathFill = firstPathFill.toLowerCase();
            return this.getObjects().every(function(path) {
                var pathFill = path.get("fill") || "";
                return typeof pathFill === "string" && pathFill.toLowerCase() === firstPathFill;
            });
        },
        complexity: function() {
            return this.paths.reduce(function(total, path) {
                return total + (path && path.complexity ? path.complexity() : 0);
            }, 0);
        },
        getObjects: function() {
            return this.paths;
        }
    });
    fabric.PathGroup.fromObject = function(object, callback) {
        var originalPaths = object.paths;
        delete object.paths;
        if (typeof originalPaths === "string") {
            fabric.loadSVGFromURL(originalPaths, function(elements) {
                var pathUrl = originalPaths;
                var pathGroup = fabric.util.groupSVGElements(elements, object, pathUrl);
                object.paths = originalPaths;
                callback(pathGroup);
            });
        } else {
            fabric.util.enlivenObjects(originalPaths, function(enlivenedObjects) {
                var pathGroup = new fabric.PathGroup(enlivenedObjects, object);
                object.paths = originalPaths;
                callback(pathGroup);
            });
        }
    };
    fabric.PathGroup.async = true;
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var fabric = global.fabric || (global.fabric = {}), extend = fabric.util.object.extend, min = fabric.util.array.min, max = fabric.util.array.max;
    if (fabric.Group) {
        return;
    }
    var _lockProperties = {
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true
    };
    fabric.Group = fabric.util.createClass(fabric.Object, fabric.Collection, {
        type: "group",
        strokeWidth: 0,
        subTargetCheck: false,
        initialize: function(objects, options, isAlreadyGrouped) {
            options = options || {};
            this._objects = [];
            isAlreadyGrouped && this.callSuper("initialize", options);
            this._objects = objects || [];
            for (var i = this._objects.length; i--; ) {
                this._objects[i].group = this;
            }
            if (options.originX) {
                this.originX = options.originX;
            }
            if (options.originY) {
                this.originY = options.originY;
            }
            if (isAlreadyGrouped) {
                this._updateObjectsCoords(true);
            } else {
                this._calcBounds();
                this._updateObjectsCoords();
                this.callSuper("initialize", options);
            }
            this.setCoords();
        },
        _updateObjectsCoords: function(skipCoordsChange) {
            var center = this.getCenterPoint();
            for (var i = this._objects.length; i--; ) {
                this._updateObjectCoords(this._objects[i], center, skipCoordsChange);
            }
        },
        _updateObjectCoords: function(object, center, skipCoordsChange) {
            object.__origHasControls = object.hasControls;
            object.hasControls = false;
            if (skipCoordsChange) {
                return;
            }
            var objectLeft = object.getLeft(), objectTop = object.getTop(), ignoreZoom = true, skipAbsolute = true;
            object.set({
                left: objectLeft - center.x,
                top: objectTop - center.y
            });
            object.setCoords(ignoreZoom, skipAbsolute);
        },
        toString: function() {
            return "#<fabric.Group: (" + this.complexity() + ")>";
        },
        addWithUpdate: function(object) {
            this._restoreObjectsState();
            fabric.util.resetObjectTransform(this);
            if (object) {
                this._objects.push(object);
                object.group = this;
                object._set("canvas", this.canvas);
            }
            this.forEachObject(this._setObjectActive, this);
            this._calcBounds();
            this._updateObjectsCoords();
            this.setCoords();
            this.dirty = true;
            return this;
        },
        _setObjectActive: function(object) {
            object.set("active", true);
            object.group = this;
        },
        removeWithUpdate: function(object) {
            this._restoreObjectsState();
            fabric.util.resetObjectTransform(this);
            this.forEachObject(this._setObjectActive, this);
            this.remove(object);
            this._calcBounds();
            this._updateObjectsCoords();
            this.setCoords();
            this.dirty = true;
            return this;
        },
        _onObjectAdded: function(object) {
            this.dirty = true;
            object.group = this;
            object._set("canvas", this.canvas);
        },
        _onObjectRemoved: function(object) {
            this.dirty = true;
            delete object.group;
            object.set("active", false);
        },
        delegatedProperties: {
            fill: true,
            stroke: true,
            strokeWidth: true,
            fontFamily: true,
            fontWeight: true,
            fontSize: true,
            fontStyle: true,
            lineHeight: true,
            textDecoration: true,
            textAlign: true,
            backgroundColor: true
        },
        _set: function(key, value) {
            var i = this._objects.length;
            if (this.delegatedProperties[key] || key === "canvas") {
                while (i--) {
                    this._objects[i].set(key, value);
                }
            } else {
                while (i--) {
                    this._objects[i].setOnGroup(key, value);
                }
            }
            this.callSuper("_set", key, value);
        },
        toObject: function(propertiesToInclude) {
            var objsToObject = this.getObjects().map(function(obj) {
                var originalDefaults = obj.includeDefaultValues;
                obj.includeDefaultValues = obj.group.includeDefaultValues;
                var _obj = obj.toObject(propertiesToInclude);
                obj.includeDefaultValues = originalDefaults;
                return _obj;
            });
            return extend(this.callSuper("toObject", propertiesToInclude), {
                objects: objsToObject
            });
        },
        toDatalessObject: function(propertiesToInclude) {
            var objsToObject = this.getObjects().map(function(obj) {
                var originalDefaults = obj.includeDefaultValues;
                obj.includeDefaultValues = obj.group.includeDefaultValues;
                var _obj = obj.toDatalessObject(propertiesToInclude);
                obj.includeDefaultValues = originalDefaults;
                return _obj;
            });
            return extend(this.callSuper("toDatalessObject", propertiesToInclude), {
                objects: objsToObject
            });
        },
        render: function(ctx) {
            this._transformDone = true;
            this.callSuper("render", ctx);
            this._transformDone = false;
        },
        shouldCache: function() {
            var parentCache = this.objectCaching && (!this.group || this.needsItsOwnCache || !this.group.isCaching());
            this.caching = parentCache;
            if (parentCache) {
                for (var i = 0, len = this._objects.length; i < len; i++) {
                    if (this._objects[i].willDrawShadow()) {
                        this.caching = false;
                        return false;
                    }
                }
            }
            return parentCache;
        },
        willDrawShadow: function() {
            if (this.shadow) {
                return true;
            }
            for (var i = 0, len = this._objects.length; i < len; i++) {
                if (this._objects[i].willDrawShadow()) {
                    return true;
                }
            }
            return false;
        },
        isCaching: function() {
            return this.caching || this.group && this.group.isCaching();
        },
        drawObject: function(ctx) {
            for (var i = 0, len = this._objects.length; i < len; i++) {
                this._renderObject(this._objects[i], ctx);
            }
        },
        isCacheDirty: function() {
            if (this.callSuper("isCacheDirty")) {
                return true;
            }
            if (!this.statefullCache) {
                return false;
            }
            for (var i = 0, len = this._objects.length; i < len; i++) {
                if (this._objects[i].isCacheDirty(true)) {
                    var dim = this._getNonTransformedDimensions();
                    this._cacheContext.clearRect(-dim.x / 2, -dim.y / 2, dim.x, dim.y);
                    return true;
                }
            }
            return false;
        },
        _renderControls: function(ctx, styleOverride, childrenOverride) {
            ctx.save();
            ctx.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
            this.callSuper("_renderControls", ctx, styleOverride);
            if (this.canvas && this === this.canvas.getActiveGroup()) {
                for (var i = 0, len = this._objects.length; i < len; i++) {
                    this._objects[i]._renderControls(ctx, childrenOverride);
                }
            }
            ctx.restore();
        },
        _renderObject: function(object, ctx) {
            if (!object.visible) {
                return;
            }
            var originalHasRotatingPoint = object.hasRotatingPoint;
            object.hasRotatingPoint = false;
            object.render(ctx);
            object.hasRotatingPoint = originalHasRotatingPoint;
        },
        _restoreObjectsState: function() {
            this._objects.forEach(this._restoreObjectState, this);
            return this;
        },
        realizeTransform: function(object) {
            var matrix = object.calcTransformMatrix(), options = fabric.util.qrDecompose(matrix), center = new fabric.Point(options.translateX, options.translateY);
            object.flipX = false;
            object.flipY = false;
            object.set("scaleX", options.scaleX);
            object.set("scaleY", options.scaleY);
            object.skewX = options.skewX;
            object.skewY = options.skewY;
            object.angle = options.angle;
            object.setPositionByOrigin(center, "center", "center");
            return object;
        },
        _restoreObjectState: function(object) {
            this.realizeTransform(object);
            object.setCoords();
            object.hasControls = object.__origHasControls;
            delete object.__origHasControls;
            object.set("active", false);
            delete object.group;
            return this;
        },
        destroy: function() {
            return this._restoreObjectsState();
        },
        setObjectsCoords: function() {
            var ignoreZoom = true, skipAbsolute = true;
            this.forEachObject(function(object) {
                object.setCoords(ignoreZoom, skipAbsolute);
            });
            return this;
        },
        _calcBounds: function(onlyWidthHeight) {
            var aX = [], aY = [], o, prop, props = [ "tr", "br", "bl", "tl" ], i = 0, iLen = this._objects.length, j, jLen = props.length, ignoreZoom = true;
            for (;i < iLen; ++i) {
                o = this._objects[i];
                o.setCoords(ignoreZoom);
                for (j = 0; j < jLen; j++) {
                    prop = props[j];
                    aX.push(o.oCoords[prop].x);
                    aY.push(o.oCoords[prop].y);
                }
            }
            this.set(this._getBounds(aX, aY, onlyWidthHeight));
        },
        _getBounds: function(aX, aY, onlyWidthHeight) {
            var minXY = new fabric.Point(min(aX), min(aY)), maxXY = new fabric.Point(max(aX), max(aY)), obj = {
                width: maxXY.x - minXY.x || 0,
                height: maxXY.y - minXY.y || 0
            };
            if (!onlyWidthHeight) {
                obj.left = minXY.x || 0;
                obj.top = minXY.y || 0;
                if (this.originX === "center") {
                    obj.left += obj.width / 2;
                }
                if (this.originX === "right") {
                    obj.left += obj.width;
                }
                if (this.originY === "center") {
                    obj.top += obj.height / 2;
                }
                if (this.originY === "bottom") {
                    obj.top += obj.height;
                }
            }
            return obj;
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup();
            markup.push("<g ", this.getSvgId(), 'transform="', this.getSvgTransform(), this.getSvgTransformMatrix(), '" style="', this.getSvgFilter(), '">\n');
            for (var i = 0, len = this._objects.length; i < len; i++) {
                markup.push("\t", this._objects[i].toSVG(reviver));
            }
            markup.push("</g>\n");
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        get: function(prop) {
            if (prop in _lockProperties) {
                if (this[prop]) {
                    return this[prop];
                } else {
                    for (var i = 0, len = this._objects.length; i < len; i++) {
                        if (this._objects[i][prop]) {
                            return true;
                        }
                    }
                    return false;
                }
            } else {
                if (prop in this.delegatedProperties) {
                    return this._objects[0] && this._objects[0].get(prop);
                }
                return this[prop];
            }
        }
    });
    fabric.Group.fromObject = function(object, callback) {
        fabric.util.enlivenObjects(object.objects, function(enlivenedObjects) {
            delete object.objects;
            callback && callback(new fabric.Group(enlivenedObjects, object, true));
        });
    };
    fabric.Group.async = true;
})(typeof exports !== "undefined" ? exports : this);

(function(global) {
    "use strict";
    var extend = fabric.util.object.extend;
    if (!global.fabric) {
        global.fabric = {};
    }
    if (global.fabric.Image) {
        fabric.warn("fabric.Image is already defined.");
        return;
    }
    var stateProperties = fabric.Object.prototype.stateProperties.concat();
    stateProperties.push("alignX", "alignY", "meetOrSlice");
    fabric.Image = fabric.util.createClass(fabric.Object, {
        type: "image",
        crossOrigin: "",
        alignX: "none",
        alignY: "none",
        meetOrSlice: "meet",
        strokeWidth: 0,
        _lastScaleX: 1,
        _lastScaleY: 1,
        _filterScalingX: 1,
        _filterScalingY: 1,
        minimumScaleTrigger: .5,
        stateProperties: stateProperties,
        objectCaching: false,
        cacheKey: "",
        initialize: function(element, options) {
            options || (options = {});
            this.filters = [];
            this.callSuper("initialize", options);
            this._initElement(element, options);
            this.cacheKey = "texture" + fabric.Object.__uid++;
        },
        getElement: function() {
            return this._element;
        },
        setElement: function(element, options) {
            this._element = element;
            this._originalElement = element;
            this._initConfig(options);
            if (this.resizeFilter) {
                this.applyResizeFilters();
            }
            if (this.filters.length !== 0) {
                this.applyFilters();
            }
            return this;
        },
        setCrossOrigin: function(value) {
            this.crossOrigin = value;
            this._element.crossOrigin = value;
            return this;
        },
        getOriginalSize: function() {
            var element = this.getElement();
            return {
                width: element.width,
                height: element.height
            };
        },
        _stroke: function(ctx) {
            if (!this.stroke || this.strokeWidth === 0) {
                return;
            }
            var w = this.width / 2, h = this.height / 2;
            ctx.beginPath();
            ctx.moveTo(-w, -h);
            ctx.lineTo(w, -h);
            ctx.lineTo(w, h);
            ctx.lineTo(-w, h);
            ctx.lineTo(-w, -h);
            ctx.closePath();
        },
        _renderDashedStroke: function(ctx) {
            var x = -this.width / 2, y = -this.height / 2, w = this.width, h = this.height;
            ctx.save();
            this._setStrokeStyles(ctx, this);
            ctx.beginPath();
            fabric.util.drawDashedLine(ctx, x, y, x + w, y, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x + w, y, x + w, y + h, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x + w, y + h, x, y + h, this.strokeDashArray);
            fabric.util.drawDashedLine(ctx, x, y + h, x, y, this.strokeDashArray);
            ctx.closePath();
            ctx.restore();
        },
        toObject: function(propertiesToInclude) {
            var filters = [];
            this.filters.forEach(function(filterObj) {
                if (filterObj) {
                    filters.push(filterObj.toObject());
                }
            });
            var object = extend(this.callSuper("toObject", [ "crossOrigin", "alignX", "alignY", "meetOrSlice" ].concat(propertiesToInclude)), {
                src: this.getSrc(),
                filters: filters
            });
            if (this.resizeFilter) {
                object.resizeFilter = this.resizeFilter.toObject();
            }
            object.width /= this._filterScalingX;
            object.height /= this._filterScalingY;
            return object;
        },
        toSVG: function(reviver) {
            var markup = this._createBaseSVGMarkup(), x = -this.width / 2, y = -this.height / 2, preserveAspectRatio = "none", filtered = true;
            if (this.group && this.group.type === "path-group") {
                x = this.left;
                y = this.top;
            }
            if (this.alignX !== "none" && this.alignY !== "none") {
                preserveAspectRatio = "x" + this.alignX + "Y" + this.alignY + " " + this.meetOrSlice;
            }
            markup.push('<g transform="', this.getSvgTransform(), this.getSvgTransformMatrix(), '">\n', "<image ", this.getSvgId(), 'xlink:href="', this.getSvgSrc(filtered), '" x="', x, '" y="', y, '" style="', this.getSvgStyles(), '" width="', this.width, '" height="', this.height, '" preserveAspectRatio="', preserveAspectRatio, '"', "></image>\n");
            if (this.stroke || this.strokeDashArray) {
                var origFill = this.fill;
                this.fill = null;
                markup.push("<rect ", 'x="', x, '" y="', y, '" width="', this.width, '" height="', this.height, '" style="', this.getSvgStyles(), '"/>\n');
                this.fill = origFill;
            }
            markup.push("</g>\n");
            return reviver ? reviver(markup.join("")) : markup.join("");
        },
        getSrc: function(filtered) {
            var element = filtered ? this._element : this._originalElement;
            if (element) {
                return fabric.isLikelyNode ? element._src : element.src;
            } else {
                return this.src || "";
            }
        },
        setSrc: function(src, callback, options) {
            fabric.util.loadImage(src, function(img) {
                this.setElement(img, options);
                callback(this);
            }, this, options && options.crossOrigin);
            return this;
        },
        toString: function() {
            return '#<fabric.Image: { src: "' + this.getSrc() + '" }>';
        },
        applyResizeFilters: function() {
            var filter = this.resizeFilter, retinaScaling = this.canvas ? this.canvas.getRetinaScaling() : 1, minimumScale = this.minimumScaleTrigger, scaleX = this.scaleX < minimumScale ? this.scaleX : 1, scaleY = this.scaleY < minimumScale ? this.scaleY : 1;
            if (scaleX * retinaScaling < 1) {
                scaleX *= retinaScaling;
            }
            if (scaleY * retinaScaling < 1) {
                scaleY *= retinaScaling;
            }
            if (!filter || scaleX >= 1 && scaleY >= 1) {
                this._element = this._filteredEl;
                return;
            }
            if (!fabric.filterBackend) {
                fabric.filterBackend = fabric.initFilterBackend();
            }
            var elementToFilter = this._filteredEl || this._originalElement, imageData;
            if (this._element === this._originalElement) {
                var canvasEl = fabric.util.createCanvasElement();
                canvasEl.width = elementToFilter.width;
                canvasEl.height = elementToFilter.height;
                this._element = canvasEl;
            }
            var ctx = this._element.getContext("2d");
            if (elementToFilter.getContext) {
                imageData = elementToFilter.getContext("2d").getImageData(0, 0, elementToFilter.width, elementToFilter.height);
            } else {
                ctx.drawImage(elementToFilter, 0, 0);
                imageData = ctx.getImageData(0, 0, elementToFilter.width, elementToFilter.height);
            }
            var options = {
                imageData: imageData,
                scaleX: scaleX,
                scaleY: scaleY
            };
            filter.applyTo2d(options);
            this.width = this._element.width = options.imageData.width;
            this.height = this._element.height = options.imageData.height;
            ctx.putImageData(options.imageData, 0, 0);
        },
        applyFilters: function(filters) {
            filters = filters || this.filters || [];
            filters = filters.filter(function(filter) {
                return filter;
            });
            if (filters.length === 0) {
                this._element = this._originalElement;
                this._filterScalingX = 1;
                this._filterScalingY = 1;
                return this;
            }
            var imgElement = this._originalElement, sourceWidth = imgElement.naturalWidth || imgElement.width, sourceHeight = imgElement.naturalHeight || imgElement.height;
            if (this._element === this._originalElement) {
                var canvasEl = fabric.util.createCanvasElement();
                canvasEl.width = imgElement.width;
                canvasEl.height = imgElement.height;
                this._element = canvasEl;
            } else {
                this._element.getContext("2d").clearRect(0, 0, sourceWidth, sourceHeight);
            }
            if (!fabric.filterBackend) {
                fabric.filterBackend = fabric.initFilterBackend();
            }
            fabric.filterBackend.applyFilters(filters, this._originalElement, sourceWidth, sourceHeight, this._element, this.cacheKey);
            if (this.width !== this._element.width || this.height !== this._element.height) {
                this._filterScalingX = this._element.width / this.width;
                this._filterScalingY = this._element.height / this.height;
                this.width = this._element.width;
                this.height = this._element.height;
            }
            return this;
        },
        _render: function(ctx, noTransform) {
            var x, y, imageMargins = this._findMargins(), elementToDraw;
            x = noTransform ? this.left : -this.width / 2;
            y = noTransform ? this.top : -this.height / 2;
            if (this.meetOrSlice === "slice") {
                ctx.beginPath();
                ctx.rect(x, y, this.width, this.height);
                ctx.clip();
            }
            if (this.isMoving === false && this.resizeFilters.length && this._needsResize()) {
                this._lastScaleX = this.scaleX;
                this._lastScaleY = this.scaleY;
                this.applyResizeFilters();
            }
            elementToDraw = this._element;
            elementToDraw && ctx.drawImage(elementToDraw, x + imageMargins.marginX, y + imageMargins.marginY, imageMargins.width, imageMargins.height);
            this._stroke(ctx);
            this._renderStroke(ctx);
        },
        _needsResize: function() {
            return this.scaleX !== this._lastScaleX || this.scaleY !== this._lastScaleY;
        },
        _findMargins: function() {
            var width = this.width, height = this.height, scales, scale, marginX = 0, marginY = 0;
            if (this.alignX !== "none" || this.alignY !== "none") {
                scales = [ this.width / this._element.width, this.height / this._element.height ];
                scale = this.meetOrSlice === "meet" ? Math.min.apply(null, scales) : Math.max.apply(null, scales);
                width = this._element.width * scale;
                height = this._element.height * scale;
                if (this.alignX === "Mid") {
                    marginX = (this.width - width) / 2;
                }
                if (this.alignX === "Max") {
                    marginX = this.width - width;
                }
                if (this.alignY === "Mid") {
                    marginY = (this.height - height) / 2;
                }
                if (this.alignY === "Max") {
                    marginY = this.height - height;
                }
            }
            return {
                width: width,
                height: height,
                marginX: marginX,
                marginY: marginY
            };
        },
        _resetWidthHeight: function() {
            var element = this.getElement();
            this.set("width", element.width);
            this.set("height", element.height);
        },
        _initElement: function(element, options) {
            this.setElement(fabric.util.getById(element), options);
            fabric.util.addClass(this.getElement(), fabric.Image.CSS_CANVAS);
        },
        _initConfig: function(options) {
            options || (options = {});
            this.setOptions(options);
            this._setWidthHeight(options);
            if (this._element && this.crossOrigin) {
                this._element.crossOrigin = this.crossOrigin;
            }
        },
        _initFilters: function(filters, callback) {
            if (filters && filters.length) {
                fabric.util.enlivenObjects(filters, function(enlivenedObjects) {
                    callback && callback(enlivenedObjects);
                }, "fabric.Image.filters");
            } else {
                callback && callback();
            }
        },
        _setWidthHeight: function(options) {
            this.width = "width" in options ? options.width : this.getElement() ? this.getElement().width || 0 : 0;
            this.height = "height" in options ? options.height : this.getElement() ? this.getElement().height || 0 : 0;
        }
    });
    fabric.Image.CSS_CANVAS = "canvas-img";
    fabric.Image.prototype.getSvgSrc = fabric.Image.prototype.getSrc;
    fabric.Image.fromObject = function(object, callback) {
        fabric.util.loadImage(object.src, function(img, error) {
            if (error) {
                callback && callback(null, error);
                return;
            }
            fabric.Image.prototype._initFilters.call(object, object.filters, function(filters) {
                object.filters = filters || [];
                fabric.Image.prototype._initFilters.call(object, [ object.resizeFilter ], function(resizeFilters) {
                    object.resizeFilter = resizeFilters[0];
                    var image = new fabric.Image(img, object);
                    callback(image);
                });
            });
        }, null, object.crossOrigin);
    };
    fabric.Image.fromURL = function(url, callback, imgOptions) {
        fabric.util.loadImage(url, function(img) {
            callback && callback(new fabric.Image(img, imgOptions));
        }, null, imgOptions && imgOptions.crossOrigin);
    };
    fabric.Image.async = true;
    fabric.Image.pngCompression = 1;
})(typeof exports !== "undefined" ? exports : this);

window.fabric = fabric;

if (typeof define === "function" && define.amd) {
    define([], function() {
        return fabric;
    });
}