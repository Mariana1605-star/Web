<?php
require_once 'conexion.php';

header('Content-Type: application/json');

$db   = DB::conectar();
$rows = $db->query(
    "SELECT id, titulo
     FROM   imagenes
     WHERE  activo = 1
     ORDER  BY orden ASC, id ASC"
)->fetchAll();

$lista = array_map(function($r, $index) {
    return [
        'id'     => (int) $r['id'],
        'titulo' => $r['titulo'],
        'slug'   => 'img_' . str_pad($index + 1, 3, '0', STR_PAD_LEFT),
    ];
}, $rows, array_keys($rows));

echo json_encode(array_values($lista));
