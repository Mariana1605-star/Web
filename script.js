'use strict';

function mostrarError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
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
    el.textContent = msg;
    el.className   = `admin-notif admin-notif--${tipo}`;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

let imagenesCache = [];

async function cargarCarrusel() {
    const container = document.getElementById('carouselItems');
    if (!container) return;
    try {
        const res      = await fetch('datos.php');
        if (!res.ok) throw new Error();
        const imagenes = await res.json();
        imagenesCache  = imagenes;
        if (!imagenes.length) {
            container.innerHTML = '<div class="carousel-item active"><div class="p-5 text-center text-white">No hay imágenes disponibles.</div></div>';
            return;
        }
        renderCarrusel(imagenes);
    } catch {
        container.innerHTML = '<div class="carousel-item active"><div class="p-4 text-center text-danger">Error al cargar las imágenes.</div></div>';
    }
}

function renderCarrusel(imagenes) {
    const container = document.getElementById('carouselItems');
    if (!container) return;

    container.innerHTML = imagenes.map((img, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}"
             data-titulo="${escHtml(img.titulo)}"
             data-descripcion="${escHtml(img.descripcion || '')}">
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
    carouselEl.replaceWith(carouselEl.cloneNode(true));
    const freshCarousel = document.getElementById('mainCarousel');

    freshCarousel.addEventListener('slide.bs.carousel', (event) => {
        const slide = freshCarousel.querySelectorAll('.carousel-item')[event.to];
        if (!slide) return;
        actualizarInfoImagen({ titulo: slide.dataset.titulo, descripcion: slide.dataset.descripcion });

        $.ajax({
            url: 'datos.php', type: 'GET', dataType: 'json',
            success: (data) => { imagenesCache = data; console.log('AJAX – imágenes:', data.length); },
            error:   ()     => { console.warn('AJAX – no se pudo recargar datos.php'); }
        });
    });
}

function actualizarInfoImagen({ titulo, descripcion }) {
    const box = document.getElementById('infoImagen');
    if (!box) return;
    document.getElementById('imgTitulo').textContent      = titulo       || '';
    document.getElementById('imgDescripcion').textContent = descripcion  || '';
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

        tbody.innerHTML = data.map(img => `
            <tr data-id="${img.id}">
                <td>
                    <img src="${escHtml(img.url_imagen)}"
                         class="admin-thumb"
                         onerror="this.src='https://placehold.co/60x40/1e293b/fff?text=?'"
                         alt="${escHtml(img.titulo)}">
                </td>
                <td class="fw-600">${escHtml(img.titulo)}</td>
                <td class="text-muted small">${escHtml(img.descripcion || '—')}</td>
                <td class="text-center">${img.orden}</td>
                <td class="text-center">
                    <span class="badge-estado ${img.activo == 1 ? 'badge-activo' : 'badge-inactivo'}">
                        ${img.activo == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn-icon btn-edit"   data-id="${img.id}" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${img.id}" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-edit').forEach(btn =>
            btn.addEventListener('click', () => {
                const img = imagenesCache.find(i => i.id == btn.dataset.id);
                if (img) abrirModal('editar', img);
            })
        );
        document.querySelectorAll('.btn-delete').forEach(btn =>
            btn.addEventListener('click', () => eliminarImagen(parseInt(btn.dataset.id), btn))
        );
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar datos.</td></tr>';
    }
}

let tabActiva = 'local';

function abrirModal(modo = 'nuevo', img = null) {
    const modal = document.getElementById('formModal');
    if (!modal) return;

    // Reset campos
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
        cambiarTab(esLocal ? 'local' : 'url');
        if (!esLocal) {
            document.getElementById('editUrl').value = img.url_imagen;
            mostrarPreviewUrl(img.url_imagen);
        } else {
            mostrarPreviewUrl(img.url_imagen);
        }
    } else {
        cambiarTab('local');
    }

    modal.style.display = 'flex';
    document.getElementById('editTitulo').focus();
}

function cerrarModal() {
    const modal = document.getElementById('formModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('editArchivo').value = '';
    ocultarFileChosen();
    ocultarPreview();
}

function cambiarTab(tab) {
    tabActiva = tab;
    document.querySelectorAll('.img-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('tabLocal').style.display = tab === 'local' ? '' : 'none';
    document.getElementById('tabUrl').style.display   = tab === 'url'   ? '' : 'none';
    ocultarPreview();
    ocultarFileChosen();
    document.getElementById('editArchivo').value = '';
    document.getElementById('editUrl').value     = '';
}

function mostrarPreviewUrl(src) {
    if (!src) { ocultarPreview(); return; }
    const box = document.getElementById('previewBox');
    const img = document.getElementById('previewImg');
    img.src   = src;
    img.onerror = () => ocultarPreview();
    img.onload  = () => { img.onerror = null; box.style.display = 'block'; };
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

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) setArchivoSeleccionado(file);
    });

    input.addEventListener('change', () => {
        if (input.files[0]) setArchivoSeleccionado(input.files[0]);
    });

    document.getElementById('btnQuitarArchivo')?.addEventListener('click', () => {
        input.value = '';
        ocultarFileChosen();
        ocultarPreview();
    });
}

function setArchivoSeleccionado(file) {
    const div  = document.getElementById('fileChosen');
    const span = document.getElementById('fileChosenName');
    if (div && span) {
        span.textContent  = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
        div.style.display = 'flex';
    }
    mostrarPreviewArchivo(file);
    const input = document.getElementById('editArchivo');
    if (input && !input.files[0]) {
        input._dragFile = file;
    }
}

function ocultarFileChosen() {
    const div = document.getElementById('fileChosen');
    if (div) div.style.display = 'none';
    const input = document.getElementById('editArchivo');
    if (input) input._dragFile = null;
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

    if (!titulo) {
        adminNotif('El título es requerido.', 'error'); return;
    }

    const usaArchivo = tabActiva === 'local' && archivo;
    const usaUrl     = tabActiva === 'url'   && urlExterna;

    const esEditar = !!id;
    if (!esEditar && !usaArchivo && !usaUrl) {
        adminNotif('Selecciona un archivo o ingresa una URL.', 'error'); return;
    }

    setBtnGuardarLoading(true);

    try {
        let res, data;

        if (usaArchivo) {
            const fd = new FormData();
            if (esEditar) fd.append('_method', 'PUT');
            if (id) fd.append('id', id);
            fd.append('titulo',      titulo);
            fd.append('descripcion', descripcion);
            fd.append('orden',       orden);
            fd.append('activo',      activo);
            fd.append('archivo',     archivo);

            res  = await fetch('datos.php', { method: 'POST', body: fd });
            data = await res.json();

        } else {
            const payload = { titulo, descripcion, orden, activo };
            if (id)      payload.id        = parseInt(id);
            if (usaUrl)  payload.url_imagen = urlExterna;

            res  = await fetch('datos.php', {
                method:  esEditar ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            data = await res.json();
        }

        if (data.exito) {
            cerrarModal();
            adminNotif(esEditar ? 'Imagen actualizada.' : 'Imagen creada.', 'success');
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
    document.getElementById('btnGuardarTxt').textContent  = v ? 'Guardando...' : 'Guardar';
    document.getElementById('btnGuardarSpinner').style.display = v ? 'inline-block' : 'none';
}

async function eliminarImagen(id, btn) {
    if (!id) return;
    if (!btn.dataset.confirmando) {
        btn.dataset.confirmando = '1';
        btn.style.background    = '#dc2626';
        btn.style.color         = '#fff';
        btn.title               = 'Clic de nuevo para confirmar';
        btn._t = setTimeout(() => {
            btn.dataset.confirmando = '';
            btn.style.background    = '';
            btn.style.color         = '';
        }, 3000);
        return;
    }
    clearTimeout(btn._t);
    try {
        const res  = await fetch(`datos.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.exito) {
            adminNotif('Imagen eliminada.', 'success');
            await cargarTablaImagenes();
            await cargarCarrusel();
        } else {
            adminNotif(data.mensaje || 'Error al eliminar.', 'error');
        }
    } catch {
        adminNotif('Error de red al eliminar.', 'error');
    }
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
            const res  = await fetch('login.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password}) });
            const data = await res.json();
            if (data.exito) { window.location.href = 'dashboard.html'; }
            else { mostrarError('loginError', data.mensaje || 'Credenciales incorrectas'); btn.disabled=false; btn.textContent='Iniciar sesión'; }
        } catch { mostrarError('loginError','Error de red.'); btn.disabled=false; btn.textContent='Iniciar sesión'; }
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
        if (!nombre || !email || !password) { mostrarError('registerError','Completa todos los campos.'); return; }
        try {
            const res  = await fetch('registro.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nombre, email, password}) });
            const data = await res.json();
            if (data.exito) { form.reset(); window.location.href='login.html'; }
            else mostrarError('registerError', data.mensaje || 'Error al registrar');
        } catch { mostrarError('registerError','Error de red.'); }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initRegistro();
    cargarCarrusel();
    cargarTablaImagenes();
    bindDropZone();

    document.getElementById('btnNuevaImagen')?.addEventListener('click', () => abrirModal('nuevo'));

    document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarForm')?.addEventListener('click', cerrarModal);
    document.getElementById('formModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('formModal')) cerrarModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });

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
            const sec = document.getElementById('sec' + link.dataset.section.charAt(0).toUpperCase() + link.dataset.section.slice(1));
            sec?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});
