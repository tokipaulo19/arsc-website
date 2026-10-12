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
    create({ sections, story, main, surfaces, beats, place, layoutY, onFrame }) {
      const panels = sections.map(section => section.querySelector('.container'));
      const dockIndex = document.querySelector?.('.scene-dock-index');
      const dockLabel = document.querySelector?.('.scene-dock-label');
      const tabStops = panels.map(panel => panel.getAttribute?.('tabindex') ?? null);
      const screen = document.createElement('div');
      screen.className = 'film-screen';
      screen.setAttribute('aria-hidden', 'true');
      const screenNext = document.createElement('div');
      screenNext.className = 'film-screen-next';
      screen.append(screenNext);
      main.append(screen);
      const footer = main.querySelector?.('.site-footer');
      const tail = document.createElement('div');
      tail.className = 'film-tail';
      tail.setAttribute('aria-hidden', 'true');
      main.append(tail);
      let enabled = false, tracks = [], pendingFocus = null, stops = [], destinations = new Map();
      let playbackDuration = 800;
      let galleryDuration = 220;
      let viewport = null, settledReading = null;
      let playback = null, playbackFrame = null, lastGesture = -Infinity, gestureDirection = 0, touch = null;
      const now = () => performance.now();
      const position = () => playback?.virtual ? playback.position : window.scrollY;
      function cancelPlayback(commit = true, keepPlaying = false) {
        if (playbackFrame !== null) cancelAnimationFrame(playbackFrame);
        if (commit && playback?.virtual) window.scrollTo({ top: playback.position, behavior: 'instant' });
        playback = null; playbackFrame = null;
        if (!keepPlaying) document.body.classList.toggle('film-playing', false);
      }
      const write = (node, key, value) => {
        if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
      };
      const number = (node, key, value, unit = '') => write(node, key, `${value.toFixed(4)}${unit}`);
      const restingX = sections.map((_, i) => [.84, .16, .86, .14, .82, .18, .88, .12, .8][i % 9]);
      const directions = sections.map((_, i) => [1, 1, -1, 1, -1, 1, -1, 1, -1][i % 9]);
      const galleries = panels.map(panel => panel.ARSCShowcase || null);
      const galleryIndex = (track, scroll) => Math.max(0, Math.min(track.count - 1,
        Math.round((scroll - track.galleryStart) / track.galleryStep)));

      function configure(on) {
        enabled = on;
        document.body.classList.toggle('film-enabled', on);
        document.documentElement.classList.toggle('film-mode', on);
        if (!on) {
          settledReading = null; viewport = null;
          cancelPlayback();
          touch = null;
          lastGesture = -Infinity;
          pendingFocus = null;
          screen.style.visibility = 'hidden';
          sections.forEach((section, i) => {
            galleries[i]?.release?.();
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
        const resume = playback;
        // A client selection or viewport change can resize a fixed panel.
        // Preserve its settled reading position when rebuilding the spacers.
        const settled = !resume && tracks.some(track => window.scrollY >= track.anchor && window.scrollY <= track.readEnd);
        const resized = viewport && (viewport.w !== metrics.w || viewport.h !== metrics.h);
        const reading = !resume && resized && settledReading ? settledReading : settled ? capturePosition() : null;
        viewport = { w: metrics.w, h: metrics.h };
        cancelPlayback();
        const { h, top, mobile } = metrics;
        playbackDuration = mobile ? 620 : 800;
        galleryDuration = mobile ? 180 : 220;
        const margin = mobile ? 24 : 36;
        const available = h - top - margin * 2 - 32;
        const transition = h * (mobile ? .48 : .52);
        const hold = h * .28;
        // Batch content-height reads before changing any chapter spacers.
        const heights = panels.map(panel => panel.offsetHeight);
        heights.forEach((height, i) => {
          const read = Math.max(0, height - available);
          const galleryTravel = Math.max(0, (galleries[i]?.count || 1) - 1) * h * .24;
          number(sections[i], '--film-span', read + hold + galleryTravel + transition, 'px');
        });
        let turn = 0;
        tracks = sections.map((section, i) => {
          const anchor = layoutY(section) - top;
          const read = Math.max(0, heights[i] - available);
          const count = galleries[i]?.count || 1, galleryStep = h * .24;
          const galleryStart = anchor + (read ? hold * .25 + read : 0);
          const centreY = read === 0 ? Math.max(0, (h - top - heights[i]) / 2 - margin) : 0;
          const track = { anchor, read, hold, transition, centreY, count, galleryStep, galleryStart,
            enter: i ? anchor - transition : metrics.end,
            readEnd: anchor + read + hold + (count - 1) * galleryStep,
            end: anchor + read + hold + (count - 1) * galleryStep + transition, turn };
          if (beats[i].spin && !mobile) turn += 360;
          track.turnEnd = turn;
          return track;
        });
        write(document.body, '--film-top', `${top + margin}px`);
        write(document.body, '--film-header', `${top}px`);
        // A gesture plays one cut. Tall scenes get reading stops instead of
        // skipping their lower content. The opening flows from its second beat
        // straight into Services instead of stopping with the logo centred.
        stops = []; destinations = new Map();
        const addStop = (value, destination) => {
          if (!Number.isFinite(value)) return;
          const stop = Math.max(0, value);
          stops.push(stop); destinations.set(stop, destination);
        };
        addStop(0, { home: true });
        (mobile ? [0, .4, .82] : [0, .4]).forEach(opening => addStop(mix(metrics.start, metrics.end, opening), { opening }));
        tracks.forEach((track, scene) => {
          addStop(track.anchor, { scene, fraction: 0 });
          const pages = Math.ceil(track.read / Math.max(1, available * .8));
          for (let page = 1; page <= pages; page++) {
            addStop(track.anchor + track.hold * .25 + track.read * page / pages, { scene, fraction: page / pages });
          }
          for (let project = 1; project < track.count; project++) {
            addStop(track.galleryStart + project * track.galleryStep, { scene, project });
          }
        });
        addStop(tracks[tracks.length - 1].end, { footer: true });
        stops = [...new Set(stops)].sort((a, b) => a - b);
        // Mobile browser chrome can resize the viewport during a swipe. Keep
        // playing toward the same scene/reading point, not an old pixel target.
        if (reading) restorePosition(reading);
        if (resume?.destination) {
          const destination = resume.destination;
          const track = tracks[destination.scene];
          const target = destination.home ? 0 : destination.footer ? tracks[tracks.length - 1].end
            : track ? destination.progress !== undefined ? track.galleryStart + destination.progress * track.galleryStep
              : destination.project ? track.galleryStart + destination.project * track.galleryStep
              : track.anchor + (destination.fraction ? track.hold * .25 + track.read * destination.fraction : 0)
              : mix(metrics.start, metrics.end, destination.opening);
          playTo(target, resume.direction, Math.max(180, resume.until - now()), destination);
        }
      }

      function selectProject(panel, project) {
        if (!enabled) return false;
        const scene = panels.indexOf(panel), track = tracks[scene];
        if (!track || project < 0 || project >= track.count) return false;
        const target = project ? track.galleryStart + project * track.galleryStep : track.anchor;
        if (Math.abs(target - position()) < 3) return true;
        playTo(target, Math.sign(target - position()), galleryDuration, { scene, project });
        return true;
      }

      function playTo(target, direction, duration, destination = destinations.get(target)) {
        const from = position();
        const gallery = tracks.some((track, i) => galleries[i] &&
          from >= track.anchor - 3 && from <= track.readEnd + 3 &&
          target >= track.anchor - 3 && target <= track.readEnd + 3);
        const openingHandoff = viewport.w <= 640 && from >= stops[1] &&
          from < tracks[0].anchor && target === tracks[0].anchor;
        duration ??= gallery ? galleryDuration : openingHandoff ? 960 : playbackDuration;
        cancelPlayback(false, true);
        pendingFocus = null;
        // Hash navigation can focus a reading panel. Release its static focus
        // shield before the camera moves, without stealing focus from controls.
        if (panels.some(panel => panel.contains?.(document.activeElement))) document.activeElement?.blur?.();
        const started = now();
        // Fixed phone scenes can play without scrolling the document each
        // frame. Keep the opening native because its hero is not viewport-fixed.
        const virtual = viewport.w <= 640 && typeof onFrame === 'function' &&
          from >= tracks[0].anchor && target >= tracks[0].anchor;
        playback = { target, direction, destination, until: started + duration, virtual, position: from };
        document.body.classList.toggle('film-playing', true);
        const frame = timestamp => {
          if (!playback || !enabled) return;
          const progress = clamp((timestamp - started) / duration);
          const phase = gallery ? 1 - (1 - progress) ** 3 : ease(progress);
          const nextPosition = mix(from, target, phase);
          if (playback.virtual) { playback.position = nextPosition; onFrame(); }
          else window.scrollTo({ top: nextPosition, behavior: 'instant' });
          if (progress < 1) playbackFrame = requestAnimationFrame(frame);
          else {
            if (playback.virtual) window.scrollTo({ top: target, behavior: 'instant' });
            playback = null; playbackFrame = null; document.body.classList.toggle('film-playing', false);
          }
        };
        playbackFrame = requestAnimationFrame(frame);
      }

      function advance(direction) {
        // A new forward gesture advances beyond the pending destination,
        // even while the camera is still approaching it. Reverse input uses
        // the current position so it can turn back without a visual jump.
        const origin = playback?.direction === direction ? playback.target : position();
        const target = direction > 0 ? stops.find(stop => stop > origin + 3)
          : [...stops].reverse().find(stop => stop < origin - 3);
        if (target === undefined) return false;
        playTo(target, direction);
        return true;
      }

      function scrubGallery(delta) {
        const scroll = position();
        const scene = tracks.findIndex((track, i) => galleries[i] && scroll >= track.anchor - 3 && scroll <= track.readEnd + 3);
        if (scene < 0 || (playback && playback.destination?.scene !== scene)) return false;
        const track = tracks[scene];
        const direction = Math.sign(delta);
        const origin = playback?.direction === direction ? playback.target : position();
        if (origin < track.galleryStart - 3) return false; // Keep tall-caption reading stops.
        const end = track.galleryStart + (track.count - 1) * track.galleryStep;
        if (!direction) return true;
        // At the last/first item, continued input can leave immediately; it
        // need not wait for either the picture or the current animation.
        if (direction > 0 ? origin >= end - 3 : origin <= track.galleryStart + 3) return advance(direction);
        const distance = Math.max(-track.galleryStep, Math.min(track.galleryStep, delta * track.galleryStep / 60));
        const target = Math.max(track.galleryStart, Math.min(end, origin + distance));
        playTo(target, direction, galleryDuration, { scene, progress: (target - track.galleryStart) / track.galleryStep });
        return true;
      }

      function nativeInput(target, direction) {
        if (document.body.classList.contains('menu-open')) return true;
        if (target?.closest?.('input, textarea, select, [contenteditable="true"], .mobile-menu, .chapter-menu')) return true;
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
        // Only group the closely spaced events of one wheel/trackpad burst.
        // Playback itself is no longer an input lock.
        const sameGesture = direction === gestureDirection && timestamp - lastGesture < 120;
        lastGesture = timestamp; gestureDirection = direction;
        // Galleries follow every wheel/trackpad update, not the one-cut gate.
        const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.h : 1);
        if (scrubGallery(delta)) { event.preventDefault(); return; }
        if (sameGesture || advance(direction) || playback) event.preventDefault();
      }, { passive: false });

      window.addEventListener?.('touchstart', event => {
        if (event.touches.length !== 1) cancelPlayback();
        touch = enabled && event.touches.length === 1 ? {
          x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target, claimed: false
        } : null;
      }, { passive: true });
      window.addEventListener?.('touchmove', event => {
        if (event.touches.length !== 1) { touch = null; cancelPlayback(); return; }
        if (!enabled || !touch || !event.cancelable) return;
        const dx = touch.x - event.touches[0].clientX, dy = touch.y - event.touches[0].clientY;
        if (touch.gallery || (!touch.claimed && Math.abs(dy) >= 12 && Math.abs(dy) > Math.abs(dx) * 1.2)) {
          if (!touch.claimed && nativeInput(touch.target, Math.sign(dy))) { touch = null; return; }
          const delta = (touch.lastY ?? touch.y) - event.touches[0].clientY;
          if (scrubGallery(delta)) {
            touch.gallery = true; touch.claimed = true; touch.lastY = event.touches[0].clientY;
            event.preventDefault(); return;
          }
        }
        if (touch.claimed) { event.preventDefault(); return; }
        if (Math.abs(dy) < 35 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
        if (nativeInput(touch.target, Math.sign(dy))) { touch = null; return; }
        const direction = Math.sign(dy);
        touch.claimed = advance(direction) || Boolean(playback);
        if (touch.claimed) event.preventDefault();
      }, { passive: false });
      window.addEventListener?.('touchend', () => {
        if (touch && !touch.claimed) cancelPlayback();
        touch = null;
      }, { passive: true });
      window.addEventListener?.('touchcancel', () => { touch = null; }, { passive: true });
      window.addEventListener?.('keydown', cancelPlayback);
      window.addEventListener?.('pointerdown', event => {
        // A fresh swipe needs the current destination to advance beyond it.
        // Mouse clicks still interrupt playback; touch taps cancel on release.
        if (event.pointerType !== 'touch') cancelPlayback();
      }, { passive: true });

      function alignHash() {
        if (!enabled || !tracks.length) return;
        cancelPlayback();
        const hash = window.location?.hash || '';
        if (hash.length < 2) return;
        let id;
        try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
        const target = document.getElementById?.(id);
        const parent = target?.closest?.('section');
        const index = sections.findIndex(section => section.id === id || section === parent);
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
        if (!playback && tracks.some(track => scroll >= track.anchor && scroll <= track.readEnd)) settledReading = capturePosition();
        const { w, h, top, mobile } = metrics;
        const first = tracks[0], last = tracks[tracks.length - 1];
        if (footer) {
          const closing = ease((scroll - last.readEnd) / last.transition);
          footer.style.visibility = scroll >= last.readEnd ? 'visible' : 'hidden';
          footer.style.pointerEvents = closing > .98 ? 'auto' : 'none';
          footer.inert = closing < .98;
          number(footer, '--film-footer-phase', closing);
        }
        const active = scroll >= first.enter && scroll <= last.end;
        screen.style.visibility = active ? 'visible' : 'hidden';
        const weights = [];
        tracks.forEach((track, i) => {
          const arrival = ease((scroll - track.enter) / Math.max(1, track.anchor - track.enter));
          const departure = ease((scroll - track.readEnd) / track.transition);
          const visible = active && scroll >= track.enter && scroll <= track.end;
          if (visible && galleries[i]) {
            const progress = Math.max(0, Math.min(track.count - 1, (scroll - track.galleryStart) / track.galleryStep));
            if (galleries[i].setProgress) galleries[i].setProgress(progress, mobile);
            else galleries[i].setIndex(galleryIndex(track, scroll));
          }
          if (!visible && mobile) galleries[i]?.suspend?.();
          const panel = panels[i];
          const visibility = visible ? 'visible' : 'hidden';
          if (panel.style.visibility !== visibility) panel.style.visibility = visibility;
          const reading = visible && arrival > .98 && departure < .02;
          const pointerEvents = reading ? 'auto' : 'none';
          if (panel.style.pointerEvents !== pointerEvents) panel.style.pointerEvents = pointerEvents;
          if (panel.inert !== !reading) panel.inert = !reading;
          weights.push({ arrival, departure });
          // Hidden scenes keep their last pose. Recompute it on re-entry in
          // either direction, rather than writing eight invisible planes.
          if (!visible) return;
          const readY = -clamp((scroll - track.anchor - track.hold * .25) /
            Math.max(1, track.read)) * track.read;
          const scale = mobile ? 1 - (1 - arrival) * .08 - departure * .08
            : 1 - .36 * (Math.sin(Math.PI * arrival) + Math.sin(Math.PI * departure))
              - .18 * (1 - arrival + departure);
          const direction = directions[i];
          // Two complete content planes coexist during every handoff. The old
          // plane shows its tail while the incoming plane brings in its head.
          const x = mobile ? 0 : ((1 - arrival) ** 2 * direction - departure ** 2 *
            (directions[i + 1] || direction)) * w;
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
        });
        if (pendingFocus !== null && !panels[pendingFocus].inert) {
          const panel = panels[pendingFocus];
          panel.setAttribute('tabindex', '-1');
          panel.focus?.({ preventScroll: true });
          pendingFocus = null;
        }
        number(story, '--film-intro-exit', weights[0].arrival);
        if (!active) {
          if (scroll > last.end) { window.ARSCExperience?.setChapter('contact'); place(w * .5, h * .8, mobile ? 170 : 330, last.turnEnd, 0); return true; }
          return false;
        }

        let current = tracks.findIndex(track => scroll < track.end);
        if (current < 0) current = tracks.length - 1;
        const track = tracks[current], next = tracks[current + 1];
        const entering = scroll < track.anchor;
        const leaving = scroll > track.readEnd;
        const target = entering ? current : Math.min(current + 1, tracks.length - 1);
        const t = entering ? weights[current].arrival : weights[current].departure;
        const chapterIndex = entering && t < .5 ? Math.max(0, current - 1)
          : !entering && t > .5 ? target : current;
        window.ARSCExperience?.setChapter(entering && current === 0 && t < .5 ? 'momentum' : sections[chapterIndex].dataset?.chapter || sections[chapterIndex].id);
        const chapter = sections[chapterIndex];
        if (dockIndex && chapter.dataset?.scene && dockIndex.textContent !== chapter.dataset.scene) dockIndex.textContent = chapter.dataset.scene;
        if (dockLabel && chapter.dataset?.sceneLabel && dockLabel.textContent !== chapter.dataset.sceneLabel) dockLabel.textContent = chapter.dataset.sceneLabel;
        const transitioning = entering || leaving;
        const fromColour = entering ? (surfaces[current - 1] || '#0b0b0c') : surfaces[current];
        const toColour = entering ? surfaces[current] : (surfaces[current + 1] || '#0b0b0c');
        if (mobile) {
          // Paint each colour only when the pair changes. Fade the prepared
          // incoming layer instead of repainting a viewport-sized gradient.
          write(screen, '--film-colour', fromColour);
          write(screenNext, '--film-colour', toColour);
          screenNext.style.opacity = transitioning && fromColour !== toColour ? t.toFixed(4) : '0';
        } else {
          write(screen, '--film-colour', transitioning ? colour(fromColour, toColour, t) : surfaces[current]);
        }
        screen.style.opacity = leaving && !next ? (1 - t).toFixed(4) : '1';
        const beat = beats[target];
        const wave = transitioning ? Math.sin(Math.PI * t) : 0;
        const startIndex = entering ? Math.max(0, current - 1) : current;
        const endIndex = transitioning ? target : current;
        const center = mix(restingX[startIndex], restingX[endIndex], t);
        const size = mix(mobile ? 170 : 330, mobile ? Math.min(w * .72, 270) : Math.min(w * .46, 640), wave);
        const rotation = transitioning ? mix(entering ? 0 : track.turnEnd,
          entering ? track.turnEnd : next?.turnEnd ?? track.turnEnd, t) + (beat.peak.rotate || 0) * wave : track.turnEnd;
        // Travel directly between side docks. The size/rotation accents remain,
        // but there is no centre magnet or centre reset at each scene cut.
        const pose = [w * center, top + (h - top) * (.58 + (beat.peak.y || 0) * wave), size,
          mobile ? rotation * .12 : rotation, (.12 + wave * .7) * (leaving && !next ? 1 - t : 1),
          (beat.peak.yaw || 0) * wave * (mobile ? .4 : 1), (beat.peak.pitch || 0) * wave];
        if (current === 0 && entering && metrics.introPose) {
          // Dock directly from the opening: no new central flyover on entry.
          const intro = metrics.introPose;
          const dock = [w * restingX[0], top + (h - top) * .58, mobile ? 170 : 330, 0, .12, 0, 0];
          [intro.x, intro.y, intro.size, 0, intro.opacity ?? 1, 0, 0].forEach((value, i) => { pose[i] = mix(value, dock[i], t); });
        }
        place(...pose);
        if (!mobile) number(screen, '--film-glow-x', mix(22, 78, transitioning ? t : restingX[current]), '%');
        return true;
      }

      function capturePosition() {
        if (!enabled || !tracks.length) return null;
        const scroll = position();
        if (scroll < tracks[0].enter) return null;
        let scene = tracks.findIndex(track => scroll <= track.end);
        if (scene < 0) return { footer: true };
        const track = tracks[scene];
        if (scroll > track.readEnd && scene < tracks.length - 1 && scroll - track.readEnd > track.transition * .5) scene++;
        const selected = tracks[scene];
        return { section: sections[scene], project: galleryIndex(selected, scroll),
          progress: galleries[scene] && scroll >= selected.galleryStart ? Math.max(0, Math.min(selected.count - 1, (scroll - selected.galleryStart) / selected.galleryStep)) : undefined,
          fraction: clamp((scroll - tracks[scene].anchor - tracks[scene].hold * .25) / Math.max(1, tracks[scene].read)) };
      }
      function restorePosition(position) {
        if (!enabled || !tracks.length || !position) return false;
        if (position.footer) { window.scrollTo({ top: tracks[tracks.length - 1].end, behavior: 'instant' }); return true; }
        const scene = sections.indexOf(position.section);
        if (scene < 0) return false;
        const track = tracks[scene];
        const top = position.progress !== undefined ? track.galleryStart + Math.max(0, Math.min(track.count - 1, position.progress)) * track.galleryStep
          : position.project ? track.galleryStart + Math.min(track.count - 1, position.project) * track.galleryStep
          : track.anchor + (position.fraction ? track.hold * .25 + clamp(position.fraction) * track.read : 0);
        window.scrollTo({ top, behavior: 'instant' });
        return true;
      }
      return { configure, measure, render, alignHash, capturePosition, restorePosition, selectProject,
        get position() { return position(); }, get enabled() { return enabled; } };
    }
  };
})();
