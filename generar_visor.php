<?php
require_once 'conexion.php';

$slug = $_GET['slug'] ?? '';
$db = DB::conectar();

// Buscamos la imagen por slug
$stmt = $db->prepare("SELECT url_imagen, titulo FROM imagenes WHERE slug = :slug AND activo = 1 LIMIT 1");
$stmt->execute([':slug' => $slug]);
$img = $stmt->fetch();

if ($img) {
    echo '<img src="' . htmlspecialchars($img['url_imagen']) . '" 
               alt="' . htmlspecialchars($img['titulo']) . '" 
               class="img-fluid rounded shadow" 
               style="max-height: 300px; object-fit: contain;">';
} else {
    echo '<p class="text-white">Imagen no encontrada.</p>';
}
