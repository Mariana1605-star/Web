'use strict';

/* ============================================================
   UTILIDADES GENERALES
   ============================================================ */
function mostrarError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent   = msg;
    el.style.display = 'block';
}

function ocultarError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function adminNotif(msg, tipo = 'success') {
    const el = document.getElementById('adminNotif');
    if (!el) return;
    el.textContent   = msg;
    el.className     = `admin-notif admin-notif--${tipo}`;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

/* ============================================================
   SIDEBAR  (toggle movil / escritorio)
   ============================================================ */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active');
    } else {
        sidebar.classList.toggle('hidden');
    }
}

/* ============================================================
   SLIDER SIMPLE  (slider.php / visor.php)
   ============================================================ */
let listaIds     = [];
let currentIndex = 0;

// Carga la lista de IDs desde slider.php y monta el contenedor
async function cargarSlider() {
    try {
        const res = await fetch('slider.php');
        listaIds  = await res.json();

        if (!listaIds || listaIds.length === 0) {
            document.getElementById('slider').innerHTML = '<p>No hay imagenes</p>';
            return;
        }

        const contenedor = document.getElementById('slider');
        contenedor.innerHTML = `
            <div id="slide-container" style="width:100%; height:100%;"></div>
            <div class="slider-controls">
                <button class="arrow" onclick="prevSlide()">&#10094;</button>
                <button class="arrow" onclick="nextSlide()">&#10095;</button>
            </div>
        `;

        mostrarImagen(listaIds[currentIndex].id);

    } catch (error) {
        console.error('Error al cargar IDs:', error);
    }
}

// AJAX a datos.php?id=X
// Al inspeccionar el DOM veras: <img src="img/imagen1.jpg" ...>
// El enlace <a href="visor.php?id=X"> permite abrirla en pagina aparte
function mostrarImagen(id) {
    console.log('Cambiando imagen al ID: ' + id);

    $.ajax({
        url:      'datos.php',
        type:     'GET',
        data:     { id: id },
        dataType: 'json',
        cache:    false,
        success: function (img) {
            if (!img || !img.url_imagen) {
                $('#slide-container').html('<p>Imagen no encontrada</p>');
                return;
            }

            var urlImagen = img.url_imagen; // ej: img/imagen1.jpg

            $('#slide-container').html(
                '<a href="visor.php?id=' + img.id + '" target="_blank" title="Ver en pagina aparte">' +
                    '<img src="' + urlImagen + '"' +
                         ' alt="' + escHtml(img.titulo) + '"' +
                         ' style="width:100%; height:380px; object-fit:cover; display:block;">' +
                '</a>'
            );

            // Panel de info debajo del slider
            $('#imgTitulo').text(img.titulo);
            $('#imgDescripcion').text(img.descripcion || '');
            $('#infoImagen').show();

            console.log('URL cargada: ' + urlImagen);
        },
        error: function () {
            console.warn('AJAX error al cargar ID: ' + id);
            $('#slide-container').html('<p>Error al cargar la imagen</p>');
        }
    });
}

// Flecha siguiente
function nextSlide() {
    if (listaIds.length === 0) return;
    currentIndex = (currentIndex + 1) % listaIds.length;
    mostrarImagen(listaIds[currentIndex].id);
}

// Flecha anterior
function prevSlide() {
    if (listaIds.length === 0) return;
    currentIndex = (currentIndex - 1 + listaIds.length) % listaIds.length;
    mostrarImagen(listaIds[currentIndex].id);
}

// Subir imagen via upload.php
function subirImagen() {
    const fileInput = document.getElementById('file');
    const file      = fileInput ? fileInput.files[0] : null;

    if (!file) {
        alert('Por favor, selecciona una imagen primero.');
        return;
    }

    const formData = new FormData();
    formData.append('imagen', file); // coincide con $_FILES['imagen'] en PHP

    fetch('upload.php', { method: 'POST', body: formData })
        .then(response => {
            if (!response.ok) throw new Error('Error en el servidor');
            return response.text();
        })
        .then(data => {
            console.log('Respuesta servidor:', data);
            if (data.trim() === 'OK') {
                alert('Imagen subida correctamente!');
                cargarSlider();
            } else {
                alert('El servidor dice: ' + data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al conectar: ' + error.message);
        });
}

/* ============================================================
   CARRUSEL BOOTSTRAP  (dashboard.html)
   ============================================================ */
let imagenesCache = [];

async function cargarCarrusel() {
    const container = document.getElementById('carouselItems');
    if (!container) return;
    try {
        const res      = await fetch('datos.php');
        if (!res.ok)   throw new Error();
        const imagenes = await res.json();
        imagenesCache  = imagenes;
        if (!imagenes.length) {
            container.innerHTML = '<div class="carousel-item active"><div class="p-5 text-center text-white">No hay imagenes disponibles.</div></div>';
            return;
        }
        renderCarrusel(imagenes);
    } catch {
        container.innerHTML = '<div class="carousel-item active"><div class="p-4 text-center text-danger">Error al cargar las imagenes.</div></div>';
    }
}

function renderCarrusel(imagenes) {
    const container = document.getElementById('carouselItems');
    if (!container) return;

    // data-id en cada slide para que el AJAX sepa que ID consultar
    container.innerHTML = imagenes.map((img, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}"
             data-id="${img.id}"
             data-titulo="${escHtml(img.titulo)}"
             data-descripcion="${escHtml(img.descripcion || '')}"
             data-url="${escHtml(img.url_imagen)}">
            <img src="${escHtml(img.url_imagen)}"
                 alt="${escHtml(img.titulo)}"
                 class="d-block w-100"
                 onerror="this.src='https://placehold.co/800x380/1e293b/fff?text=${encodeURIComponent(img.titulo)}'">
            <div class="carousel-caption d-none d-sm-block">
                <h5 class="mb-0">${escHtml(img.titulo)}</h5>
            </div>
        </div>
    `).join('');

    actualizarInfoImagen(imagenes[0]);

    const carouselEl = document.getElementById('mainCarousel');
    const clone      = carouselEl.cloneNode(true);
    carouselEl.replaceWith(clone);

    // Al presionar flecha: AJAX a datos.php?id=X -> actualiza src + panel info
    clone.addEventListener('slide.bs.carousel', (event) => {
        const slides = clone.querySelectorAll('.carousel-item');
        const slide  = slides[event.to];
        if (!slide) return;

        const id = slide.dataset.id;
        console.log('Cambiando imagen al ID: ' + id);

        $.ajax({
            url:      'datos.php',
            type:     'GET',
            data:     { id: id },
            dataType: 'json',
            cache:    false,
            success: function (img) {
                if (img && img.url_imagen) {
                    // src actualizado en el DOM -> inspector muestra img/imagen2.jpg
                    const imgEl = slide.querySelector('img');
                    if (imgEl) {
                        imgEl.src = img.url_imagen;
                        imgEl.alt = img.titulo;
                    }
                    actualizarInfoImagen(img);
                    console.log('URL cargada: ' + img.url_imagen);
                } else {
                    actualizarInfoImagen({
                        titulo:      slide.dataset.titulo,
                        descripcion: slide.dataset.descripcion,
                        url_imagen:  slide.dataset.url,
                    });
                }
            },
            error: function () {
                console.warn('AJAX: no se pudo cargar la imagen ID ' + id);
                actualizarInfoImagen({
                    titulo:      slide.dataset.titulo,
                    descripcion: slide.dataset.descripcion,
                    url_imagen:  slide.dataset.url,
                });
            },
        });
    });
}

function actualizarInfoImagen({ titulo, descripcion, url_imagen } = {}) {
    const box = document.getElementById('infoImagen');
    if (!box) return;
    document.getElementById('imgTitulo').textContent      = titulo      || '';
    document.getElementById('imgDescripcion').textContent = descripcion || '';
    box.style.display = 'block';
}

/* ============================================================
   TABLA ADMIN DE IMAGENES
   ============================================================ */
async function cargarTablaImagenes() {
    const tbody = document.getElementById('tablaImagenes');
    if (!tbody) return;
    try {
        const res  = await fetch('datos.php?todas=1');
        const data = await res.json();
        imagenesCache = data;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Sin imagenes registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(img => {
            const activo = img.activo == 1;
            return `
            <tr data-id="${img.id}">
                <td>
                    <img src="${escHtml(img.url_imagen)}" class="admin-thumb"
                         onerror="this.src='https://placehold.co/60x40/1e293b/fff?text=?'"
                         alt="${escHtml(img.titulo)}">
                </td>
                <td class="fw-semibold">${escHtml(img.titulo)}</td>
                <td class="text-muted small">${escHtml(img.descripcion || '&mdash;')}</td>
                <td class="text-center">${img.orden}</td>
                <td class="text-center">
                    <span class="badge-estado ${activo ? 'badge-activo' : 'badge-inactivo'}">
                        ${activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center acciones-cell">
                    <button class="btn-icon btn-edit" data-id="${img.id}" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-toggle ${activo ? 'btn-toggle--on' : 'btn-toggle--off'}"
                            data-id="${img.id}" title="${activo ? 'Desactivar' : 'Activar'}">
                        ${activo
                            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
                            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                        }
                    </button>
                    <button class="btn-icon btn-delete" data-id="${img.id}" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                        </svg>
                    </button>
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.btn-edit').forEach(btn =>
            btn.addEventListener('click', () => {
                const img = imagenesCache.find(i => i.id == btn.dataset.id);
                if (img) abrirModal('editar', img);
            })
        );
        document.querySelectorAll('.btn-toggle').forEach(btn =>
            btn.addEventListener('click', () => toggleActivo(parseInt(btn.dataset.id), btn))
        );
        document.querySelectorAll('.btn-delete').forEach(btn =>
            btn.addEventListener('click', () => eliminarImagen(parseInt(btn.dataset.id)))
        );

    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar datos.</td></tr>';
    }
}

async function toggleActivo(id, btn) {
    if (!id || btn.disabled) return;
    btn.disabled = true;
    try {
        const res  = await fetch(`datos.php?toggle=1&id=${id}`);
        const data = await res.json();
        if (data.exito) {
            const activo  = data.activo == 1;
            btn.title     = activo ? 'Desactivar' : 'Activar';
            btn.className = `btn-icon btn-toggle ${activo ? 'btn-toggle--on' : 'btn-toggle--off'}`;
            btn.innerHTML = activo
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

            const fila  = btn.closest('tr');
            const badge = fila?.querySelector('.badge-estado');
            if (badge) {
                badge.textContent = activo ? 'Activo' : 'Inactivo';
                badge.className   = `badge-estado ${activo ? 'badge-activo' : 'badge-inactivo'}`;
            }
            const cached = imagenesCache.find(i => i.id == id);
            if (cached) cached.activo = data.activo;
            adminNotif(data.mensaje, 'success');
            cargarCarrusel();
        } else {
            adminNotif(data.mensaje || 'Error al cambiar estado.', 'error');
        }
    } catch {
        adminNotif('Error de red.', 'error');
    }
    btn.disabled = false;
}

// Eliminar imagen — detecta automaticamente si es slider simple o panel admin
async function eliminarImagen(id) {
    if (!id) return;

    // Slider simple: usa delete.php con POST + confirm
    if (document.getElementById('slider')) {
        if (!confirm('Estas seguro de que deseas eliminar esta imagen?')) return;
        try {
            const formData = new FormData();
            formData.append('id', id);
            const res       = await fetch('delete.php', { method: 'POST', body: formData });
            const resultado = await res.text();
            if (resultado.includes('correctamente')) {
                alert(resultado);
                cargarSlider();
            } else {
                alert('Hubo un problema: ' + resultado);
            }
        } catch (error) {
            console.error('Error en borrado:', error);
            alert('No se pudo conectar con el servidor para eliminar.');
        }
        return;
    }

    // Panel admin: usa datos.php con DELETE
    try {
        const res  = await fetch(`datos.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.exito) {
            adminNotif('Imagen eliminada correctamente.', 'success');
            await cargarTablaImagenes();
            await cargarCarrusel();
        } else {
            adminNotif(data.mensaje || 'Error al eliminar.', 'error');
        }
    } catch {
        adminNotif('Error de red al eliminar.', 'error');
    }
}

/* ============================================================
   MODAL  (nueva / editar imagen)
   ============================================================ */
let tabActiva = 'local';

function abrirModal(modo = 'nuevo', img = null) {
    const modal = document.getElementById('formModal');
    if (!modal) return;

    document.getElementById('editId').value         = img?.id          ?? '';
    document.getElementById('editTitulo').value      = img?.titulo      ?? '';
    document.getElementById('editDescripcion').value = img?.descripcion ?? '';
    document.getElementById('editOrden').value       = img?.orden       ?? 0;
    document.getElementById('editActivo').checked    = img ? img.activo == 1 : true;
    document.getElementById('editUrl').value         = '';
    document.getElementById('editArchivo').value     = '';
    ocultarPreview();
    ocultarFileChosen();

    document.getElementById('formModalTitle').textContent =
        modo === 'editar' ? 'Editar imagen' : 'Nueva imagen';

    if (img?.url_imagen) {
        const esLocal = !img.url_imagen.startsWith('http');
        if (esLocal) {
            cambiarTab('local');
            mostrarPreviewUrl(img.url_imagen);
        } else {
            cambiarTab('url');
            document.getElementById('editUrl').value = img.url_imagen;
            mostrarPreviewUrl(img.url_imagen);
        }
    } else {
        cambiarTab('local');
    }

    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('editTitulo')?.focus(), 60);
}

function cerrarModal() {
    const modal = document.getElementById('formModal');
    if (modal) modal.style.display = 'none';
    const input = document.getElementById('editArchivo');
    if (input) { input.value = ''; input._dragFile = null; }
    ocultarFileChosen();
    ocultarPreview();
}

function cambiarTab(tab) {
    tabActiva = tab;
    document.querySelectorAll('.img-tab').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tab === tab)
    );
    document.getElementById('tabLocal').style.display = tab === 'local' ? '' : 'none';
    document.getElementById('tabUrl').style.display   = tab === 'url'   ? '' : 'none';
    document.getElementById('editArchivo').value = '';
    document.getElementById('editUrl').value     = '';
    ocultarPreview();
    ocultarFileChosen();
}

function mostrarPreviewUrl(src) {
    if (!src) { ocultarPreview(); return; }
    const box = document.getElementById('previewBox');
    const img = document.getElementById('previewImg');
    if (!box || !img) return;
    img.onerror = () => ocultarPreview();
    img.onload  = () => { img.onerror = null; };
    img.src     = src;
    box.style.display = 'block';
}

function mostrarPreviewArchivo(file) {
    if (!file) { ocultarPreview(); return; }
    const reader = new FileReader();
    reader.onload = (e) => mostrarPreviewUrl(e.target.result);
    reader.readAsDataURL(file);
}

function ocultarPreview() {
    const box = document.getElementById('previewBox');
    if (box) box.style.display = 'none';
}

function bindDropZone() {
    const zone  = document.getElementById('dropZone');
    const input = document.getElementById('editArchivo');
    if (!zone || !input) return;

    zone.addEventListener('click',   () => input.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) setArchivoSeleccionado(file, input);
    });
    input.addEventListener('change', () => {
        if (input.files[0]) setArchivoSeleccionado(input.files[0], input);
    });
    document.getElementById('btnQuitarArchivo')?.addEventListener('click', () => {
        input.value     = '';
        input._dragFile = null;
        ocultarFileChosen();
        ocultarPreview();
    });
}

function setArchivoSeleccionado(file, input) {
    const div  = document.getElementById('fileChosen');
    const span = document.getElementById('fileChosenName');
    if (div && span) {
        span.textContent  = `${file.name}  (${(file.size / 1024).toFixed(0)} KB)`;
        div.style.display = 'flex';
    }
    mostrarPreviewArchivo(file);
    if (input && !input.files[0]) input._dragFile = file;
}

function ocultarFileChosen() {
    const div = document.getElementById('fileChosen');
    if (div) div.style.display = 'none';
}

function getArchivoActivo() {
    const input = document.getElementById('editArchivo');
    if (!input) return null;
    return input.files[0] || input._dragFile || null;
}

async function guardarImagen() {
    const id          = document.getElementById('editId').value;
    const titulo      = document.getElementById('editTitulo').value.trim();
    const descripcion = document.getElementById('editDescripcion').value.trim();
    const orden       = parseInt(document.getElementById('editOrden').value) || 0;
    const activo      = document.getElementById('editActivo').checked ? 1 : 0;
    const archivo     = getArchivoActivo();
    const urlExterna  = document.getElementById('editUrl').value.trim();
    const esEditar    = !!id;

    if (!titulo) { adminNotif('El titulo es requerido.', 'error'); return; }

    const usaArchivo = tabActiva === 'local' && !!archivo;
    const usaUrl     = tabActiva === 'url'   && !!urlExterna;

    if (!esEditar && !usaArchivo && !usaUrl) {
        adminNotif('Selecciona un archivo o ingresa una URL.', 'error');
        return;
    }

    setBtnGuardarLoading(true);

    try {
        let res, data;

        if (usaArchivo) {
            const fd = new FormData();
            if (esEditar) fd.append('_method', 'PUT');
            if (id)       fd.append('id',           id);
            fd.append('titulo',      titulo);
            fd.append('descripcion', descripcion);
            fd.append('orden',       orden);
            fd.append('activo',      activo);
            fd.append('archivo',     archivo);
            res  = await fetch('datos.php', { method: 'POST', body: fd });
            data = await res.json();
        } else {
            const payload = { titulo, descripcion, orden, activo };
            if (id)     payload.id        = parseInt(id);
            if (usaUrl) payload.url_imagen = urlExterna;
            res  = await fetch('datos.php', {
                method:  esEditar ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            data = await res.json();
        }

        if (data.exito) {
            cerrarModal();
            adminNotif(esEditar ? 'Imagen actualizada.' : 'Imagen creada correctamente.', 'success');
            await cargarTablaImagenes();
            await cargarCarrusel();
        } else {
            adminNotif(data.mensaje || 'Error al guardar.', 'error');
        }
    } catch (err) {
        console.error(err);
        adminNotif('Error de red al guardar.', 'error');
    }

    setBtnGuardarLoading(false);
}

function setBtnGuardarLoading(v) {
    const btn = document.getElementById('btnGuardarImagen');
    if (!btn) return;
    btn.disabled = v;
    document.getElementById('btnGuardarTxt').textContent       = v ? 'Guardando...' : 'Guardar';
    document.getElementById('btnGuardarSpinner').style.display = v ? 'inline-block' : 'none';
}

/* ============================================================
   LOGIN
   ============================================================ */
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        ocultarError('loginError');
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        if (!email || !password) { mostrarError('loginError', 'Completa todos los campos.'); return; }
        const btn = document.getElementById('btnLogin');
        btn.disabled = true; btn.textContent = 'Verificando...';
        try {
            const res  = await fetch('login.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.exito) {
                window.location.href = 'dashboard.html';
            } else {
                mostrarError('loginError', data.mensaje || 'Credenciales incorrectas');
                btn.disabled = false; btn.textContent = 'Iniciar sesion';
            }
        } catch {
            mostrarError('loginError', 'Error de red.');
            btn.disabled = false; btn.textContent = 'Iniciar sesion';
        }
    });
}

/* ============================================================
   REGISTRO
   ============================================================ */
function initRegistro() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        ocultarError('registerError');
        const nombre   = document.getElementById('regNombre').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        if (!nombre || !email || !password) { mostrarError('registerError', 'Completa todos los campos.'); return; }
        try {
            const res  = await fetch('registro.php', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ nombre, email, password }),
            });
            const data = await res.json();
            if (data.exito) {
                form.reset();
                window.location.href = 'login.html';
            } else {
                mostrarError('registerError', data.mensaje || 'Error al registrar');
            }
        } catch {
            mostrarError('registerError', 'Error de red.');
        }
    });
}

/* ============================================================
   INIT — se ejecuta cuando el DOM esta listo
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

    // Login y Registro
    initLogin();
    initRegistro();

    // Slider simple (paginas con #slider)
    if (document.getElementById('slider')) {
        cargarSlider();
    }

    // Dashboard: carrusel Bootstrap + tabla admin
    cargarCarrusel();
    cargarTablaImagenes();
    bindDropZone();

    // Botones del modal
    document.getElementById('btnNuevaImagen')?.addEventListener('click', () => abrirModal('nuevo'));
    document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarForm')?.addEventListener('click', cerrarModal);
    document.getElementById('formModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('formModal')) cerrarModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
    document.getElementById('btnGuardarImagen')?.addEventListener('click', guardarImagen);

    // Tabs del modal (local / URL)
    document.querySelectorAll('.img-tab').forEach(btn =>
        btn.addEventListener('click', () => cambiarTab(btn.dataset.tab))
    );

    // Preview en vivo de URL externa
    document.getElementById('editUrl')?.addEventListener('input', function () {
        mostrarPreviewUrl(this.value.trim());
    });

    // Navegacion por secciones del sidebar
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const id = 'sec' + link.dataset.section.charAt(0).toUpperCase() + link.dataset.section.slice(1);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

});
