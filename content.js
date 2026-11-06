chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  sendResponse({ received: true });

  if (req.action === 'toggleMenu') toggleMenu(req.hide);
  if (req.action === 'toggleFooter') toggleFooter(req.hide);
  if (req.action === 'setFontSize') document.body.style.fontSize = `${req.size}px`;
  if (req.action === 'toggleSepia') {
    document.body.style.backgroundColor = req.enable ? '#fbf0d9' : '';
    document.body.style.color = req.enable ? '#5f4b32' : '';
  }
  if (req.action === 'printCurrent') window.print();
  if (req.action === 'startUnify') runUnification(req.pageMode, req.includeMenu);
});

// Oculta el menú lateral en pantalla y ajusta el texto al 100% de la ventana
function toggleMenu(hide) {
  // Buscar la columna o contenedor del menú lateral en la plantilla de FP
  const elements = document.querySelectorAll('#oculto, #menu, .menu, #sidebar, table tr > td:first-child');
  elements.forEach(el => {
    // Si contiene enlaces a páginas de la unidad, es la columna del menú
    if (el.querySelector('a[href*=".html"]') || el.id === 'oculto' || el.classList.contains('menu')) {
      el.style.display = hide ? 'none' : '';
    }
  });

  // Ajustar estilos CSS globales de impresión y pantalla
  let styleEl = document.getElementById('fp-hide-menu-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'fp-hide-menu-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = hide ? `
    @media print {
      #oculto, #menu, .menu, #sidebar, table tr > td:first-child { display: none !important; }
      body, table, td { width: 100% !important; margin: 0 !important; padding: 0 !important; }
    }
  ` : '';
}

function toggleFooter(hide) {
  const elements = document.querySelectorAll('footer, .footer, .avisolegal, img[src*="gobierno"], [class*="pie"]');
  elements.forEach(el => el.style.display = hide ? 'none' : '');
}

// Ocultar menús al cargar la página por defecto
toggleMenu(true);
toggleFooter(true);

// Algoritmo de unificación con detección exacta de URLs
async function runUnification(pageMode, includeMenu) {
  // Extraer todos los enlaces .html que pertenezcan a la navegación del tema
  const rawLinks = Array.from(document.querySelectorAll('a'))
    .map(a => a.getAttribute('href'))
    .filter(href => href && href.endsWith('.html'));

  // Convertir a URLs absolutas válidas
  const uniqueUrls = [...new Set(rawLinks.map(relUrl => new URL(relUrl, window.location.href).href))];

  if (uniqueUrls.length === 0) {
    alert("No se detectaron páginas para unificar en esta pantalla.");
    return;
  }

  let container = document.getElementById('unified-pdf-container');
  if (container) container.remove();
  container = document.createElement('div');
  container.id = 'unified-pdf-container';
  document.body.appendChild(container);

  const total = uniqueUrls.length;
  const startTime = Date.now();

  for (let i = 0; i < total; i++) {
    const elapsedSecs = (Date.now() - startTime) / 1000;
    const avgTime = i > 0 ? elapsedSecs / i : 0.4;
    const remainingSecs = Math.ceil((total - i) * avgTime);
    const percent = Math.round(((i + 1) / total) * 100);

    chrome.runtime.sendMessage({
      type: 'UNIFY_PROGRESS',
      percent,
      current: i + 1,
      total,
      remainingSecs,
      completed: false
    }).catch(() => {});

    try {
      const res = await fetch(uniqueUrls[i]);
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      
      // Capturar la columna de contenido (segundo <td>) o el body
      const mainContent = includeMenu 
        ? doc.body 
        : (doc.querySelector('table tr > td:nth-child(2)') || doc.querySelector('#content') || doc.querySelector('.content') || doc.body);

      const block = document.createElement('div');
      if (pageMode === 'page') block.style.pageBreakAfter = 'always';
      block.style.marginBottom = '30px';
      block.innerHTML = `
        <div style="border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 12px; font-family: sans-serif;">
          <small style="color:#64748b; font-weight:bold;">Sección ${i + 1} de ${total}</small>
        </div>
        ${mainContent.innerHTML}
      `;
      container.appendChild(block);
    } catch (e) {
      console.error(`Error procesando ${uniqueUrls[i]}`, e);
    }
  }

  // Finalización
  chrome.runtime.sendMessage({
    type: 'UNIFY_PROGRESS',
    percent: 100,
    current: total,
    total,
    remainingSecs: 0,
    completed: true
  }).catch(() => {});

  // Preparar estilo de impresión exclusivo para la unificación
  let stylePrint = document.getElementById('fp-style-unified-print');
  if (!stylePrint) {
    stylePrint = document.createElement('style');
    stylePrint.id = 'fp-style-unified-print';
    document.head.appendChild(stylePrint);
  }
  stylePrint.textContent = `
    @media print {
      body > *:not(#unified-pdf-container) { display: none !important; }
      #unified-pdf-container { display: block !important; width: 100% !important; margin: 0 !important; }
    }
  `;
}