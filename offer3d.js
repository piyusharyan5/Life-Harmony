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

    const rim = new THREE.DirectionalLight(0xffffff, 0.9);        // edge light from behind
    rim.position.set(3, 4, -9);
    scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffd6f0, 0.6);       // pink kicker from the left
    rim2.position.set(-8, 3, -6);
    scene.add(rim2);

    /* soft glow disc behind the bottles + sparkles in the air */
    function radialTex(stops) {
        const c = document.createElement("canvas"); c.width = c.height = 128;
        const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        stops.forEach(([o, col]) => gr.addColorStop(o, col));
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(11, 11),
        new THREE.MeshBasicMaterial({ map: radialTex([[0, "rgba(255,255,255,0.95)"], [0.45, "rgba(255,236,250,0.4)"], [1, "rgba(255,255,255,0)"]]), transparent: true, depthWrite: false }));
    glow.position.set(0, 0.6, -3);
    scene.add(glow);

    const SPARKS = 46, sparkPos = new Float32Array(SPARKS * 3), sparkSeed = [];
    for (let i = 0; i < SPARKS; i++) {
        sparkPos[i * 3] = (Math.random() - 0.5) * 8; sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 9; sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 0.5;
        sparkSeed.push({ ph: Math.random() * 6.28, sp: 0.2 + Math.random() * 0.4 });
    }
    const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
        size: 0.16, map: radialTex([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]),
        transparent: true, opacity: 0.85, depthWrite: false,
    }));
    sparks.frustumCulled = false;
    scene.add(sparks);


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

    /* painted stand-in label, used only if the label image can't be loaded */
    function paintLabel(hex, dark, title, sub) {
        const W = 2048, H = 1024, c = document.createElement("canvas"); c.width = W; c.height = H;
        const g = c.getContext("2d");
        g.fillStyle = hex; g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(255,255,255,0.16)"; g.beginPath(); g.arc(W / 2, H, 420, 0, 7); g.fill();
        g.textAlign = "center"; g.fillStyle = dark;
        const F = '"Schibsted Grotesk","Helvetica Neue",Arial,sans-serif';
        g.font = "600 46px " + F; g.fillText("Life Harmony", W / 2, 150);
        g.font = "700 108px " + F; g.fillText(title, W / 2, 400);
        g.font = "500 42px " + F; g.fillText(sub, W / 2, 470);
        g.font = "600 30px " + F; g.fillText("HEALTHCARE. REAL RESULTS.", W / 2, 900);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const api = { loaded: 0 };
    function loadTexture(src, fallback, onFail) {
        const done = () => { api.loaded++; if (api.loaded >= 2) { stage.classList.add("ready"); stage.classList.add("revealed"); } };
        const t = new THREE.TextureLoader().load(src, done, undefined, () => {
            console.warn("offer3d.js: could not load '" + src + "', using a painted label instead.");
            if (onFail) onFail(fallback());
            done();
        });
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.generateMipmaps = true;
        return t;
    }

    function makeBottle(labelSrc, capColour, fb) {
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
        const map = loadTexture(labelSrc, () => paintLabel(fb.hex, fb.dark, fb.title, fb.sub), (tex) => {
            labelMat.map = tex; labelMat.emissiveMap = tex; labelMat.needsUpdate = true;
        });
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

    const blue = makeBottle("Images/label-blue.png", 0xdcdcde, { hex: "#8fb4f2", dark: "#12195a", title: "Vitamin D3+K2", sub: "with Coconut MCT Oil" });
    const brown = makeBottle("Images/label-brown.png", 0xcbbfb4, { hex: "#c9a27e", dark: "#3a2414", title: "Collagen Peptides", sub: "Organic · Chocolate" });
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

    /* glossy capsules orbiting the pair */
    const CR = 0.17, CL = 0.62;
    const capsuleGeo = new THREE.CapsuleGeometry(CR, CL - 2 * CR, 12, 32);
    const orbit = [0x5b97e6, 0xf27fb4, 0x58c98a, 0xf3a24f, 0xf4f2f6, 0x5b97e6, 0xf3a24f].map((col, i) => {
        const m = new THREE.Mesh(capsuleGeo, new THREE.MeshPhysicalMaterial({
            color: col, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5,
            emissive: new THREE.Color(col).multiplyScalar(0.15),
        }));
        scene.add(m);
        return { m, a: (i / 7) * Math.PI * 2, rx: 2.5 + (i % 3) * 0.35, ry: 1.3 + (i % 2) * 0.5, sp: 0.25 + (i % 4) * 0.06, ph: i * 1.3, ty: (i % 3 - 1) * 0.9 };
    });

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

    const bottles = [blue, brown], bc = new THREE.Vector3();

    /* pointer parallax + only render while the section is on screen */
    let px = 0, py = 0, tx = 0, ty = 0, visible = true, intro = 0, started = false;
    stage.addEventListener("pointermove", (e) => {
        const r = stage.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    stage.addEventListener("pointerleave", () => { tx = ty = 0; });
    if ("IntersectionObserver" in window) {
        new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) started = true; }, { threshold: 0.15 }).observe(stage);
    } else started = true;

    const clock = new THREE.Clock();
    (function render() {
        requestAnimationFrame(render);
        if (!visible) return;
        const t = clock.getElapsedTime();
        const k = reduceMotion.matches ? 0 : 1;
        if (started) intro = Math.min(1, intro + 0.014);                     // bottles glide in the first time you scroll to them
        const ie = 1 - Math.pow(1 - intro, 3);
        px += (tx - px) * 0.06; py += (ty - py) * 0.06;
        camera.position.x = px * 0.7; camera.position.y = 0.2 - py * 0.4; camera.lookAt(0, 0.2, 0);
        hang.position.y = -PIVOT_Y - (1 - ie) * 5;
        sparks.rotation.y = t * 0.03 * k;
        sparks.material.opacity = 0.55 + 0.3 * Math.sin(t * 1.7);
        glow.scale.setScalar(1 + 0.05 * Math.sin(t * 0.9) * k);
        for (const o of orbit) {
            const a = o.a + t * o.sp * k;
            // wide ring: well in front of and behind the bottles, so it never cuts through them
            o.m.position.set(Math.cos(a) * o.rx * 0.95 + 0.1, o.ty + Math.sin(a * 1.3 + o.ph) * 0.35 + Math.sin(a) * o.ry * 0.25, Math.sin(a) * 2.4 + 0.1);
            o.m.rotation.set(t * 0.6 + o.ph, t * 0.4, a);
            o.m.scale.setScalar(ie);
        }

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

        /* safety: treat each bottle as a vertical cylinder (following the swing) and push any capsule
           that would end up inside it out to the surface, so capsules can never appear inside a bottle */
        scene.updateMatrixWorld(true);
        for (const b of bottles) {
            b.getWorldPosition(bc);
            const s = b.scale.x, halfH = (CAP_HI / 2) * s + 0.45, minR = s + 0.31 + 0.22;
            for (const o of orbit) {
                const p = o.m.position;
                if (Math.abs(p.y - bc.y) > halfH) continue;
                let dx = p.x - bc.x, dz = p.z - bc.z;
                const len = Math.hypot(dx, dz);
                if (len >= minR) continue;
                if (len < 1e-4) { dx = 0; dz = 1; } else { dx /= len; dz /= len; }
                p.x = bc.x + dx * minR; p.z = bc.z + dz * minR;
            }
        }

        renderer.render(scene, camera);
    })();
})();