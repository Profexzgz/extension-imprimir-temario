document.addEventListener('DOMContentLoaded', () => {
  const APP_VERSION = (typeof EXTENSION_VERSION_DATA !== 'undefined') ? EXTENSION_VERSION_DATA.current : '2.5';
  const versionBadge = document.getElementById('appVersion');
  if (versionBadge) versionBadge.innerText = `v${APP_VERSION}`;

  const debugLog = document.getElementById('debugLog');
  const logHistory = [];

  function log(msg, type = 'info') {
    const timestamp = new Date().toISOString();
    const shortTime = new Date().toLocaleTimeString().split(' ')[0];
    const formatted = `[${timestamp}] [${type.toUpperCase()}] ${msg}`;
    logHistory.push(formatted);

    const entry = document.createElement('div');
    entry.className = `log-entry ${type === 'err' ? 'log-err' : type === 'ok' ? 'log-ok' : ''}`;
    entry.innerText = `[${shortTime}] ${msg}`;
    debugLog.appendChild(entry);
    debugLog.scrollTop = debugLog.scrollHeight;
  }

  log(`SidePanel inicializado (Versión ${APP_VERSION} | UA: ${navigator.userAgent})`, "ok");

  // Control de Pestañas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
      log(`Cambio de pestaña: ${tab.innerText.trim()}`);
    });
  });

  const runScript = (func, args = []) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        log("ERROR: No se encontró pestaña activa.", "err");
        return;
      }
      log(`Ejecutando script en tabId=${tabs[0].id} (${tabs[0].url})`);
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
    log(`Ocultar Pie Página Actual: ${hide}`);
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
    log("Imprimiendo página actual...", "ok");
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

    log(`Iniciando unificación | Modo=${pageMode} | AvoidBreak=${avoidBreak} | HideFooter=${hideFooter} | FontSize=${fontSize}px`, "ok");
    document.getElementById('progressBox').style.display = 'block';
    document.getElementById('btnPrintUnified').style.display = 'none';

    runScript(async (mode, noBreak, noFooter, fSize) => {
      console.log("[eXeLearning PDF Printer] Unificando HTML intacto...");

      const navLinks = Array.from(document.querySelectorAll('#siteNav a'))
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.endsWith('.html'));

      const uniqueUrls = [...new Set(navLinks.map(l => new URL(l, window.location.href).href))];

      if (uniqueUrls.length === 0) {
        alert("No se encontraron páginas en el menú #siteNav.");
        return;
      }

      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l => `<link rel="stylesheet" type="text/css" href="${l.href}">`).join('\n');

      let container = document.getElementById('unified-pdf-container');
      if (container) container.remove();
      container = document.createElement('div');
      container.id = 'unified-pdf-container';
      container.style.fontSize = fSize + 'px';
      document.body.appendChild(container);

      container.innerHTML = stylesheets;

      for (let i = 0; i < uniqueUrls.length; i++) {
        try {
          const res = await fetch(uniqueUrls[i]);
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');

          const mainContent = doc.querySelector('#main') || doc.querySelector('#content') || doc.body;

          if (noFooter) {
            doc.querySelectorAll('.pagination, #topPagination, #bottomPagination, #skipNav').forEach(el => el.remove());
          }

          const block = document.createElement('div');
          block.className = `pdf-page-block ${mode === 'page' && i > 0 ? 'fp-page-break' : ''}`;
          block.style.marginBottom = mode === 'continuous' ? '22px' : '0px';

          block.innerHTML = mainContent.innerHTML;
          container.appendChild(block);
        } catch (e) {
          console.error(`Error fetch ${uniqueUrls[i]}`, e);
        }
      }

      // Reglas CSS de impresión nativas + Protección completa de cuadros y títulos
      let stylePrint = document.getElementById('fp-style-unified-print');
      if (!stylePrint) {
        stylePrint = document.createElement('style');
        stylePrint.id = 'fp-style-unified-print';
        document.head.appendChild(stylePrint);
      }

      const breakAvoidCSS = noBreak ? `
        [class*="iDevice_"][class*="fpd"],
        .iDevice_destacadofpd,
        .iDevice_casopracticofpd,
        .iDevice_parasabermasfpd,
        .iDevice_debesconocerfpd,
        .iDevice_ejercicioresueltofpd,
        .iDevice_reflexionfpd,
        .iDevice_orientacionesfpd,
        .iDevice_curiosidadfpd,
        .iDevice_citasfpd,
        .iDevice_contenido,
        table, pre, .highlighted-code, figure, .exe-figure, .iDevice_header {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          display: block !important;
        }
      ` : '';

      const headingProtectionCSS = `
        #nodeDecoration, #nodeTitle, header#nodeDecoration,
        #unified-pdf-container h1, #unified-pdf-container h2, #unified-pdf-container h3,
        .iDevice_header, .iDeviceTitle {
          break-after: avoid !important;
          page-break-after: avoid !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      `;

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
          ${headingProtectionCSS}
          ${modeCSS}
          ${breakAvoidCSS}
        }
      `;

      alert("¡Unificación completada! Haz clic en '2. Guardar Documento Unificado (PDF)'.");
    }, [pageMode, avoidBreak, hideFooter, fontSize]);

    document.getElementById('pFill').style.width = '100%';
    document.getElementById('pPercent').innerText = '100%';
    document.getElementById('pStatus').innerText = '¡Completado!';
    document.getElementById('btnPrintUnified').style.display = 'block';
    log("Unificación finalizada y estilos de protección aplicados.", "ok");
  });

  document.getElementById('btnPrintUnified').addEventListener('click', () => {
    log("Abriendo diálogo de impresión de Chrome...", "ok");
    runScript(() => { window.print(); });
  });

  // --- BOTÓN 3: DESCARGAR LOGS DE DIAGNÓSTICO ---
  document.getElementById('btnDownloadLogs').addEventListener('click', () => {
    log("Exportando archivo de logs...", "ok");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeUrl = tabs[0] ? tabs[0].url : 'Desconocida';
      const configSnapshot = {
        version: APP_VERSION,
        url: activeUrl,
        pageMode: document.getElementById('pageMode').value,
        avoidBreak: document.getElementById('unifyAvoidBreak').checked,
        hideFooter: document.getElementById('unifyHideFooter').checked,
        fontSize: document.getElementById('unifyFontSize').value
      };

      const report = [
        `=== REPORTE DE DIAGNÓSTICO - eXeLearning PDF Printer v${APP_VERSION} ===`,
        `Fecha: ${new Date().toLocaleString()}`,
        `Configuración activa: ${JSON.stringify(configSnapshot, null, 2)}`,
        `\n=== HISTORIAL DE LOGS ===`,
        ...logHistory
      ].join('\n');

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-exelearning-pdf-v${APP_VERSION}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  // --- BOTÓN 4: DESCARGAR CÓDIGO FUENTE COMPLETO ---
  document.getElementById('btnDownloadCode').addEventListener('click', async () => {
    log("Empaquetando código fuente de la extensión...", "ok");
    const filesToExport = ['manifest.json', 'background.js', 'sidepanel.html', 'sidepanel.js', 'versiones.js'];
    let bundle = `=== CÓDIGO FUENTE COMPLETO - eXeLearning PDF Printer v${APP_VERSION} ===\nFecha de exportación: ${new Date().toLocaleString()}\n\n`;

    for (const file of filesToExport) {
      try {
        const res = await fetch(chrome.runtime.getURL(file));
        if (res.ok) {
          const content = await res.text();
          bundle += `====================================================================\n`;
          bundle += `ARCHIVO: ${file}\n`;
          bundle += `====================================================================\n`;
          bundle += `${content}\n\n`;
        }
      } catch (e) {
        bundle += `--- No se pudo leer ${file}: ${e.message} ---\n\n`;
      }
    }

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigo-fuente-exelearning-pdf-v${APP_VERSION}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    log("Código fuente descargado correctamente.", "ok");
  });
});