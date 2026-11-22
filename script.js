let button = document.querySelector("#login");
let login = document.querySelector("#login-btn");
login.addEventListener("click", function(){
    button.click();
})


/* ---------- 3D bottle: click to spin and change colour, drag to rotate ----------
   Two layers, so it looks real from the front and still works all the way round:
   1. A 3D bottle (white plastic, ridged cap, printed label with a back design).
   2. Your product photo wrapped over the front of it, fading out toward the
      sides. Facing the camera you see the real photo; as it turns, the 3D
      bottle takes over. */
const stage = document.querySelector("#bottle-stage");
const swatches = document.querySelectorAll(".swatch");

// Fallback label colours (used for the dots, and if the photo can't be read)
const BOTTLES = [
    { name: "Blue",   label: "#7db8fa" },
    { name: "Green",  label: "#7df2a8" },
    { name: "Pink",   label: "#f77fc7" },
    { name: "Orange", label: "#f7b878" },
];
// Photos in the same order as BOTTLES
const BOTTLE_FILES = [
    "Images/Image01.png",
    "Images/Image02-green.png",
    "Images/Image03-pink.png",
    "Images/Image04-orange.png",
];
const bottleImages = window.BOTTLE_IMAGES || BOTTLE_FILES;

// Bottle outline traced from the photo: [y, radius] in image pixels
const IMG = { w: 1155, h: 1362, cx: 577.5, top: 92, bottom: 1262 };
const PROFILE = [[92,2.0],[97,118.5],[102,155.5],[107,175.5],[112,187.0],[117,192.5],[122,197.5],[127,199.5],[132,199.5],[137,200.0],[142,200.0],[147,200.0],[152,200.0],[157,200.0],[162,200.0],[167,200.0],[172,200.0],[177,200.0],[182,200.0],[187,200.0],[192,200.0],[197,200.0],[202,200.0],[207,200.0],[212,200.0],[217,200.0],[222,200.0],[227,200.0],[232,200.5],[237,200.5],[242,200.5],[247,200.5],[252,193.0],[257,199.0],[262,201.5],[267,201.5],[272,201.5],[277,199.5],[282,192.5],[287,182.5],[292,182.5],[297,182.5],[302,182.5],[307,182.5],[312,184.5],[317,189.0],[322,205.5],[327,222.5],[332,235.5],[337,245.5],[342,254.0],[347,261.5],[352,267.5],[357,273.5],[362,278.5],[367,282.5],[372,286.5],[377,289.5],[382,292.5],[387,295.5],[392,297.5],[397,299.5],[402,301.5],[407,303.5],[412,304.5],[417,305.5],[422,306.5],[427,306.5],[432,307.5],[437,307.5],[442,307.5],[447,307.5],[452,307.5],[457,307.5],[462,307.5],[467,307.5],[472,308.5],[477,308.5],[482,308.5],[487,308.5],[492,308.5],[497,308.5],[502,308.5],[507,308.5],[512,308.5],[517,308.5],[522,308.5],[527,308.5],[532,308.5],[537,308.5],[542,308.5],[547,308.5],[552,308.5],[557,308.5],[562,308.5],[567,308.5],[572,308.5],[577,308.5],[582,308.5],[587,308.5],[592,308.5],[597,308.5],[602,308.5],[607,308.5],[612,308.5],[617,308.5],[622,308.5],[627,308.5],[632,308.5],[637,308.5],[642,308.5],[647,308.5],[652,308.5],[657,308.5],[662,308.5],[667,308.5],[672,308.5],[677,308.5],[682,308.5],[687,308.5],[692,308.5],[697,308.5],[702,308.5],[707,308.5],[712,308.5],[717,308.5],[722,308.5],[727,308.5],[732,308.5],[737,308.5],[742,308.5],[747,308.5],[752,308.5],[757,308.5],[762,308.5],[767,308.5],[772,308.5],[777,308.5],[782,308.5],[787,308.5],[792,308.5],[797,308.5],[802,308.5],[807,308.5],[812,308.5],[817,308.5],[822,308.5],[827,308.5],[832,308.5],[837,308.5],[842,308.5],[847,308.5],[852,308.5],[857,308.5],[862,308.5],[867,308.5],[872,308.5],[877,308.5],[882,308.5],[887,308.5],[892,308.5],[897,308.5],[902,308.5],[907,308.5],[912,308.5],[917,308.5],[922,308.5],[927,308.5],[932,308.5],[937,308.5],[942,308.5],[947,308.5],[952,308.5],[957,308.5],[962,308.5],[967,308.5],[972,308.5],[977,308.5],[982,308.5],[987,308.5],[992,308.5],[997,308.5],[1002,308.5],[1007,308.5],[1012,308.5],[1017,308.5],[1022,308.5],[1027,308.5],[1032,308.5],[1037,308.5],[1042,308.5],[1047,308.5],[1052,308.5],[1057,308.5],[1062,308.5],[1067,308.5],[1072,308.5],[1077,308.0],[1082,307.5],[1087,307.5],[1092,307.5],[1097,307.5],[1102,307.5],[1107,307.5],[1112,307.5],[1117,307.5],[1122,307.5],[1127,307.5],[1132,307.5],[1137,307.5],[1142,307.5],[1147,307.5],[1152,307.5],[1157,307.0],[1162,306.5],[1167,305.5],[1172,305.0],[1177,303.5],[1182,302.5],[1187,300.5],[1192,299.0],[1197,296.5],[1202,294.5],[1207,290.5],[1212,287.5],[1217,283.5],[1222,278.5],[1227,272.5],[1232,265.5],[1237,257.0],[1242,245.0],[1247,229.5],[1252,203.0],[1257,158.0],[1262,1.5]];
const LABEL = { y1: 458, y2: 1093, r: 309.5 };              // label band, photo pixels
const CAP = { y1: 118, y2: 246, ridges: 120, depth: 1.3 };   // ridged cap rows
const FADE = { from: 48, to: 80 };                          // photo fades out between these angles (degrees)
const FONT = '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif';

const mixRGB = (a, b, t) => "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
const hexToRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Reads the label colour from the photo at the left, centre and right, so the
   3D label underneath matches the photo exactly where the two blend. */
function sampleLabelColours(img) {
    const cv = document.createElement("canvas");
    cv.width = IMG.w; cv.height = IMG.h;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, IMG.w, IMG.h);
    const strip = (xc, half) => {
        const d = ctx.getImageData(Math.round(xc - half), 520, half * 2 + 1, 540).data;
        const ch = [[], [], []];
        for (let i = 0; i < d.length; i += 4) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
            if (mx > 150 && (mx - mn) / mx > 0.2) { ch[0].push(d[i]); ch[1].push(d[i + 1]); ch[2].push(d[i + 2]); }
        }
        return ch.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });
    };
    const off = Math.sin((62 * Math.PI) / 180) * 308;
    return { left: strip(IMG.cx - off, 5), centre: strip(IMG.cx, 20), right: strip(IMG.cx + off, 5) };
}

/* The 3D label: plain colour matching the photo, with the back design. */
function buildLabelTexture(img, fallbackHex, renderer) {
    let cols;
    try { cols = sampleLabelColours(img); } catch (e) { const c = hexToRgb(fallbackHex); cols = { left: c, centre: c, right: c }; }
    const k = 2048 / (2 * Math.PI * LABEL.r);               // canvas px per photo px
    const cv = document.createElement("canvas");
    cv.width = 2048;
    cv.height = Math.round((LABEL.y2 - LABEL.y1) * k);
    const ctx = cv.getContext("2d");

    const avg = cols.left.map((v, i) => (v + cols.right[i]) / 2);
    const gr = ctx.createLinearGradient(0, 0, cv.width, 0);
    const rgb = (c) => "rgb(" + c.join(",") + ")";
    gr.addColorStop(0, rgb(avg));          // back of the bottle
    gr.addColorStop(0.3276, rgb(cols.left));   // 62 degrees left of front
    gr.addColorStop(0.5, rgb(cols.centre));
    gr.addColorStop(0.6724, rgb(cols.right));  // 62 degrees right of front
    gr.addColorStop(1, rgb(avg));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, cv.width, cv.height);

    const navy = mixRGB(cols.centre, [10, 10, 64], 0.8);
    const dark = "#2a2a33";
    const text = (str, x, y, size, weight, color, align) => {
        ctx.font = weight + " " + size + "px " + FONT;
        ctx.fillStyle = color;
        ctx.textAlign = align || "left";
        ctx.fillText(str, x, y);
    };
    [0, cv.width].forEach((off) => {        // back design, centred on the texture's edge
        ctx.save();
        ctx.translate(off, 0); ctx.scale(k, k); ctx.translate(0, -LABEL.y1);
        ctx.strokeStyle = mixRGB(cols.centre, [10, 10, 64], 0.55);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-250, 503, 500, 542);
        ctx.fillStyle = "#262626";
        ctx.beginPath(); ctx.arc(-212, 568, 28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
        for (let a = 0; a < 8; a++) {
            const t = (a * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(-212 + Math.cos(t) * 10, 568 + Math.sin(t) * 10);
            ctx.lineTo(-212 + Math.cos(t) * 18, 568 + Math.sin(t) * 18);
            ctx.stroke();
        }
        text("Life", -170, 561, 24, 500, navy);
        text("Harmony", -170, 589, 24, 500, navy);
        text("Healthcare.", -220, 700, 36, 600, dark);
        text("Real results.", -220, 744, 36, 600, dark);
        ["Carefully formulated with", "science-backed ingredients,",
         "free from artificial additives,", "made to the highest standards."]
            .forEach((line, i) => text(line, -220, 806 + i * 30, 21, 400, navy));
        text("62.5 MCG (2500 IU) D3 | 100 MCG K2 |", -220, 940, 18, 400, navy);
        text("60 PLANTGEL\u2122 CAPSULES", -220, 964, 18, 400, navy);
        if ("letterSpacing" in ctx) ctx.letterSpacing = "2.5px";
        text("PREMIUM INNOVATION", 0, 1015, 20, 500, navy, "center");
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        ctx.restore();
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

/* A small photo studio for the plastic to reflect: dim room, bright soft-boxes. */
function buildEnvironment(renderer) {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
        new THREE.SphereGeometry(20, 32, 16),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.51, 0.54), side: THREE.BackSide })
    ));
    const box = (w, h, x, y, z, power) => {
        const m = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(power, power, power), side: THREE.DoubleSide })
        );
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        env.add(m);
    };
    box(14, 8, 0, 12, 4, 2.7);
    box(5, 14, -11, 2, 6, 3.4);
    box(3, 14, 12, 2, -2, 2.6);
    box(10, 4, 0, -3, 12, 1.0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const tex = pmrem.fromScene(env, 0.03).texture;
    pmrem.dispose();
    return tex;
}

const loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
});

function initBottle3D() {
    if (!window.THREE) return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
        return; // no WebGL: the plain photo stays visible
    }
    // Draw at 2-3x the size it is shown at; the browser then shrinks it smoothly.
    // This is what keeps the photo and its text sharp.
    renderer.setPixelRatio(Math.min(3, Math.max(2, (window.devicePixelRatio || 1) + 1)));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.environment = buildEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(22, 4 / 5, 0.1, 50);
    camera.position.set(0, 0.55, 6.4);
    camera.lookAt(0, -0.06, 0);

    const s = 2 / (IMG.bottom - IMG.top);            // world units per image pixel
    const yMid = (IMG.top + IMG.bottom) / 2;

    // ----- Bottle shape: the traced outline spun round, built in two pieces so
    // the ridged cap can have much finer detail than the smooth body.
    const SPLIT = 252;                                        // row where cap meets neck
    const fadeFrom = (FADE.from * Math.PI) / 180, fadeTo = (FADE.to * Math.PI) / 180;
    const toPts = (rows) => rows.map(([y, r]) => {
        const rr = y >= 125 && y <= 245 ? 200 : r;            // clean, straight cap sides
        return new THREE.Vector2(rr * s, (yMid - y) * s);
    }).reverse();

    function buildPiece(rows, seg, ridged) {
        const pts = toPts(rows);
        if (ridged) pts.push(new THREE.Vector2(0, pts[pts.length - 1].y));   // close the top of the cap
        else pts.unshift(new THREE.Vector2(0, pts[0].y));                    // close the base
        const NP = pts.length;
        const g = new THREE.LatheGeometry(pts, seg);
        g.rotateY(Math.PI);                                   // seam goes to the back
        const pos = g.attributes.position, uv = g.attributes.uv;
        const plasticCol = new Float32Array(pos.count * 3);
        const photoCol = new Float32Array(pos.count * 4);
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), z = pos.getZ(i);
            const y = pos.getY(i);
            const yPx = yMid - y / s;
            const r0 = Math.hypot(x, z);
            const theta = r0 > 1e-6 ? Math.atan2(x, z) : 0;   // 0 = facing the camera

            // photo coordinates: exactly the photo when seen from the front
            const rPx = r0 / s;
            const inset = rPx > 4 ? (rPx - 3) / rPx : 1;      // stay off the blurry edge pixels
            const sx = Math.cos(theta) >= 0 ? Math.sin(theta) : (Math.sin(theta) < 0 ? -1 : 1);
            uv.setXY(i, (IMG.cx + sx * rPx * inset) / IMG.w, 1 - yPx / IMG.h);
            photoCol[i * 4] = photoCol[i * 4 + 1] = photoCol[i * 4 + 2] = 1;
            photoCol[i * 4 + 3] = 1 - smooth(fadeFrom, fadeTo, Math.abs(theta));

            // fine ridges round the cap
            if (ridged && r0 > 1e-6 && yPx >= CAP.y1 && yPx <= CAP.y2) {
                const f = smooth(CAP.y1, CAP.y1 + 14, yPx) * (1 - smooth(CAP.y2 - 6, CAP.y2, yPx));
                const nr = r0 + CAP.depth * s * f * Math.cos(CAP.ridges * theta);
                x *= nr / r0; z *= nr / r0;
                pos.setX(i, x); pos.setZ(i, z);
            }
            // thin dark line where the cap meets the neck
            const band = Math.max(0, 1 - Math.abs(yPx - SPLIT) / 4.5);
            const c = 1 - 0.38 * band * band * (3 - 2 * band);
            plasticCol[i * 3] = plasticCol[i * 3 + 1] = plasticCol[i * 3 + 2] = c;
        }
        g.setAttribute("color", new THREE.BufferAttribute(plasticCol, 3));
        g.computeVertexNormals();
        const nrm = g.attributes.normal;                      // join shading across the seam
        for (let j = 0; j < NP; j++) {
            const a = j, b = seg * NP + j;
            const nx = nrm.getX(a) + nrm.getX(b), ny = nrm.getY(a) + nrm.getY(b), nz = nrm.getZ(a) + nrm.getZ(b);
            const l = Math.hypot(nx, ny, nz) || 1;
            nrm.setXYZ(a, nx / l, ny / l, nz / l);
            nrm.setXYZ(b, nx / l, ny / l, nz / l);
        }
        // Photo layer: same shape, pushed out a hair so it sits on top
        const pg = g.clone();
        pg.setAttribute("color", new THREE.BufferAttribute(photoCol, 4));
        const pp = pg.attributes.position;
        for (let i = 0; i < pp.count; i++) {
            const x = pp.getX(i), z = pp.getZ(i), r = Math.hypot(x, z);
            if (r > 1e-6) { const k = (r + 2.5 * s) / r; pp.setX(i, x * k); pp.setZ(i, z * k); }
        }
        return [g, pg];
    }

    const [capGeo, capPhotoGeo] = buildPiece(PROFILE.filter(([y]) => y <= SPLIT), 960, true);
    const [bodyGeo, bodyPhotoGeo] = buildPiece(PROFILE.filter(([y]) => y >= SPLIT), 360, false);

    const plastic = new THREE.MeshPhysicalMaterial({
        color: 0xf4f4f6, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.28,
        vertexColors: true, side: THREE.DoubleSide,
    });
    const capMat = new THREE.MeshPhysicalMaterial({
        color: 0xf6f6f8, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35,
        envMapIntensity: 1.1, vertexColors: true, side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, plastic);
    const cap = new THREE.Mesh(capGeo, capMat);

    const labelGeo = new THREE.CylinderGeometry(LABEL.r * s, LABEL.r * s, (LABEL.y2 - LABEL.y1) * s, 256, 1, true, -Math.PI, Math.PI * 2);
    const labelMat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = (yMid - (LABEL.y1 + LABEL.y2) / 2) * s;

    const photoMat = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const photo = new THREE.Group();                         // the photo layer: cap + body
    [capPhotoGeo, bodyPhotoGeo].forEach((pg) => {
        const m = new THREE.Mesh(pg, photoMat);
        m.renderOrder = 2;
        photo.add(m);
    });
    photo.visible = false;                                   // shown once the photos are ready

    const bottle = new THREE.Group();
    bottle.add(body, cap, label, photo);
    scene.add(bottle);

    // ----- Soft contact shadow on the floor
    const sc = document.createElement("canvas");
    sc.width = sc.height = 256;
    const g = sc.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(40,40,50,0.5)");
    grad.addColorStop(0.45, "rgba(40,40,50,0.22)");
    grad.addColorStop(1, "rgba(40,40,50,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.7),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(-0.03, -1.003, 0.02);
    shadow.renderOrder = 0;
    scene.add(shadow);

    new ResizeObserver(() => {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }).observe(stage);

    // ----- Load photos, then build a photo texture and a label for each bottle
    swatches.forEach((d, i) => { if (BOTTLES[i]) d.style.setProperty("--c", BOTTLES[i].label); });
    const photos = [], labels = [];
    Promise.race([
        document.fonts.load('600 24px "Schibsted Grotesk"').catch(() => {}),
        new Promise((r) => setTimeout(r, 1500)),
    ]).then(() => Promise.all(bottleImages.map(loadImage))).then((imgs) => {
        imgs.forEach((img, i) => {
            const t = new THREE.Texture(img);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = renderer.capabilities.getMaxAnisotropy();
            t.minFilter = THREE.LinearMipmapLinearFilter;
            t.magFilter = THREE.LinearFilter;
            t.generateMipmaps = true;
            t.needsUpdate = true;
            photos[i] = t;
            labels[i] = buildLabelTexture(img, BOTTLES[i].label, renderer);
        });
        photoMat.map = photos[0]; photoMat.needsUpdate = true;
        labelMat.map = labels[0]; labelMat.needsUpdate = true;
        photo.visible = true;
        stage.classList.add("ready");
    }).catch(() => { /* photos failed to load: the plain photo stays visible */ });

    // ----- Interaction -----
    const TAU = Math.PI * 2;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rotY = 0, current = 0, busy = false;
    let dragging = false, moved = 0, lastX = 0;

    function setBottle(i) { photoMat.map = photos[i]; labelMat.map = labels[i]; }

    function tween(ms, onUpdate, onDone) {
        const t0 = performance.now();
        busy = true;
        (function step(now) {
            const p = Math.min((now - t0) / ms, 1);
            onUpdate(p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2); // ease in-out
            if (p < 1) requestAnimationFrame(step);
            else { busy = false; if (onDone) onDone(); }
        })(t0);
    }

    function spinTo(index) {
        if (busy || index === current || !photos[index]) return;
        current = index;
        swatches.forEach((d, i) => d.classList.toggle("active", i === index));
        if (reduceMotion.matches) { setBottle(index); return; }
        const start = rotY;
        let swapped = false;
        tween(1100, (e) => {
            rotY = start + e * TAU;
            if (!swapped && e >= 0.5) { swapped = true; setBottle(index); } // back faces us: change colour unseen
        });
    }

    function settle() {                           // ease back to facing front
        const start = rotY, target = Math.round(rotY / TAU) * TAU;
        tween(500, (e) => { rotY = start + (target - start) * e; });
    }

    const nextBottle = () => spinTo((current + 1) % BOTTLES.length);

    stage.addEventListener("pointerdown", (e) => {
        if (busy) return;
        dragging = true; moved = 0; lastX = e.clientX;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add("grabbing");
    });
    stage.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        moved += Math.abs(dx);
        rotY += dx * 0.012;
    });
    stage.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        stage.classList.remove("grabbing");
        if (moved < 6) nextBottle(); else settle();
    });
    stage.addEventListener("pointercancel", () => {
        if (!dragging) return;
        dragging = false;
        stage.classList.remove("grabbing");
        settle();
    });
    stage.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextBottle(); }
    });
    swatches.forEach((d) => d.addEventListener("click", () => spinTo(Number(d.dataset.index))));

    (function render() {
        bottle.rotation.y = rotY;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    })();
}

initBottle3D();


document.querySelectorAll(".hotspot").forEach((hotspot) => {
  hotspot.addEventListener("click", (e) => {
    e.stopPropagation();
    const card = hotspot.querySelector(".hotspot-card");
    const icon = hotspot.querySelector(".hotspot-icon");
    if (!card) return;

    const isOpen = card.style.display !== "none";
    card.style.display = isOpen ? "none" : "block";
    icon.textContent = isOpen ? "+" : "−";
  });
});