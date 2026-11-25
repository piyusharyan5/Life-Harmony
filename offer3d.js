/* ---------- Offer section: two 3D bottles swinging in the air ----------
   Built the same way as the hero bottle (script.js): a lathe-turned plastic
   bottle with a ridged cap, and a label wrapped round it. The label images
   (Images/label-blue.png, Images/label-brown.png) are the front and back photos
   unwrapped so you see the real front design and, as it turns, the back panel. */
(function () {
    const stage = document.querySelector("#offer-stage");
    if (!stage || !window.THREE) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
        return; // no WebGL: the plain photo stays visible
    }
    renderer.setPixelRatio(Math.min(3, Math.max(2, (window.devicePixelRatio || 1) + 0.5)));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 3 / 4, 0.1, 80);
    camera.position.set(0, 0.2, 15);
    camera.lookAt(0, 0.2, 0);

    /* A small photo studio for the plastic to reflect */
    function buildEnvironment() {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(
            new THREE.SphereGeometry(20, 32, 16),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.55, 0.58), side: THREE.BackSide })
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
        box(5, 14, -11, 2, 6, 3.2);
        box(3, 14, 12, 2, -2, 2.4);
        box(10, 4, 0, -3, 12, 1.0);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const tex = pmrem.fromScene(env, 0.03).texture;
        pmrem.dispose();
        return tex;
    }
    scene.environment = buildEnvironment();

    /* ----- Bottle shape (units: body radius = 1) ----- */
    const BODY_TOP = 2.727, SHOULDER_TOP = 3.117;
    const NECK_LO = 3.225, NECK_HI = 3.32, CAP_LO = 3.355, CAP_HI = 3.788;
    const LABEL = { lo: 0.437, hi: 2.675 };
    const RIDGES = 90;

    function bodyProfile() {
        const pts = [];
        const f = 0.22;                                        // base fillet
        pts.push(new THREE.Vector2(0, 0));
        for (let a = Math.PI / 2; a >= 0; a -= Math.PI / 24) {
            pts.push(new THREE.Vector2(1 - f + f * Math.cos(a), f - f * Math.sin(a)));
        }
        pts.push(new THREE.Vector2(1, BODY_TOP));
        for (let i = 1; i <= 16; i++) {                        // rounded shoulder
            const t = i / 16;
            pts.push(new THREE.Vector2(
                0.714 + 0.286 * Math.pow(Math.cos(t * Math.PI / 2), 0.9),
                BODY_TOP + t * (SHOULDER_TOP - BODY_TOP)
            ));
        }
        pts.push(new THREE.Vector2(0.714, 3.16));
        pts.push(new THREE.Vector2(0.66, 3.19));               // collar
        pts.push(new THREE.Vector2(0.585, NECK_LO));           // neck
        pts.push(new THREE.Vector2(0.585, NECK_HI));
        return pts;
    }

    function capProfile() {
        const pts = [];
        const r = 0.665, f = 0.06;
        pts.push(new THREE.Vector2(0.60, CAP_LO - 0.02));
        pts.push(new THREE.Vector2(r, CAP_LO));
        pts.push(new THREE.Vector2(r, CAP_HI - f));
        for (let a = 0; a <= Math.PI / 2; a += Math.PI / 12) {
            pts.push(new THREE.Vector2(r - f + f * Math.cos(a), CAP_HI - f + f * Math.sin(a)));
        }
        pts.push(new THREE.Vector2(0, CAP_HI));
        return pts;
    }

    function makeRidged(geo, y0, y1, depth) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
            const r = Math.hypot(x, z);
            if (r < 0.3 || y < y0 || y > y1) continue;
            const theta = Math.atan2(x, z);
            const edge = Math.min(1, (y - y0) / 0.05) * Math.min(1, (y1 - y) / 0.05);
            const nr = r + depth * edge * Math.cos(RIDGES * theta);
            pos.setX(i, x * nr / r);
            pos.setZ(i, z * nr / r);
        }
        geo.computeVertexNormals();
    }

    function loadTexture(src) {
        const t = new THREE.TextureLoader().load(src, () => { api.loaded++; if (api.loaded >= 2) stage.classList.add("ready"); });
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return t;
    }
    const api = { loaded: 0 };

    function makeBottle(labelSrc, capColour) {
        const g = new THREE.Group();

        const bodyGeo = new THREE.LatheGeometry(bodyProfile(), 128);
        const plastic = new THREE.MeshPhysicalMaterial({
            color: 0xf4f4f6, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.28,
        });
        g.add(new THREE.Mesh(bodyGeo, plastic));

        const capGeo = new THREE.LatheGeometry(capProfile(), 360);
        makeRidged(capGeo, CAP_LO + 0.03, CAP_HI - 0.06, 0.014);
        const capMat = new THREE.MeshPhysicalMaterial({
            color: capColour, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 1.1,
        });
        g.add(new THREE.Mesh(capGeo, capMat));

        const labelGeo = new THREE.CylinderGeometry(1.004, 1.004, LABEL.hi - LABEL.lo, 256, 1, true, -Math.PI, Math.PI * 2);
        const labelMat = new THREE.MeshPhysicalMaterial({
            map: loadTexture(labelSrc), roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4,
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = (LABEL.lo + LABEL.hi) / 2;
        g.add(label);

        g.position.y = -CAP_HI / 2;                      // centre each bottle on its own middle
        const holder = new THREE.Group();
        holder.add(g);
        return holder;
    }

    const blue = makeBottle("Images/label-blue.png", 0xdcdcde);
    const brown = makeBottle("Images/label-brown.png", 0xcbbfb4);
    blue.position.set(-1.05, 0, 0);
    brown.position.set(1.2, -0.1, 0.25);
    brown.scale.setScalar(1.05);
    brown.rotation.z = -0.13;                            // leans like in the photo
    const baseLean = brown.rotation.z;

    /* The pair hangs from a point above and swings like a pendulum */
    const PIVOT_Y = 6.2;
    const swing = new THREE.Group();
    swing.position.y = PIVOT_Y;
    const hang = new THREE.Group();
    hang.position.y = -PIVOT_Y;
    hang.add(blue, brown);
    swing.add(hang);
    scene.add(swing);

    /* Soft shadow on the floor that moves with the swing */
    const sc = document.createElement("canvas");
    sc.width = sc.height = 256;
    const sg = sc.getContext("2d");
    const grad = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(54,30,60,0.38)");
    grad.addColorStop(0.5, "rgba(54,30,60,0.16)");
    grad.addColorStop(1, "rgba(54,30,60,0)");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 5.6),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -2.75, 0);
    scene.add(shadow);

    new ResizeObserver(() => {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }).observe(stage);

    /* ----- Motion: pendulum swing + slow turn, drag to spin ----- */
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let drag = 0, dragVel = 0, dragging = false, lastX = 0;

    stage.addEventListener("pointerdown", (e) => {
        dragging = true; lastX = e.clientX; dragVel = 0;
        stage.setPointerCapture(e.pointerId);
        stage.classList.add("grabbing");
    });
    stage.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        dragVel = dx * 0.012;
        drag += dragVel;
    });
    const release = () => { dragging = false; stage.classList.remove("grabbing"); };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    const clock = new THREE.Clock();
    (function render() {
        const t = clock.getElapsedTime();
        const k = reduceMotion.matches ? 0 : 1;

        if (!dragging) {                                  // inertia, then ease back to rest
            drag += dragVel;
            dragVel *= 0.94;
            drag *= 0.985;
        }

        swing.rotation.z = Math.sin(t * 1.15) * 0.11 * k;                 // pendulum
        swing.rotation.x = Math.sin(t * 0.8 + 1.2) * 0.025 * k;
        swing.position.y = PIVOT_Y + Math.sin(t * 1.6) * 0.06 * k;        // gentle float

        blue.rotation.y = Math.sin(t * 0.7) * 0.5 * k + drag;             // each bottle turns a little
        brown.rotation.y = Math.sin(t * 0.7 + 1.4) * 0.5 * k + drag;
        brown.rotation.z = baseLean + Math.sin(t * 1.15 + 0.6) * 0.03 * k;

        const sway = Math.sin(t * 1.15);
        shadow.position.x = sway * 0.5 * k;
        shadow.material.opacity = 0.85 - Math.abs(sway) * 0.2 * k;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    })();
})();