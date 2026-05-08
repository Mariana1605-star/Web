<?php

require_once 'conexion.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('IMG_DIR', __DIR__ . '/img/');
if (!is_dir(IMG_DIR)) mkdir(IMG_DIR, 0755, true);

$db     = DB::conectar();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && ($_POST['_method'] ?? '') === 'PUT') {
    $method = 'PUT';
}

if ($method === 'GET') {

    // Obtener una imagen por su ID (para AJAX del carrusel)
    if (isset($_GET['id']) && !isset($_GET['toggle'])) {
        $id   = intval($_GET['id']);
        $stmt = $db->prepare("SELECT id, titulo, descripcion, url_imagen, activo, orden FROM imagenes WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row  = $stmt->fetch();
        if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }
        echo json_encode($row);
        exit;
    }

    if (isset($_GET['toggle'], $_GET['id'])) {
        $id   = intval($_GET['id']);
        $stmt = $db->prepare("SELECT activo FROM imagenes WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row  = $stmt->fetch();

        if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }

        $nuevo = ($row['activo'] == 1) ? 0 : 1;
        $db->prepare("UPDATE imagenes SET activo = :a WHERE id = :id")->execute([':a'=>$nuevo,':id'=>$id]);

        echo json_encode(['exito'=>true,'activo'=>$nuevo,'mensaje'=> $nuevo ? 'Imagen activada' : 'Imagen desactivada']);
        exit;
    }

    $todas = isset($_GET['todas']) && $_GET['todas'] == '1';
    $where = $todas ? '' : 'WHERE activo = 1';
    echo json_encode($db->query(
        "SELECT id, titulo, descripcion, url_imagen, activo, orden
         FROM imagenes $where ORDER BY orden ASC, id ASC"
    )->fetchAll());
    exit;
}

if ($method === 'POST') {
    $esForm = !empty($_POST);

    if ($esForm) {
        $titulo      = trim($_POST['titulo']      ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $orden       = intval($_POST['orden']     ?? 0);
        $activo      = intval($_POST['activo']    ?? 1);
        $url_ext     = trim($_POST['url_imagen']  ?? '');
    } else {
        $json        = json_decode(file_get_contents('php://input'), true) ?? [];
        $titulo      = trim($json['titulo']      ?? '');
        $descripcion = trim($json['descripcion'] ?? '');
        $orden       = intval($json['orden']     ?? 0);
        $activo      = intval($json['activo']    ?? 1);
        $url_ext     = trim($json['url_imagen']  ?? '');
    }

    if (empty($titulo)) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'El título es requerido']);
        exit;
    }

    $url_imagen = '';

    if ($esForm && isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK) {
        $url_imagen = subirArchivo($_FILES['archivo']);
        if (!$url_imagen) {
            echo json_encode(['exito'=>false,'mensaje'=>'Archivo no válido. Solo JPG/PNG/GIF/WEBP, máx 5 MB.']);
            exit;
        }
    } else {
        $url_imagen = $url_ext;
    }

    if (empty($url_imagen)) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'Se requiere imagen (archivo local o URL)']);
        exit;
    }

    if (DB::driver() === 'pgsql') {
        $stmt = $db->prepare(
            "INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden)
             VALUES (:t,:d,:u,:a,:o) RETURNING id"
        );
        $stmt->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden]);
        $id = (int)($stmt->fetch()['id'] ?? 0);
    } else {
        $stmt = $db->prepare(
            "INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden)
             VALUES (:t,:d,:u,:a,:o)"
        );
        $stmt->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden]);
        $id = (int)$db->lastInsertId();
    }

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen creada','id'=>$id,'url_imagen'=>$url_imagen]);
    exit;
}

if ($method === 'PUT') {
    $esForm = !empty($_POST);

    if ($esForm) {
        $id          = intval($_POST['id']          ?? 0);
        $titulo      = trim($_POST['titulo']        ?? '');
        $descripcion = trim($_POST['descripcion']   ?? '');
        $orden       = intval($_POST['orden']       ?? 0);
        $activo      = intval($_POST['activo']      ?? 1);
        $url_ext     = trim($_POST['url_imagen']    ?? '');
    } else {
        $json        = json_decode(file_get_contents('php://input'), true) ?? [];
        $id          = intval($json['id']           ?? 0);
        $titulo      = trim($json['titulo']         ?? '');
        $descripcion = trim($json['descripcion']    ?? '');
        $orden       = intval($json['orden']        ?? 0);
        $activo      = intval($json['activo']       ?? 1);
        $url_ext     = trim($json['url_imagen']     ?? '');
    }

    if (!$id) { http_response_code(422); echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit; }

    $curr = $db->prepare("SELECT url_imagen FROM imagenes WHERE id = :id LIMIT 1");
    $curr->execute([':id'=>$id]);
    $actual = $curr->fetch();
    if (!$actual) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }

    $url_imagen = $actual['url_imagen'];

    if ($esForm && isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK) {
        // Nueva imagen local: borra la anterior si era local
        $nueva = subirArchivo($_FILES['archivo']);
        if (!$nueva) { echo json_encode(['exito'=>false,'mensaje'=>'Archivo no válido. Solo JPG/PNG/GIF/WEBP, máx 5 MB.']); exit; }
        borrarArchivoLocal($actual['url_imagen']);
        $url_imagen = $nueva;
    } elseif (!empty($url_ext) && $url_ext !== $actual['url_imagen']) {
        borrarArchivoLocal($actual['url_imagen']);
        $url_imagen = $url_ext;
    }

    $db->prepare(
        "UPDATE imagenes SET titulo=:t, descripcion=:d, url_imagen=:u, activo=:a, orden=:o WHERE id=:id"
    )->execute([':t'=>$titulo,':d'=>$descripcion,':u'=>$url_imagen,':a'=>$activo,':o'=>$orden,':id'=>$id]);

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen actualizada','url_imagen'=>$url_imagen]);
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $id   = intval($body['id'] ?? 0);
    }
    if (!$id) { http_response_code(422); echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit; }

    $curr = $db->prepare("SELECT url_imagen FROM imagenes WHERE id = :id LIMIT 1");
    $curr->execute([':id'=>$id]);
    $row  = $curr->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['exito'=>false,'mensaje'=>'No encontrada']); exit; }

    $db->prepare("DELETE FROM imagenes WHERE id = :id")->execute([':id'=>$id]);
    borrarArchivoLocal($row['url_imagen']);

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen eliminada correctamente']);
    exit;
}

http_response_code(405);
echo json_encode(['exito'=>false,'mensaje'=>'Método no permitido']);

function subirArchivo(array $file): string|false {
    $permitidos = ['image/jpeg','image/png','image/gif','image/webp'];
    $finfo      = new finfo(FILEINFO_MIME_TYPE);
    $mime       = $finfo->file($file['tmp_name']); 

    if (!in_array($mime, $permitidos, true)) return false;
    if ($file['size'] > 5 * 1024 * 1024)   return false;

    $ext = match($mime) {
        'image/jpeg' => 'jpg', 'image/png'  => 'png',
        'image/gif'  => 'gif', 'image/webp' => 'webp',
        default      => false,
    };
    if (!$ext) return false;

    $nombre  = uniqid('img_', true) . '.' . $ext;
    $destino = IMG_DIR . $nombre;

    if (!move_uploaded_file($file['tmp_name'], $destino)) return false;
    chmod($destino, 0644);
    return 'img/' . $nombre;
}

function borrarArchivoLocal(string $url): void {
    if (empty($url)) return;
    if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) return;
    $ruta = __DIR__ . '/' . ltrim($url, '/');
    if (file_exists($ruta) && is_file($ruta)) @unlink($ruta);
}

