/*
 * Pipeline player: replays a scripted run (made-up data, no model calls) beat by beat.
 * Each page passes stages, rules, beats and a render function. The view is rebuilt
 * from beat 0 up to the current beat, so play, pause, step and back all stay consistent.
 */
(function () {
  "use strict";

  var ICON = {
    play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>',
    step: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2.5 2.5v11l7.5-5.5z"/><path d="M11 2.5h2.5v11H11z"/></svg>',
    back: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.5 2.5v11L6 8z"/><path d="M2.5 2.5H5v11H2.5z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.8"/><path d="M2.5 2.2v2.6h2.6"/></svg>',
    pass: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5"/></svg>',
    fail: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6"/></svg>',
    flag: '<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="5" y="2" width="2" height="5.5" rx="1"/><circle cx="6" cy="9.6" r="1.1"/></svg>'
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function clock(base, sec) {
    var p = base.split(":").map(Number);
    var t = p[0] * 3600 + p[1] * 60 + (p[2] || 0) + sec;
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return two(Math.floor(t / 3600) % 24) + ":" + two(Math.floor(t / 60) % 60) + ":" + two(t % 60);
  }

  function mount(root, cfg) {
    var n = cfg.stages.length;
    var beats = cfg.beats;
    var k = -1, playing = false, timer = null, lastSaid = null;

    root.innerHTML =
      '<div class="p-bar">' +
        '<div class="p-title"><strong>' + esc(cfg.title) + '</strong><span>' + esc(cfg.subtitle) + '</span></div>' +
        '<span class="p-sim">Simulation: scripted run on made-up data</span>' +
        '<div class="p-controls">' +
          '<button type="button" data-a="back" aria-label="Back one step">' + ICON.back + '</button>' +
          '<button type="button" data-a="play" class="primary">' + ICON.play + '<span>Play</span></button>' +
          '<button type="button" data-a="step" aria-label="Forward one step">' + ICON.step + '</button>' +
          '<button type="button" data-a="replay" aria-label="Replay from the start">' + ICON.replay + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="p-progress" aria-hidden="true"><div></div></div>' +
      '<div class="conveyor" style="--n:' + n + '">' +
        '<div class="track" style="left:' + (50 / n) + '%;right:' + (50 / n) + '%"></div>' +
        '<div class="track-fill" style="left:' + (50 / n) + '%"></div>' +
        '<ol>' + cfg.stages.map(function (s) {
          return '<li data-id="' + s.id + '" data-s="idle"><div class="node">' + s.icon + '</div><span>' + esc(s.label) + '</span></li>';
        }).join("") + '</ol>' +
        '<div class="packet" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="p-body">' +
        '<section class="stage" aria-label="Current step"><div class="stage-head"><h3></h3><p></p></div><div class="stage-body"></div></section>' +
        '<aside class="side" aria-label="Rules and run log">' +
          '<div><h4>Rules on every run</h4><ul class="rules">' + cfg.rules.map(function (r) {
            return '<li data-id="' + r.id + '" data-s="idle"><span class="dot"></span><b>' + esc(r.label) + '</b><small>' + esc(r.detail) + '</small></li>';
          }).join("") + '</ul></div>' +
          '<div><h4>Run log</h4><ol class="log" aria-label="Run log"></ol></div>' +
        '</aside>' +
      '</div>' +
      '<p class="sr" aria-live="polite"></p>';

    var el = {
      play: root.querySelector('[data-a="play"]'),
      back: root.querySelector('[data-a="back"]'),
      step: root.querySelector('[data-a="step"]'),
      progress: root.querySelector(".p-progress div"),
      stages: Array.prototype.slice.call(root.querySelectorAll(".conveyor li")),
      fill: root.querySelector(".track-fill"),
      packet: root.querySelector(".packet"),
      h: root.querySelector(".stage-head h3"),
      note: root.querySelector(".stage-head p"),
      body: root.querySelector(".stage-body"),
      rules: Array.prototype.slice.call(root.querySelectorAll(".rules li")),
      log: root.querySelector(".log"),
      live: root.querySelector(".sr")
    };

    function build(upto) {
      var st = { cur: -1, halt: false, done: false, rules: {}, log: [], data: cfg.init(), k: upto };
      var sec = 0;
      for (var i = 0; i <= upto; i++) {
        var b = beats[i];
        sec += b.t || 1;
        st.cur = cfg.stages.map(function (s) { return s.id; }).indexOf(b.stage);
        st.halt = !!b.halt;
        st.done = !!b.done;
        if (b.rules) Object.keys(b.rules).forEach(function (id) { st.rules[id] = b.rules[id]; });
        if (b.log) b.log.forEach(function (l) { st.log.push({ t: clock(cfg.clock || "16:40:00", sec), text: l[0], cls: l[1] || "", at: i }); });
        if (b.do) b.do(st.data, i);
      }
      return st;
    }

    function paint(announce) {
      var st = build(k);
      var lastStage = null;
      el.stages.forEach(function (li, i) {
        var s = "idle";
        if (i < st.cur || (i === st.cur && st.done)) s = "done";
        else if (i === st.cur) s = st.halt ? "halt" : "run";
        li.setAttribute("data-s", s);
        if (i === st.cur) lastStage = cfg.stages[i];
      });
      var pos = st.cur < 0 ? 0 : (st.cur + 0.5) / n * 100;
      el.packet.style.left = pos + "%";
      el.packet.style.opacity = st.cur < 0 || st.done ? 0 : 1;
      el.fill.style.width = st.cur < 1 ? "0" : ((st.cur) / n * 100) + "%";
      el.progress.style.width = ((k + 1) / beats.length * 100) + "%";

      el.rules.forEach(function (li) {
        var r = st.rules[li.getAttribute("data-id")];
        var s = r ? r[0] : "idle";
        li.setAttribute("data-s", s);
        li.querySelector(".dot").innerHTML = s === "pass" ? ICON.pass : s === "fail" ? ICON.fail : s === "flag" ? ICON.flag : "";
        var base = cfg.rules.filter(function (x) { return x.id === li.getAttribute("data-id"); })[0].detail;
        li.querySelector("small").textContent = r && r[1] ? r[1] : base;
      });

      el.log.innerHTML = st.log.map(function (l) {
        return '<li class="' + (l.at === k ? "enter " : "") + l.cls + '"><span class="t">' + l.t + "</span>  " + esc(l.text) + "</li>";
      }).join("") || '<li class="t">Waiting to start.</li>';
      el.log.scrollTop = el.log.scrollHeight;

      var view = cfg.render(st, k);
      el.h.textContent = view.title;
      el.note.textContent = view.note || "";
      el.body.innerHTML = view.html;

      el.back.disabled = k < 0;
      el.step.disabled = k >= beats.length - 1;
      var say = k < 0 ? "Ready to run" : k >= beats.length - 1 ? "Run finished" : lastStage ? lastStage.label : null;
      if (say && (announce || say !== lastSaid)) el.live.textContent = say;
      lastSaid = say;
    }

    function setPlaying(on) {
      playing = on;
      clearTimeout(timer);
      el.play.innerHTML = (on ? ICON.pause : ICON.play) + "<span>" + (on ? "Pause" : k >= beats.length - 1 ? "Play again" : k < 0 ? "Play" : "Resume") + "</span>";
      if (on) schedule();
    }

    function schedule() {
      if (k >= beats.length - 1) { setPlaying(false); window.__pipelineDone = true; return; }
      var wait = k < 0 ? 300 : (beats[k].dur || 1200);
      timer = setTimeout(function () { k++; paint(false); schedule(); }, wait);
    }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-a]");
      if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "play") {
        if (playing) return setPlaying(false);
        if (k >= beats.length - 1) { k = -1; paint(false); }
        setPlaying(true);
      } else if (a === "step") { setPlaying(false); if (k < beats.length - 1) { k++; paint(true); } }
      else if (a === "back") { setPlaying(false); if (k >= 0) { k--; paint(true); } }
      else if (a === "replay") { k = -1; paint(false); setPlaying(true); }
      if (a !== "play" && a !== "replay") setPlaying(false);
    });

    paint(false);

    if (/[?&]record\b/.test(location.search)) {
      document.body.classList.add("record");
      setTimeout(function () { setPlaying(true); }, 800);
    }
  }

  window.Pipeline = { mount: mount, esc: esc };
})();
