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

$lista = array_map(function($r) {
    return [
        'id'     => (int) $r['id'],
        'titulo' => $r['titulo'],
        'slug'   => $r['slug'],
    ];
}, $rows);
