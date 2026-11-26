/* ---------- Loading animation ----------
   Plain background. A bottle drops slowly, lands, then tips over on its side and
   a few capsules spill out and roll across the floor. The camera follows one
   capsule and dives into it; the page is revealed through a circle that opens
   from inside the capsule.
   Edit CONFIG / the T_ times below to change the pacing. */
(function () {
    const root = document.getElementById("loader");
    if (!root) return;

    const CONFIG = {
        showOncePerSession: false,   // true = only play on the first visit of a browser session
        shadows: true,               // soft contact shadows on the floor
    };

    const body = document.body;
    const pctEl = document.getElementById("loader-pct");
    const skipBtn = document.getElementById("loader-skip");
    const canvas = document.getElementById("loader-canvas");
    const idxEl = document.getElementById("loader-idx");
    const wordEl = document.getElementById("loader-word");
    const WORDS = ["Vitamin D3 + K2", "Marine Collagen", "Omega-3 Fish Oil", "Hydrate Electrolytes", "Energy & Immunity"];
    let curWord = 0;

    let finished = false, pageReady = document.readyState === "complete", raf = 0, renderer = null, opened = false;
    window.addEventListener("load", () => { pageReady = true; });

    function openSite() {
        if (opened) return;
        opened = true;
        body.classList.add("loaded");
    }
    function finish() {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        openSite();
        root.classList.add("hide");
        body.classList.remove("is-loading");
        try { if (CONFIG.showOncePerSession) sessionStorage.setItem("lh-loader-seen", "1"); } catch (e) {}
        setTimeout(() => { if (renderer) renderer.dispose(); root.remove(); }, 1000);
    }
    skipBtn.addEventListener("click", finish);

    let seen = false;
    try { seen = CONFIG.showOncePerSession && sessionStorage.getItem("lh-loader-seen") === "1"; } catch (e) {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce || !window.THREE) { finish(); return; }

    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) { finish(); return; }

    const pixelRatio = () => Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));   // never below 1.5x: keeps edges crisp on 1x screens
    renderer.setPixelRatio(pixelRatio());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if (CONFIG.shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.03, 120);
    let zoomOut = 1;                                            // pulls the camera back on narrow screens
    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setPixelRatio(pixelRatio());                   // follows the screen if the window moves between displays
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        zoomOut = Math.max(1, (5.8 / camera.aspect) / 4.5);
    }
    resize();
    window.addEventListener("resize", resize);

    /* ----- Studio light: bright soft-boxes for natural reflections ----- */
    (function () {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(
            new THREE.SphereGeometry(20, 32, 16),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(0.78, 0.74, 0.80), side: THREE.BackSide })
        ));
        const box = (w, h, x, y, z, p) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({ color: new THREE.Color(p, p, p), side: THREE.DoubleSide }));
            m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
        };
        box(16, 9, 0, 12, 4, 3.2); box(5, 14, -11, 3, 6, 3.6); box(4, 12, 12, 3, -1, 2.4); box(12, 4, 0, -2, 12, 1.2);
        // extra strip lights: these make the long, crisp window-reflections you see on real glossy plastic
        box(1.2, 16, -6, 5, 12, 4.5); box(1.0, 14, 7, 4, 10, 3.2); box(14, 1.1, 0, 7, -10, 2.6); box(3, 3, -3, 9, 9, 5.0);
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(env, 0.03).texture;
        pm.dispose();
    })();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf0e2ee, 0.45));
    const key = new THREE.DirectionalLight(0xfff4ea, 1.5);
    key.position.set(-6, 13, 9);
    if (CONFIG.shadows) {
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.left = -11; key.shadow.camera.right = 11;
        key.shadow.camera.top = 11; key.shadow.camera.bottom = -11;
        key.shadow.camera.near = 2; key.shadow.camera.far = 45;
        key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    }
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe4ecff, 0.45); fill.position.set(8, 4, 8); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe0f4, 0.9); rim.position.set(6, 5, -9); scene.add(rim);   // soft edge light from behind

    /* tiny procedural noise: gives the plastic a real moulded, slightly orange-peel surface */
    function noiseTexture(size, rep) {
        const cv = document.createElement("canvas"); cv.width = cv.height = size;
        const g = cv.getContext("2d"), im = g.createImageData(size, size);
        for (let i = 0; i < size * size; i++) {
            const v = 128 + (Math.random() - 0.5) * 120;
            im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
        }
        g.putImageData(im, 0, 0);
        const t = new THREE.CanvasTexture(cv);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
    }
    const PLASTIC_BUMP = noiseTexture(256, 6);

    /* soft contact shadow sprite (an extra dark core right under objects, like ambient occlusion) */
    const blobTex = (function () {
        const cv = document.createElement("canvas"); cv.width = cv.height = 128;
        const g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, "rgba(40,18,48,0.85)"); gr.addColorStop(0.5, "rgba(40,18,48,0.35)"); gr.addColorStop(1, "rgba(40,18,48,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    function makeBlob(w, h) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = 1; m.visible = false;
        scene.add(m); return m;
    }

    /* Invisible floor that only shows the shadows */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.2, color: 0x4a2a52 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    /* ----- Bottle (open, no cap) ----- */
    const S = 1.1;
    const BODY_TOP = 2.727, SHOULDER_TOP = 3.117, NECK_LO = 3.225, NECK_HI = 3.32;
    const LABEL = { lo: 0.437, hi: 2.675 };

    function bodyProfile() {
        const p = [], f = 0.22;
        p.push(new THREE.Vector2(0, 0));
        for (let a = Math.PI / 2; a >= 0; a -= Math.PI / 24) p.push(new THREE.Vector2(1 - f + f * Math.cos(a), f - f * Math.sin(a)));
        p.push(new THREE.Vector2(1, BODY_TOP));
        for (let i = 1; i <= 16; i++) {
            const t = i / 16;
            p.push(new THREE.Vector2(0.714 + 0.286 * Math.pow(Math.cos(t * Math.PI / 2), 0.9), BODY_TOP + t * (SHOULDER_TOP - BODY_TOP)));
        }
        p.push(new THREE.Vector2(0.714, 3.16), new THREE.Vector2(0.66, 3.19), new THREE.Vector2(0.6, NECK_LO), new THREE.Vector2(0.585, NECK_LO + 0.004));
        for (let k = 0; k < 3; k++) {                       // moulded screw-thread ridges on the neck
            const y = NECK_LO + 0.012 + k * 0.026;
            p.push(new THREE.Vector2(0.585, y - 0.008), new THREE.Vector2(0.606, y), new THREE.Vector2(0.585, y + 0.008));
        }
        p.push(new THREE.Vector2(0.585, NECK_HI - 0.02));
        p.push(new THREE.Vector2(0.57, NECK_HI), new THREE.Vector2(0.53, NECK_HI), new THREE.Vector2(0.515, NECK_HI - 0.03));   // rounded rim
        p.push(new THREE.Vector2(0.515, 2.8), new THREE.Vector2(0, 2.8));                                                        // inside wall
        return p;
    }

    const rig = new THREE.Group();                 // pivots on the bottle's bottom edge when it tips
    const holder = new THREE.Group();
    const bottle = new THREE.Group();
    holder.add(bottle); rig.add(holder); scene.add(rig);
    holder.scale.setScalar(S);

    const bodyMesh = new THREE.Mesh(
        new THREE.LatheGeometry(bodyProfile(), 128),
        new THREE.MeshPhysicalMaterial({
            color: 0xf1f1f3, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.3, side: THREE.DoubleSide,
            bumpMap: PLASTIC_BUMP, bumpScale: 0.35, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xf6eefa),
            envMapIntensity: 1.1,
        })
    );
    bottle.add(bodyMesh);

    /* dark interior seen through the open mouth */
    const inside = new THREE.Mesh(new THREE.CircleGeometry(0.512, 64), new THREE.MeshBasicMaterial({ color: 0x8c8790 }));
    inside.rotation.x = -Math.PI / 2; inside.position.y = 2.95;
    bottle.add(inside);

    /* bottle cap: ridged, sits on the neck, pops off and rolls away when the bottle tips */
    const CAP_H = 0.64, CAP_R = 0.665;
    const capGeo = (function () {
        const pts = [[0.6, 0], [0.655, 0], [CAP_R, 0.025], [CAP_R, CAP_H - 0.08], [0.655, CAP_H - 0.025], [0.62, CAP_H], [0.3, CAP_H + 0.004], [0, CAP_H + 0.004]]
            .map(([r, y]) => new THREE.Vector2(r, y - CAP_H / 2));
        const g = new THREE.LatheGeometry(pts, 180);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {                                  // fine vertical grip ridges
            const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i) + CAP_H / 2, r = Math.hypot(x, z);
            if (r > 0.64 && y > 0.05 && y < CAP_H - 0.07) {
                const k = 1 + 0.02 * Math.cos(Math.atan2(x, z) * 90);
                pos.setX(i, x * k); pos.setZ(i, z * k);
            }
        }
        g.computeVertexNormals();
        return g;
    })();
    const capMesh = new THREE.Mesh(capGeo, new THREE.MeshPhysicalMaterial({
        color: 0xf4f4f6, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
        bumpMap: PLASTIC_BUMP, bumpScale: 0.25, envMapIntensity: 1.0,
    }));
    capMesh.position.y = 3.12 + CAP_H / 2;
    capMesh.castShadow = true;
    bottle.add(capMesh);
    const capSim = { stage: 0, t0: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), roll: 0, tilt: 0, blob: null };

    /* if the label photo is missing, paint a proper wrap-around label instead of a flat colour */
    function paintLabel() {
        const W = 2048, H = 1024, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const g = cv.getContext("2d");
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, "#9cc2f7"); gr.addColorStop(1, "#78a5ee");
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        const F = '"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif';
        const txt = (s, x, y, size, w, col, al) => { g.font = w + " " + size + "px " + F; g.fillStyle = col; g.textAlign = al || "center"; g.fillText(s, x, y); };
        const cx = W / 2;                                          // front of the bottle = texture centre
        g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(cx, H * 0.95, 360, 0, 7); g.fill();
        txt("Life Harmony", cx, 150, 46, 600, "#12195a");
        txt("Vitamin D3+K2", cx, 400, 116, 700, "#12195a");
        txt("with Coconut MCT Oil", cx, 470, 44, 500, "#1d2a7a");
        txt("62.5 MCG (2500 IU) D3 | 100 MCG K2", cx, 760, 30, 500, "#12195a");
        txt("60 PLANTGEL\u2122 CAPSULES", cx, 805, 30, 500, "#12195a");
        txt("HEALTHCARE. REAL RESULTS.", cx, 900, 30, 600, "#12195a");
        g.strokeStyle = "rgba(18,25,90,0.5)"; g.lineWidth = 3;
        g.strokeRect(0, 40, 520, H - 80); g.strokeRect(W - 520, 40, 520, H - 80);              // back panel boxes
        txt("Carefully formulated with", 260, 300, 28, 500, "#12195a");
        txt("science-backed ingredients", 260, 340, 28, 500, "#12195a");
        txt("free from artificial additives", W - 260, 300, 28, 500, "#12195a");
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
    }
    const labelMap = new THREE.TextureLoader().load("Images/label-blue.png", undefined, undefined, () => {
        const t = paintLabel();
        labelMat.map = t; labelMat.emissiveMap = t;
        labelMat.needsUpdate = true;
    });
    labelMap.colorSpace = THREE.SRGBColorSpace;
    labelMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const labelMat = new THREE.MeshPhysicalMaterial({
        map: labelMap, color: new THREE.Color(0.5, 0.5, 0.5), emissive: 0xffffff, emissiveMap: labelMap,
        emissiveIntensity: 0.6, roughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.5, envMapIntensity: 0.35, toneMapped: false,
    });
    const label = new THREE.Mesh(new THREE.CylinderGeometry(1.004, 1.004, LABEL.hi - LABEL.lo, 128, 1, true, -Math.PI, Math.PI * 2), labelMat);
    label.position.y = (LABEL.lo + LABEL.hi) / 2;
    bottle.add(label);
    bodyMesh.castShadow = true;

    const X0 = 1.6;                                 // where the bottle stands
    const X_P = X0 - S;                             // its left bottom edge: the tipping pivot
    holder.position.set(S, 0, 0);
    rig.position.set(X_P, 0, 0);
    const bottleBlob = makeBlob(4.6, 3.4);                        // ambient-occlusion pool under the bottle
    bottleBlob.position.x = X0; bottleBlob.visible = true;

    /* ----- Realistic capsules: two-piece, glossy, with the cap overlapping the body ----- */
    const R = 0.24, LEN = 1.3, JOIN = 0.10;
    function arcPts(cx, cy, r, a0, a1, n, fx, fy) {
        const p = [];
        for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push(new THREE.Vector2(fx(r, a), cy + fy(r, a))); }
        return p;
    }
    function capsuleGeos() {
        // body: bottom pole -> equator -> straight up to the join
        const body = arcPts(0, -LEN / 2 + R, R, 0, Math.PI / 2, 16, (r, a) => r * Math.sin(a), (r, a) => -r * Math.cos(a));
        body.push(new THREE.Vector2(R, JOIN));
        // cap: slightly wider, starts at the join, straight up, then top pole
        const rc = R * 1.022;
        // the cap's open edge is slightly rolled over, which is the thin lip you see on a real two-piece capsule
        const cap = [new THREE.Vector2(R * 0.985, JOIN - 0.004), new THREE.Vector2(rc * 1.004, JOIN + 0.002), new THREE.Vector2(rc * 1.008, JOIN + 0.012),
            new THREE.Vector2(rc * 1.002, JOIN + 0.03), new THREE.Vector2(rc, JOIN + 0.05), new THREE.Vector2(rc, LEN / 2 - rc)];
        cap.push(...arcPts(0, LEN / 2 - rc, rc, 0, Math.PI / 2, 16, (r, a) => r * Math.cos(a), (r, a) => r * Math.sin(a)));
        return [new THREE.LatheGeometry(body, 64), new THREE.LatheGeometry(cap, 64)];
    }
    const [BODY_GEO, CAP_GEO] = capsuleGeos();

    function makeCapsule(bodyCol, capCol) {
        // glossy gelatin: a thin clearcoat over a satin base, with a faint inner glow standing in for light passing through the shell
        const mat = (c) => new THREE.MeshPhysicalMaterial({
            color: c, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.52,
            specularIntensity: 1, envMapIntensity: 1.5, sheen: 0.5, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffffff),
            emissive: new THREE.Color(c).multiplyScalar(0.16),
        });
        const a = new THREE.Mesh(BODY_GEO, mat(bodyCol)), b = new THREE.Mesh(CAP_GEO, mat(capCol));
        a.castShadow = b.castShadow = true;
        const roll = new THREE.Group(); roll.add(a, b);        // spins about the capsule's own long axis
        const lay = new THREE.Group(); lay.add(roll); lay.rotation.x = Math.PI / 2;   // long axis -> along z
        const yaw = new THREE.Group(); yaw.add(lay);           // turns it to face its direction of travel
        const sc = 0.94 + Math.random() * 0.12;                // no two capsules are exactly the same size
        yaw.scale.setScalar(sc);
        yaw.visible = false;
        scene.add(yaw);
        return { yaw, roll, blob: makeBlob(LEN * 1.5, R * 4.2) };
    }

    const WHITE = 0xf4f2f6;
    const defs = [
        { body: 0x5b97e6, cap: WHITE, t0: 3.55 },
        { body: WHITE, cap: 0xf27fb4, t0: 3.80 },
        { body: 0x5b97e6, cap: WHITE, t0: 3.95, hero: true },
        { body: 0x58c98a, cap: WHITE, t0: 4.20 },
        { body: 0xf3a24f, cap: WHITE, t0: 4.45 },
    ];
    const caps = defs.map((d) => {
        const c = makeCapsule(d.body, d.cap);
        return Object.assign(d, c, { started: false, v: new THREE.Vector3(), rollAngle: 0, travel: 0 });
    });
    const hero = caps.find((c) => c.hero);

    const MOUTH = new THREE.Vector3(X_P - NECK_HI * S, S, 0);        // mouth once the bottle is lying down
    const TARGET = new THREE.Vector3(-4.7, R, 2.9);                  // where the hero capsule comes to rest
    const HERO_DIR = new THREE.Vector3(TARGET.x - MOUTH.x, 0, TARGET.z - MOUTH.z).normalize();

    /* ----- Timeline (seconds) ----- */
    const T_DROP0 = 0.35, T_LAND = 2.35, T_TIP0 = 2.75, T_TIP = 0.95;
    const T_ZOOM0 = 5.0, T_ZOOM1 = 6.3, T_HOLE0 = 5.95, T_HOLE1 = 6.95;
    const TOTAL = T_HOLE1;
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const eOut3 = (u) => 1 - Math.pow(1 - u, 3);
    const eInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

    /* ----- Details: soft floor ripples when the bottle lands and tips, plus drifting dust in the light ----- */
    const ringGeo = new THREE.RingGeometry(0.985, 1, 128);
    const ripples = [
        { t0: T_LAND,              x: X0,          size: 4.2, dur: 1.5, op: 0.30 },
        { t0: T_LAND + 0.14,       x: X0,          size: 2.7, dur: 1.4, op: 0.16 },
        { t0: T_TIP0 + T_TIP,      x: X_P - 1.8,   size: 5.4, dur: 1.4, op: 0.28 },
        { t0: T_TIP0 + T_TIP + 0.14, x: X_P - 1.8, size: 3.4, dur: 1.3, op: 0.15 },
    ].map((r) => {
        const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x8a5a90, transparent: true, opacity: 0, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(r.x, 0.01, 0); m.visible = false;
        scene.add(m);
        return Object.assign(r, { m });
    });

    const moteTex = (function () {
        const cv = document.createElement("canvas"); cv.width = cv.height = 64;
        const g = cv.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    function makeMotes(n, size, color, opacity) {
        const a = new Float32Array(n * 3), seed = [];
        for (let i = 0; i < n; i++) {
            a[i * 3] = (Math.random() - 0.5) * 20; a[i * 3 + 1] = Math.random() * 9; a[i * 3 + 2] = (Math.random() - 0.5) * 12 - 1;
            seed.push({ sp: 0.05 + Math.random() * 0.12, ph: Math.random() * 6.28, amp: 0.1 + Math.random() * 0.25 });
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(a, 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: moteTex, color, transparent: true, opacity: 0, depthWrite: false }));
        p.frustumCulled = false; scene.add(p);
        return { p, a, seed, n, base: opacity };
    }
    const motes = [makeMotes(70, 0.17, 0xffffff, 0.95), makeMotes(40, 0.1, 0xb27fb0, 0.55)];

    const L0 = new THREE.Vector3(-1.8, 0.9, 0.8);
    const C0 = new THREE.Vector3(0.6, 4.6, 15.5);
    const camStart = new THREE.Vector3(), camPos = new THREE.Vector3(), focus = new THREE.Vector3(), look = new THREE.Vector3();
    const blueDir = new THREE.Vector3();
    let last = performance.now(), start = last;

    function placeCapsule(c, pos, psi) {
        c.yaw.position.copy(pos);
        c.yaw.rotation.y = psi;
        c.roll.rotation.y = c.rollAngle;
        const h = Math.max(0, pos.y - R);                       // contact shadow sharpens and darkens as it lands
        c.blob.visible = true;
        c.blob.position.x = pos.x; c.blob.position.z = pos.z;
        c.blob.rotation.z = psi;
        c.blob.scale.setScalar(1 + h * 0.6);
        c.blob.material.opacity = 0.55 / (1 + h * 3);
    }

    /* the cap pops off as the bottle tips, bounces away and rolls like a coin before it wobbles flat, open side up */
    const CAP_RW = CAP_R * S, CAP_HALF = (CAP_H / 2) * S;
    function updateCap(t, dt) {
        if (capSim.stage === 0) {
            if (t < T_TIP0 + 0.3) return;
            capMesh.updateWorldMatrix(true, false);
            capSim.pos.setFromMatrixPosition(capMesh.matrixWorld);
            scene.add(capMesh); capMesh.scale.setScalar(S); capMesh.rotation.set(0, 0, 0);
            capMesh.position.copy(capSim.pos);
            capSim.vel.set(2.5, 2.3, 0.55);
            capSim.blob = makeBlob(CAP_RW * 3.2, CAP_RW * 3.2);
            capSim.stage = 1;
        }
        const s = capSim;
        if (s.stage === 1) {                                    // flight: tips over onto its edge
            s.vel.y -= 9 * dt; s.pos.addScaledVector(s.vel, dt);
            s.tilt = Math.min(Math.PI / 2, s.tilt + dt * 2.3);
            s.roll -= dt * 3;
            if (s.pos.y <= CAP_RW && s.vel.y < 0) {
                s.pos.y = CAP_RW; s.vel.y = -s.vel.y * 0.3; s.tilt = Math.PI / 2;
                s.stage = s.vel.y < 0.4 ? 2 : 1.5;
                s.vel.x *= 0.85;
            }
        } else if (s.stage === 1.5) {                           // one small bounce
            s.vel.y -= 9 * dt; s.pos.addScaledVector(s.vel, dt);
            if (s.pos.y <= CAP_RW) { s.pos.y = CAP_RW; s.vel.y = 0; s.stage = 2; }
        }
        if (s.stage === 2) {                                    // rolling on its rim
            s.vel.x *= Math.exp(-1.1 * dt); s.vel.z *= Math.exp(-1.1 * dt);
            s.pos.x += s.vel.x * dt; s.pos.z += s.vel.z * dt;
            s.roll -= (s.vel.x * dt) / CAP_RW;
            if (Math.hypot(s.vel.x, s.vel.z) < 0.35) { s.stage = 3; s.t0 = t; }
        } else if (s.stage === 3) {                             // loses speed, wobbles and drops flat
            s.vel.x *= Math.exp(-3 * dt); s.pos.x += s.vel.x * dt;
            const u = clamp01((t - s.t0) / 0.9), a = (Math.PI / 2) * (1 - Math.pow(1 - u, 3)) + 0.05 * Math.sin(u * 30) * (1 - u);
            s.tiltFall = Math.max(0, a);
            s.pos.y = CAP_RW * Math.cos(s.tiltFall) + CAP_HALF * Math.sin(s.tiltFall);
            s.roll -= (s.vel.x * dt) / CAP_RW * (1 - u);
        }
        const tiltX = s.stage === 3 ? Math.PI / 2 + s.tiltFall : s.tilt;
        capMesh.position.copy(s.pos);
        capMesh.quaternion.setFromEuler(new THREE.Euler(tiltX, 0, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.roll));   // spin about its own axis
        const h = Math.max(0, s.pos.y - CAP_HALF);
        s.blob.visible = true; s.blob.position.set(s.pos.x, 0.006, s.pos.z);
        s.blob.scale.setScalar(1 + h * 0.4); s.blob.material.opacity = 0.6 / (1 + h * 2.5);
    }

    function frame(now) {
        if (finished) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.033, (now - last) / 1000); last = now;
        const t = (now - start) / 1000;
        let shake = 0;

        /* 1. slow drop, turning gently, then a soft landing */
        if (t < T_LAND) {
            const s = clamp01((t - T_DROP0) / (T_LAND - T_DROP0));
            rig.position.y = 15 * (1 - Math.pow(s, 1.7));
            rig.rotation.z = 0.07 * Math.sin(t * 2.3) * (1 - s);
            holder.rotation.y = 1.1 * (1 - s);
        } else {
            const u = t - T_LAND;
            const sq = Math.exp(-u * 9) * Math.cos(u * 26) * 0.07;
            holder.scale.set(S * (1 + sq * 0.5), S * (1 - sq), S * (1 + sq * 0.5));
            holder.rotation.y = 0;
            shake = Math.max(shake, Math.exp(-u * 10) * 0.12);
            rig.position.y = 0;
            rig.rotation.z = 0.035 * Math.exp(-u * 4) * Math.sin(u * 16);          // small rock after landing
        }

        /* 2. it tips over and lies on its side (rotating about its bottom edge) */
        if (t >= T_TIP0) {
            const tt = clamp01((t - T_TIP0) / T_TIP);
            rig.rotation.z = (Math.PI / 2) * Math.pow(tt, 2.2);
            if (tt >= 1) {
                const uu = t - T_TIP0 - T_TIP;
                rig.position.y = Math.max(0, Math.sin(uu * 10)) * Math.exp(-uu * 5) * 0.14;
                shake = Math.max(shake, Math.exp(-uu * 9) * 0.16);
            }
        }

        {   // shadow pool: faint while falling from high up, dark at touchdown, slides away as it tips over
            const tipU = clamp01((t - T_TIP0) / T_TIP);
            const h = rig.position.y;
            bottleBlob.material.opacity = 0.62 * (1 - tipU) / (1 + h * 0.5);
            bottleBlob.scale.setScalar(1 + h * 0.15);
            bottleBlob.position.x = X0 - tipU * 1.2;
        }
        updateCap(t, dt);

        /* 3. capsules spill out and roll */
        for (const c of caps) {
            if (t < c.t0) continue;
            const age = t - c.t0;
            if (!c.started) {
                c.started = true; c.yaw.visible = true;
                c.pos = MOUTH.clone().add(new THREE.Vector3(-0.15, 0, (Math.random() - 0.5) * 0.3));
                if (c.hero) {
                    c.dir = HERO_DIR.clone();
                } else {
                    const ang = (Math.random() - 0.5) * 1.1;
                    c.dir = new THREE.Vector3(-Math.cos(ang), 0, Math.sin(ang) * 0.8 + 0.25).normalize();
                    c.speed = 1.2 + Math.random() * 1.3;
                    c.vy = 0;
                    c.y = S;
                }
                c.psi = Math.atan2(-c.dir.z, c.dir.x);
                c.rollAngle = Math.random() * 6;
            }
            if (c.hero) {
                const u = clamp01(age / 1.6), e = eOut3(u);
                c.pos.x = lerp(MOUTH.x - 0.15, TARGET.x, e);
                c.pos.z = lerp(MOUTH.z, TARGET.z, e);
                const tHit = Math.sqrt(2 * (S - R) / 9);
                c.pos.y = age < tHit ? S - 0.5 * 9 * age * age
                                      : R + 0.09 * Math.abs(Math.sin((age - tHit) * 12)) * Math.exp(-(age - tHit) * 7);
                const dist = Math.hypot(c.pos.x - (MOUTH.x - 0.15), c.pos.z - MOUTH.z);
                c.rollAngle = -dist / R;
            } else {
                c.vy -= 9 * dt; c.y += c.vy * dt;
                if (c.y < R) {
                    c.y = R;
                    c.vy = c.vy < -0.6 ? -c.vy * 0.28 : 0;
                }
                if (c.y <= R + 0.002) c.speed *= Math.exp(-2.0 * dt);
                c.pos.x += c.dir.x * c.speed * dt;
                c.pos.z += c.dir.z * c.speed * dt;
                c.pos.y = c.y;
                if (c.y <= R + 0.002) c.rollAngle -= (c.speed * dt) / R;
            }
            placeCapsule(c, c.pos, c.psi);
        }

        /* details: ripples + dust */
        for (const r of ripples) {
            const u = (t - r.t0) / r.dur;
            if (u < 0 || u > 1) { r.m.visible = false; continue; }
            r.m.visible = true;
            r.m.scale.setScalar(lerp(0.25, r.size, eOut3(u)));
            r.m.material.opacity = r.op * (1 - u) * (1 - u);
        }
        const moteFade = clamp01(t / 1.6) * (1 - clamp01((t - T_ZOOM0) / 0.8));
        for (const m of motes) {
            for (let i = 0; i < m.n; i++) {
                const s = m.seed[i];
                let y = m.a[i * 3 + 1] + s.sp * dt; if (y > 9) y = 0;
                m.a[i * 3 + 1] = y;
                m.a[i * 3] += Math.sin(t * 0.4 + s.ph) * s.amp * dt;
            }
            m.p.geometry.attributes.position.needsUpdate = true;
            m.p.material.opacity = m.base * moteFade;
        }

        /* 4. camera: slow push-in, follow the hero capsule, then dive into its blue half */
        const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
        camStart.copy(C0).sub(L0).multiplyScalar(zoomOut).add(L0);
        camStart.z -= Math.min(t, 5) * 0.12;                                   // gentle dolly in
        if (t >= T_ZOOM0 && hero.started) {
            const u = clamp01((t - T_ZOOM0) / (T_ZOOM1 - T_ZOOM0));
            const e = Math.pow(u, 2.4);
            blueDir.set(-Math.sin(hero.psi), 0, -Math.cos(hero.psi));          // towards the blue half
            focus.copy(hero.pos).addScaledVector(blueDir, 0.34);
            const dir = camStart.clone().sub(focus), d0 = dir.length(); dir.normalize();
            camPos.copy(focus).addScaledVector(dir, lerp(d0, 0.55, e));
            look.lerpVectors(L0, focus, clamp01(e * 2));
            camera.position.copy(camPos);
            camera.lookAt(look);
        } else {
            camera.position.copy(camStart);
            camera.lookAt(L0);
        }
        camera.position.x += sx; camera.position.y += sy;

        /* 5. the site shows through a circle that opens from inside the capsule */
        if (t >= T_HOLE0) {
            openSite();
            if (!root.classList.contains("opening")) root.classList.add("opening");
            const w = eInOut(clamp01((t - T_HOLE0) / (T_HOLE1 - T_HOLE0)));
            root.style.setProperty("--r", (lerp(-8, 125, w)).toFixed(2) + "vmax");
        }

        /* counter */
        let pct = Math.floor(clamp01(t / T_ZOOM1) * 100);
        if (!pageReady) pct = Math.min(pct, 99);
        pctEl.textContent = pct;
        root.style.setProperty("--p", (pct / 100).toFixed(3));
        const wi = Math.min(WORDS.length - 1, Math.floor(pct / (100 / WORDS.length)));
        if (wi !== curWord) {
            curWord = wi;
            idxEl.textContent = "0" + (wi + 1);
            wordEl.textContent = WORDS[wi];
            wordEl.classList.remove("swap"); void wordEl.offsetWidth; wordEl.classList.add("swap");
        }
        root.classList.toggle("counting-done", pct >= 100);

        renderer.render(scene, camera);

        if (t >= TOTAL && pageReady) finish();
        else if (t >= TOTAL + 6) finish();                                     // never hang on a slow load
    }
    raf = requestAnimationFrame(frame);
})();