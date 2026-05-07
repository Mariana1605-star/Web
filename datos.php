<?php
require_once 'conexion.php';
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('UPLOAD_DIR', __DIR__ . 'img');
define('UPLOAD_URL', 'img/');

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

$TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$TAMANO_MAX       = 5 * 1024 * 1024; // 5 MB

$db     = DB::conectar();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    header('Content-Type: application/json');
    $todas = isset($_GET['todas']) && $_GET['todas'] == '1';
    $where = $todas ? '' : 'WHERE activo = 1';
    $sql   = "SELECT id, titulo, descripcion, url_imagen, activo, orden
              FROM imagenes $where ORDER BY orden ASC, id ASC";
    echo json_encode($db->query($sql)->fetchAll());
    exit;
}

function guardarArchivoEnDisco(string $tmpPath, int $tamanoBytes,
                                array $tiposPermitidos, int $maxSize): string {
    if ($tamanoBytes > $maxSize) {
        throw new RuntimeException('El archivo supera el límite de ' . ($maxSize / 1024 / 1024) . ' MB');
    }
    if (!file_exists($tmpPath) || !is_readable($tmpPath)) {
        throw new RuntimeException('No se puede leer el archivo temporal');
    }

    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeReal = $finfo->file($tmpPath);

    if (!in_array($mimeReal, $tiposPermitidos, true)) {
        throw new RuntimeException('Tipo no permitido. Solo JPG, PNG, GIF o WebP.');
    }

    $extMap  = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'];
    $ext     = $extMap[$mimeReal];
    $nombre  = 'img_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $destino = UPLOAD_DIR . $nombre;

    if (!@copy($tmpPath, $destino)) {
        $contenido = file_get_contents($tmpPath);
        if ($contenido === false || file_put_contents($destino, $contenido) === false) {
            throw new RuntimeException('No se pudo guardar el archivo. Verifica los permisos de img/uploads/');
        }
    }
    @chmod($destino, 0644);

    return UPLOAD_URL . $nombre;
}



function procesarFilesPost(array $file, array $tipos, int $maxSize): string {
    $errores = [
        UPLOAD_ERR_INI_SIZE   => 'El archivo supera el límite del servidor',
        UPLOAD_ERR_FORM_SIZE  => 'El archivo supera el límite del formulario',
        UPLOAD_ERR_PARTIAL    => 'La subida fue interrumpida',
        UPLOAD_ERR_NO_FILE    => 'No se seleccionó archivo',
        UPLOAD_ERR_NO_TMP_DIR => 'Falta directorio temporal en el servidor',
        UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir en disco',
        UPLOAD_ERR_EXTENSION  => 'Una extensión PHP bloqueó la subida',
    ];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException($errores[$file['error']] ?? 'Error al subir (código ' . $file['error'] . ')');
    }
    return guardarArchivoEnDisco($file['tmp_name'], $file['size'], $tipos, $maxSize);
}


function insertarImagen(PDO $db, string $titulo, string $desc,
                        string $url, int $activo, int $orden): int {
    $p = [':titulo'=>$titulo,':descripcion'=>$desc,
          ':url_imagen'=>$url,':activo'=>$activo,':orden'=>$orden];
    if (DB::driver() === 'pgsql') {
        $st = $db->prepare(
            "INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden)
             VALUES (:titulo,:descripcion,:url_imagen,:activo,:orden) RETURNING id");
        $st->execute($p);
        return (int)($st->fetch()['id'] ?? 0);
    }
    $st = $db->prepare(
        "INSERT INTO imagenes (titulo,descripcion,url_imagen,activo,orden)
         VALUES (:titulo,:descripcion,:url_imagen,:activo,:orden)");
    $st->execute($p);
    return (int)$db->lastInsertId();
}

function borrarArchivoLocal(?string $urlRelativa): void {
    if (empty($urlRelativa)) return;
    if (strpos($urlRelativa, 'http') === 0) return;
    if (strpos($urlRelativa, UPLOAD_URL) === false) return;

    $ruta = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $urlRelativa);
    if (file_exists($ruta)) @unlink($ruta);
}

if ($method === 'POST') {
    header('Content-Type: application/json');

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $esMultipart = stripos($contentType, 'multipart/form-data') !== false;

    if ($esMultipart) {
        $esActualizacion = (trim($_POST['_method'] ?? '') === 'PUT');
        $id_edit         = intval($_POST['id'] ?? 0);

        $titulo      = trim($_POST['titulo']      ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $orden       = intval($_POST['orden']     ?? 0);
        $activo      = isset($_POST['activo'])
            ? (int)filter_var($_POST['activo'], FILTER_VALIDATE_BOOLEAN)
            : 1;

        if (empty($titulo)) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>'El título es requerido']); exit;
        }

        if (!isset($_FILES['archivo']) || $_FILES['archivo']['error'] === UPLOAD_ERR_NO_FILE) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>'No se seleccionó ningún archivo']); exit;
        }

        try {
            $url_imagen = procesarFilesPost($_FILES['archivo'], $TIPOS_PERMITIDOS, $TAMANO_MAX);
        } catch (RuntimeException $e) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>$e->getMessage()]); exit;
        }

        if ($esActualizacion && $id_edit) {
            $stOld = $db->prepare("SELECT url_imagen FROM imagenes WHERE id = :id");
            $stOld->execute([':id' => $id_edit]);
            $old   = $stOld->fetch();
            if ($old) borrarArchivoLocal($old['url_imagen']);

            $db->prepare(
                "UPDATE imagenes
                 SET titulo=:titulo, descripcion=:descripcion,
                     url_imagen=:url_imagen, activo=:activo, orden=:orden
                 WHERE id=:id"
            )->execute([
                ':titulo'=>$titulo, ':descripcion'=>$descripcion,
                ':url_imagen'=>$url_imagen, ':activo'=>$activo,
                ':orden'=>$orden, ':id'=>$id_edit,
            ]);
            echo json_encode(['exito'=>true,'mensaje'=>'Imagen actualizada','url_imagen'=>$url_imagen]);
            exit;
        }

        $id = insertarImagen($db, $titulo, $descripcion, $url_imagen, $activo, $orden);
        echo json_encode(['exito'=>true,'mensaje'=>'Imagen creada','id'=>$id,'url_imagen'=>$url_imagen]);
        exit;

    } else {
        $input       = json_decode(file_get_contents('php://input'), true) ?? [];
        $titulo      = trim($input['titulo']      ?? '');
        $descripcion = trim($input['descripcion'] ?? '');
        $url_imagen  = trim($input['url_imagen']  ?? '');
        $orden       = intval($input['orden']     ?? 0);
        $activo      = isset($input['activo']) ? (int)(bool)$input['activo'] : 1;

        if (empty($titulo) || empty($url_imagen)) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>'Título y URL son requeridos']); exit;
        }

        $id = insertarImagen($db, $titulo, $descripcion, $url_imagen, $activo, $orden);
        echo json_encode(['exito'=>true,'mensaje'=>'Imagen creada','id'=>$id,'url_imagen'=>$url_imagen]);
        exit;
    }
}

if ($method === 'PUT') {
    header('Content-Type: application/json');

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id    = intval($input['id'] ?? 0);

    if (!$id) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit;
    }

    $sets   = [];
    $params = [':id' => $id];
    foreach (['titulo','descripcion','url_imagen','orden','activo'] as $campo) {
        if (array_key_exists($campo, $input)) {
            $sets[]            = "$campo = :$campo";
            $params[":$campo"] = in_array($campo, ['activo','orden'])
                ? intval($input[$campo]) : trim($input[$campo]);
        }
    }

    if (empty($sets)) {
        echo json_encode(['exito'=>false,'mensaje'=>'Nada que actualizar']); exit;
    }

    $db->prepare("UPDATE imagenes SET " . implode(', ', $sets) . " WHERE id = :id")
       ->execute($params);

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen actualizada']);
    exit;
}

if ($method === 'DELETE') {
    header('Content-Type: application/json');

    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $id    = intval($input['id'] ?? 0);
    }
    if (!$id) {
        http_response_code(422);
        echo json_encode(['exito'=>false,'mensaje'=>'ID requerido']); exit;
    }

    $stSel = $db->prepare("SELECT url_imagen FROM imagenes WHERE id = :id");
    $stSel->execute([':id' => $id]);
    $fila  = $stSel->fetch();

    $stDel = $db->prepare("DELETE FROM imagenes WHERE id = :id");
    $stDel->execute([':id' => $id]);

    if ($stDel->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['exito'=>false,'mensaje'=>'Imagen no encontrada']); exit;
    }

    if ($fila) borrarArchivoLocal($fila['url_imagen']);

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen eliminada correctamente']);
    exit;
}

http_response_code(405);
header('Content-Type: application/json');
echo json_encode(['exito'=>false,'mensaje'=>'Método no permitido']);
