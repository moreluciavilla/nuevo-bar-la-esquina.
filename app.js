/* ==========================================================
   Bar La Esquina - app.js
   ========================================================== */

/* REGISTRO DE IA
   Archivo generado con ayuda de IA (Claude).
   Completá acá los datos de registro que corresponda. */

/* ---------- 1. DATOS (arrays) ---------- */

const CLAVE_STORAGE = "bar-datos";

// { id, nombre, categoria, precio, disponible }
let productos = [];

// { id, numero, capacidad, estado }  estado: "libre" | "ocupada"
let mesas = [];

// { id, mesaId, items, estado, apertura, cierre, total, formaPago }
// items: [{ productoId, nombre, precio, cantidad }]
// estado: "abierto" | "cerrado"
let pedidos = [];

/* ---------- 2. DATOS DE EJEMPLO ---------- */

function crearDatosEjemplo() {
  productos = [
    { id: 1, nombre: "Cerveza artesanal", categoria: "Bebidas", precio: 3500, disponible: true },
    { id: 2, nombre: "Gaseosa", categoria: "Bebidas", precio: 2000, disponible: true },
    { id: 3, nombre: "Hamburguesa completa", categoria: "Comidas", precio: 7500, disponible: true },
    { id: 4, nombre: "Papas fritas", categoria: "Comidas", precio: 4000, disponible: true },
    { id: 5, nombre: "Café", categoria: "Cafetería", precio: 1800, disponible: true }
  ];

  mesas = [];
  for (let i = 1; i <= 8; i++) {
    mesas.push({
      id: i,
      numero: i,
      capacidad: i <= 4 ? 2 : 4,
      estado: "libre"
    });
  }

  pedidos = [];
}

/* ---------- 3. PERSISTENCIA (localStorage) ---------- */

function guardarDatos() {
  try {
    const datos = { productos, mesas, pedidos };
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(datos));
  } catch (error) {
    console.error("No se pudieron guardar los datos:", error);
  }
}

function cargarDatos() {
  try {
    const texto = localStorage.getItem(CLAVE_STORAGE);
    if (texto) {
      const datos = JSON.parse(texto);
      if (Array.isArray(datos.productos) && Array.isArray(datos.mesas) && Array.isArray(datos.pedidos)) {
        productos = datos.productos;
        mesas = datos.mesas;
        pedidos = datos.pedidos;
        return;
      }
    }
  } catch (error) {
    console.error("Datos guardados inválidos, se crean los de ejemplo:", error);
  }

  // No había datos guardados (o estaban dañados)
  crearDatosEjemplo();
  guardarDatos();
}

/* ---------- 4. MENÚ: UNA SECCIÓN A LA VEZ ---------- */

const IDS_SECCIONES = ["salon", "carta", "caja"];

function mostrarSeccion(id) {
  if (!IDS_SECCIONES.includes(id)) id = "salon";

  IDS_SECCIONES.forEach(function (seccionId) {
    const seccion = document.getElementById(seccionId);
    const enlace = document.querySelector('#menu-principal a[href="#' + seccionId + '"]');
    const activa = seccionId === id;

    if (seccion) seccion.hidden = !activa;
    if (enlace) {
      if (activa) enlace.setAttribute("aria-current", "page");
      else enlace.removeAttribute("aria-current");
    }
  });
}

function seccionDesdeHash() {
  return location.hash.replace("#", "") || "salon";
}

function iniciarMenu() {
  mostrarSeccion(seccionDesdeHash());
  window.addEventListener("hashchange", function () {
    mostrarSeccion(seccionDesdeHash());
  });
}

/* ---------- 5. CARTA: PRODUCTOS ---------- */

const formatoPesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// id del producto que se está editando (null = se está agregando uno nuevo)
let productoEditandoId = null;

function siguienteId(lista) {
  return lista.reduce(function (max, elemento) {
    return Math.max(max, elemento.id);
  }, 0) + 1;
}

// Devuelve un mensaje de error, o "" si todo está bien
function validarProducto(nombre, categoria, precio, idIgnorado) {
  if (!nombre) return "El nombre no puede estar vacío.";

  const repetido = productos.some(function (p) {
    return p.id !== idIgnorado && p.nombre.trim().toLowerCase() === nombre.toLowerCase();
  });
  if (repetido) return "Ya existe un producto con ese nombre.";

  if (!categoria) return "La categoría no puede estar vacía.";
  if (!Number.isFinite(precio) || precio <= 0) return "El precio debe ser mayor que cero.";

  return "";
}

function mostrarErrorProducto(mensaje) {
  const error = document.getElementById("error-producto");
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

function crearElemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearBoton(texto, clase, accion, id) {
  const boton = crearElemento("button", clase, texto);
  boton.type = "button";
  boton.dataset.accion = accion;
  boton.dataset.id = id;
  return boton;
}

function crearTarjetaProducto(producto) {
  const li = crearElemento("li", producto.disponible ? "" : "no-disponible");

  const info = crearElemento("div", "producto-info");
  info.appendChild(crearElemento("strong", "producto-nombre", producto.nombre));
  info.appendChild(crearElemento("span", "producto-precio", formatoPesos.format(producto.precio)));

  // Interruptor de disponible
  const interruptor = crearElemento("label", "interruptor");
  const casilla = document.createElement("input");
  casilla.type = "checkbox";
  casilla.checked = producto.disponible;
  casilla.dataset.accion = "disponible";
  casilla.dataset.id = producto.id;
  interruptor.appendChild(casilla);
  interruptor.appendChild(crearElemento("span", "interruptor-pista"));
  interruptor.appendChild(crearElemento("span", "interruptor-texto", producto.disponible ? "Disponible" : "No disponible"));

  const acciones = crearElemento("div", "producto-acciones");
  acciones.appendChild(interruptor);
  acciones.appendChild(crearBoton("✏️ Editar", "btn-secundario", "editar", producto.id));
  acciones.appendChild(crearBoton("🗑️ Borrar", "btn-peligro", "borrar", producto.id));

  li.appendChild(info);
  li.appendChild(acciones);
  return li;
}

function renderCarta() {
  renderSelectProductos();

  const contenedor = document.getElementById("lista-productos");
  const sugerencias = document.getElementById("categorias-existentes");
  contenedor.replaceChildren();
  sugerencias.replaceChildren();

  if (productos.length === 0) {
    contenedor.appendChild(crearElemento("p", "", "Todavía no hay productos en la carta."));
    return;
  }

  // Agrupar por categoría (sin distinguir mayúsculas)
  const grupos = new Map();
  productos.forEach(function (producto) {
    const clave = producto.categoria.trim().toLowerCase();
    if (!grupos.has(clave)) {
      grupos.set(clave, { nombre: producto.categoria.trim(), productos: [] });
    }
    grupos.get(clave).productos.push(producto);
  });

  const ordenados = Array.from(grupos.values()).sort(function (a, b) {
    return a.nombre.localeCompare(b.nombre, "es");
  });

  ordenados.forEach(function (grupo) {
    const opcion = document.createElement("option");
    opcion.value = grupo.nombre;
    sugerencias.appendChild(opcion);

    const seccion = crearElemento("section", "grupo-categoria");
    seccion.appendChild(crearElemento("h4", "", grupo.nombre));

    const ul = crearElemento("ul", "productos-grupo");
    grupo.productos
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); })
      .forEach(function (producto) {
        ul.appendChild(crearTarjetaProducto(producto));
      });

    seccion.appendChild(ul);
    contenedor.appendChild(seccion);
  });
}

function salirDeEdicion() {
  productoEditandoId = null;
  document.getElementById("form-producto").reset();
  document.getElementById("producto-disponible").checked = true;
  document.getElementById("btn-guardar-producto").textContent = "Guardar producto";
  document.getElementById("btn-cancelar-edicion").hidden = true;
  mostrarErrorProducto("");
}

function editarProducto(id) {
  const producto = productos.find(function (p) { return p.id === id; });
  if (!producto) return;

  productoEditandoId = id;
  document.getElementById("producto-nombre").value = producto.nombre;
  document.getElementById("producto-categoria").value = producto.categoria;
  document.getElementById("producto-precio").value = producto.precio;
  document.getElementById("producto-disponible").checked = producto.disponible;
  document.getElementById("btn-guardar-producto").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar-edicion").hidden = false;
  mostrarErrorProducto("");

  document.getElementById("producto-nombre").focus();
}

function borrarProducto(id) {
  const producto = productos.find(function (p) { return p.id === id; });
  if (!producto) return;

  if (!confirm('¿Borrar "' + producto.nombre + '" de la carta?')) return;

  productos = productos.filter(function (p) { return p.id !== id; });
  if (productoEditandoId === id) salirDeEdicion();
  guardarDatos();
  renderCarta();
}

function cambiarDisponibilidad(id, disponible) {
  const producto = productos.find(function (p) { return p.id === id; });
  if (!producto) return;

  producto.disponible = disponible;
  guardarDatos();
  renderCarta();
}

function enviarFormularioProducto(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("producto-nombre").value.trim();
  const categoria = document.getElementById("producto-categoria").value.trim();
  const precio = Number(document.getElementById("producto-precio").value);
  const disponible = document.getElementById("producto-disponible").checked;

  const error = validarProducto(nombre, categoria, precio, productoEditandoId);
  if (error) {
    mostrarErrorProducto(error);
    return;
  }

  if (productoEditandoId === null) {
    productos.push({
      id: siguienteId(productos),
      nombre: nombre,
      categoria: categoria,
      precio: precio,
      disponible: disponible
    });
  } else {
    const producto = productos.find(function (p) { return p.id === productoEditandoId; });
    producto.nombre = nombre;
    producto.categoria = categoria;
    producto.precio = precio;
    producto.disponible = disponible;
  }

  guardarDatos();
  renderCarta();
  salirDeEdicion();
}

function iniciarCarta() {
  document.getElementById("form-producto").addEventListener("submit", enviarFormularioProducto);
  document.getElementById("btn-cancelar-edicion").addEventListener("click", salirDeEdicion);

  const lista = document.getElementById("lista-productos");

  lista.addEventListener("click", function (evento) {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "editar") editarProducto(id);
    if (boton.dataset.accion === "borrar") borrarProducto(id);
  });

  lista.addEventListener("change", function (evento) {
    const casilla = evento.target;
    if (casilla.dataset.accion === "disponible") {
      cambiarDisponibilidad(Number(casilla.dataset.id), casilla.checked);
    }
  });

  renderCarta();
}

/* ---------- 6. SALÓN: MESAS Y PEDIDOS ---------- */

// id de la mesa que se está mirando en el panel lateral (null = ninguna)
let mesaSeleccionadaId = null;

function buscarPedidoAbierto(mesaId) {
  return pedidos.find(function (p) {
    return p.mesaId === mesaId && p.estado === "abierto";
  });
}

// Total parcial = suma de precio x cantidad de cada ítem
function totalPedido(pedido) {
  return pedido.items.reduce(function (suma, item) {
    return suma + item.precio * item.cantidad;
  }, 0);
}

function crearPedido(mesaId) {
  const pedido = {
    id: siguienteId(pedidos),
    mesaId: mesaId,
    items: [],
    estado: "abierto",
    apertura: new Date().toISOString(),
    cierre: null,
    total: 0,
    formaPago: null
  };
  pedidos.push(pedido);
  return pedido;
}

function formatearHora(iso) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function renderMesas() {
  const grilla = document.getElementById("grilla-mesas");
  grilla.replaceChildren();

  mesas.forEach(function (mesa) {
    const ocupada = mesa.estado === "ocupada";

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "mesa " + (ocupada ? "ocupada" : "libre");
    if (mesa.id === mesaSeleccionadaId) boton.classList.add("seleccionada");
    boton.dataset.id = mesa.id;
    boton.setAttribute("role", "listitem");
    boton.setAttribute("aria-pressed", mesa.id === mesaSeleccionadaId ? "true" : "false");

    boton.appendChild(crearElemento("span", "mesa-numero", "Mesa " + mesa.numero));
    boton.appendChild(crearElemento("span", "mesa-estado", ocupada ? "Ocupada" : "Libre"));

    if (ocupada) {
      const pedido = buscarPedidoAbierto(mesa.id);
      const total = pedido ? totalPedido(pedido) : 0;
      boton.appendChild(crearElemento("span", "mesa-total", formatoPesos.format(total)));
    }

    grilla.appendChild(boton);
  });
}

function renderPanelPedido() {
  const titulo = document.getElementById("mesa-seleccionada");
  const lista = document.getElementById("lista-pedido");
  const total = document.getElementById("valor-total-pedido");
  const formItem = document.getElementById("form-item");
  const cierre = document.getElementById("cierre-pedido");
  lista.replaceChildren();
  document.getElementById("error-cierre").hidden = true;

  const mesa = mesas.find(function (m) { return m.id === mesaSeleccionadaId; });
  const pedido = mesa ? buscarPedidoAbierto(mesa.id) : null;

  if (!mesa || !pedido) {
    titulo.textContent = "Ninguna mesa seleccionada";
    total.textContent = "";
    formItem.hidden = true;
    cierre.hidden = true;
    return;
  }

  formItem.hidden = false;
  cierre.hidden = false;
  titulo.textContent = "Mesa " + mesa.numero + " · Pedido #" + pedido.id +
    " · abierto a las " + formatearHora(pedido.apertura);

  if (pedido.items.length === 0) {
    lista.appendChild(crearElemento("li", "", "Todavía no hay productos en este pedido."));
  } else {
    pedido.items.forEach(function (item) {
      const li = document.createElement("li");

      const info = crearElemento("div", "item-info");
      info.appendChild(crearElemento("strong", "item-nombre", item.nombre));
      info.appendChild(crearElemento("small", "item-unitario", formatoPesos.format(item.precio) + " c/u"));

      const controles = crearElemento("div", "item-controles");
      controles.appendChild(crearBoton("−", "btn-cantidad", "menos", item.productoId));
      controles.appendChild(crearElemento("span", "item-cantidad", String(item.cantidad)));
      controles.appendChild(crearBoton("+", "btn-cantidad", "mas", item.productoId));
      controles.children[0].setAttribute("aria-label", "Quitar una unidad de " + item.nombre);
      controles.children[2].setAttribute("aria-label", "Sumar una unidad de " + item.nombre);

      li.appendChild(info);
      li.appendChild(controles);
      li.appendChild(crearElemento("strong", "item-subtotal", formatoPesos.format(item.precio * item.cantidad)));
      lista.appendChild(li);
    });
  }

  total.textContent = formatoPesos.format(totalPedido(pedido));
}

// Llena el select con los productos disponibles (conserva la selección)
function renderSelectProductos() {
  const select = document.getElementById("item-producto");
  const boton = document.getElementById("btn-agregar-item");
  const anterior = select.value;
  select.replaceChildren();

  const disponibles = productos
    .filter(function (p) { return p.disponible; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });

  if (disponibles.length === 0) {
    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "No hay productos disponibles";
    select.appendChild(vacio);
    select.disabled = true;
    boton.disabled = true;
    return;
  }

  disponibles.forEach(function (producto) {
    const opcion = document.createElement("option");
    opcion.value = producto.id;
    opcion.textContent = producto.nombre + " — " + formatoPesos.format(producto.precio);
    select.appendChild(opcion);
  });

  select.disabled = false;
  boton.disabled = false;
  if (anterior) select.value = anterior;
}

function mostrarErrorItem(mensaje) {
  const error = document.getElementById("error-item");
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

function pedidoDeMesaSeleccionada() {
  return mesaSeleccionadaId === null ? null : buscarPedidoAbierto(mesaSeleccionadaId);
}

function agregarItem(productoId, cantidad) {
  const pedido = pedidoDeMesaSeleccionada();
  const producto = productos.find(function (p) { return p.id === productoId && p.disponible; });
  if (!pedido || !producto) return false;

  const existente = pedido.items.find(function (i) { return i.productoId === productoId; });
  if (existente) {
    // Ya estaba en el pedido: se suma la cantidad (se mantiene su precio original)
    existente.cantidad += cantidad;
  } else {
    // Se guardan nombre y precio de este momento
    pedido.items.push({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: cantidad
    });
  }

  pedido.total = totalPedido(pedido);
  guardarDatos();
  return true;
}

function cambiarCantidadItem(productoId, cambio) {
  const pedido = pedidoDeMesaSeleccionada();
  if (!pedido) return;

  const item = pedido.items.find(function (i) { return i.productoId === productoId; });
  if (!item) return;

  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    // Al bajar de 1 el ítem sale del pedido
    pedido.items = pedido.items.filter(function (i) { return i.productoId !== productoId; });
  }

  pedido.total = totalPedido(pedido);
  guardarDatos();
  renderSalon();
}

function renderSalon() {
  renderMesas();
  renderPanelPedido();
}

function tocarMesa(id) {
  const mesa = mesas.find(function (m) { return m.id === id; });
  if (!mesa) return;

  if (mesa.estado === "libre") {
    // Mesa libre: se abre un pedido y la mesa pasa a ocupada
    mesa.estado = "ocupada";
    crearPedido(mesa.id);
    guardarDatos();
  } else if (!buscarPedidoAbierto(mesa.id)) {
    // Mesa ocupada sin pedido abierto (datos inconsistentes): se crea uno
    crearPedido(mesa.id);
    guardarDatos();
  }

  mesaSeleccionadaId = mesa.id;
  renderSalon();
}

function iniciarSalon() {
  document.getElementById("grilla-mesas").addEventListener("click", function (evento) {
    const boton = evento.target.closest(".mesa");
    if (boton) tocarMesa(Number(boton.dataset.id));
  });

  document.getElementById("form-item").addEventListener("submit", function (evento) {
    evento.preventDefault();

    const productoId = Number(document.getElementById("item-producto").value);
    const cantidad = Number(document.getElementById("item-cantidad").value);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      mostrarErrorItem("La cantidad debe ser un número entero mayor que cero.");
      return;
    }
    if (!agregarItem(productoId, cantidad)) {
      mostrarErrorItem("Elegí un producto disponible.");
      return;
    }

    mostrarErrorItem("");
    document.getElementById("item-cantidad").value = 1;
    renderSalon();
  });

  document.getElementById("lista-pedido").addEventListener("click", function (evento) {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;

    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "mas") cambiarCantidadItem(id, 1);
    if (boton.dataset.accion === "menos") cambiarCantidadItem(id, -1);
  });

  renderSalon();
}

/* ---------- 7. CIERRE DE CUENTA Y TICKET ---------- */

const FORMAS_PAGO = {
  efectivo: "💵 Efectivo",
  debito: "💳 Débito",
  transferencia: "🏦 Transferencia"
};

function formatearFechaHora(iso) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function numeroDeMesa(mesaId) {
  const mesa = mesas.find(function (m) { return m.id === mesaId; });
  return mesa ? mesa.numero : "?";
}

function mostrarErrorCierre(mensaje) {
  const error = document.getElementById("error-cierre");
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

function abrirDialogoCierre() {
  const pedido = pedidoDeMesaSeleccionada();
  if (!pedido) return;

  if (pedido.items.length === 0) {
    mostrarErrorCierre("No se puede cerrar un pedido vacío.");
    return;
  }

  mostrarErrorCierre("");
  document.getElementById("form-cierre").reset();
  document.getElementById("resumen-cierre").textContent =
    "Mesa " + numeroDeMesa(pedido.mesaId) + " · Total a cobrar: " + formatoPesos.format(totalPedido(pedido));
  document.getElementById("dialogo-cierre").showModal();
}

// Cierra el pedido, libera la mesa y devuelve true si se pudo
function cerrarCuenta(pedido, formaPago) {
  if (pedido.items.length === 0 || !FORMAS_PAGO[formaPago]) return false;

  pedido.estado = "cerrado";
  pedido.cierre = new Date().toISOString();
  pedido.total = totalPedido(pedido);
  pedido.formaPago = formaPago;

  const mesa = mesas.find(function (m) { return m.id === pedido.mesaId; });
  if (mesa) mesa.estado = "libre";

  guardarDatos();
  return true;
}

function mostrarTicket(pedido) {
  const contenido = document.getElementById("ticket-contenido");
  contenido.replaceChildren();

  contenido.appendChild(crearElemento("h3", "", "🍻 Bar La Esquina"));
  contenido.appendChild(crearElemento("p", "ticket-meta",
    "Mesa " + numeroDeMesa(pedido.mesaId) + " · Pedido #" + pedido.id));
  contenido.appendChild(crearElemento("p", "ticket-meta", "Apertura: " + formatearFechaHora(pedido.apertura)));
  contenido.appendChild(crearElemento("p", "ticket-meta", "Cierre: " + formatearFechaHora(pedido.cierre)));

  const ul = crearElemento("ul", "ticket-items");
  pedido.items.forEach(function (item) {
    const li = document.createElement("li");
    const detalle = crearElemento("span", "", item.cantidad + " × " + item.nombre +
      " (" + formatoPesos.format(item.precio) + " c/u)");
    li.appendChild(detalle);
    li.appendChild(crearElemento("strong", "", formatoPesos.format(item.precio * item.cantidad)));
    ul.appendChild(li);
  });
  contenido.appendChild(ul);

  const total = crearElemento("p", "ticket-total");
  total.appendChild(crearElemento("span", "", "TOTAL"));
  total.appendChild(crearElemento("strong", "", formatoPesos.format(pedido.total)));
  contenido.appendChild(total);

  contenido.appendChild(crearElemento("p", "ticket-meta", "Forma de pago: " + FORMAS_PAGO[pedido.formaPago]));
  contenido.appendChild(crearElemento("p", "ticket-gracias", "¡Gracias por su visita!"));

  document.getElementById("dialogo-ticket").showModal();
}

function iniciarCierre() {
  const dialogoCierre = document.getElementById("dialogo-cierre");

  document.getElementById("btn-cerrar-cuenta").addEventListener("click", abrirDialogoCierre);
  document.getElementById("btn-cancelar-cierre").addEventListener("click", function () {
    dialogoCierre.close();
  });

  document.getElementById("form-cierre").addEventListener("submit", function (evento) {
    evento.preventDefault();

    const pedido = pedidoDeMesaSeleccionada();
    const formaPago = evento.target.elements["forma-pago"].value;
    dialogoCierre.close();
    if (!pedido) return;

    if (cerrarCuenta(pedido, formaPago)) {
      mesaSeleccionadaId = null;
      renderSalon();
      renderCaja();
      mostrarTicket(pedido);
    }
  });

  document.getElementById("btn-cerrar-ticket").addEventListener("click", function () {
    document.getElementById("dialogo-ticket").close();
  });
}

/* ---------- 8. CAJA DEL DÍA ---------- */

function esDeHoy(iso) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function renderCaja() {
  const cuerpo = document.getElementById("cuerpo-caja");
  cuerpo.replaceChildren();

  const cerrados = pedidos
    .filter(function (p) { return p.estado === "cerrado" && p.cierre && esDeHoy(p.cierre); })
    .sort(function (a, b) { return new Date(a.cierre) - new Date(b.cierre); });

  const subtotales = { efectivo: 0, debito: 0, transferencia: 0 };
  let totalRecaudado = 0;

  if (cerrados.length === 0) {
    const fila = document.createElement("tr");
    const celda = crearElemento("td", "", "Todavía no hay cuentas cerradas hoy.");
    celda.colSpan = 4;
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
  }

  cerrados.forEach(function (pedido) {
    const fila = document.createElement("tr");
    fila.appendChild(crearElemento("td", "", formatearHora(pedido.cierre)));
    fila.appendChild(crearElemento("td", "", "Mesa " + numeroDeMesa(pedido.mesaId)));
    fila.appendChild(crearElemento("td", "", FORMAS_PAGO[pedido.formaPago] || "—"));
    fila.appendChild(crearElemento("td", "", formatoPesos.format(pedido.total)));
    cuerpo.appendChild(fila);

    if (pedido.formaPago in subtotales) subtotales[pedido.formaPago] += pedido.total;
    totalRecaudado += pedido.total;
  });

  Object.keys(subtotales).forEach(function (forma) {
    document.getElementById("subtotal-" + forma).textContent = formatoPesos.format(subtotales[forma]);
  });
  document.getElementById("total-caja").textContent = formatoPesos.format(totalRecaudado);
}

/* ---------- 9. EXPORTAR E IMPORTAR ---------- */

let temporizadorMensaje = null;

// tipo: "ok" o "error"
function mostrarMensajeDatos(texto, tipo) {
  const mensaje = document.getElementById("mensaje-datos");
  clearTimeout(temporizadorMensaje);

  mensaje.textContent = texto;
  mensaje.className = tipo;
  mensaje.hidden = false;

  if (tipo === "ok") {
    temporizadorMensaje = setTimeout(function () { mensaje.hidden = true; }, 5000);
  }
}

function exportarDatos() {
  const datos = { productos: productos, mesas: mesas, pedidos: pedidos };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "bar.json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  mostrarMensajeDatos("Datos exportados en bar.json.", "ok");
}

function esNumero(valor) {
  return typeof valor === "number" && Number.isFinite(valor);
}

// Devuelve un mensaje de error, o "" si los datos son válidos
function validarDatosImportados(datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    return "El archivo no tiene el formato esperado.";
  }

  const listas = ["productos", "mesas", "pedidos"];
  for (let i = 0; i < listas.length; i++) {
    if (!Array.isArray(datos[listas[i]])) {
      return 'Falta la lista "' + listas[i] + '" en el archivo.';
    }
  }

  const productosOk = datos.productos.every(function (p) {
    return p && esNumero(p.id) && typeof p.nombre === "string" && typeof p.categoria === "string" &&
      esNumero(p.precio) && typeof p.disponible === "boolean";
  });
  if (!productosOk) return 'Hay productos con datos incompletos o inválidos.';

  const mesasOk = datos.mesas.every(function (m) {
    return m && esNumero(m.id) && esNumero(m.numero) && esNumero(m.capacidad) &&
      (m.estado === "libre" || m.estado === "ocupada");
  });
  if (!mesasOk) return 'Hay mesas con datos incompletos o inválidos.';

  const pedidosOk = datos.pedidos.every(function (p) {
    return p && esNumero(p.id) && esNumero(p.mesaId) && Array.isArray(p.items) &&
      (p.estado === "abierto" || p.estado === "cerrado") &&
      p.items.every(function (i) {
        return i && esNumero(i.productoId) && typeof i.nombre === "string" &&
          esNumero(i.precio) && esNumero(i.cantidad);
      });
  });
  if (!pedidosOk) return 'Hay pedidos con datos incompletos o inválidos.';

  return "";
}

async function importarArchivo(archivo) {
  let datos;
  try {
    datos = JSON.parse(await archivo.text());
  } catch (error) {
    mostrarMensajeDatos("El archivo no es un JSON válido. No se modificó nada.", "error");
    return;
  }

  const problema = validarDatosImportados(datos);
  if (problema) {
    mostrarMensajeDatos(problema + " No se modificó nada.", "error");
    return;
  }

  const confirmado = confirm(
    "Se van a reemplazar todos los datos actuales por los del archivo (" +
    datos.productos.length + " productos, " + datos.mesas.length + " mesas, " +
    datos.pedidos.length + " pedidos). ¿Continuar?"
  );
  if (!confirmado) return;

  productos = datos.productos;
  mesas = datos.mesas;
  pedidos = datos.pedidos;
  guardarDatos();

  // Volver a dibujar todo
  mesaSeleccionadaId = null;
  salirDeEdicion();
  renderCarta();
  renderSalon();
  renderCaja();

  mostrarMensajeDatos("Datos importados correctamente.", "ok");
}

function iniciarExportarImportar() {
  const entrada = document.getElementById("input-importar");

  document.getElementById("btn-exportar").addEventListener("click", exportarDatos);
  document.getElementById("btn-importar").addEventListener("click", function () {
    entrada.click();
  });

  entrada.addEventListener("change", function () {
    const archivo = entrada.files[0];
    entrada.value = ""; // permite volver a elegir el mismo archivo
    if (archivo) importarArchivo(archivo);
  });
}

/* ---------- 10. INICIO ---------- */

cargarDatos();
iniciarMenu();
iniciarCarta();
iniciarSalon();
iniciarCierre();
iniciarExportarImportar();
renderCaja();
