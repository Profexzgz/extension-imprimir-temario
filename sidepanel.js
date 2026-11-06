document.addEventListener('DOMContentLoaded', () => {
  const debugLog = document.getElementById('debugLog');

  function log(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type === 'err' ? 'log-err' : type === 'ok' ? 'log-ok' : ''}`;
    entry.innerText = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
  }

  log("SidePanel listo.", "ok");

  // Control de Pestañas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
      log(`Pestaña: ${tab.innerText}`);
    });
  });

  const runScript = (func, args = []) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        log("ERROR: Sin pestaña activa", "err");
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id, allFrames: true },
        func: func,
        args: args
      }).catch(err => log(`Error Scripting: ${err.message}`, "err"));
    });
  };

  // --- CONTROLES PÁGINA ACTUAL ---
  const applyMenuToggle = () => {
    const hide = document.getElementById('hideMenu').checked;
    log(`Ocultar Menú: ${hide}`);
    
    runScript((shouldHide) => {
      const navBtn = document.querySelector('a#siteNavToggle, button.nav-toggle, #main-wrapper header a, .exe-nav-toggle');
      const isMenuVisible = document.querySelector('#siteNav')?.offsetWidth > 0;

      if (navBtn && ((shouldHide && isMenuVisible) || (!shouldHide && !isMenuVisible))) {
        navBtn.click();
      }

      let style = document.getElementById('fp-hide-menu-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'fp-hide-menu-style';
        document.head.appendChild(style);
      }
      style.textContent = shouldHide ? `
        #siteNav { display: none !important; }
        #main-wrapper, #main, #content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; }
        @media print {
          #siteNav, .pagination, #topPagination, #bottomPagination, #skipNav, a#siteNavToggle, .exe-nav-toggle { display: none !important; }
          #main-wrapper, #main, #content { margin: 0 !important; width: 100% !important; }
        }
      ` : '';
    }, [hide]);
  };

  document.getElementById('hideMenu').addEventListener('change', applyMenuToggle);

  document.getElementById('hideFooter').addEventListener('change', (e) => {
    const hide = e.target.checked;
    runScript((h) => {
      let style = document.getElementById('fp-hide-footer-style');
      if (!style) { style = document.createElement('style'); style.id = 'fp-hide-footer-style'; document.head.appendChild(style); }
      style.textContent = h ? `.pagination, #topPagination, #bottomPagination { display: none !important; }` : '';
    }, [hide]);
  });

  document.getElementById('fontSize').addEventListener('input', (e) => {
    runScript((s) => { document.body.style.fontSize = s + 'px'; }, [e.target.value]);
  });

  document.getElementById('sepia').addEventListener('change', (e) => {
    runScript((en) => {
      document.body.style.backgroundColor = en ? '#fbf0d9' : '';
      document.body.style.color = en ? '#5f4b32' : '';
    }, [e.target.checked]);
  });

  document.getElementById('btnPrintCurrent').addEventListener('click', () => {
    log("Imprimiendo...", "ok");
    applyMenuToggle();
    setTimeout(() => { runScript(() => { window.print(); }); }, 200);
  });

  document.getElementById('unifyFontSize').addEventListener('input', (e) => {
    const size = e.target.value;
    runScript((s) => {
      const container = document.getElementById('unified-pdf-container');
      if (container) container.style.fontSize = s + 'px';
    }, [size]);
  });

  // --- UNIFICACIÓN FIEL AL HTML ORIGINAL ---
  document.getElementById('btnStartUnify').addEventListener('click', () => {
    const pageMode = document.getElementById('pageMode').value;
    const avoidBreak = document.getElementById('unifyAvoidBreak').checked;
    const hideFooter = document.getElementById('unifyHideFooter').checked;
    const fontSize = document.getElementById('unifyFontSize').value;

    log("Descargando contenido nativo...", "ok");
    document.getElementById('progressBox').style.display = 'block';
    document.getElementById('btnPrintUnified').style.display = 'none';

    runScript(async (mode, noBreak, noFooter, fSize) => {
      console.log("[FP Extension] Unificando HTML intacto...");

      // 1. Extraer URLs exactas del menú de navegación #siteNav
      const navLinks = Array.from(document.querySelectorAll('#siteNav a'))
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.endsWith('.html'));

      const uniqueUrls = [...new Set(navLinks.map(l => new URL(l, window.location.href).href))];

      if (uniqueUrls.length === 0) {
        alert("No se encontraron páginas en el menú #siteNav.");
        return;
      }

      // 2. Extraer hojas de estilo originales de la web viva
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l => `<link rel="stylesheet" type="text/css" href="${l.href}">`).join('\n');

      let container = document.getElementById('unified-pdf-container');
      if (container) container.remove();
      container = document.createElement('div');
      container.id = 'unified-pdf-container';
      container.style.fontSize = fSize + 'px';
      document.body.appendChild(container);

      // Inyectar CSS originales en la raíz del contenedor
      container.innerHTML = stylesheets;

      // 3. Recorrer y clonar exacto el contenido HTML de cada enlace
      for (let i = 0; i < uniqueUrls.length; i++) {
        try {
          const res = await fetch(uniqueUrls[i]);
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');

          // Tomar el bloque principal del tema (#main o #content)
          const mainContent = doc.querySelector('#main') || doc.querySelector('#content') || doc.body;

          if (noFooter) {
            doc.querySelectorAll('.pagination, #topPagination, #bottomPagination, #skipNav').forEach(el => el.remove());
          }

          const block = document.createElement('div');
          block.className = `pdf-page-block ${mode === 'page' && i > 0 ? 'fp-page-break' : ''}`;
          block.style.marginBottom = mode === 'continuous' ? '20px' : '0px';

          // Insertar únicamente el HTML original sin alterar nada de las cajas ni etiquetas
          block.innerHTML = mainContent.innerHTML;
          container.appendChild(block);
        } catch (e) {
          console.error(`Error fetch ${uniqueUrls[i]}`, e);
        }
      }

      // 4. Inyectar reglas CSS de impresión nativas
      let stylePrint = document.getElementById('fp-style-unified-print');
      if (!stylePrint) {
        stylePrint = document.createElement('style');
        stylePrint.id = 'fp-style-unified-print';
        document.head.appendChild(stylePrint);
      }

      const breakAvoidCSS = noBreak ? `
        .iDevice_wrapper, .iDevice_destacadofpd, .iDevice_content, 
        article, table, pre, .highlighted-code, figure, .exe-figure {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      ` : '';

      const modeCSS = mode === 'page' ? `
        .fp-page-break {
          break-before: page !important;
          page-break-before: always !important;
        }
      ` : `
        .fp-page-break {
          break-before: auto !important;
          page-break-before: auto !important;
        }
      `;

      stylePrint.textContent = `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body > *:not(#unified-pdf-container) { display: none !important; }
          #unified-pdf-container { display: block !important; width: 100% !important; margin: 0 !important; }
          #unified-pdf-container #siteNav, #unified-pdf-container .pagination { display: none !important; }
          ${modeCSS}
          ${breakAvoidCSS}
        }
      `;

      alert("¡Unificación completada! Haz clic en '2. Guardar Documento Unificado'.");
    }, [pageMode, avoidBreak, hideFooter, fontSize]);

    document.getElementById('pFill').style.width = '100%';
    document.getElementById('pPercent').innerText = '100%';
    document.getElementById('pStatus').innerText = '¡Completado!';
    document.getElementById('btnPrintUnified').style.display = 'block';
    log("Contenido intacto listo para guardar.", "ok");
  });

  document.getElementById('btnPrintUnified').addEventListener('click', () => {
    log("Abriendo impresión de Chrome...", "ok");
    runScript(() => { window.print(); });
  });
});