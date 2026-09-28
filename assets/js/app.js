(function () {
  "use strict";

  const { NODES, LAYOUT, STAGES, TASKS, SOURCES, SYMPTOMS, CAUSES, UI, ZH } = window.PAWE;

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

  /* ---------- language ---------- */
  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "zh") return q;
    const saved = store.get("lang", null);
    if (saved === "en" || saved === "zh") return saved;
    return /^zh/i.test(navigator.language || "") ? "zh" : "en";
  }

  const state = {
    lang: initialLang(),
    taskId: store.get("task", TASKS[0].id),
    engineer: store.get("engineer", false),
    node: "gr00t",
    chunk: { fv: 20, H: 16, fa: 50, fc: 100, fpd: 1000 },
    symptom: null,
    cause: null,
  };
  if (!TASKS.some((t) => t.id === state.taskId)) state.taskId = TASKS[0].id;

  const zh = () => state.lang === "zh";
  /* UI string lookup with {param} substitution; falls back to English. */
  const tr = (key, params) => {
    let s = (UI[state.lang] && UI[state.lang][key]) ?? UI.en[key] ?? key;
    if (params && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
    return s;
  };
  /* Content lookup: shallow-merge the Chinese override over the English object. */
  const node = (id) => (zh() && ZH.nodes[id] ? { ...NODES[id], ...ZH.nodes[id] } : NODES[id]);
  const cause = (id) => (zh() && ZH.causes[id] ? { ...CAUSES[id], ...ZH.causes[id] } : CAUSES[id]);
  const symptom = (s) => (zh() && ZH.symptoms[s.id] ? { ...s, ...ZH.symptoms[s.id] } : s);
  const stageLabel = (id) => (zh() && ZH.stages[id]) || (STAGES.find((s) => s.id === id) || {}).label || id;
  const taskLabel = (t) => (zh() && ZH.tasks[t.id] ? ZH.tasks[t.id].label : t.label);
  const currentTask = () => TASKS.find((t) => t.id === state.taskId);
  const taskNode = (id) => {
    const [status, note] = currentTask().nodes[id] || ["core", ""];
    const zhNote = zh() && ZH.tasks[state.taskId] ? ZH.tasks[state.taskId].notes[id] : null;
    return [status, zhNote || note];
  };
  /* zh overrides list tool names as plain strings; English keeps {name, src}. */
  const toolName = (id, n, i) => (typeof n.tools[i] === "string" ? n.tools[i] : NODES[id].tools[i].name);

  const srcLink = (key) => {
    const s = SOURCES[key];
    return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : "";
  };

  /* ---------- theme ---------- */
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const effectiveTheme = () => document.documentElement.dataset.theme || (mq.matches ? "dark" : "light");
  function updateThemeButton() {
    const dark = effectiveTheme() === "dark";
    const btn = $("#theme-toggle");
    btn.textContent = dark ? "☀" : "☾";
    const label = tr(dark ? "toggle.themeToLight" : "toggle.themeToDark");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }
  function initTheme() {
    $("#theme-toggle").addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      store.set("theme", next);
      updateThemeButton();
    });
    mq.addEventListener("change", updateThemeButton);
  }

  /* ---------- static text ---------- */
  function applyStaticText() {
    document.documentElement.lang = zh() ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = tr(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = tr(el.dataset.i18nHtml)));
    const lb = $("#lang-toggle");
    lb.textContent = tr("toggle.lang");
    lb.title = tr("toggle.langTitle");
    lb.setAttribute("aria-label", tr("toggle.langTitle"));
    updateThemeButton();
  }

  function initLang() {
    $("#lang-toggle").addEventListener("click", () => {
      state.lang = zh() ? "en" : "zh";
      store.set("lang", state.lang);
      renderAll();
    });
  }

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

  function renderAll() {
    applyStaticText();
    renderStageStrip();
    renderTaskOptions();
    budgetBuilt = false;
    route();
  }

  /* ---------- stage strip ---------- */
  function renderStageStrip() {
    $("#stage-strip").innerHTML = STAGES.map((s) => {
      const first = Object.keys(NODES).find((id) => NODES[id].stage === s.id);
      return `<li><a class="stage-chip st-${s.id}" href="#/workflow/${first}">${esc(stageLabel(s.id))}</a></li>`;
    }).join("");
  }

  /* ---------- workflow ---------- */
  function renderTaskOptions() {
    const sel = $("#task-select");
    sel.innerHTML = TASKS.map((t) => `<option value="${t.id}">${esc(taskLabel(t))}</option>`).join("");
    sel.value = state.taskId;
  }

  function initWorkflowControls() {
    const sel = $("#task-select");
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
    const rows = LAYOUT.map((row, i) => {
      const cells = row
        .map((id) => {
          const n = node(id);
          const [status] = taskNode(id);
          const active = id === state.node ? " active" : "";
          return `<a role="listitem" class="node st-${n.stage} is-${status}${active}" href="#/workflow/${id}">
            <span class="node-stage">${esc(stageLabel(n.stage))}</span>
            <span class="node-title">${esc(n.title)}</span>
            <span class="node-tech">${esc(n.tech)}</span>
            <span class="badge ${status}">${esc(tr("status." + status))}</span>
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
    const n = node(id);
    const [status, note] = taskNode(id);
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
        <span class="badge ${status}">${esc(tr("wf.forTask", { status: tr("status." + status) }))}</span>
        <p>${esc(note)}</p>
      </div>`;

    html += section(esc(tr("sec.what")), `<p>${esc(n.what)}</p>`);
    html += section(esc(tr("sec.why")), `<p>${esc(n.why)}</p>`);
    html += section(esc(tr("sec.when")), `<p>${esc(n.whenNeeded)}</p>`);
    if (n.diagram) html += `<pre class="diagram">${esc(n.diagram)}</pre>`;
    if (state.engineer) {
      if (n.engineerWidget === "chunk") html += chunkWidgetHTML();
      else if (n.engineer) html += `<div class="eng">${section(esc(tr("eng.prefix") + n.engineer.title), list(n.engineer.body))}</div>`;
      else html += `<div class="eng"><p class="muted">${esc(tr("eng.none"))}</p></div>`;
    } else if (n.engineer || n.engineerWidget) {
      html += `<p class="hint">${tr("eng.hint")}</p>`;
    }

    html += `<div class="io">${section(esc(tr("sec.input")), list(n.input))}${section(esc(tr("sec.output")), list(n.output))}</div>`;
    html += section(esc(tr("sec.bottleneck")), list(n.bottleneck));
    html += section(esc(tr("sec.debug")), list(n.debug));
    const baseTools = NODES[id].tools;
    if (baseTools.length) {
      html += section(
        esc(tr("sec.tool")),
        `<ul class="tools">${baseTools
          .map((t, i) => `<li><a href="${esc(SOURCES[t.src].url)}" target="_blank" rel="noopener">${esc(toolName(id, n, i))}</a></li>`)
          .join("")}</ul>`
      );
    }

    html += section(esc(tr("sec.sources")), `<ul class="sources">${n.sources.map((s) => `<li>${srcLink(s)}</li>`).join("")}</ul>`);
    html += `<nav class="d-nav">
      ${prev ? `<a href="#/workflow/${prev}">← ${esc(node(prev).title)}</a>` : "<span></span>"}
      ${next ? `<a href="#/workflow/${next}">${esc(node(next).title)} →</a>` : "<span></span>"}
    </nav>`;

    $("#detail").innerHTML = html;
    if (state.engineer && n.engineerWidget === "chunk") bindChunkWidget();
  }

  /* ---------- engineer widget: action chunk vs. control rates ---------- */
  function chunkWidgetHTML() {
    const c = state.chunk;
    const opt = (vals, cur) => vals.map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${v} Hz</option>`).join("");
    return `<div class="eng">
      <h4>${esc(tr("cw.title"))}</h4>
      <p class="tag">${esc(tr("cw.tag"))}</p>
      <pre class="diagram" id="cw-diagram"></pre>
      <label class="field grow">
        <span>${esc(tr("cw.fv"))} <output id="cw-fv-out"></output></span>
        <input type="range" id="cw-fv" min="5" max="50" step="1" value="${c.fv}" />
        <span class="range-ends"><span>5 Hz</span><span>50 Hz</span></span>
      </label>
      <div class="cw-grid">
        <label class="field"><span>${esc(tr("cw.H"))}</span>
          <input type="number" id="cw-H" min="1" max="128" value="${c.H}" /></label>
        <label class="field"><span>${esc(tr("cw.fa"))}</span>
          <select id="cw-fa">${opt([15, 20, 30, 50, 100], c.fa)}</select></label>
        <label class="field"><span>${esc(tr("cw.fc"))}</span>
          <select id="cw-fc">${opt([50, 100, 200, 500], c.fc)}</select></label>
        <label class="field"><span>${esc(tr("cw.fpd"))}</span>
          <select id="cw-fpd">${opt([500, 1000, 2000], c.fpd)}</select></label>
      </div>
      <div id="cw-out" class="cw-out"></div>
      <p class="note">${tr("cw.note", { src: srcLink("gr00tRepo") })}</p>
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

      let warn;
      if (chunkSpan < period) {
        warn = `<p class="warn">${esc(tr("cw.warn", { span: fmt(chunkSpan, 0), period: fmt(period, 0) }))}</p>`;
      } else if (chunkSpan < 2 * period) {
        warn = `<p class="caution">${esc(tr("cw.caution"))}</p>`;
      } else {
        warn = `<p class="ok">${esc(tr("cw.ok", { n: fmt(chunkSpan / period, 1) }))}</p>`;
      }

      $("#cw-out").innerHTML = `
        <dl class="kv">
          <dt>${esc(tr("cw.period"))}</dt><dd>${fmt(period)} ms</dd>
          <dt>${esc(tr("cw.maxLat"))}</dt><dd>&lt; ${fmt(period)} ms</dd>
          <dt>${esc(tr("cw.lowPer"))}</dt><dd>≈ ${fmt(lowPerUpdate)}</dd>
          <dt>${esc(tr("cw.consumed"))}</dt><dd>≈ ${fmt(consumed)} ${esc(tr("cw.of"))} ${H}</dd>
          <dt>${esc(tr("cw.interp"))}</dt><dd>${fmt(interp)}${interp > 1 ? esc(tr("cw.interpNote")) : ""}</dd>
          <dt>${esc(tr("cw.pdPer"))}</dt><dd>${fmt(pdPerLow)}</dd>
        </dl>
        ${warn}
        <a class="btn" href="#/budget" id="cw-to-budget">${esc(tr("cw.toBudget", { fv }))}</a>`;
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
      { id: "camera", ms: 6 },
      { id: "prepost", ms: 3 },
      { id: "inference", ms: 12 },
      { id: "ros", ms: 2 },
      { id: "other", ms: 0 },
    ],
    target: 50,
    mode: "sequential",
    speedup: 1,
  };
  const rowLabel = (id) => tr("b.rows")[id];

  const OPT_PATH = [
    { id: "pt", label: "PyTorch" },
    { id: "onnx", label: "ONNX" },
    { id: "fp16", label: "TensorRT FP16" },
    { id: "int8", label: "TensorRT INT8 / FP8 / FP4" },
    { id: "thor", label: "Jetson Thor" },
  ];

  let budgetBuilt = false;
  function initBudgetControls() {
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
  }

  function renderBudget() {
    if (!budgetBuilt) {
      $("#budget-inputs").innerHTML = budget.rows
        .map(
          (r) => `<label class="field inline"><span>${esc(rowLabel(r.id))}</span>
            <input type="number" min="0" step="0.5" data-row="${r.id}" value="${r.ms}" /><span class="unit">ms</span></label>`
        )
        .join("");
      const notes = tr("b.opt");
      $("#opt-path").innerHTML = OPT_PATH.map(
        (s, i) =>
          `${i ? '<span class="opt-arrow">→</span>' : ""}<div class="opt-step" title="${esc(notes[s.id])}"><strong>${esc(s.label)}</strong><span>${esc(notes[s.id])}</span></div>`
      ).join("");
      $("#budget-mode").value = budget.mode;
      $("#budget-speedup").value = budget.speedup;
      budgetBuilt = true;
    }
    $("#budget-target").value = budget.target;
    computeBudget();
  }

  function computeBudget() {
    const eff = budget.rows.map((r) => ({ ...r, label: rowLabel(r.id), eff: r.id === "inference" ? r.ms / budget.speedup : r.ms }));
    const total = eff.reduce((a, r) => a + r.eff, 0);
    const slowest = eff.reduce((a, r) => (r.eff > a.eff ? r : a), eff[0]);
    const cycle = budget.mode === "pipelined" ? slowest.eff : total;
    const maxHz = cycle > 0 ? 1000 / cycle : Infinity;
    const budgetMs = 1000 / budget.target;
    const over = cycle - budgetMs;
    $("#speedup-out").textContent = fmt(budget.speedup) + "×";

    const status =
      over > 0
        ? `<p class="warn big">${esc(tr("b.over", { ms: fmt(over) }))}</p>`
        : `<p class="ok big">${esc(tr("b.within", { ms: fmt(-over) }))}</p>`;

    $("#budget-result").innerHTML = `
      <dl class="kv">
        <dt>${esc(tr("b.e2e"))}</dt><dd>${fmt(total)} ms</dd>
        <dt>${esc(tr(budget.mode === "pipelined" ? "b.cycleSlowest" : "b.cycle"))}</dt><dd>${fmt(cycle)} ms</dd>
        <dt>${esc(tr("b.maxHz"))}</dt><dd>${Number.isFinite(maxHz) ? fmt(maxHz) + " Hz" : "∞"}</dd>
        <dt>${esc(tr("b.targetHz"))}</dt><dd>${fmt(budget.target)} Hz</dd>
        <dt>${esc(tr("b.budget"))}</dt><dd>${fmt(budgetMs)} ms</dd>
      </dl>
      ${status}
      ${budget.mode === "pipelined" ? `<p class="note">${esc(tr("b.pipeNote", { ms: fmt(total) }))}</p>` : ""}`;

    const max = Math.max(...eff.map((r) => r.eff), budgetMs, 1e-9);
    $("#budget-bars").innerHTML =
      eff
        .map((r) => {
          const w = (r.eff / max) * 100;
          const mark = r.id === slowest.id && r.eff > 0 ? " " + tr("b.largest") : "";
          return `<div class="bar-row${mark ? " largest" : ""}">
            <span class="bar-label">${esc(r.label)}</span>
            <span class="bar"><span style="width:${w}%"></span></span>
            <span class="bar-val">${fmt(r.eff)} ms${esc(mark)}</span>
          </div>`;
        })
        .join("") +
      `<div class="bar-row budget-line"><span class="bar-label">${esc(tr("b.budgetBar"))}</span><span class="bar"><span style="width:${(budgetMs / max) * 100}%"></span></span><span class="bar-val">${fmt(budgetMs)} ms</span></div>`;

    $("#opt-advice").innerHTML =
      slowest.eff > 0
        ? `<h4>${esc(tr("b.largestTitle", { name: slowest.label }))}</h4>${list(tr("b.advice")[slowest.id])}
           <p class="note">${esc(tr("b.adviceNote"))}</p>`
        : "";
    document.querySelectorAll(".opt-step").forEach((s) => s.classList.toggle("dim", slowest.id !== "inference"));
  }

  /* ---------- sim2real ---------- */
  function renderSim2Real() {
    $("#symptoms").innerHTML = SYMPTOMS.map((raw) => {
      const s = symptom(raw);
      return `<a class="symptom${s.id === state.symptom ? " active" : ""}" href="#/sim2real/${s.id}">
        <strong>${esc(s.label)}</strong><span>${esc(s.hint)}</span></a>`;
    }).join("");

    const sym = SYMPTOMS.find((s) => s.id === state.symptom);
    if (!sym) {
      $("#causes").innerHTML = `<p class="muted">${esc(tr("s.pickSymptom"))}</p>`;
      $("#cause-detail").innerHTML = "";
      return;
    }
    $("#causes").innerHTML =
      `<h3>${esc(tr("s.causes"))}</h3>` +
      sym.causes
        .map(
          (cid, i) => `<a class="cause${cid === state.cause ? " active" : ""}" href="#/sim2real/${sym.id}/${cid}">
          <span class="num">${CIRCLED[i] || i + 1}</span> ${esc(cause(cid).title)}</a>`
        )
        .join("");

    if (!state.cause) {
      $("#cause-detail").innerHTML = `<p class="muted">${esc(tr("s.pickCause"))}</p>`;
      return;
    }
    const c = cause(state.cause);
    $("#cause-detail").innerHTML = `
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.explain)}</p>
      <div class="simreal">
        <div><h4>SIM</h4><pre class="diagram">${esc(c.sim)}</pre></div>
        <div><h4>REAL</h4><pre class="diagram real">${esc(c.real)}</pre></div>
      </div>
      ${section(esc(tr("s.check")), list(c.check))}
      ${section(esc(tr("s.fix")), list(c.fix))}
      ${c.dr ? section(esc(tr("s.dr")), `<pre class="code">${esc(c.dr)}</pre>`) : ""}
      ${c.link ? `<p><a class="btn" href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.linkLabel || c.link.label)} ↗</a></p>` : ""}`;
  }

  /* ---------- init ---------- */
  initTheme();
  initLang();
  initWorkflowControls();
  initBudgetControls();
  renderAll();
  window.addEventListener("hashchange", route);
})();
