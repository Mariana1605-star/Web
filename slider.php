<?php
require_once 'conexion.php';
header('Content-Type: application/json');

try {
    $db = DB::conectar();
    // Agregamos 'slug' y 'descripcion' a la consulta
    $rows = $db->query(
        "SELECT id, titulo, slug, descripcion 
         FROM imagenes 
         WHERE activo = 1 
         ORDER BY orden ASC, id ASC"
    )->fetchAll();

    $lista = array_map(function($r) {
        return [
            'id'          => (int) $r['id'],
            'titulo'      => $r['titulo'],
            'slug'        => $r['slug'], // IMPORTANTE: Usar el de la BD
            'descripcion' => $r['descripcion']
        ];
    }, $rows);

    echo json_encode($lista);
} catch (Exception $e) {
    echo json_encode([]); // Devolver array vacío si hay error para que JS no falle
}