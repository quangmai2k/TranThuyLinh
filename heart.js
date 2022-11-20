var settings = {
    particles: {
        length: 2000, // maximum amount of particles
        duration: 2, // particle duration in sec
        velocity: 100, // particle velocity in pixels/sec
        effect: -1.3, // play with this for a nice effect
        size: 13, // particle size in pixels
    },
};
/*
 * RequestAnimationFrame polyfill by Erik Möller
 */
(function () { var b = 0; var c = ["ms", "moz", "webkit", "o"]; for (var a = 0; a < c.length && !window.requestAnimationFrame; ++a) { window.requestAnimationFrame = window[c[a] + "RequestAnimationFrame"]; window.cancelAnimationFrame = window[c[a] + "CancelAnimationFrame"] || window[c[a] + "CancelRequestAnimationFrame"] } if (!window.requestAnimationFrame) { window.requestAnimationFrame = function (h, e) { var d = new Date().getTime(); var f = Math.max(0, 16 - (d - b)); var g = window.setTimeout(function () { h(d + f) }, f); b = d + f; return g } } if (!window.cancelAnimationFrame) { window.cancelAnimationFrame = function (d) { clearTimeout(d) } } }());
/*
 * Point class
 */
var Point = (function () {
    function Point(x, y) {
        this.x = (typeof x !== 'undefined') ? x : 0;
        this.y = (typeof y !== 'undefined') ? y : 0;
    }
    Point.prototype.clone = function () {
        return new Point(this.x, this.y);
    };
    Point.prototype.length = function (length) {
        if (typeof length == 'undefined')
            return Math.sqrt(this.x * this.x + this.y * this.y);
        this.normalize();
        this.x *= length;
        this.y *= length;
        return this;
    };
    Point.prototype.normalize = function () {
        var length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    };
    return Point;
})();
/*
 * Particle class
 */
var Particle = (function () {
    function Particle() {
        this.position = new Point();
        this.velocity = new Point();
        this.acceleration = new Point();
        this.age = 0;
    }
    Particle.prototype.initialize = function (x, y, dx, dy) {
        this.position.x = x;
        this.position.y = y;
        this.velocity.x = dx;
        this.velocity.y = dy;
        this.acceleration.x = dx * settings.particles.effect;
        this.acceleration.y = dy * settings.particles.effect;
        this.age = 0;
    };
    Particle.prototype.update = function (deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.age += deltaTime;
    };
    Particle.prototype.draw = function (context, image) {
        function ease(t) {
            return (--t) * t * t + 1;
        }
        var size = image.width * ease(this.age / settings.particles.duration);
        context.globalAlpha = 1 - this.age / settings.particles.duration;
        context.drawImage(image, this.position.x - size / 2, this.position.y - size / 2, size, size);
    };
    return Particle;
})();
/*
 * ParticlePool class
 */
var ParticlePool = (function () {
    var particles,
        firstActive = 0,
        firstFree = 0,
        duration = settings.particles.duration;

    function ParticlePool(length) {
        // create and populate particle pool
        particles = new Array(length);
        for (var i = 0; i < particles.length; i++)
            particles[i] = new Particle();
    }
    ParticlePool.prototype.add = function (x, y, dx, dy) {
        particles[firstFree].initialize(x, y, dx, dy);

        // handle circular queue
        firstFree++;
        if (firstFree == particles.length) firstFree = 0;
        if (firstActive == firstFree) firstActive++;
        if (firstActive == particles.length) firstActive = 0;
    };
    ParticlePool.prototype.update = function (deltaTime) {
        var i;

        // update active particles
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++)
                particles[i].update(deltaTime);
        }
        if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++)
                particles[i].update(deltaTime);
            for (i = 0; i < firstFree; i++)
                particles[i].update(deltaTime);
        }

        // remove inactive particles
        while (particles[firstActive].age >= duration && firstActive != firstFree) {
            firstActive++;
            if (firstActive == particles.length) firstActive = 0;
        }


    };
    ParticlePool.prototype.draw = function (context, image) {
        // draw active particles
        if (firstActive < firstFree) {
            for (i = firstActive; i < firstFree; i++)
                particles[i].draw(context, image);
        }
        if (firstFree < firstActive) {
            for (i = firstActive; i < particles.length; i++)
                particles[i].draw(context, image);
            for (i = 0; i < firstFree; i++)
                particles[i].draw(context, image);
        }
    };
    return ParticlePool;
})();
/*
 * Putting it all together
 */
(function (canvas) {
    var context = canvas.getContext('2d'),
        particles = new ParticlePool(settings.particles.length),
        particleRate = settings.particles.length / settings.particles.duration, // particles/sec
        time;

    // get point on heart with -PI <= t <= PI
    function pointOnHeart(t) {
        return new Point(
            160 * Math.pow(Math.sin(t), 3),
            130 * Math.cos(t) - 50 * Math.cos(2 * t) - 20 * Math.cos(3 * t) - 10 * Math.cos(4 * t) + 25
        );
    }

    // creating the particle image using a dummy canvas
    var image = (function () {
        var canvas = document.createElement('canvas'),
            context = canvas.getContext('2d');
        canvas.width = settings.particles.size;
        canvas.height = settings.particles.size;
        // helper function to create the path
        function to(t) {
            var point = pointOnHeart(t);
            point.x = settings.particles.size / 2 + point.x * settings.particles.size / 350;
            point.y = settings.particles.size / 2 - point.y * settings.particles.size / 350;
            return point;
        }
        // create the path
        context.beginPath();
        var t = -Math.PI;
        var point = to(t);
        context.moveTo(point.x, point.y);
        while (t < Math.PI) {
            t += 0.01; // baby steps!
            point = to(t);
            context.lineTo(point.x, point.y);
        }
        context.closePath();
        // create the fill
        context.fillStyle = '#FF5CA4';
        context.fill();
        // create the image
        var image = new Image();
        image.src = canvas.toDataURL();
        return image;
    })();

    // render that thing!
    function render() {
        // next animation frame
        requestAnimationFrame(render);

        // update time
        var newTime = new Date().getTime() / 1000,
            deltaTime = newTime - (time || newTime);
        time = newTime;

        // clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // create new particles
        var amount = particleRate * deltaTime;
        for (var i = 0; i < amount; i++) {
            var pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
            var dir = pos.clone().length(settings.particles.velocity);
            particles.add(canvas.width / 2 + pos.x, canvas.height / 2 - pos.y, dir.x, -dir.y);
        }

        // update and draw particles
        particles.update(deltaTime);
        particles.draw(context, image);
    }

    // handle (re-)sizing of the canvas
    function onResize() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.onresize = onResize;

    // delay rendering bootstrap
    setTimeout(function () {
        onResize();
        render();
    }, 10);
})(document.getElementById('pinkboard'));

const qs = document.querySelector.bind(document);
const easingHeart = mojs.easing.path(
    "M0,100C2.9,86.7,33.6-7.3,46-7.3s15.2,22.7,26,22.7S89,0,100,0");


const el = {
    container: qs(".mo-container"),

    i: qs(".lttr--I"),
    l: qs(".lttr--L"),
    o: qs(".lttr--O"),
    v: qs(".lttr--V"),
    e: qs(".lttr--E"),
    y: qs(".lttr--Y"),
    o2: qs(".lttr--O2"),
    u: qs(".lttr--U"),

    lineLeft: qs(".line--left"),
    lineRight: qs(".line--rght"),

    colTxt: "#763c8c",
    colHeart: "#fa4843",

    blup: qs(".blup"),
    blop: qs(".blop"),
    sound: qs(".sound")
};


class Heart extends mojs.CustomShape {
    getShape() {
        return '<path d="M50,88.9C25.5,78.2,0.5,54.4,3.8,31.1S41.3,1.8,50,29.9c8.7-28.2,42.8-22.2,46.2,1.2S74.5,78.2,50,88.9z"/>';
    }
    getLength() {
        return 200;
    }
}

mojs.addShape("heart", Heart);

const crtBoom = (delay = 0, x = 0, rd = 46) => {
    parent = el.container;
    const crcl = new mojs.Shape({
        shape: "circle",
        fill: "none",
        stroke: el.colTxt,
        strokeWidth: { 5: 0 },
        radius: { [rd]: [rd + 20] },
        easing: "quint.out",
        duration: 500 / 3,
        parent,
        delay,
        x
    });


    const brst = new mojs.Burst({
        radius: { [rd + 15]: 110 },
        angle: "rand(60, 180)",
        count: 3,
        timeline: { delay },
        parent,
        x,
        children: {
            radius: [5, 3, 7],
            fill: el.colTxt,
            scale: { 1: 0, easing: "quad.in" },
            pathScale: [0.8, null],
            degreeShift: ["rand(13, 60)", null],
            duration: 1000 / 3,
            easing: "quint.out"
        }
    });



    return [crcl, brst];
};

const crtLoveTl = () => {
    const move = 1000;
    const boom = 200;
    const easing = "sin.inOut";
    const easingBoom = "sin.in";
    const easingOut = "sin.out";
    const opts = { duration: move, easing, opacity: 1 };
    const delta = 150;

    return new mojs.Timeline().add([
        new mojs.Tween({
            duration: move,
            onStart: () => {
                [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
                    el.style.opacity = 1;
                    el.style =
                        "transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: 1;";
                });
            },
            onComplete: () => {
                [el.l, el.o, el.v, el.e].forEach(el => el.style.opacity = 0);
                el.blop.play();
            }
        }),


        new mojs.Tween({
            duration: move * 2 + boom,
            onComplete: () => {
                [el.y, el.o2].forEach(el => el.style.opacity = 0);
                el.blop.play();
            }
        }),


        new mojs.Tween({
            duration: move * 3 + boom * 2 - delta,
            onComplete: () => {
                el.i.style.opacity = 0;
                el.blop.play();
            }
        }),


        new mojs.Tween({
            duration: move * 3 + boom * 2,
            onComplete: () => {
                el.u.style.opacity = 0;
                el.blup.play();
            }
        }),


        new mojs.Tween({
            duration: 50,
            delay: 4050,
            onUpdate: progress => {
                [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
                    el.style = `transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: ${1 * progress
                        };`;
                });
            },
            onComplete: () => {
                [el.i, el.l, el.o, el.v, el.e, el.y, el.o2, el.u].forEach(el => {
                    el.style.opacity = 1;
                    el.style =
                        "transform: translate(0px, 0px) rotate(0deg) skew(0deg, 0deg) scale(1, 1); opacity: 1;";
                });
            }
        }),


        new mojs.Html({
            ...opts,
            el: el.lineLeft,
            x: { 0: 52 }
        }).

            then({
                duration: boom + move,
                easing,
                x: { to: 52 + 54 }
            }).

            then({
                duration: boom + move,
                easing,
                x: { to: 52 + 54 + 60 }
            }).

            then({
                duration: 150, // 3550
                easing,
                x: { to: 52 + 54 + 60 + 10 }
            }).

            then({
                duration: 300
            }).

            then({
                duration: 350,
                x: { to: 0 },
                easing: easingOut
            }),


        new mojs.Html({
            ...opts,
            el: el.lineRight,
            x: { 0: -52 }
        }).

            then({
                duration: boom + move,
                easing,
                x: { to: -52 - 54 }
            }).

            then({
                duration: boom + move,
                easing,
                x: { to: -52 - 54 - 60 }
            }).

            then({
                duration: 150,
                easing,
                x: { to: -52 - 54 - 60 - 10 }
            }).

            then({
                duration: 300
            }).

            then({
                duration: 350,
                x: { to: 0 },
                easing: easingOut
            }),


        new mojs.Html({
            // [I] LOVE YOU
            ...opts,
            el: el.i,
            x: { 0: 34 }
        }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: 34 + 19 }
            }).

            then({
                duration: move,
                easing,
                x: { to: 34 + 19 + 40 }
            }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: 34 + 19 + 40 + 30 }
            }).

            then({
                duration: move,
                easing,
                x: { to: 34 + 19 + 40 + 30 + 30 }
            }),


        new mojs.Html({
            // I [L]OVE YOU
            ...opts,
            el: el.l,
            x: { 0: 15 }
        }),


        new mojs.Html({
            // I L[O]VE YOU
            ...opts,
            el: el.o,
            x: { 0: 11 }
        }),


        new mojs.Html({
            // I LO[V]E YOU
            ...opts,
            el: el.v,
            x: { 0: 3 }
        }),


        new mojs.Html({
            // I LOV[E] YOU
            ...opts,
            el: el.e,
            x: { 0: -3 }
        }),


        new mojs.Html({
            // I LOVE [Y]OU
            ...opts,
            el: el.y,
            x: { 0: -20 }
        }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: -20 - 33 }
            }).

            then({
                duration: move,
                easing,
                x: { to: -20 - 33 - 24 }
            }),


        new mojs.Html({
            // I LOVE Y[O]U
            ...opts,
            el: el.o2,
            x: { 0: -27 }
        }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: -27 - 27 }
            }).

            then({
                duration: move,
                easing,
                x: { to: -27 - 27 - 30 }
            }),


        new mojs.Html({
            // I LOVE YO[U]
            ...opts,
            el: el.u,
            x: { 0: -32 }
        }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: -32 - 21 }
            }).

            then({
                duration: move,
                easing,
                x: { to: -32 - 21 - 36 }
            }).

            then({
                duration: boom,
                easing: easingBoom,
                x: { to: -32 - 21 - 36 - 31 }
            }).

            then({
                duration: move,
                easing,
                x: { to: -32 - 21 - 36 - 31 - 27 }
            }),


        new mojs.Shape({
            parent: el.container,
            shape: "heart",
            delay: move,
            fill: el.colHeart,
            x: -64,
            scale: { 0: 0.95, easing: easingHeart },
            duration: 500
        }).

            then({
                x: { to: -62, easing },
                scale: { to: 0.65, easing },
                duration: boom + move - 500
            }).

            then({
                duration: boom - 50,
                x: { to: -62 + 48 },
                scale: { to: 0.9 },
                easing: easingBoom
            }).

            then({
                duration: 125,
                scale: { to: 0.8 },
                easing: easingOut
            }).

            then({
                duration: 125,
                scale: { to: 0.85 },
                easing: easingOut
            }).

            then({
                duration: move - 200,
                scale: { to: 0.45 },
                easing
            }).

            then({
                delay: -75,
                duration: 150,
                x: { to: 0 },
                scale: { to: 0.9 },
                easing: easingBoom
            }).

            then({
                duration: 125,
                scale: { to: 0.8 },
                easing: easingOut
            }).

            then({
                duration: 125, // 3725
                scale: { to: 0.85 },
                easing: easingOut
            }).

            then({
                duration: 125 // 3850
            }).
            then({
                duration: 350,
                scale: { to: 0 },
                easing: easingOut
            }),


        ...crtBoom(move, -64, 46),
        ...crtBoom(move * 2 + boom, 18, 34),
        ...crtBoom(move * 3 + boom * 2 - delta, -64, 34),
        ...crtBoom(move * 3 + boom * 2, 45, 34)]);

};

const loveTl = crtLoveTl().play();
setInterval(() => {
    loveTl.replay();
}, 4300);
