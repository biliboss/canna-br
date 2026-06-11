/**
 * CHARTS_JS — dependency-free SVG chart micro-lib injected into widgets.
 *
 * Geometry + scales live here (engineering correctness); ALL paint is driven by
 * CSS classes + design tokens (var(--chart-1..8), var(--series-*)) so the
 * designer owns the palette in molecules.ts without touching this file.
 *
 * window.AuiCharts:
 *   el(tag, attrs, parent)                       low-level SVG element factory
 *   frame(host, {width,height,margin})           responsive <svg> + plot <g>; returns {svg,plot,iw,ih,m}
 *   scaleLinear([d0,d1],[r0,r1]) -> fn(v)
 *   scaleBand(keys,[r0,r1],pad) -> {x(k),bw,step}
 *   axisBottom(plot, scale, {y,ticks,fmt,band})
 *   axisLeft(plot, scale, {x,ticks,fmt,grid,gridW,label})
 *   line(plot, pts, {cls})                        pts: [{x,y}] (pixel space)
 *   area(plot, pts, y0, {cls})
 *   stackBands(plot, bands)                       bands: [{pts:[{x,yTop,yBot}],cls}]
 *   bars(plot, items)                             items: [{x,y,w,h,cls,data}]
 *   dots(plot, pts, {r,cls,clsFn})                pts: [{x,y,data}]
 *   hRule(plot, y, x0, x1, {label,cls})           percentile / reference line
 *   sparkline(host, values, {cls,width,height})
 *   tooltip(host) -> {show(html,clientX,clientY), hide(), bind(el,htmlFn)}
 */
export const CHARTS_JS = `(function () {
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') { e.textContent = attrs[k]; }
      else if (k === 'cls') { e.setAttribute('class', attrs[k]); }
      else { e.setAttribute(k, String(attrs[k])); }
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function frame(host, opts) {
    opts = opts || {};
    var width = opts.width || 640;
    var height = opts.height || 320;
    var m = opts.margin || { top: 16, right: 16, bottom: 34, left: 44 };
    var svg = el('svg', {
      cls: 'aui-chart',
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img'
    });
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.style.display = 'block';
    var plot = el('g', { transform: 'translate(' + m.left + ',' + m.top + ')' }, svg);
    if (host) host.appendChild(svg);
    return {
      svg: svg, plot: plot, m: m,
      iw: width - m.left - m.right,
      ih: height - m.top - m.bottom,
      width: width, height: height
    };
  }

  function scaleLinear(domain, range) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    var span = (d1 - d0) || 1;
    var fn = function (v) { return r0 + (v - d0) / span * (r1 - r0); };
    fn.invert = function (px) { return d0 + (px - r0) / (r1 - r0) * span; };
    fn.domain = domain; fn.range = range;
    return fn;
  }

  function scaleBand(keys, range, pad) {
    pad = pad == null ? 0.2 : pad;
    var r0 = range[0], r1 = range[1];
    var step = (r1 - r0) / Math.max(keys.length, 1);
    var bw = step * (1 - pad);
    var index = {};
    for (var i = 0; i < keys.length; i++) index[keys[i]] = i;
    return {
      x: function (k) { return r0 + index[k] * step + (step - bw) / 2; },
      center: function (k) { return r0 + index[k] * step + step / 2; },
      bw: bw, step: step, keys: keys
    };
  }

  function niceTicks(d0, d1, count) {
    count = count || 5;
    var span = (d1 - d0) || 1;
    var raw = span / count;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
    if (step < 1 && d0 >= 0 && d1 <= 10) step = 1;
    var start = Math.ceil(d0 / step) * step;
    var ticks = [];
    for (var v = start; v <= d1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }

  function axisBottom(plot, scale, o) {
    o = o || {};
    var y = o.y;
    var g = el('g', { cls: 'aui-axis aui-axis-x' }, plot);
    if (o.band) {
      var keys = scale.keys;
      for (var i = 0; i < keys.length; i++) {
        el('text', { cls: 'aui-tick', x: scale.center(keys[i]), y: y + 18, 'text-anchor': 'middle', text: o.fmt ? o.fmt(keys[i]) : keys[i] }, g);
      }
    } else {
      var ticks = o.ticks || niceTicks(scale.domain[0], scale.domain[1], o.count || 6);
      for (var j = 0; j < ticks.length; j++) {
        var x = scale(ticks[j]);
        el('line', { cls: 'aui-tickline', x1: x, x2: x, y1: y, y2: y + 5 }, g);
        el('text', { cls: 'aui-tick', x: x, y: y + 18, 'text-anchor': 'middle', text: o.fmt ? o.fmt(ticks[j]) : ticks[j] }, g);
      }
    }
    return g;
  }

  function axisLeft(plot, scale, o) {
    o = o || {};
    var x = o.x || 0;
    var g = el('g', { cls: 'aui-axis aui-axis-y' }, plot);
    var ticks = o.ticks || niceTicks(scale.domain[0], scale.domain[1], o.count || 5);
    for (var i = 0; i < ticks.length; i++) {
      var y = scale(ticks[i]);
      if (o.grid) el('line', { cls: 'aui-grid', x1: x, x2: o.gridW, y1: y, y2: y }, g);
      el('text', { cls: 'aui-tick', x: x - 8, y: y + 4, 'text-anchor': 'end', text: o.fmt ? o.fmt(ticks[i]) : ticks[i] }, g);
    }
    if (o.label) el('text', { cls: 'aui-axis-label', x: x - 34, y: -4, text: o.label }, g);
    return g;
  }

  function path(pts, close) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i === 0 ? 'M' : 'L') + pts[i].x.toFixed(2) + ' ' + pts[i].y.toFixed(2) + ' ';
    if (close) d += 'Z';
    return d;
  }

  function line(plot, pts, o) {
    o = o || {};
    if (!pts.length) return null;
    return el('path', { cls: 'aui-line ' + (o.cls || ''), d: path(pts, false), fill: 'none' }, plot);
  }

  function area(plot, pts, y0, o) {
    o = o || {};
    if (!pts.length) return null;
    var d = path(pts, false) + 'L' + pts[pts.length - 1].x.toFixed(2) + ' ' + y0.toFixed(2) + ' L' + pts[0].x.toFixed(2) + ' ' + y0.toFixed(2) + ' Z';
    return el('path', { cls: 'aui-area ' + (o.cls || ''), d: d }, plot);
  }

  function stackBands(plot, bands) {
    var g = el('g', { cls: 'aui-stack' }, plot);
    for (var b = 0; b < bands.length; b++) {
      var band = bands[b];
      var top = band.pts.map(function (p) { return { x: p.x, y: p.yTop }; });
      var bot = band.pts.map(function (p) { return { x: p.x, y: p.yBot }; }).reverse();
      el('path', { cls: 'aui-band ' + (band.cls || ('s' + b)), d: path(top.concat(bot), true) }, g);
    }
    return g;
  }

  function bars(plot, items) {
    var g = el('g', { cls: 'aui-bars' }, plot);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var r = el('rect', { cls: 'aui-bar ' + (it.cls || ''), x: it.x, y: it.y, width: Math.max(0, it.w), height: Math.max(0, it.h), rx: it.rx == null ? 2 : it.rx }, g);
      if (it.data) r.__data = it.data;
    }
    return g;
  }

  function dots(plot, pts, o) {
    o = o || {};
    var g = el('g', { cls: 'aui-dots' }, plot);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var cls = 'aui-dot ' + (o.clsFn ? o.clsFn(p.data, p) : (o.cls || ''));
      var c = el('circle', { cls: cls, cx: p.x, cy: p.y, r: p.r || o.r || 4 }, g);
      if (p.data) c.__data = p.data;
    }
    return g;
  }

  function hRule(plot, y, x0, x1, o) {
    o = o || {};
    var g = el('g', { cls: 'aui-rule ' + (o.cls || '') }, plot);
    el('line', { cls: 'aui-rule-line', x1: x0, x2: x1, y1: y, y2: y }, g);
    if (o.label) el('text', { cls: 'aui-rule-label', x: x1 - 4, y: y - 4, 'text-anchor': 'end', text: o.label }, g);
    return g;
  }

  function sparkline(host, values, o) {
    o = o || {};
    var w = o.width || 80, h = o.height || 24, pad = 2;
    if (!values.length) return null;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var sx = scaleLinear([0, values.length - 1], [pad, w - pad]);
    var sy = scaleLinear([min, max], [h - pad, pad]);
    var f = frame(null, { width: w, height: h, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    f.svg.setAttribute('class', 'aui-spark');
    var pts = values.map(function (v, i) { return { x: sx(i), y: sy(v) }; });
    line(f.svg, pts, { cls: o.cls || 'spark' });
    el('circle', { cls: 'aui-spark-end ' + (o.cls || ''), cx: pts[pts.length - 1].x, cy: pts[pts.length - 1].y, r: 2 }, f.svg);
    if (host) host.appendChild(f.svg);
    return f.svg;
  }

  function tooltip(host) {
    var tip = document.createElement('div');
    tip.className = 'aui-tooltip';
    tip.style.position = 'fixed';
    tip.style.display = 'none';
    tip.style.pointerEvents = 'none';
    tip.style.zIndex = '9999';
    document.body.appendChild(tip);
    function show(html, cx, cy) {
      tip.innerHTML = html;
      tip.style.display = 'block';
      var r = tip.getBoundingClientRect();
      var x = cx + 12, y = cy + 12;
      if (x + r.width > window.innerWidth) x = cx - r.width - 12;
      if (y + r.height > window.innerHeight) y = cy - r.height - 12;
      tip.style.left = Math.max(4, x) + 'px';
      tip.style.top = Math.max(4, y) + 'px';
    }
    function hide() { tip.style.display = 'none'; }
    function bind(el2, htmlFn) {
      el2.addEventListener('mousemove', function (ev) {
        var t = ev.target;
        var d = t && t.__data;
        if (d == null) { hide(); return; }
        show(htmlFn(d, t), ev.clientX, ev.clientY);
      });
      el2.addEventListener('mouseleave', hide);
    }
    return { show: show, hide: hide, bind: bind, node: tip };
  }

  window.AuiCharts = {
    el: el, frame: frame, scaleLinear: scaleLinear, scaleBand: scaleBand,
    niceTicks: niceTicks, axisBottom: axisBottom, axisLeft: axisLeft,
    line: line, area: area, stackBands: stackBands, bars: bars, dots: dots,
    hRule: hRule, sparkline: sparkline, tooltip: tooltip, path: path
  };
})();`;
