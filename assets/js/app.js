(function () {
  "use strict";

  const { NODES, LAYOUT, STAGES, TASKS, SOURCES, SYMPTOMS, CAUSES } = window.PAWE;

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace(/\.0+$/, "") : "—");
  const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem("pawe:" + k);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("pawe:" + k, JSON.stringify(v));
      } catch (e) {
        /* storage unavailable — ignore */
      }
    },
  };

  const state = {
    taskId: store.get("task", TASKS[0].id),
    engineer: store.get("engineer", false),
    node: "gr00t",
    chunk: { fv: 20, H: 16, fa: 50, fc: 100, fpd: 1000 },
    symptom: null,
    cause: null,
  };
  if (!TASKS.some((t) => t.id === state.taskId)) state.taskId = TASKS[0].id;

  const currentTask = () => TASKS.find((t) => t.id === state.taskId);
  const stageLabel = (id) => (STAGES.find((s) => s.id === id) || {}).label || id;
  const srcLink = (key) => {
    const s = SOURCES[key];
    return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : "";
  };

  /* ---------- router ---------- */
  function route(e) {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const view = ["workflow", "budget", "sim2real", "ai"].includes(parts[0]) ? parts[0] : "workflow";

    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
    document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.view === view));

    if (view === "workflow") {
      const changed = parts[1] && NODES[parts[1]] && parts[1] !== state.node;
      if (changed) state.node = parts[1];
      renderPipeline();
      renderDetail();
      if (changed) {
        $("#detail").scrollTop = 0;
        if (e && window.matchMedia("(max-width: 900px)").matches) $("#detail").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (view === "sim2real") {
      state.symptom = SYMPTOMS.some((s) => s.id === parts[1]) ? parts[1] : null;
      state.cause = state.symptom && CAUSES[parts[2]] ? parts[2] : null;
      renderSim2Real();
    } else if (view === "budget") {
      renderBudget();
    }
  }

  /* ---------- stage strip ---------- */
  function renderStageStrip() {
    $("#stage-strip").innerHTML = STAGES.map((s) => {
      const first = Object.keys(NODES).find((id) => NODES[id].stage === s.id);
      return `<li><a class="stage-chip st-${s.id}" href="#/workflow/${first}">${esc(s.label)}</a></li>`;
    }).join("");
  }

  /* ---------- workflow ---------- */
  function renderTaskSelect() {
    const sel = $("#task-select");
    sel.innerHTML = TASKS.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join("");
    sel.value = state.taskId;
    sel.addEventListener("change", () => {
      state.taskId = sel.value;
      store.set("task", state.taskId);
      renderPipeline();
      renderDetail();
    });

    const tog = $("#engineer-toggle");
    tog.checked = state.engineer;
    document.body.classList.toggle("engineer", state.engineer);
    tog.addEventListener("change", () => {
      state.engineer = tog.checked;
      store.set("engineer", state.engineer);
      document.body.classList.toggle("engineer", state.engineer);
      renderDetail();
    });
  }

  function renderPipeline() {
    const task = currentTask();
    const rows = LAYOUT.map((row, i) => {
      const cells = row
        .map((id) => {
          const n = NODES[id];
          const [status] = task.nodes[id] || ["core"];
          const active = id === state.node ? " active" : "";
          return `<a role="listitem" class="node st-${n.stage} is-${status}${active}" href="#/workflow/${id}">
            <span class="node-stage">${esc(stageLabel(n.stage))}</span>
            <span class="node-title">${esc(n.title)}</span>
            <span class="node-tech">${esc(n.tech)}</span>
            <span class="badge ${status}">${status}</span>
          </a>`;
        })
        .join("");
      const branch = row.length > 1 ? " branch" : "";
      const arrow = i < LAYOUT.length - 1 ? `<div class="arrow${branch || (LAYOUT[i + 1].length > 1 ? " split" : "")}" aria-hidden="true"></div>` : "";
      return `<div class="row${branch}">${cells}</div>${arrow}`;
    });
    $("#pipeline").innerHTML = rows.join("");
  }

  function section(label, body) {
    return `<section class="d-sec"><h4>${label}</h4>${body}</section>`;
  }

  function renderDetail() {
    const id = state.node;
    const n = NODES[id];
    const task = currentTask();
    const [status, note] = task.nodes[id] || ["core", ""];
    const order = LAYOUT.flat();
    const idx = order.indexOf(id);
    const prev = order[idx - 1];
    const next = order[idx + 1];

    let html = `
      <div class="d-head st-${n.stage}">
        <span class="node-stage">${esc(stageLabel(n.stage))}</span>
        <h3>${esc(n.title)}</h3>
        <p class="d-tech">${esc(n.tech)}</p>
      </div>
      <div class="task-note is-${status}">
        <span class="badge ${status}">${status} for this task</span>
        <p>${esc(note)}</p>
      </div>`;

    html += section("What", `<p>${esc(n.what)}</p>`);
    html += section("Why customers need it", `<p>${esc(n.why)}</p>`);
    html += section("When do you need it?", `<p>${esc(n.whenNeeded)}</p>`);
    if (n.diagram) html += `<pre class="diagram">${esc(n.diagram)}</pre>`;
    if (state.engineer) {
      if (n.engineerWidget === "chunk") html += chunkWidgetHTML();
      else if (n.engineer) html += `<div class="eng">${section("Engineer · " + esc(n.engineer.title), list(n.engineer.body))}</div>`;
      else html += `<div class="eng"><p class="muted">No engineer view for this stage yet.</p></div>`;
    } else if (n.engineer || n.engineerWidget) {
      html += `<p class="hint">Turn on <strong>Engineer Mode</strong> for numbers, timing and trade-offs.</p>`;
    }

    html += `<div class="io">${section("Input", list(n.input))}${section("Output", list(n.output))}</div>`;
    html += section("Bottleneck", list(n.bottleneck));
    html += section("Debug", list(n.debug));
    if (n.tools.length) {
      html += section(
        "NVIDIA tool",
        `<ul class="tools">${n.tools
          .map((t) => `<li><a href="${esc(SOURCES[t.src].url)}" target="_blank" rel="noopener">${esc(t.name)}</a></li>`)
          .join("")}</ul>`
      );
    }

    html += section("Sources", `<ul class="sources">${n.sources.map((s) => `<li>${srcLink(s)}</li>`).join("")}</ul>`);
    html += `<nav class="d-nav">
      ${prev ? `<a href="#/workflow/${prev}">← ${esc(NODES[prev].title)}</a>` : "<span></span>"}
      ${next ? `<a href="#/workflow/${next}">${esc(NODES[next].title)} →</a>` : "<span></span>"}
    </nav>`;

    const d = $("#detail");
    d.innerHTML = html;
    if (state.engineer && n.engineerWidget === "chunk") bindChunkWidget();
  }

  /* ---------- engineer widget: action chunk vs. control rates ---------- */
  function chunkWidgetHTML() {
    const c = state.chunk;
    const opt = (vals, cur) => vals.map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v} Hz</option>`).join("");
    return `<div class="eng">
      <h4>Engineer · Action chunk & control hierarchy</h4>
      <p class="tag">Typical architecture · Example values — robot dependent</p>
      <pre class="diagram" id="cw-diagram"></pre>
      <label class="field grow">
        <span>VLA inference frequency <output id="cw-fv-out"></output></span>
        <input type="range" id="cw-fv" min="5" max="50" step="1" value="${c.fv}" />
        <span class="range-ends"><span>5 Hz</span><span>50 Hz</span></span>
      </label>
      <div class="cw-grid">
        <label class="field"><span>Chunk length H (actions)</span>
          <input type="number" id="cw-H" min="1" max="128" value="${c.H}" /></label>
        <label class="field"><span>Chunk step rate</span>
          <select id="cw-fa">${opt([15, 20, 30, 50, 100], c.fa)}</select></label>
        <label class="field"><span>Whole-body / low-level controller</span>
          <select id="cw-fc">${opt([50, 100, 200, 500], c.fc)}</select></label>
        <label class="field"><span>Joint PD / actuator loop</span>
          <select id="cw-fpd">${opt([500, 1000, 2000], c.fpd)}</select></label>
      </div>
      <div id="cw-out" class="cw-out"></div>
      <p class="note">Reference: GR00T N1.7 raised the action horizon from 16 to 40 steps and exposes an
        <code>--execution-horizon</code> flag (how many predicted actions are executed per policy call) —
        ${srcLink("gr00tRepo")}. Chunk step rate = the dataset's control rate.</p>
    </div>`;
  }

  function bindChunkWidget() {
    const ids = ["fv", "H", "fa", "fc", "fpd"];
    const update = () => {
      ids.forEach((k) => (state.chunk[k] = Number($("#cw-" + k).value) || state.chunk[k]));
      const { fv, H, fa, fc, fpd } = state.chunk;
      const period = 1000 / fv;
      const lowPerUpdate = fc / fv;
      const chunkSpan = (H / fa) * 1000;
      const consumed = fa / fv;
      const pdPerLow = fpd / fc;
      const interp = fc / fa;

      $("#cw-fv-out").textContent = fv + " Hz";
      $("#cw-diagram").textContent =
        `GR00T / VLA inference        ${fv} Hz   (every ${fmt(period)} ms)\n` +
        `        ↓\n` +
        `Action chunk  [a0 a1 … a${H - 1}]   (${H} steps @ ${fa} Hz = ${fmt(chunkSpan, 0)} ms)\n` +
        `        ↓\n` +
        `Whole-body controller        ${fc} Hz\n` +
        `        ↓\n` +
        `Joint target\n` +
        `        ↓\n` +
        `PD / actuator controller     ${fpd} Hz`;

      let warn = "";
      if (chunkSpan < period) {
        warn = `<p class="warn">⚠ The chunk covers only ${fmt(chunkSpan, 0)} ms but the next inference arrives after ${fmt(period, 0)} ms — the controller runs out of actions and must hold or extrapolate. Increase H, lower the chunk step rate, or raise the VLA frequency.</p>`;
      } else if (chunkSpan < 2 * period) {
        warn = `<p class="caution">Chunk covers less than two inference periods — little slack if one inference is late (p99 latency).</p>`;
      } else {
        warn = `<p class="ok">✓ Each chunk covers ${fmt(chunkSpan / period, 1)} inference periods — slack for late inferences, and room to execute only the first part of each chunk before re-planning.</p>`;
      }

      $("#cw-out").innerHTML = `
        <dl class="kv">
          <dt>Inference period</dt><dd>${fmt(period)} ms</dd>
          <dt>Max synchronous inference latency</dt><dd>&lt; ${fmt(period)} ms</dd>
          <dt>Low-level cycles between VLA updates</dt><dd>≈ ${fmt(lowPerUpdate)}</dd>
          <dt>Chunk actions consumed per update</dt><dd>≈ ${fmt(consumed)} of ${H}</dd>
          <dt>Low-level cycles per chunk step</dt><dd>${fmt(interp)}${interp > 1 ? " (interpolate between chunk actions)" : ""}</dd>
          <dt>PD cycles per low-level cycle</dt><dd>${fmt(pdPerLow)}</dd>
        </dl>
        ${warn}
        <a class="btn" href="#/budget" id="cw-to-budget">Use ${fv} Hz as deployment budget target →</a>`;
      $("#cw-to-budget").addEventListener("click", () => {
        budget.target = fv;
      });
    };
    ids.forEach((k) => $("#cw-" + k).addEventListener("input", update));
    update();
  }

  /* ---------- deployment budget ---------- */
  const budget = {
    rows: [
      { id: "camera", label: "Camera pipeline", ms: 6 },
      { id: "prepost", label: "Pre/post processing", ms: 3 },
      { id: "inference", label: "Model inference", ms: 12 },
      { id: "ros", label: "ROS transport", ms: 2 },
      { id: "other", label: "Other (control, logging)", ms: 0 },
    ],
    target: 50,
    mode: "sequential",
    speedup: 1,
  };

  const ADVICE = {
    camera: [
      "Lower resolution / crop to the region the policy needs",
      "Hardware-accelerated capture & ISP on Jetson; avoid CPU colour conversion",
      "Check exposure time — long exposure adds latency and motion blur",
    ],
    prepost: [
      "Move resize / normalise to the GPU (e.g. Isaac ROS image processing)",
      "Avoid CPU ↔ GPU copies between pre-processing and inference",
      "Fuse pre-processing into the TensorRT engine where possible",
    ],
    inference: [
      "Export PyTorch → ONNX → TensorRT; try FP16, then INT8 / FP8 / FP4 with accuracy checks",
      "For diffusion / flow action heads: fewer denoising steps trade quality for latency",
      "Execute more of each action chunk per call so inference can run less often",
    ],
    ros: [
      "Zero-copy GPU transport between nodes (Isaac ROS: NITROS → rosidl::Buffer)",
      "Composable nodes / intra-process communication",
      "Tune QoS and executors; avoid large-message serialisation",
    ],
    other: ["Profile with Nsight Systems to find hidden sync points and logging overhead"],
  };

  const OPT_PATH = [
    { id: "pt", label: "PyTorch", note: "Research baseline; easiest to debug, slowest to deploy." },
    { id: "onnx", label: "ONNX", note: "Framework-neutral graph; fix unsupported ops and dynamic shapes here." },
    { id: "fp16", label: "TensorRT FP16", note: "Usually the first big win with small accuracy risk — validate outputs." },
    { id: "int8", label: "TensorRT INT8 / FP8 / FP4", note: "Needs calibration or quantisation-aware steps; re-run task evaluation." },
    { id: "thor", label: "Jetson Thor", note: "Build the engine on the target device; benchmark in the real power mode." },
  ];

  let budgetBuilt = false;
  function renderBudget() {
    if (!budgetBuilt) {
      $("#budget-inputs").innerHTML = budget.rows
        .map(
          (r) => `<label class="field inline"><span>${esc(r.label)}</span>
            <input type="number" min="0" step="0.5" data-row="${r.id}" value="${r.ms}" /><span class="unit">ms</span></label>`
        )
        .join("");
      $("#budget-inputs").addEventListener("input", (e) => {
        const r = budget.rows.find((x) => x.id === e.target.dataset.row);
        if (r) r.ms = Math.max(0, Number(e.target.value) || 0);
        computeBudget();
      });
      $("#budget-target").addEventListener("input", (e) => {
        budget.target = Math.max(1, Number(e.target.value) || 1);
        computeBudget();
      });
      $("#budget-mode").addEventListener("change", (e) => {
        budget.mode = e.target.value;
        computeBudget();
      });
      $("#budget-speedup").addEventListener("input", (e) => {
        budget.speedup = Number(e.target.value) || 1;
        computeBudget();
      });
      $("#opt-path").innerHTML = OPT_PATH.map(
        (s, i) => `${i ? '<span class="opt-arrow">→</span>' : ""}<div class="opt-step" title="${esc(s.note)}"><strong>${esc(s.label)}</strong><span>${esc(s.note)}</span></div>`
      ).join("");
      budgetBuilt = true;
    }
    $("#budget-target").value = budget.target;
    computeBudget();
  }

  function computeBudget() {
    const eff = budget.rows.map((r) => ({ ...r, eff: r.id === "inference" ? r.ms / budget.speedup : r.ms }));
    const total = eff.reduce((a, r) => a + r.eff, 0);
    const slowest = eff.reduce((a, r) => (r.eff > a.eff ? r : a), eff[0]);
    const cycle = budget.mode === "pipelined" ? slowest.eff : total;
    const maxHz = cycle > 0 ? 1000 / cycle : Infinity;
    const budgetMs = 1000 / budget.target;
    const over = cycle - budgetMs;
    $("#speedup-out").textContent = fmt(budget.speedup) + "×";

    const status =
      over > 0
        ? `<p class="warn big">⚠ Over budget by ${fmt(over)} ms</p>`
        : `<p class="ok big">✓ Within budget — ${fmt(-over)} ms headroom</p>`;

    $("#budget-result").innerHTML = `
      <dl class="kv">
        <dt>End-to-end latency (sensor → action)</dt><dd>${fmt(total)} ms</dd>
        <dt>${budget.mode === "pipelined" ? "Cycle time (slowest stage)" : "Cycle time"}</dt><dd>${fmt(cycle)} ms</dd>
        <dt>Maximum theoretical frequency</dt><dd>${Number.isFinite(maxHz) ? fmt(maxHz) + " Hz" : "∞"}</dd>
        <dt>Target control frequency</dt><dd>${fmt(budget.target)} Hz</dd>
        <dt>Budget per cycle</dt><dd>${fmt(budgetMs)} ms</dd>
      </dl>
      ${status}
      ${
        budget.mode === "pipelined"
          ? `<p class="note">Pipelining raises throughput, but each action is still based on an observation ${fmt(total)} ms old — the policy must tolerate that delay (see Sim2Real → Observation delay).</p>`
          : ""
      }`;

    const max = Math.max(...eff.map((r) => r.eff), budgetMs, 1e-9);
    $("#budget-bars").innerHTML =
      eff
        .map((r) => {
          const w = (r.eff / max) * 100;
          const mark = r.id === slowest.id && r.eff > 0 ? " ← largest" : "";
          return `<div class="bar-row${mark ? " largest" : ""}">
            <span class="bar-label">${esc(r.label)}</span>
            <span class="bar"><span style="width:${w}%"></span></span>
            <span class="bar-val">${fmt(r.eff)} ms${mark}</span>
          </div>`;
        })
        .join("") +
      `<div class="bar-row budget-line"><span class="bar-label">Budget</span><span class="bar"><span style="width:${(budgetMs / max) * 100}%"></span></span><span class="bar-val">${fmt(budgetMs)} ms</span></div>`;

    $("#opt-advice").innerHTML =
      slowest.eff > 0
        ? `<h4>Largest contributor: ${esc(slowest.label)}</h4>${list(ADVICE[slowest.id])}
           <p class="note">Suggestions are general engineering practice. Measure p99 latency on the target device before and after each change.</p>`
        : "";
    document.querySelectorAll(".opt-step").forEach((s) => s.classList.toggle("dim", slowest.id !== "inference"));
  }

  /* ---------- sim2real ---------- */
  function renderSim2Real() {
    $("#symptoms").innerHTML = SYMPTOMS.map(
      (s) => `<a class="symptom${s.id === state.symptom ? " active" : ""}" href="#/sim2real/${s.id}">
        <strong>${esc(s.label)}</strong><span>${esc(s.hint)}</span></a>`
    ).join("");

    const sym = SYMPTOMS.find((s) => s.id === state.symptom);
    if (!sym) {
      $("#causes").innerHTML = `<p class="muted">↑ Select a symptom to see potential causes.</p>`;
      $("#cause-detail").innerHTML = "";
      return;
    }
    $("#causes").innerHTML =
      `<h3>Potential causes</h3>` +
      sym.causes
        .map(
          (cid, i) => `<a class="cause${cid === state.cause ? " active" : ""}" href="#/sim2real/${sym.id}/${cid}">
          <span class="num">${CIRCLED[i] || i + 1}</span> ${esc(CAUSES[cid].title)}</a>`
        )
        .join("");

    const c = CAUSES[state.cause];
    if (!c) {
      $("#cause-detail").innerHTML = `<p class="muted">Select a cause to see the SIM vs. REAL picture.</p>`;
      return;
    }
    $("#cause-detail").innerHTML = `
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.explain)}</p>
      <div class="simreal">
        <div><h4>SIM</h4><pre class="diagram">${esc(c.sim)}</pre></div>
        <div><h4>REAL</h4><pre class="diagram real">${esc(c.real)}</pre></div>
      </div>
      ${section("How to check", list(c.check))}
      ${section("Fix", list(c.fix))}
      ${c.dr ? section("Domain randomisation during training (example ranges)", `<pre class="code">${esc(c.dr)}</pre>`) : ""}
      ${c.link ? `<p><a class="btn" href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.link.label)} ↗</a></p>` : ""}`;
  }

  /* ---------- init ---------- */
  renderStageStrip();
  renderTaskSelect();
  window.addEventListener("hashchange", route);
  route();
})();
