<?php

require_once 'conexion.php';

$id = intval($_GET['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo '<p class="text-danger text-center p-4">ID de imagen no válido.</p>';
    exit;
}

$db   = DB::conectar();
$stmt = $db->prepare(
    "SELECT id, titulo, descripcion, url_imagen
     FROM imagenes
     WHERE id = :id AND activo = 1
     LIMIT 1"
);
$stmt->execute([':id' => $id]);
$img = $stmt->fetch();

if (!$img) {
    http_response_code(404);
    echo '<p class="text-warning text-center p-4">Imagen no encontrada o inactiva.</p>';
    exit;
}

$titulo      = htmlspecialchars($img['titulo'],      ENT_QUOTES, 'UTF-8');
$descripcion = htmlspecialchars($img['descripcion'] ?? '', ENT_QUOTES, 'UTF-8');
$url         = htmlspecialchars($img['url_imagen'],  ENT_QUOTES, 'UTF-8');
$placeholder = 'https://placehold.co/800x380/1e293b/fff?text=' . rawurlencode($img['titulo']);
?>
<div class="visor-slide" data-id="<?= $img['id'] ?>">
    <img
        src="<?= $url ?>"
        alt="<?= $titulo ?>"
        class="d-block w-100"
        style="height:380px; object-fit:cover;"
        onerror="this.src='<?= $placeholder ?>'"
    >
    <div class="carousel-caption d-none d-sm-block">
        <h5 class="mb-0"><?= $titulo ?></h5>
    </div>
</div>

<script>
(function () {
    var data = {
        titulo:      <?= json_encode($img['titulo']) ?>,
        descripcion: <?= json_encode($img['descripcion'] ?? '') ?>,
        url_imagen:  <?= json_encode($img['url_imagen']) ?>
    };
    if (typeof window._visorData === 'undefined') window._visorData = {};
    window._visorData[<?= $img['id'] ?>] = data;
})();
</script>
