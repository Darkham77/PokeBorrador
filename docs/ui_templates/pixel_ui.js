document.addEventListener('DOMContentLoaded', () => {
      // Iniciar escala canónica de 3px para calcular todos los polígonos matemáticos
      updatePixelScale(3);

      // GSAP EN BOTONES
      document.querySelectorAll('.pv-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          if (btn.disabled) return;
          gsap.to(btn, { y: -2, duration: 0.12, ease: 'power2.out' });
        });
        btn.addEventListener('mouseleave', () => {
          if (btn.disabled) return;
          gsap.to(btn, { y: 0, duration: 0.12, ease: 'power2.out' });
        });
        btn.addEventListener('mousedown', () => {
          if (btn.disabled) return;
          gsap.to(btn, { y: 2, duration: 0.05, ease: 'power1.in' });
        });
        btn.addEventListener('mouseup', () => {
          if (btn.disabled) return;
          gsap.to(btn, { y: -2, duration: 0.1, ease: 'back.out(2)' });
        });
      });

      // GSAP EN PESTAÑAS Y SLOTS
      document.querySelectorAll('.pv-tab-btn, .pv-pill-tab, .pv-server-btn, .pv-slot-recessed, .pv-move-slot').forEach(el => {
        el.addEventListener('mouseenter', () => {
          gsap.to(el, { y: -2, duration: 0.12, ease: 'power2.out' });
        });
        el.addEventListener('mouseleave', () => {
          gsap.to(el, { y: 0, duration: 0.12, ease: 'power2.out' });
        });
      });
    });

    function selectTab(btn) {
      document.querySelectorAll('.pv-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    function selectPillTab(btn) {
      document.querySelectorAll('.pv-pill-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    function selectServer(btn) {
      document.querySelectorAll('.pv-server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    function selectSlot(el) {
      document.querySelectorAll('.pv-slot-recessed').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
    }

    function toggleCheckbox(input) {
      const mark = input.parentElement.querySelector('.pv-checkbox-mark');
      if (input.checked) {
        gsap.to(mark, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' });
      } else {
        gsap.to(mark, { scale: 0.5, opacity: 0, duration: 0.1 });
      }
    }

    function toggleSwitch(input) {
      const thumb = input.parentElement.querySelector('.pv-toggle-thumb');
      const label = input.parentElement.querySelector('span');
      if (input.checked) {
        gsap.to(thumb, { left: 29, duration: 0.18, ease: 'power2.out' });
        label.textContent = 'MÚSICA ACTIVADA';
        label.style.color = '#4ade80';
      } else {
        gsap.to(thumb, { left: 3, duration: 0.18, ease: 'power2.out' });
        label.textContent = 'MÚSICA DESACTIVADA';
        label.style.color = '#94a3b8';
      }
    }

    let count = 5;
    function stepVal(delta) {
      count = Math.max(1, Math.min(99, count + delta));
      document.getElementById('stepper-count').textContent = String(count).padStart(2, '0');
    }

    function setTheme(themeClass, btn) {
      document.body.classList.remove('theme-vicio-dark', 'theme-wingull-light', 'theme-cyber-neon');
      document.body.classList.add(themeClass);
      btn.parentElement.querySelectorAll('.lab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    
    
    /* ========================================================
       ALGORITMO MATEMÁTICO UNIVERSAL DE BORDES PIXELADOS (BRESENHAM)
       Sincroniza 4 niveles: Pills (R2), Tabs/Inputs (R2), Botones (R5), Paneles (R4)
       ======================================================== */
    function generatePoints(radius, pixelSize, offset = 0) {
      const coords = [];
      const lastCoords = { x: -1, y: -1 };
      for (let i = 270; i > 225; i--) {
        const x = parseInt(radius * Math.sin((2 * Math.PI * i) / 360) + radius + 0.5) * pixelSize;
        const y = parseInt(radius * Math.cos((2 * Math.PI * i) / 360) + radius + 0.5) * pixelSize;
        if (x !== lastCoords.x || y !== lastCoords.y) {
          lastCoords.x = x;
          lastCoords.y = y;
          coords.push({ x: x + offset * pixelSize, y: y + offset * pixelSize });
        }
      }
      return addCorners(mergeCoords(coords));
    }

    function flipCoords(coords) {
      return [...coords, ...coords.map(({ x, y }) => ({ x: y, y: x })).reverse()]
        .filter(({ x, y }, i, arr) => !i || arr[i - 1].x !== x || arr[i - 1].y !== y);
    }

    function insetCoords(coords, pixelSize, offset) {
      return coords.map(({ x, y }) => ({
        x: x + pixelSize * offset,
        y: y + pixelSize * Math.floor(offset / 2),
      })).reduce((ret, item) => {
        if (ret.length > 0 && ret[ret.length - 1].x === ret[ret.length - 1].y) return ret;
        ret.push(item);
        return ret;
      }, []);
    }

    function mergeCoords(coords) {
      return coords.reduce((result, point, index) => {
        if (index !== coords.length - 1 && point.x === 0 && coords[index + 1].x === 0) return result;
        if (index !== 0 && point.y === 0 && coords[index - 1].y === 0) return result;
        if (index !== 0 && index !== coords.length - 1 && point.x === coords[index - 1].x && point.x === coords[index + 1].x) return result;
        result.push(point);
        return result;
      }, []);
    }

    function addCorners(coords) {
      return coords.reduce((result, point, i) => {
        result.push(point);
        if (coords.length > 1 && i < coords.length - 1 && coords[i + 1].x !== point.x && coords[i + 1].y !== point.y) {
          result.push({ x: coords[i + 1].x, y: point.y });
        }
        return result;
      }, []);
    }

    function edgeCoord(n, offset) {
      if (offset) return n === 0 ? `calc(100% - ${offset}px)` : `calc(100% - ${offset + n}px)`;
      return n === 0 ? '100%' : `calc(100% - ${n}px)`;
    }

    function mirrorCoords(coords, offset = 0) {
      return [
        ...coords.map(({ x, y }) => ({
          x: offset ? `${x + offset}px` : `${x}px`,
          y: offset ? `${y + offset}px` : `${y}px`,
        })),
        ...coords.map(({ x, y }) => ({
          x: edgeCoord(y, offset),
          y: offset ? `${x + offset}px` : `${x}px`,
        })),
        ...coords.map(({ x, y }) => ({
          x: edgeCoord(x, offset),
          y: edgeCoord(y, offset),
        })),
        ...coords.map(({ x, y }) => ({
          x: offset ? `${y + offset}px` : `${y}px`,
          y: edgeCoord(x, offset),
        })),
      ];
    }

    function generatePath(coords, reverse = false) {
      const mirrored = mirrorCoords(coords);
      return (reverse ? mirrored : mirrored.reverse()).map(p => `${p.x} ${p.y}`).join(', ');
    }

    function getPixelFramePolygons(radius, pixelSize, borderWidth = 1) {
      const outerCoords = flipCoords(generatePoints(radius, pixelSize));
      const outerPath = generatePath(outerCoords);
      const innerCoords = addCorners(flipCoords(
        borderWidth < radius ? insetCoords(generatePoints(radius, pixelSize), pixelSize, borderWidth) : generatePoints(2, pixelSize, borderWidth)
      ));
      const innerPath = generatePath(innerCoords, true);
      const borderPath = `${outerPath}, 0px 50%, ${borderWidth * pixelSize}px 50%, ${innerPath}, ${borderWidth * pixelSize}px 50%, 0px 50%`;
      return { outerPath, innerPath, borderPath };
    }

    function updatePixelScale(pixelSize) {
      document.documentElement.style.setProperty('--s', pixelSize + 'px');

      const lPill = getPixelFramePolygons(2, pixelSize, 1);
      const lControl = getPixelFramePolygons(2, pixelSize, 1);
      const lBtn = getPixelFramePolygons(5, pixelSize, 1);
      const lPanel = getPixelFramePolygons(4, pixelSize, 1);

      // Level 1: Pills & Badges
      document.documentElement.style.setProperty('--clip-pill-outer', 'polygon(' + lPill.outerPath + ')');
      document.documentElement.style.setProperty('--clip-pill-border', 'polygon(' + lPill.borderPath + ')');
      document.documentElement.style.setProperty('--clip-pill-inner', 'polygon(' + lPill.innerPath + ')');
      document.documentElement.style.setProperty('--clip-pill', 'polygon(' + lPill.outerPath + ')');

      // Level 2: Tabs & Inputs (Rectangular structure)
      document.documentElement.style.setProperty('--clip-control-outer', 'polygon(' + lControl.outerPath + ')');
      document.documentElement.style.setProperty('--clip-control-border', 'polygon(' + lControl.borderPath + ')');
      document.documentElement.style.setProperty('--clip-control-inner', 'polygon(' + lControl.innerPath + ')');
      document.documentElement.style.setProperty('--clip-control', 'polygon(' + lControl.outerPath + ')');

      // Level 3: Buttons (Curved Pixel Contour)
      document.documentElement.style.setProperty('--clip-btn-outer', 'polygon(' + lBtn.outerPath + ')');
      document.documentElement.style.setProperty('--clip-btn-border', 'polygon(' + lBtn.borderPath + ')');
      document.documentElement.style.setProperty('--clip-btn-inner', 'polygon(' + lBtn.innerPath + ')');
      document.documentElement.style.setProperty('--clip-btn', 'polygon(' + lBtn.outerPath + ')');

      // Level 4: Panels & Cards
      document.documentElement.style.setProperty('--clip-panel-outer', 'polygon(' + lPanel.outerPath + ')');
      document.documentElement.style.setProperty('--clip-panel-border', 'polygon(' + lPanel.borderPath + ')');
      document.documentElement.style.setProperty('--clip-panel-inner', 'polygon(' + lPanel.innerPath + ')');
      document.documentElement.style.setProperty('--clip-panel', 'polygon(' + lPanel.outerPath + ')');
    }

    function setPixelScale(scale, btn) {
      const px = parseInt(scale, 10);
      updatePixelScale(px);
      btn.parentElement.querySelectorAll('.lab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

/* ========================================================
   CALLBACKS ESPECÍFICOS DEL LOGIN DEMO
   ======================================================== */
function setViewMode(mode, btn) {
  if (mode === 'modern') {
    document.body.classList.add('view-modern');
  } else {
    document.body.classList.remove('view-modern');
  }
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.lab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

function switchAuthTab(el, tab) {
  const row = el.closest('.pv-tab-row') || el.parentElement;
  row.querySelectorAll('.pv-tab-btn').forEach(w => w.classList.remove('active'));
  el.classList.add('active');
  const submitText = document.getElementById('submit-text');
  if (submitText) {
    if (tab === 'signup') {
      submitText.textContent = 'REGISTRARSE';
    } else {
      submitText.textContent = 'ENTRAR';
    }
  }
}

function switchServerMode(el) {
  const row = el.closest('.pv-server-row') || el.parentElement;
  row.querySelectorAll('.pv-server-btn').forEach(w => w.classList.remove('active'));
  el.classList.add('active');
}

function simulateLogin(_btn) {
  const text = document.getElementById('submit-text');
  if (!text) return;
  const original = text.textContent;
  text.textContent = 'CONECTANDO...';
  setTimeout(() => {
    text.textContent = original;
  }, 1000);
}

// Global exposure for HTML onclick / event handlers
window.selectTab = selectTab;
window.selectPillTab = selectPillTab;
window.selectServer = selectServer;
window.selectSlot = selectSlot;
window.toggleCheckbox = toggleCheckbox;
window.toggleSwitch = toggleSwitch;
window.stepVal = stepVal;
window.setTheme = setTheme;
window.setPixelScale = setPixelScale;
window.setViewMode = setViewMode;
window.switchAuthTab = switchAuthTab;
window.switchServerMode = switchServerMode;
window.simulateLogin = simulateLogin;
window.updatePixelScale = updatePixelScale;
window.getPixelFramePolygons = getPixelFramePolygons;
