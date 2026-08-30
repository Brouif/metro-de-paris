/* Chronologie du métro de Paris
   ---------------------------------------------------------------------------
   Rendering model: every line segment and station is joined to the DOM exactly
   once at startup. Changing the year only toggles classes on those existing
   nodes, so playback is a class flip per node rather than a teardown and
   rebuild of the whole SVG. The fades themselves live in CSS.

   Dates are compared as ISO "YYYY-MM-DD" strings. That is lexicographically
   correct for this format and avoids parsing 740 Dates on every frame.
   end === null means "still open"; build_data.py normalises the sentinels. */

(function () {
  "use strict";

  var DATA = window.METRO_DATA;

  // 'Couloirs' are connecting tracks rather than a passenger line: drawn on the
  // map, but kept out of the legend, as in the original visualisation.
  var NOT_A_LINE = "Couloirs";

  var CASING_SHIFT = 0.45;
  var STATION_R = 2.6;   /* in proportion to the 2px line */
  var PAD = 26;
  var INSET = 9;   // keeps the handle off the ends of the track
  var SPEEDS = { 1: 900, 2: 450, 4: 225 };

  var domainStart = new Date(1900, 0, 1);
  var domainEnd = iso2date(DATA.meta.last);
  var domainSpan = domainEnd - domainStart;
  // Where the record stops and the projection starts. The dataset was built on
  // this day, so everything after it is a plan rather than something that
  // happened, whatever the planned features' own dates say.
  var todayIso = DATA.meta.generated;
  var firstYear = domainStart.getFullYear();
  var lastYear = domainEnd.getFullYear();

  // ---------------------------------------------------------------- i18n

  var STRINGS = window.METRO_I18N;
  var LINE_NAMES = window.METRO_LINE_NAMES;

  function storedLang() {
    // localStorage throws on file:// in some browsers (opaque origin), and the
    // app is meant to run from file://, so never let it break startup.
    try { return localStorage.getItem("metro-lang"); } catch (e) { return null; }
  }

  function rememberLang(code) {
    try { localStorage.setItem("metro-lang", code); } catch (e) { /* ignore */ }
  }

  function initialLang() {
    var q = /[?&]lang=(fr|en)\b/.exec(location.search);
    if (q) return q[1];
    var saved = storedLang();
    if (saved && STRINGS[saved]) return saved;
    return /^en\b/i.test(navigator.language || "") ? "en" : "fr";
  }

  var lang = initialLang();

  function t(key) {
    var v = STRINGS[lang][key];
    return v === undefined ? key : v;
  }

  function fmt(key) {
    var args = Array.prototype.slice.call(arguments, 1);
    var i = 0;
    return String(t(key)).replace(/%s/g, function () { return args[i++]; });
  }

  // Line names are data, so they arrive in French. In English the "Ligne N"
  // prefix reads as a label rather than part of the name, so it is swapped;
  // a few names need a full mapping instead.
  function lineLabel(name) {
    var special = LINE_NAMES[lang] && LINE_NAMES[lang][name];
    if (special) return special;
    var prefix = t("line.prefix");
    return prefix ? name.replace(/^Ligne /, prefix) : name;
  }

  // Chips are tight, so they carry only what follows the Ligne/Line prefix.
  function chipLabel(name) {
    return lineLabel(name).replace(/^(Ligne|Line) /, "");
  }

  var state = {
    date: iso2date(DATA.meta.first),  // opens on line 1's first day
    playing: false,
    direction: 1,      // +1 forward through time, -1 backwards
    speed: 1,
    timer: null,
    highlight: null,                  // Set of line names, or null
    transform: d3.zoomIdentity
  };

  // ---------------------------------------------------------------- helpers

  function iso2date(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function date2iso(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" +
           (day < 10 ? "0" : "") + day;
  }

  function clampDate(d) {
    return d < domainStart ? new Date(domainStart)
         : d > domainEnd ? new Date(domainEnd) : d;
  }

  function isOpen(f, ref) {
    return f.start <= ref && (f.end === null || f.end > ref);
  }

  function period(f) {
    var from = f.start.slice(0, 4);
    // "depuis 2027" would state a projection as fact, so planned features get
    // their own phrasing rather than the historical one.
    if (f.planned) return fmt("tip.planned", from);
    // A still-open record dates from the station, not from the record: the
    // two differ wherever a record was split off because the line set moved.
    return f.end === null ? fmt("tip.since", (f.since || f.start).slice(0, 4))
                          : fmt("tip.range", from, f.end.slice(0, 4));
  }

  // ------------------------------------------------------------------- DOM

  var app = document.getElementById("app");
  var mapEl = document.getElementById("map");
  var yearEl = document.getElementById("year");
  var chipsEl = document.getElementById("chips");
  var tooltipEl = document.getElementById("tooltip");
  var scrubEl = document.getElementById("scrubber");
  var fillEl = document.getElementById("fill");
  var futureEl = document.getElementById("future");
  var todayEl = document.getElementById("today");
  var yearFlagEl = document.getElementById("year-flag");
  var legendNoteEl = document.getElementById("legend-note");
  var handleEl = document.getElementById("handle");
  var playBtn = document.getElementById("play");
  var playIcon = document.getElementById("play-icon");
  var reverseBtn = document.getElementById("reverse");

  var svg = d3.select(mapEl).append("svg");
  var gRoot = svg.append("g");
  // A line's casing is a shade of its own colour rather than a neutral outline:
  // it fixes the contrast without discarding the hue, so line 1 still reads as
  // yellow while gaining an edge it does not have against pale land.
  //
  // The shade has to follow the theme. Darkening rescues the pale colours on the
  // light map but does nothing for line 2's navy on the dark one, so the casing
  // moves away from the ground in whichever direction the ground sits.
  var darkMedia = window.matchMedia("(prefers-color-scheme: dark)");

  function shade(hex, amount, towardWhite) {
    var n = parseInt(hex.slice(1), 16);
    var parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (c) {
      return Math.round(towardWhite ? c + (255 - c) * amount : c * (1 - amount));
    });
    return "rgb(" + parts.join(",") + ")";
  }

  function casingFor(hex) {
    return shade(hex, CASING_SHIFT, darkMedia.matches);
  }

  // Repainted only when the theme actually flips. render() calls this on every
  // frame of playback, so the common path is one boolean compare. The change
  // listener alone would be the tidier hook, but it is the only thing standing
  // between a theme switch and 740 wrongly-shaded strokes, so the state is
  // checked rather than trusted.
  var casingIsDark = null;

  function syncCasings() {
    if (casingIsDark === darkMedia.matches) return;
    casingIsDark = darkMedia.matches;
    casingNodes.attr("stroke", function (d) { return casingFor(DATA.colors[d.line]); });
    // A planned station is drawn hollow, so the ring is the only thing carrying
    // its colour: it takes the colour itself rather than the casing shade.
    stationNodes.attr("stroke", function (d) {
      return d.planned ? d.color : casingFor(d.color);
    });
  }

  darkMedia.addEventListener("change", syncCasings);

  var gParks = gRoot.append("g");
  var gWater = gRoot.append("g");
  var gCasing = gRoot.append("g");
  var gLines = gRoot.append("g");
  var gStations = gRoot.append("g");

  var projection = d3.geoMercator();
  var path = d3.geoPath(projection);

  // Fit to the network rather than to the context layers, which come from
  // départment-wide datasets and reach well past Paris.
  //
  // Projected track is left out of the fit as well. Including it would pull
  // Saclay and Chelles into frame and shrink 126 years of built network to
  // about 60% at every year, to make room for track nobody has ridden. The
  // planned lines run off the edges instead; the zoom floor is what lets you
  // pull back far enough to see where they go.
  var fitTarget = {
    type: "FeatureCollection",
    features: DATA.lines.filter(function (l) { return !l.planned; })
      .map(function (l) {
        return { type: "Feature", geometry: l.geometry, properties: {} };
      })
  };

  // ------------------------------------------------------- build once

  // Whether a feature is a projection never changes, so it is baked into the
  // class at join time; render() only ever toggles .hidden and .dim.
  function classFor(base) {
    return function (d) { return d.planned ? base + " planned" : base; };
  }

  var parksPath = gParks.append("path").attr("class", "parks");
  var waterPath = gWater.append("path").attr("class", "water");

  var casingNodes = gCasing.selectAll("path")
    .data(DATA.lines)
    .join("path")
    .attr("class", classFor("casing"));

  var lineNodes = gLines.selectAll("path")
    .data(DATA.lines)
    .join("path")
    .attr("class", classFor("line"))
    .attr("stroke", function (d) { return DATA.colors[d.line]; })
    .on("pointerenter", function (event, d) {
      if (event.pointerType === "touch") return;
      setHighlight(new Set([d.line]));
      // Name only, plus the projected note where there is one. Each record is a
      // geometry version rather than the line, so its dates describe the current
      // shape, not the line's life: line 1's most recent record starts in 1992 at
      // the La Défense extension, which read as "since 1992" for a line that
      // opened in 1900. A projected line has no such history to misreport.
      showTooltip(event, "<div class='t-name'>" + esc(lineLabel(d.line)) + "</div>" +
        (d.planned ? "<div class='t-meta'>" + esc(fmt("tip.planned", d.start.slice(0, 4))) +
                     "</div>" : ""));
    })
    .on("pointermove", moveTooltip)
    .on("pointerleave", clearHover)
    .on("click", function (event, d) {
      event.stopPropagation();
      setHighlight(new Set([d.line]));
    });

  var stationNodes = gStations.selectAll("circle")
    .data(DATA.stations)
    .join("circle")
    .attr("class", classFor("station"))
    .attr("fill", function (d) { return d.color; })
    .on("pointerenter", function (event, d) {
      if (event.pointerType === "touch") return;
      setHighlight(new Set(d.lines));
      showTooltip(event, stationTip(d));
    })
    .on("pointermove", moveTooltip)
    .on("pointerleave", clearHover)
    .on("click", function (event, d) {
      event.stopPropagation();
      setHighlight(new Set(d.lines));
      showTooltip(event, stationTip(d));
    });

  // Raw node arrays: render() runs on every frame of playback and touches every
  // feature, so it walks these rather than re-deriving d3 selections.
  var lineEls = lineNodes.nodes();
  var casingEls = casingNodes.nodes();
  var stationEls = stationNodes.nodes();

  // Previous on-screen state per node. Writing a class that is already set is
  // still a style invalidation, and at 740 nodes a frame that cost enough to
  // stutter playback. 2 = "unknown", so the first pass writes everything.
  var UNSET = 2;
  var lineVis = new Uint8Array(lineEls.length).fill(UNSET);
  var stationVis = new Uint8Array(stationEls.length).fill(UNSET);
  var lineDim = new Uint8Array(lineEls.length).fill(UNSET);
  var stationDim = new Uint8Array(stationEls.length).fill(UNSET);
  var chipDim = [];

  function stationTip(d) {
    var html = "<div class='t-name'>" + esc(d.name) + "</div><div class='t-meta'>";
    if (d.lines.length) html += esc(d.lines.map(lineLabel).join(", ")) + "<br>";
    html += period(d);
    // Set only when this record predates a rename; absent for closed stations,
    // which have no present-day name to point at.
    if (d.now) html += "<br>" + esc(fmt("tip.today", d.now));
    else if (d.was) html += "<br>" + esc(fmt("tip.was", d.was.join(", ")));
    return html + "</div>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ------------------------------------------------------------- layout

  function layout() {
    var w = mapEl.clientWidth;
    var h = mapEl.clientHeight;
    if (!w || !h) return;

    svg.attr("viewBox", "0 0 " + w + " " + h);
    projection.fitExtent([[PAD, PAD], [w - PAD, h - PAD]], fitTarget);

    parksPath.attr("d", path(DATA.parks));
    waterPath.attr("d", path(DATA.water));
    lineNodes.attr("d", function (d) { return path(d.geometry); });
    casingNodes.attr("d", function (d) { return path(d.geometry); });
    stationNodes
      .attr("cx", function (d) { return projection([d.lon, d.lat])[0]; })
      .attr("cy", function (d) { return projection([d.lon, d.lat])[1]; });

    applyZoomScale();
    buildTicks(w);
    positionEra();
    positionScrubber();
  }

  // ------------------------------------------------------------- render

  function render(animate) {
    var ref = date2iso(state.date);
    var i, el, d;

    syncCasings();

    app.classList.toggle("no-anim", !animate);

    var v;
    for (i = 0; i < lineEls.length; i++) {
      v = isOpen(DATA.lines[i], ref) ? 0 : 1;
      if (v !== lineVis[i]) {
        lineVis[i] = v;
        lineEls[i].classList.toggle("hidden", v === 1);
        casingEls[i].classList.toggle("hidden", v === 1);
      }
    }
    for (i = 0; i < stationEls.length; i++) {
      v = isOpen(DATA.stations[i], ref) ? 0 : 1;
      if (v !== stationVis[i]) {
        stationVis[i] = v;
        stationEls[i].classList.toggle("hidden", v === 1);
      }
    }

    yearEl.textContent = state.date.getFullYear();
    // The one signal that cannot be missed at a glance: past today, the year
    // itself is labelled as a projection.
    yearFlagEl.classList.toggle("on", ref > todayIso);
    scrubEl.setAttribute("aria-valuenow", state.date.getFullYear());
    positionScrubber();
    buildLegend(ref);
    applyHighlight();
  }

  // ------------------------------------------------------------- legend

  var legendState = "";

  function buildLegend(ref) {
    // Big interchanges carry several records in the source data, one per
    // platform cluster (Châtelet has three, Franklin D. Roosevelt four), so the
    // legend counts distinct station names rather than features.
    var seen = Object.create(null);
    var planned = Object.create(null);
    var i, d, j, line;

    for (i = 0; i < DATA.lines.length; i++) {
      d = DATA.lines[i];
      if (d.line !== NOT_A_LINE && isOpen(d, ref)) {
        seen[d.line] = seen[d.line] || Object.create(null);
        if (d.planned) planned[d.line] = 1;
      }
    }
    for (i = 0; i < DATA.stations.length; i++) {
      d = DATA.stations[i];
      if (!isOpen(d, ref)) continue;
      for (j = 0; j < d.lines.length; j++) {
        line = d.lines[j];
        if (seen[line]) seen[line][d.name] = 1;
      }
    }

    var counts = Object.create(null);
    var names = Object.keys(seen).sort(compareLines);
    for (i = 0; i < names.length; i++) {
      counts[names[i]] = Object.keys(seen[names[i]]).length;
    }
    legendNoteEl.classList.toggle("on", names.some(function (n) { return planned[n]; }));
    // Planned-ness is part of the key: a chip that changes from solid to hollow
    // is a different chip, even though the set of line names has not moved.
    var key = names.map(function (n) { return planned[n] ? n + "*" : n; }).join("|");
    if (key === legendState) {           // same set of lines: only counts moved
      for (i = 0; i < names.length; i++) {
        var c = chipsEl.children[i].querySelector(".count");
        if (c) c.textContent = counts[names[i]] || "";
      }
      return;
    }
    legendState = key;
    chipDim = [];
    chipsEl.textContent = "";
    names.forEach(function (name) {
      var chip = document.createElement("div");
      chip.className = planned[name] ? "chip planned" : "chip";
      chip.dataset.line = name;
      chip.innerHTML =
        (planned[name]
          ? "<span class='swatch' style='border-color:" + DATA.colors[name] + "'></span>"
          : "<span class='swatch' style='background:" + DATA.colors[name] + "'></span>") +
        "<span class='label'>" + esc(chipLabel(name)) + "</span>" +
        "<span class='count'>" + (counts[name] || "") + "</span>";
      chip.addEventListener("pointerenter", function () {
        setHighlight(new Set([name]));
      });
      chip.addEventListener("pointerleave", clearHover);
      chipsEl.appendChild(chip);
    });
    // render() calls applyHighlight() right after this, which paints the new chips.
  }

  // "Ligne 3 bis" after "Ligne 3", numbers before letters, digits numerically.
  function compareLines(a, b) {
    var na = parseInt(a.replace(/\D+/g, ""), 10);
    var nb = parseInt(b.replace(/\D+/g, ""), 10);
    if (isNaN(na) && isNaN(nb)) return a.localeCompare(b, "fr");
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb || a.localeCompare(b, "fr");
  }

  // ---------------------------------------------------------- highlight

  function setHighlight(lines) {
    state.highlight = lines;
    applyHighlight();
  }

  function applyHighlight() {
    var h = state.highlight;
    var i, v, chip;

    for (i = 0; i < lineEls.length; i++) {
      v = h && !h.has(DATA.lines[i].line) ? 1 : 0;
      if (v !== lineDim[i]) {
        lineDim[i] = v;
        lineEls[i].classList.toggle("dim", v === 1);
        casingEls[i].classList.toggle("dim", v === 1);
      }
    }
    for (i = 0; i < stationEls.length; i++) {
      v = h && !sharesLine(DATA.stations[i].lines, h) ? 1 : 0;
      if (v !== stationDim[i]) {
        stationDim[i] = v;
        stationEls[i].classList.toggle("dim", v === 1);
      }
    }
    for (i = 0; i < chipsEl.children.length; i++) {
      chip = chipsEl.children[i];
      v = h && !h.has(chip.dataset.line) ? 1 : 0;
      if (v !== chipDim[i]) {
        chipDim[i] = v;
        chip.classList.toggle("dim", v === 1);
      }
    }
  }

  function sharesLine(lines, set) {
    for (var i = 0; i < lines.length; i++) if (set.has(lines[i])) return true;
    return false;
  }

  function clearHover() {
    setHighlight(null);
    hideTooltip();
  }

  // ------------------------------------------------------------ tooltip

  function showTooltip(event, html) {
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add("on");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!tooltipEl.classList.contains("on")) return;
    var r = tooltipEl.getBoundingClientRect();
    var x = event.clientX + 14;
    var y = event.clientY - r.height - 12;
    if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - 14;
    if (y < 8) y = event.clientY + 18;
    tooltipEl.style.left = Math.max(8, x) + "px";
    tooltipEl.style.top = y + "px";
  }

  function hideTooltip() {
    tooltipEl.classList.remove("on");
  }

  // --------------------------------------------------------------- zoom

  // The floor used to be 1: you could never pull back from the initial fit.
  // That fit now frames the built network alone, so a floor of 1 would leave
  // the projected termini permanently off-screen. 0.5 clears the widest of
  // them — Saclay to Chelles needs about 0.55 — and "Reset view" still
  // returns to the built frame.
  var zoom = d3.zoom()
    .scaleExtent([0.5, 14])
    .on("zoom", function (event) {
      state.transform = event.transform;
      gRoot.attr("transform", event.transform);
      applyZoomScale();
    });

  svg.call(zoom).on("dblclick.zoom", null);

  // Lines keep their width via vector-effect; circles have no such escape hatch,
  // so their radius is divided by the zoom factor to hold a constant screen size.
  function applyZoomScale() {
    stationNodes.attr("r", STATION_R / state.transform.k);
  }

  document.getElementById("zoom-in").onclick = function () {
    svg.transition().duration(220).call(zoom.scaleBy, 1.6);
  };
  document.getElementById("zoom-out").onclick = function () {
    svg.transition().duration(220).call(zoom.scaleBy, 1 / 1.6);
  };
  document.getElementById("zoom-reset").onclick = function () {
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  };

  // Tapping empty map clears a touch-set highlight, which otherwise sticks.
  svg.on("click", function () { clearHover(); });

  // ---------------------------------------------------------- scrubber

  function scrubWidth() {
    return Math.max(1, scrubEl.clientWidth - 2 * INSET);
  }

  function positionScrubber() {
    var t = Math.max(0, Math.min(1, (state.date - domainStart) / domainSpan));
    var x = INSET + t * scrubWidth();
    fillEl.style.width = (x - INSET) + "px";
    handleEl.style.left = x + "px";
  }

  // The stretch of track past today, and the rule marking today itself. Both
  // depend on the width rather than on the handle, so this runs on layout
  // rather than on every frame.
  function positionEra() {
    var t = (iso2date(todayIso) - domainStart) / domainSpan;
    var projected = t > 0 && t < 1;
    futureEl.classList.toggle("on", projected);
    todayEl.classList.toggle("on", projected);
    if (!projected) return;
    var x = INSET + t * scrubWidth();
    futureEl.style.left = x + "px";
    todayEl.style.left = x + "px";
  }

  function buildTicks(width) {
    Array.prototype.slice.call(scrubEl.querySelectorAll(".tick"))
      .forEach(function (n) { n.remove(); });

    var every = width < 420 ? 40 : width < 700 ? 20 : 10;
    for (var y = firstYear; y <= lastYear; y += every) {
      var t = (new Date(y, 0, 1) - domainStart) / domainSpan;
      if (t < 0 || t > 1) continue;
      var el = document.createElement("div");
      el.className = "tick";
      el.style.left = (INSET + t * scrubWidth()) + "px";
      el.textContent = y;
      scrubEl.appendChild(el);
    }
  }

  function seek(clientX, animate) {
    var r = scrubEl.getBoundingClientRect();
    var t = Math.max(0, Math.min(1, (clientX - r.left - INSET) / scrubWidth()));
    state.date = new Date(domainStart.getTime() + t * domainSpan);
    render(!!animate);
  }

  // Tracked explicitly rather than via hasPointerCapture(), so that a failed
  // capture degrades to a still-working drag instead of a dead scrubber.
  var dragPointer = null;

  scrubEl.addEventListener("pointerdown", function (event) {
    stop();
    seek(event.clientX, false);
    dragPointer = event.pointerId;
    scrubEl.classList.add("dragging");
    try { scrubEl.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
  });

  scrubEl.addEventListener("pointermove", function (event) {
    if (dragPointer !== event.pointerId) return;
    seek(event.clientX, false);
  });

  function endDrag(event) {
    if (dragPointer !== event.pointerId) return;
    dragPointer = null;
    scrubEl.classList.remove("dragging");
    try { scrubEl.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
  }

  scrubEl.addEventListener("pointerup", endDrag);
  scrubEl.addEventListener("pointercancel", endDrag);

  scrubEl.addEventListener("keydown", function (event) {
    var step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step) {
      event.preventDefault();
      stop();
      state.date = clampDate(d3.timeYear.offset(state.date, step));
      render(true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      stop();
      state.date = new Date(event.key === "Home" ? domainStart : domainEnd);
      render(true);
    }
  });

  // -------------------------------------------------------------- play

  var ICON_PLAY = "M0 0 L12 7 L0 14 Z";
  var ICON_BACK = "M12 0 L0 7 L12 14 Z";
  var ICON_PAUSE = "M0 0 H4 V14 H0 Z M8 0 H12 V14 H8 Z";

  // Playback runs between the first opening and the end of the data. The
  // scrubber still reaches back to 1900-01-01, but there is nothing to watch
  // there, so neither direction plays into the empty stretch.
  var playStart = iso2date(DATA.meta.first);

  function start() {
    if (state.playing) return;
    if (state.timer) clearTimeout(state.timer);
    wrapIfAtEnd();
    state.playing = true;
    updateTransport();
    // Wait a full interval before the first step, so the year you pressed play
    // on is actually on screen for a beat instead of being skipped.
    state.timer = setTimeout(tick, SPEEDS[state.speed]);
  }

  // Starting a run from the end it would immediately finish at does nothing
  // visible, so jump to the far end and play the whole span instead.
  function wrapIfAtEnd() {
    if (state.direction > 0 && state.date >= domainEnd) {
      state.date = new Date(playStart);
      render(true);
    } else if (state.direction < 0 && state.date <= playStart) {
      state.date = new Date(domainEnd);
      render(true);
    }
  }

  function stop() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.playing = false;
    updateTransport();
  }

  function tick() {
    if (!state.playing) return;
    // Whole calendar years via timeYear, not a fixed 365 days, which would
    // drift by a day per leap year across 120 steps.
    var next = d3.timeYear.offset(state.date, state.direction);
    var done = state.direction > 0 ? next >= domainEnd : next <= playStart;

    state.date = done ? new Date(state.direction > 0 ? domainEnd : playStart) : next;
    render(true);

    if (done) stop();
    else state.timer = setTimeout(tick, SPEEDS[state.speed]);
  }

  // The play arrow points the way time will move, so flipping direction flips
  // the arrow. While running it shows a pause glyph instead.
  function updateTransport() {
    var back = state.direction < 0;

    playIcon.firstElementChild.setAttribute(
      "d", state.playing ? ICON_PAUSE : (back ? ICON_BACK : ICON_PLAY));
    playBtn.setAttribute("aria-label",
      t(state.playing ? "play.pause" : (back ? "play.start.back" : "play.start")));

    reverseBtn.setAttribute("aria-pressed", back ? "true" : "false");
    reverseBtn.setAttribute("aria-label", t("play.reverse"));
  }

  playBtn.addEventListener("click", function () {
    state.playing ? stop() : start();
  });

  reverseBtn.addEventListener("click", function () {
    state.direction = -state.direction;
    // Reversing mid-run keeps running, the other way; reversing while paused
    // only re-points the arrow.
    if (state.playing) wrapIfAtEnd();
    updateTransport();
  });

  document.getElementById("speed").addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn) return;
    state.speed = +btn.dataset.speed;
    Array.prototype.forEach.call(this.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== " " && event.key !== "Spacebar") return;
    if (creditsEl.open) return;                   // not while the panel is up
    if (event.target.closest("button")) return;   // let the button handle itself
    event.preventDefault();
    state.playing ? stop() : start();
  });

  // -------------------------------------------------------- language UI

  function applyLang() {
    document.documentElement.lang = t("html.lang");
    document.title = t("doc.title");

    // Text nodes, raw HTML blocks and aria labels are marked up in index.html
    // rather than looked up one by one here, so adding a string needs no code.
    each("[data-i18n]", function (el) { el.textContent = t(el.dataset.i18n); });
    each("[data-i18n-html]", function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    each("[data-i18n-aria-label]", function (el) {
      el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
    });

    // The transport labels depend on state, so they are set from there.
    updateTransport();

    each("#lang button", function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });

    legendState = "";     // chip labels changed language: force a rebuild
    render(false);
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  // Credits. showModal() gives the backdrop and makes the rest of the page
  // inert, but Escape-to-close and focus restoration are handled here rather
  // than left to the browser: both are specified behaviours of <dialog> that
  // were observed not firing, and an attribution panel that traps the keyboard
  // is worse than one that costs a few extra lines.
  var creditsEl = document.getElementById("credits");
  var creditsBtn = document.getElementById("credits-open");

  function openCredits() {
    creditsEl.showModal();
  }

  function closeCredits() {
    if (!creditsEl.open) return;
    creditsEl.close();
    creditsBtn.focus();
  }

  creditsBtn.addEventListener("click", openCredits);
  document.getElementById("credits-close").addEventListener("click", closeCredits);

  creditsEl.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCredits();
    }
  });

  // A click landing on the dialog element itself is the backdrop: the content
  // sits in child elements, so anything inside stops the event before here.
  creditsEl.addEventListener("click", function (event) {
    if (event.target === creditsEl) closeCredits();
  });

  document.getElementById("lang").addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn || btn.dataset.lang === lang) return;
    lang = btn.dataset.lang;
    rememberLang(lang);
    hideTooltip();
    applyLang();
  });

  // ------------------------------------------------------------ startup

  // Only one element is observed, so ResizeObserver already delivers at most one
  // entry per frame; the rAF debounce this used to carry had nothing to
  // coalesce. layout() cannot change the size it observes, so calling it
  // straight from the callback risks no feedback loop either.
  new ResizeObserver(layout).observe(mapEl);

  // aria-valuemax is the one slider bound the markup does not carry: it is
  // wherever the data happens to end, so it is set here rather than left to
  // rot in index.html the way it did at 2020.
  scrubEl.setAttribute("aria-valuemax", lastYear);

  layout();
  applyLang();        // paints every string, then renders
})();
