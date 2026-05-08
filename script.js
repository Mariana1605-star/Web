'use strict';

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
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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


let imagenesCache  = [];  
let indiceActual   = 0; 

function mostrarImagen(id) {
    console.log('Cambiando imagen al ID: ' + id);

    const container = $('#slide-container');

    container.html(
        '<div class="text-center p-5">' +
        '<div class="spinner-border text-light" role="status"></div>' +
        '<p class="mt-2 text-white-50 small">Cargando...</p>' +
        '</div>'
    );

    $.ajax({
        url:     'generar_visor.php',
        data:    { id: id },
        cache:   false,
        success: function (result) {
            container.html(result);

            const url = new URL(window.location.href);
            url.searchParams.set('imagen', id);
            window.history.pushState({ imagenId: id }, '', url.toString());

            if (window._visorData && window._visorData[id]) {
                actualizarInfoImagen(window._visorData[id]);
            }
        },
        error: function () {
            container.html(
                '<p class="text-danger text-center p-4">Error al cargar el componente de imagen.</p>'
            );
        }
    });
}

function irAnterior() {
    if (!imagenesCache.length) return;
    indiceActual = (indiceActual - 1 + imagenesCache.length) % imagenesCache.length;
    const img    = imagenesCache[indiceActual];
    resaltarIndicador(indiceActual);
    mostrarImagen(img.id);
}

function irSiguiente() {
    if (!imagenesCache.length) return;
    indiceActual = (indiceActual + 1) % imagenesCache.length;
    const img    = imagenesCache[indiceActual];
    resaltarIndicador(indiceActual);
    mostrarImagen(img.id);
}

function irAIndice(idx) {
    if (idx < 0 || idx >= imagenesCache.length) return;
    indiceActual = idx;
    resaltarIndicador(idx);
    mostrarImagen(imagenesCache[idx].id);
}

function renderIndicadores(imagenes) {
    const wrap = document.getElementById('carouselIndicadores');
    if (!wrap) return;
    wrap.innerHTML = imagenes.map((img, i) => `
        <button class="carousel-dot ${i === indiceActual ? 'carousel-dot--active' : ''}"
                data-idx="${i}"
                aria-label="Imagen ${i + 1}: ${escHtml(img.titulo)}">
        </button>
    `).join('');

    wrap.querySelectorAll('.carousel-dot').forEach(btn =>
        btn.addEventListener('click', () => irAIndice(parseInt(btn.dataset.idx)))
    );
}

function resaltarIndicador(idx) {
    document.querySelectorAll('.carousel-dot').forEach((btn, i) =>
        btn.classList.toggle('carousel-dot--active', i === idx)
    );
}

async function cargarCarrusel() {
    const container = document.getElementById('slide-container');
    if (!container) return;

    try {
        const res      = await fetch('datos.php');
        if (!res.ok)   throw new Error();
        const imagenes = await res.json();
        imagenesCache  = imagenes;

        if (!imagenes.length) {
            container.innerHTML =
                '<div class="p-5 text-center text-white">No hay imágenes disponibles.</div>';
            return;
        }

        const params  = new URLSearchParams(window.location.search);
        const idParam = parseInt(params.get('imagen')) || 0;
        const idxUrl  = imagenes.findIndex(img => img.id === idParam);
        indiceActual  = idxUrl >= 0 ? idxUrl : 0;

        renderIndicadores(imagenes);
        mostrarImagen(imagenes[indiceActual].id);

    } catch {
        container.innerHTML =
            '<div class="p-4 text-center text-danger">Error al cargar las imágenes.</div>';
    }
}

function actualizarInfoImagen({ titulo, descripcion }) {
    const box = document.getElementById('infoImagen');
    if (!box) return;
    document.getElementById('imgTitulo').textContent      = titulo      || '';
    document.getElementById('imgDescripcion').textContent = descripcion || '';
    box.style.display = 'block';
}

async function cargarTablaImagenes() {
    const tbody = document.getElementById('tablaImagenes');
    if (!tbody) return;
    try {
        const res  = await fetch('datos.php?todas=1');
        const data = await res.json();
        imagenesCache = data;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Sin imágenes registradas.</td></tr>';
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
                <td class="text-muted small">${escHtml(img.descripcion || '—')}</td>
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
            const activo = data.activo == 1;

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

async function eliminarImagen(id) {
    if (!id) return;
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

    zone.addEventListener('click',    () => input.click());
    zone.addEventListener('keydown',  (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
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

    if (!titulo) { adminNotif('El título es requerido.', 'error'); return; }

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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.exito) {
                window.location.href = 'dashboard.html';
            } else {
                mostrarError('loginError', data.mensaje || 'Credenciales incorrectas');
                btn.disabled = false; btn.textContent = 'Iniciar sesión';
            }
        } catch {
            mostrarError('loginError', 'Error de red.');
            btn.disabled = false; btn.textContent = 'Iniciar sesión';
        }
    });
}

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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password }),
            });
            const data = await res.json();
            if (data.exito) { form.reset(); window.location.href = 'login.html'; }
            else mostrarError('registerError', data.mensaje || 'Error al registrar');
        } catch {
            mostrarError('registerError', 'Error de red.');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initRegistro();
    cargarCarrusel();
    cargarTablaImagenes();
    bindDropZone();

    document.getElementById('btnPrev')?.addEventListener('click', irAnterior);
    document.getElementById('btnNext')?.addEventListener('click', irSiguiente);

    window.addEventListener('popstate', (e) => {
        if (e.state?.imagenId) {
            const idx = imagenesCache.findIndex(img => img.id === e.state.imagenId);
            if (idx >= 0) { indiceActual = idx; resaltarIndicador(idx); }
            mostrarImagen(e.state.imagenId);
        }
    });

    document.getElementById('btnNuevaImagen')?.addEventListener('click', () => abrirModal('nuevo'));
    document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarForm')?.addEventListener('click', cerrarModal);
    document.getElementById('formModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('formModal')) cerrarModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

    document.getElementById('btnGuardarImagen')?.addEventListener('click', guardarImagen);

    document.querySelectorAll('.img-tab').forEach(btn =>
        btn.addEventListener('click', () => cambiarTab(btn.dataset.tab))
    );

    document.getElementById('editUrl')?.addEventListener('input', function () {
        mostrarPreviewUrl(this.value.trim());
    });

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
