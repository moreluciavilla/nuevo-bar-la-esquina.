/* ==========================================================
   Bar La Esquina - sw.js (service worker)
   Estrategia: "primero la caché".
   ========================================================== */

// Versión de la caché. Cada vez que cambies un archivo de la app,
// subí este número (v2, v3...) para que los celulares descarguen todo de nuevo.
const VERSION = "v1";

// Nombre de nuestra caché: un prefijo fijo + la versión (ej.: "bar-la-esquina-v1").
const PREFIJO = "bar-la-esquina-";
const NOMBRE_CACHE = PREFIJO + VERSION;

// Lista de archivos que se guardan para que la app funcione sin internet.
const ARCHIVOS = [
  "./",                 // la raíz de la carpeta (abre index.html)
  "./index.html",       // la página principal
  "./styles.css",       // los estilos
  "./app.js",           // la lógica de la app
  "./manifest.json",    // los datos de instalación
  "./icono-192.png",    // ícono chico
  "./icono-512.png"     // ícono grande
];

/* ---------- INSTALL ----------
   Ocurre una sola vez, cuando el navegador descubre este service worker
   (o una versión nueva de él). Sirve para preparar la caché. */
self.addEventListener("install", function (evento) {
  // waitUntil le pide al navegador que espere a que termine el trabajo
  // antes de dar la instalación por completa.
  evento.waitUntil(
    // Abre (o crea) la caché con el nombre de esta versión...
    caches.open(NOMBRE_CACHE).then(function (cache) {
      // ...y descarga y guarda todos los archivos de la lista.
      // Si uno solo falla (por ejemplo, falta un ícono), la instalación falla.
      return cache.addAll(ARCHIVOS);
    })
  );
});

/* ---------- ACTIVATE ----------
   Ocurre cuando esta versión toma el control de la app.
   Sirve para limpiar lo que dejaron las versiones anteriores. */
self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    // caches.keys() devuelve los nombres de todas las cachés guardadas.
    caches.keys().then(function (nombres) {
      // Promise.all espera a que terminen todos los borrados.
      return Promise.all(
        nombres
          // Nos quedamos solo con las cachés de esta app que NO son la actual.
          .filter(function (nombre) {
            return nombre.startsWith(PREFIJO) && nombre !== NOMBRE_CACHE;
          })
          // Y borramos cada una.
          .map(function (nombre) {
            return caches.delete(nombre);
          })
      );
    })
  );
});

/* ---------- FETCH ----------
   Ocurre cada vez que la página pide algo (un archivo, una imagen, una fuente).
   Acá decidimos de dónde sale la respuesta. */
self.addEventListener("fetch", function (evento) {
  // Solo manejamos pedidos de lectura (GET); el resto pasa sin tocar.
  if (evento.request.method !== "GET") return;

  // respondWith nos deja entregar nosotros la respuesta.
  evento.respondWith(
    // 1) Buscamos el pedido en la caché...
    caches.match(evento.request).then(function (copiaGuardada) {
      // 2) ...si está, la devolvemos al instante (funciona sin internet).
      if (copiaGuardada) return copiaGuardada;

      // 3) Si no está, la buscamos en internet.
      return fetch(evento.request);
    })
  );
});
