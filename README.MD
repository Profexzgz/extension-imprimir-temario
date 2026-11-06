# eXeLearning PDF Exporter & Imprinter 📄✨

Una extensión profesional para navegadores Chromium (Chrome, Edge, Brave) diseñada para **unificar, maquetar y exportar temarios completos generados con eXeLearning** a formato PDF continuo sin fallos de diseño ni cortes publicitarios.

Diseñada especialmente para estudiantes de **FP a Distancia (Moodle/eXeLearning)** y plataformas educativas del Ministerio de Educación y Comunidades Autónomas.

---

## 🛠️ Características Principales

- **📦 Unificación Nativa de Temarios:** Recorre automáticamente la estructura de navegación de eXeLearning (`#siteNav`) y une todos los módulos en un único documento legible.
- **🎨 Respeto Absoluto del Diseño Original:** Copia e inyecta dinámicamente los estilos CSS nativos (`base.css`, `content.css`, `exe_highlighter.css`), manteniendo los colores de fondo, cajas decorativas (*Caso práctico*, *Recomendación*, *Atención*) e imágenes originales.
- **🛡️ Anti-corte de Bloques:** Aplica reglas avanzadas de impresión CSS (`break-inside: avoid`) para garantizar que los fragmentos de código fuente (PHP, HTML, Java, CSS), tablas y diagramas nunca se corten por la mitad al cambiar de página.
- **📑 Modo Secuencial / Continuo:** Elimina saltos de página artificiales e innecesarios, logrando un ahorro sustancial de folios (más del 20% de páginas) al imprimir o guardar en PDF.
- **📌 Panel Lateral Nativo (SidePanel API):** Panel de control persistente en el lateral del navegador que no se cierra accidentalmente al interaccionar con el temario.
- **🔍 Monitor de Depuración (Logs LogBox):** Consola visual integrada en la extensión para monitorizar en tiempo real las descargas, inyecciones de CSS y permisos del navegador.

---

## 📂 Estructura del Proyecto

```text
eXeLearning-PDF-printer/
├── manifest.json       # Manifest V3 con SidePanel y Scripting API
├── background.js       # Listener para la apertura nativa del Side Panel
├── sidepanel.html      # Interfaz visual del panel lateral
├── sidepanel.js        # Motor principal de clonado HTML y renderizado PDF
├── styles.css          # Estilos visuales del Side Panel
└── README.md