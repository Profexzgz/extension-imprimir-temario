const EXTENSION_VERSION_DATA = {
  current: "2.6",
  history: [
    {
      version: "2.6",
      date: "26/11/2026",
      changes: [
        "Protección completa contra cortes en todos los bloques iDevice FPD (.iDevice_casopracticofpd, .iDevice_parasabermasfpd, .iDevice_debesconocerfpd, .iDevice_ejercicioresueltofpd, etc.) mediante selector comodín [class*='iDevice_'][class*='fpd'].",
        "Forzado de display: block en impresión para evitar que contenedores con overflow/flex ignoren break-inside: avoid.",
        "Eliminación de break-before: avoid en selectores adyacentes (+ *) para evitar que títulos empujen cuadros grandes a partirse entre dos páginas."
      ]
    },
    {
      version: "2.5",
      date: "26/11/2026",
      changes: [
        "Protección CSS (break-after: avoid) en #nodeDecoration, #nodeTitle y encabezados h1-h3 para evitar títulos huérfanos al final de hoja.",
        "Ajuste de break-inside: avoid únicamente a elementos atómicos (table, pre, figure, .iDevice_destacadofpd, .iDevice_header) para evitar espacios vacíos bajo los títulos.",
        "Indicador dinámico de versión en la cabecera del SidePanel leído desde versiones.js.",
        "Botones de exportación de logs de diagnóstico y empaquetado del código fuente completo."
      ]
    },
    {
      version: "2.4",
      date: "26/11/2026",
      changes: [
        "Unificación nativa clonando el HTML intacto de #siteNav e inyectando las hojas de estilo originales.",
        "Modos Continuo (Secuencial) y Salto de página por sección.",
        "Migración completa a Chrome SidePanel API."
      ]
    }
  ]
};