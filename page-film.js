/* The native scroll position is the playhead; wheel/swipe gestures play one
   chapter cut. Original content and anchors remain on the viewport stage. */
(() => {
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
  const mix = (a, b, t) => a + (b - a) * t;
  const colour = (a, b, t) => {
    const channels = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
    return `rgb(${channels(a).map((value, i) => Math.round(mix(value, channels(b)[i], t))).join(', ')})`;
  };

  window.ARSCFilm = {
    create({ sections, story, main, surfaces, beats, place, layoutY }) {
      const panels = sections.map(section => section.querySelector('.container'));
      const tabStops = panels.map(panel => panel.getAttribute?.('tabindex') ?? null);
      const screen = document.createElement('div');
      screen.className = 'film-screen';
      screen.setAttribute('aria-hidden', 'true');
      main.append(screen);
      const footer = main.querySelector?.('.site-footer');
      const tail = document.createElement('div');
      tail.className = 'film-tail';
      tail.setAttribute('aria-hidden', 'true');
      main.append(tail);
      let enabled = false, tracks = [], pendingFocus = null, stops = [];
      let playback = null, playbackFrame = null, lastGesture = -Infinity, gestureDirection = 0, touch = null;
      const now = () => performance.now();
      function cancelPlayback() {
        if (playbackFrame !== null) cancelAnimationFrame(playbackFrame);
        playback = null; playbackFrame = null;
      }
      const write = (node, key, value) => {
        if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
      };
      const number = (node, key, value, unit = '') => write(node, key, `${value.toFixed(4)}${unit}`);
      const restingX = [.84, .18, .5, .8, .2, .5, .78, .5, .84];

      function configure(on) {
        enabled = on;
        document.body.classList.toggle('film-enabled', on);
        document.documentElement.classList.toggle('film-mode', on);
        if (!on) {
          cancelPlayback();
          touch = null;
          lastGesture = -Infinity;
          pendingFocus = null;
          screen.style.visibility = 'hidden';
          sections.forEach((section, i) => {
            section.style.removeProperty('--film-span');
            panels[i].style.visibility = '';
            panels[i].style.pointerEvents = '';
            panels[i].inert = false;
            if (tabStops[i] === null) panels[i].removeAttribute?.('tabindex');
            else panels[i].setAttribute('tabindex', tabStops[i]);
          });
          story.style.removeProperty('--film-intro-exit');
          if (footer) { footer.style.visibility = ''; footer.style.pointerEvents = ''; footer.inert = false; }
        }
      }

      function measure(metrics) {
        if (!enabled) return;
        cancelPlayback();
        const { h, top, mobile } = metrics;
        const margin = mobile ? 24 : 36;
        const available = h - top - margin * 2 - 32;
        const transition = h * (mobile ? .48 : .52);
        const hold = h * .28;
        // Batch content-height reads before changing any chapter spacers.
        const heights = panels.map(panel => panel.offsetHeight);
        heights.forEach((height, i) => {
          const read = Math.max(0, height - available);
          number(sections[i], '--film-span', read + hold + transition, 'px');
        });
        let turn = 0;
        tracks = sections.map((section, i) => {
          const anchor = layoutY(section) - top;
          const read = Math.max(0, heights[i] - available);
          const centreY = read === 0 ? Math.max(0, (h - top - heights[i]) / 2 - margin) : 0;
          const track = { anchor, read, hold, transition, centreY,
            enter: i ? anchor - transition : metrics.end,
            readEnd: anchor + read + hold,
            end: anchor + read + hold + transition, turn };
          if (beats[i].spin && !mobile) turn += 360;
          track.turnEnd = turn;
          return track;
        });
        write(document.body, '--film-top', `${top + margin}px`);
        write(document.body, '--film-header', `${top}px`);
        // A gesture plays one cut. Tall scenes get reading stops instead of
        // skipping their lower content; the opening film gets its three beats.
        stops = [0, metrics.start, mix(metrics.start, metrics.end, .4), mix(metrics.start, metrics.end, .86)];
        tracks.forEach(track => {
          stops.push(track.anchor);
          const pages = Math.ceil(track.read / Math.max(1, available * .8));
          for (let page = 1; page <= pages; page++) {
            stops.push(track.anchor + track.hold * .25 + track.read * page / pages);
          }
        });
        stops.push(tracks[tracks.length - 1].end);
        stops = [...new Set(stops.filter(Number.isFinite).map(value => Math.max(0, value)))].sort((a, b) => a - b);
      }

      function playTo(target, direction) {
        cancelPlayback();
        pendingFocus = null;
        // Hash navigation can focus a reading panel. Release its static focus
        // shield before the camera moves, without stealing focus from controls.
        if (panels.some(panel => panel.contains?.(document.activeElement))) document.activeElement?.blur?.();
        const from = window.scrollY;
        const started = now();
        const duration = 1050;
        playback = { target, direction };
        const frame = timestamp => {
          if (!playback || !enabled) return;
          const progress = clamp((timestamp - started) / duration);
          window.scrollTo({ top: mix(from, target, ease(progress)), behavior: 'instant' });
          if (progress < 1) playbackFrame = requestAnimationFrame(frame);
          else { playback = null; playbackFrame = null; }
        };
        playbackFrame = requestAnimationFrame(frame);
      }

      function advance(direction) {
        const scroll = window.scrollY;
        const target = direction > 0 ? stops.find(stop => stop > scroll + 3)
          : [...stops].reverse().find(stop => stop < scroll - 3);
        if (target === undefined) return false;
        playTo(target, direction);
        return true;
      }

      function nativeInput(target, direction) {
        if (document.body.classList.contains('menu-open')) return true;
        if (target?.closest?.('input, textarea, select, [contenteditable="true"], .mobile-menu')) return true;
        // Let nested scroll areas (especially the mobile footer) consume their
        // own gesture until an edge is reached. No frame-time layout reads.
        for (let node = target; node && node !== document.body; node = node.parentElement) {
          if (node.scrollHeight > node.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
            if (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 2 : node.scrollTop > 2) return true;
          }
        }
        return false;
      }

      window.addEventListener?.('wheel', event => {
        if (!enabled || !stops.length || !event.cancelable || event.ctrlKey || event.metaKey ||
          !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        const direction = Math.sign(event.deltaY);
        if (nativeInput(event.target, direction)) return;
        const timestamp = now();
        const sameGesture = direction === gestureDirection && (playback || timestamp - lastGesture < 220);
        lastGesture = timestamp; gestureDirection = direction;
        if (sameGesture || advance(direction)) event.preventDefault();
      }, { passive: false });

      window.addEventListener?.('touchstart', event => {
        touch = enabled && event.touches.length === 1 ? {
          x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target, claimed: false
        } : null;
      }, { passive: true });
      window.addEventListener?.('touchmove', event => {
        if (!enabled || !touch || event.touches.length !== 1 || !event.cancelable) return;
        if (touch.claimed) { event.preventDefault(); return; }
        const dx = touch.x - event.touches[0].clientX, dy = touch.y - event.touches[0].clientY;
        if (Math.abs(dy) < 35 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
        if (nativeInput(touch.target, Math.sign(dy))) { touch = null; return; }
        const direction = Math.sign(dy);
        touch.claimed = (playback?.direction === direction) || advance(direction);
        if (touch.claimed) event.preventDefault();
      }, { passive: false });
      window.addEventListener?.('touchend', () => { touch = null; }, { passive: true });
      window.addEventListener?.('touchcancel', () => { touch = null; }, { passive: true });
      window.addEventListener?.('keydown', cancelPlayback);
      window.addEventListener?.('pointerdown', cancelPlayback, { passive: true });

      function alignHash() {
        if (!enabled || !tracks.length) return;
        cancelPlayback();
        const hash = window.location?.hash || '';
        if (hash.length < 2) return;
        let id;
        try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
        const index = sections.findIndex(section => section.id === id);
        if (index >= 0) {
          pendingFocus = index;
          window.scrollTo({ top: tracks[index].anchor, behavior: 'instant' });
        }
      }
      // Menu closure or late fonts can resize earlier chapter spacers. Align
      // the selected original anchor after those layout callbacks have run.
      window.addEventListener?.('hashchange', () => {
        requestAnimationFrame(() => requestAnimationFrame(alignHash));
      });

      function render(scroll, metrics) {
        if (!enabled || !tracks.length) return false;
        const { w, h, top, mobile } = metrics;
        const first = tracks[0], last = tracks[tracks.length - 1];
        if (footer) {
          const closing = ease((scroll - last.readEnd) / last.transition);
          footer.style.visibility = scroll >= last.readEnd ? 'visible' : 'hidden';
          footer.style.pointerEvents = closing > .98 ? 'auto' : 'none';
          footer.inert = closing < .98;
          number(document.body, '--film-footer-phase', closing);
        }
        const active = scroll >= first.enter && scroll <= last.end;
        screen.style.visibility = active ? 'visible' : 'hidden';
        const weights = [];
        tracks.forEach((track, i) => {
          const arrival = ease((scroll - track.enter) / Math.max(1, track.anchor - track.enter));
          const departure = ease((scroll - track.readEnd) / track.transition);
          const visible = active && scroll >= track.enter && scroll <= track.end;
          const panel = panels[i];
          panel.style.visibility = visible ? 'visible' : 'hidden';
          const reading = visible && arrival > .98 && departure < .02;
          panel.style.pointerEvents = reading ? 'auto' : 'none';
          panel.inert = !reading;
          const readY = -clamp((scroll - track.anchor - track.hold * .25) /
            Math.max(1, track.read)) * track.read;
          const scale = mobile ? 1 - (1 - arrival) * .08 - departure * .08
            : 1 - .36 * (Math.sin(Math.PI * arrival) + Math.sin(Math.PI * departure))
              - .18 * (1 - arrival + departure);
          const direction = [1, 1, -1, 1, -1, 1, -1, 1, -1][i];
          // Two complete content planes coexist during every handoff. The old
          // plane shows its tail while the incoming plane brings in its head.
          const x = mobile ? 0 : ((1 - arrival) ** 2 * direction - departure ** 2 *
            ([1, 1, -1, 1, -1, 1, -1, 1, -1][i + 1] || direction)) * w;
          const y = track.centreY + readY * scale + (mobile
            ? (1 - arrival) * (h - top) * .72 - departure * (h - top) * .48
            : (1 - arrival) * 48 - departure * 24);
          const alpha = visible ? Math.min(1, arrival * 5, (1 - departure) * 5) : 0;
          number(panel, '--film-x', x, 'px');
          number(panel, '--film-y', y, 'px');
          number(panel, '--film-read-y', track.centreY + readY, 'px');
          number(panel, '--film-scale', scale);
          number(panel, '--film-roll', mobile ? 0 : (1 - arrival) * direction * -4 + departure * direction * 3, 'deg');
          number(panel, '--film-alpha', alpha);
          number(sections[i], '--film-arrival', arrival);
          number(sections[i], '--film-departure', departure);
          weights.push({ arrival, departure });
        });
        if (pendingFocus !== null && !panels[pendingFocus].inert) {
          const panel = panels[pendingFocus];
          panel.setAttribute('tabindex', '-1');
          panel.focus?.({ preventScroll: true });
          pendingFocus = null;
        }
        number(story, '--film-intro-exit', weights[0].arrival);
        if (!active) {
          if (scroll > last.end) { place(w * .5, h * .8, mobile ? 170 : 330, last.turnEnd, 0); return true; }
          return false;
        }

        let current = tracks.findIndex(track => scroll < track.end);
        if (current < 0) current = tracks.length - 1;
        const track = tracks[current], next = tracks[current + 1];
        const entering = scroll < track.anchor;
        const leaving = scroll > track.readEnd;
        const target = entering ? current : Math.min(current + 1, tracks.length - 1);
        const t = entering ? weights[current].arrival : weights[current].departure;
        const transitioning = entering || leaving;
        const fromColour = entering ? (surfaces[current - 1] || '#0b0b0c') : surfaces[current];
        const toColour = entering ? surfaces[current] : (surfaces[current + 1] || '#0b0b0c');
        write(screen, '--film-colour', transitioning ? colour(fromColour, toColour, t) : surfaces[current]);
        screen.style.opacity = leaving && !next ? (1 - t).toFixed(4) : '1';
        const beat = beats[target];
        const wave = transitioning ? Math.sin(Math.PI * t) : 0;
        const startIndex = entering ? Math.max(0, current - 1) : current;
        const endIndex = transitioning ? target : current;
        const center = mix(restingX[startIndex], restingX[endIndex], t);
        const peakX = .5 + (beat.peak.x || 0) * .5;
        const size = mix(mobile ? 170 : 330, mobile ? Math.min(w * .72, 270) : Math.min(w * .46, 640), wave);
        const rotation = transitioning ? mix(track.turn, track.turnEnd, t) + (beat.peak.rotate || 0) * wave : track.turnEnd;
        place(w * mix(center, peakX, wave), top + (h - top) * (.58 + (beat.peak.y || 0) * wave), size,
          mobile ? rotation * .12 : rotation, .12 + wave * .7,
          (beat.peak.yaw || 0) * wave * (mobile ? .4 : 1), (beat.peak.pitch || 0) * wave);
        number(screen, '--film-glow-x', mix(22, 78, transitioning ? t : restingX[current]), '%');
        return true;
      }

      return { configure, measure, render, alignHash, get enabled() { return enabled; } };
    }
  };
})();
