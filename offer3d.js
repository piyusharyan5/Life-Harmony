/* ---------- Offer section: two 3D bottles swinging in the air ----------
   Lathe-turned plastic bottles with ridged caps and printed labels wrapped
   round them (Images/label-blue.png, Images/label-brown.png). Lit like a small
   photo studio: soft key light, fill, rim light and reflections. */
(function () {
    const stage = document.querySelector("#offer-stage");
    if (!stage || !window.THREE) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
        return; // no WebGL: the plain photo stays visible
    }
    renderer.setPixelRatio(Math.min(3, Math.max(2.5, (window.devicePixelRatio || 1) * 1.5)));   // render big, browser shrinks it: keeps the label sharp
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 3 / 4, 0.1, 80);
    camera.position.set(0, 0.2, 15);
    camera.lookAt(0, 0.2, 0);

    /* Reflections: a dim room with bright soft-boxes */
    function buildEnvironment() {
        const env = new THREE.Scene();
        env.add(new THREE.Mesh(
            new THREE.SphereGeometry(20, 32, 16),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.40, 0.45), side: THREE.BackSide })
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
        box(14, 8, 0, 12, 4, 3.0);      // top
        box(5, 14, -11, 2, 6, 4.0);     // tall left strip: long vertical highlight
        box(3, 14, 12, 2, -2, 2.6);     // right rim light
        box(10, 4, 0, -3, 12, 0.9);     // low front fill
        const pmrem = new THREE.PMREMGenerator(renderer);
        const tex = pmrem.fromScene(env, 0.03).texture;
        pmrem.dispose();
        return tex;
    }
    scene.environment = buildEnvironment();

    /* Lights */
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe3cfe1, 0.35));

    const key = new THREE.DirectionalLight(0xfff4ea, 1.25);       // warm key, casts the shadow
    key.position.set(-5, 9, 10);
    key.castShadow = false;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6; key.shadow.camera.right = 6;
    key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.camera.near = 1; key.shadow.camera.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xdde6ff, 0.35);      // cool fill
    fill.position.set(7, 2, 8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.5);        // edge light from behind
    rim.position.set(3, 4, -9);
    scene.add(rim);


    /* ----- Bottle shape (units: body radius = 1) ----- */
    const BODY_TOP = 2.727, SHOULDER_TOP = 3.117;
    const NECK_LO = 3.225, NECK_HI = 3.32, CAP_LO = 3.355, CAP_HI = 3.788;
    const LABEL = { lo: 0.437, hi: 2.675 };
    const RIDGES = 90;

    function bodyProfile() {
        const pts = [];
        const f = 0.22;
        pts.push(new THREE.Vector2(0, 0));
        for (let a = Math.PI / 2; a >= 0; a -= Math.PI / 24) {
            pts.push(new THREE.Vector2(1 - f + f * Math.cos(a), f - f * Math.sin(a)));
        }
        pts.push(new THREE.Vector2(1, BODY_TOP));
        for (let i = 1; i <= 16; i++) {
            const t = i / 16;
            pts.push(new THREE.Vector2(
                0.714 + 0.286 * Math.pow(Math.cos(t * Math.PI / 2), 0.9),
                BODY_TOP + t * (SHOULDER_TOP - BODY_TOP)
            ));
        }
        pts.push(new THREE.Vector2(0.714, 3.16));
        pts.push(new THREE.Vector2(0.66, 3.19));
        pts.push(new THREE.Vector2(0.585, NECK_LO));
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

    /* A fine grain so the plastic is not perfectly smooth (reads as real moulded plastic) */
    function grainTexture() {
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        const g = c.getContext("2d");
        const d = g.createImageData(256, 256);
        for (let i = 0; i < d.data.length; i += 4) {
            const v = 128 + (Math.random() - 0.5) * 60;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
            d.data[i + 3] = 255;
        }
        g.putImageData(d, 0, 0);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(10, 10);
        return t;
    }
    const grain = grainTexture();

    const api = { loaded: 0 };
    function loadTexture(src) {
        const done = () => { api.loaded++; if (api.loaded >= 2) stage.classList.add("ready"); };
        const t = new THREE.TextureLoader().load(src, done, undefined, () => {
            console.error("offer3d.js: could not load '" + src + "'. Check that the file is in your Images folder and the page is opened through a local server.");
            done();
        });
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = true;
        return t;
    }

    function makeBottle(labelSrc, capColour) {
        const g = new THREE.Group();

        const plastic = new THREE.MeshPhysicalMaterial({
            color: 0xf3f3f5, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.22,
            bumpMap: grain, bumpScale: 0.35, envMapIntensity: 1.15,
        });
        g.add(new THREE.Mesh(new THREE.LatheGeometry(bodyProfile(), 128), plastic));

        const capGeo = new THREE.LatheGeometry(capProfile(), 360);
        makeRidged(capGeo, CAP_LO + 0.03, CAP_HI - 0.06, 0.014);
        const capMat = new THREE.MeshPhysicalMaterial({
            color: capColour, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 1.2,
        });
        g.add(new THREE.Mesh(capGeo, capMat));

        /* Printed label: the photo supplies the print, lights add the shape.
           Half the print is emissive so colours stay true, half is lit so it curves. */
        const labelGeo = new THREE.CylinderGeometry(1.004, 1.004, LABEL.hi - LABEL.lo, 256, 1, true, -Math.PI, Math.PI * 2);
        const map = loadTexture(labelSrc);
        const labelMat = new THREE.MeshPhysicalMaterial({
            map: map, color: new THREE.Color(0.5, 0.5, 0.5),
            emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.6,
            roughness: 0.55, clearcoat: 0.08, clearcoatRoughness: 0.5, envMapIntensity: 0.35,
            toneMapped: false,
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = (LABEL.lo + LABEL.hi) / 2;
        g.add(label);

        g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        label.receiveShadow = false;                     // avoids striping where it touches the body

        g.position.y = -CAP_HI / 2;
        const holder = new THREE.Group();
        holder.add(g);
        return holder;
    }

    const blue = makeBottle("Images/label-blue.png", 0xdcdcde);
    const brown = makeBottle("Images/label-brown.png", 0xcbbfb4);
    blue.position.set(-1.05, 0, 0);
    brown.position.set(1.2, -0.1, 0.25);
    brown.scale.setScalar(1.05);
    brown.rotation.z = -0.13;
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

        if (!dragging) {
            drag += dragVel;
            dragVel *= 0.94;
            drag *= 0.985;
        }

        swing.rotation.z = Math.sin(t * 1.15) * 0.11 * k;
        swing.rotation.x = Math.sin(t * 0.8 + 1.2) * 0.025 * k;
        swing.position.y = PIVOT_Y + Math.sin(t * 1.6) * 0.06 * k;

        blue.rotation.y = Math.sin(t * 0.7) * 0.5 * k + drag;
        brown.rotation.y = Math.sin(t * 0.7 + 1.4) * 0.5 * k + drag;
        brown.rotation.z = baseLean + Math.sin(t * 1.15 + 0.6) * 0.03 * k;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    })();
})();