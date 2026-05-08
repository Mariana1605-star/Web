let listaIds = [];
let currentIndex = 0;
let imagenesCache = [];
let tabActiva = 'local';

async function cargarSlider() {
    try {
        const res = await fetch('slider.php');
        listaIds = await res.json();

        if (!listaIds || listaIds.length === 0) {
            document.getElementById('slide-container').innerHTML = '<p class="text-center text-white p-5">No hay imágenes disponibles.</p>';
            document.getElementById('carouselIndicadores').innerHTML = '';
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const slugParam = params.get('imagen') || '';
        const idxUrl = listaIds.findIndex(img => img.slug === slugParam);
        currentIndex = idxUrl >= 0 ? idxUrl : 0;

        renderIndicadores();
        mostrarImagen(currentIndex);
    } catch (error) {
        document.getElementById('slide-container').innerHTML = '<p class="text-center text-danger p-5">Error al cargar el slider.</p>';
    }
}

function mostrarImagen(idx) {
    if (!listaIds || !listaIds[idx]) return;

    const item = listaIds[idx];
    const slugActual = item.slug;

    const nuevaUrl = window.location.pathname + '?imagen=' + slugActual;
    window.history.pushState({ idx: idx }, '', nuevaUrl);

    $.ajax({
        url: 'generar_visor.php',
        type: 'GET',
        data: { slug: slugActual },
        success: function(htmlResponse) {
            $('#slide-container').html(htmlResponse);
            $('#imgTitulo').text(item.titulo);
            $('#imgDescripcion').text(item.descripcion || 'Sin descripción disponible.');
            resaltarIndicador(idx);
        }
    });
}

function nextSlide() {
    if (listaIds.length === 0) return;
    currentIndex = (currentIndex + 1) % listaIds.length;
    mostrarImagen(currentIndex);
}

function prevSlide() {
    if (listaIds.length === 0) return;
    currentIndex = (currentIndex - 1 + listaIds.length) % listaIds.length;
    mostrarImagen(currentIndex);
}

function irAIndice(idx) {
    if (idx < 0 || idx >= listaIds.length) return;
    currentIndex = idx;
    mostrarImagen(idx);
}

function renderIndicadores() {
    const wrap = document.getElementById('carouselIndicadores');
    if (!wrap) return;
    wrap.innerHTML = listaIds.map((img, i) => `
        <button class="carousel-dot ${i === currentIndex ? 'carousel-dot--active' : ''}"
                data-idx="${i}" aria-label="${escHtml(img.slug)}">
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

async function cargarTablaImagenes() {
    const tbody = document.getElementById('tablaImagenes');
    if (!tbody) return;
    try {
        const res = await fetch('datos.php?todas=1');
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
                <td><img src="${escHtml(img.url_imagen)}" class="admin-thumb" onerror="this.src='https://placehold.co/60x40/1e293b/fff?text=?'"></td>
                <td class="fw-semibold">${escHtml(img.titulo)}</td>
                <td class="text-muted small">${escHtml(img.descripcion || '—')}</td>
                <td class="text-center">${img.orden}</td>
                <td class="text-center"><span class="badge-estado ${activo ? 'badge-activo' : 'badge-inactivo'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
                <td class="text-center acciones-cell">
                    <button class="btn-icon btn-edit" data-id="${img.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-icon btn-toggle ${activo ? 'btn-toggle--on' : 'btn-toggle--off'}" data-id="${img.id}">${activo ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'}</button>
                    <button class="btn-icon btn-delete" data-id="${img.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                </td>
            </tr>`;
        }).join('');

        document.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => abrirModal('editar', imagenesCache.find(i => i.id == btn.dataset.id)));
        document.querySelectorAll('.btn-toggle').forEach(btn => btn.onclick = () => toggleActivo(parseInt(btn.dataset.id), btn));
        document.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => eliminarImagen(parseInt(btn.dataset.id)));
    } catch {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar datos.</td></tr>';
    }
}

async function toggleActivo(id, btn) {
    if (!id || btn.disabled) return;
    btn.disabled = true;
    try {
        const res = await fetch(`datos.php?toggle=1&id=${id}`);
        const data = await res.json();
        if (data.exito) {
            await cargarTablaImagenes();
            await cargarSlider();
            adminNotif(data.mensaje, 'success');
        }
    } catch { adminNotif('Error de red.', 'error'); }
    btn.disabled = false;
}

async function eliminarImagen(id) {
    if (!id || !confirm('¿Eliminar esta imagen?')) return;
    try {
        const res = await fetch(`datos.php?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.exito) {
            await cargarTablaImagenes();
            await cargarSlider();
            adminNotif('Eliminada.', 'success');
        }
    } catch { adminNotif('Error de red.', 'error'); }
}

function abrirModal(modo = 'nuevo', img = null) {
    const modal = document.getElementById('formModal');
    if (!modal) return;
    document.getElementById('editId').value = img?.id ?? '';
    document.getElementById('editTitulo').value = img?.titulo ?? '';
    document.getElementById('editDescripcion').value = img?.descripcion ?? '';
    document.getElementById('editOrden').value = img?.orden ?? 0;
    document.getElementById('editActivo').checked = img ? img.activo == 1 : true;
    cambiarTab('local');
    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('formModal').style.display = 'none';
}

function cambiarTab(tab) {
    tabActiva = tab;
    document.querySelectorAll('.img-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.getElementById('tabLocal').style.display = tab === 'local' ? '' : 'none';
    document.getElementById('tabUrl').style.display = tab === 'url' ? '' : 'none';
}

async function guardarImagen() {
    const id = document.getElementById('editId').value;
    const fd = new FormData();
    if (id) fd.append('id', id);
    fd.append('titulo', document.getElementById('editTitulo').value);
    fd.append('descripcion', document.getElementById('editDescripcion').value);
    fd.append('orden', document.getElementById('editOrden').value);
    fd.append('activo', document.getElementById('editActivo').checked ? 1 : 0);

    if (tabActiva === 'local') {
        const file = document.getElementById('editArchivo').files[0];
        if (file) fd.append('archivo', file);
    } else {
        fd.append('url_imagen', document.getElementById('editUrl').value);
    }

    try {
        const res = await fetch('datos.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.exito) {
            cerrarModal();
            await cargarTablaImagenes();
            await cargarSlider();
            adminNotif('Guardado.', 'success');
        }
    } catch { adminNotif('Error al guardar.', 'error'); }
}

function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch('login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.exito) window.location.href = 'dashboard.html';
            else adminNotif(data.mensaje, 'error');
        } catch { adminNotif('Error de red', 'error'); }
    });
}

function initRegistro() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        try {
            const res = await fetch('registro.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password })
            });
            const data = await res.json();
            if (data.exito) window.location.href = 'login.html';
            else adminNotif(data.mensaje, 'error');
        } catch { adminNotif('Error de red', 'error'); }
    });
}

function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function adminNotif(msg, tipo = 'success') {
    const el = document.getElementById('adminNotif');
    if (!el) return;
    el.textContent = msg;
    el.className = `admin-notif admin-notif--${tipo}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initRegistro();
    cargarSlider();
    cargarTablaImagenes();

    document.getElementById('btnPrev')?.addEventListener('click', prevSlide);
    document.getElementById('btnNext')?.addEventListener('click', nextSlide);
    document.getElementById('btnNuevaImagen')?.addEventListener('click', () => abrirModal('nuevo'));
    document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('btnGuardarImagen')?.addEventListener('click', guardarImagen);

    window.addEventListener('popstate', (e) => {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('imagen');
        if (slug) {
            const idx = listaIds.findIndex(img => img.slug === slug);
            if (idx !== -1) { currentIndex = idx; mostrarImagen(idx); }
        }
    });

    document.querySelectorAll('.img-tab').forEach(btn =>
        btn.addEventListener('click', () => cambiarTab(btn.dataset.tab))
    );
});