<?php
require_once 'conexion.php';
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('UPLOAD_DIR', __DIR__ . '/img/uploads/');
define('UPLOAD_URL', 'img/uploads/');

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

function procesarArchivo(array $file, array $tipos, int $maxSize): string {
    $errores = [
        UPLOAD_ERR_INI_SIZE   => 'El archivo supera el límite del servidor',
        UPLOAD_ERR_FORM_SIZE  => 'El archivo supera el límite del formulario',
        UPLOAD_ERR_PARTIAL    => 'La subida fue interrumpida',
        UPLOAD_ERR_NO_FILE    => 'No se seleccionó archivo',
        UPLOAD_ERR_NO_TMP_DIR => 'Falta directorio temporal en el servidor',
        UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir en disco',
        UPLOAD_ERR_EXTENSION  => 'Extensión PHP bloqueó la subida',
    ];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException($errores[$file['error']] ?? 'Error al subir archivo');
    }
    if ($file['size'] > $maxSize) {
        throw new RuntimeException('El archivo supera el límite de ' . ($maxSize / 1024 / 1024) . ' MB');
    }

    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReal = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeReal, $tipos, true)) {
        throw new RuntimeException('Tipo no permitido. Solo JPG, PNG, GIF o WebP.');
    }

    $ext  = ['image/jpeg' => 'jpg', 'image/png' => 'png',
             'image/gif' => 'gif', 'image/webp' => 'webp'][$mimeReal];
    $dest = UPLOAD_DIR . uniqid('img_', true) . '.' . $ext;

    $ok = isset($file['_raw'])
        ? (file_put_contents($dest, $file['_raw']) !== false)
        : move_uploaded_file($file['tmp_name'], $dest);

    if (!$ok) throw new RuntimeException('No se pudo guardar el archivo');

    return UPLOAD_URL . basename($dest);
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

if ($method === 'POST') {
    header('Content-Type: application/json');

    $esMultipart = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');

    if ($esMultipart) {
        $titulo      = trim($_POST['titulo']      ?? '');
        $descripcion = trim($_POST['descripcion'] ?? '');
        $orden       = intval($_POST['orden']     ?? 0);
        $activo      = isset($_POST['activo']) ? (int)(bool)$_POST['activo'] : 1;

        if (empty($titulo)) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>'El título es requerido']); exit;
        }
        if (empty($_FILES['archivo']) || $_FILES['archivo']['error'] === UPLOAD_ERR_NO_FILE) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>'No se envió ningún archivo']); exit;
        }

        try {
            $url_imagen = procesarArchivo($_FILES['archivo'], $TIPOS_PERMITIDOS, $TAMANO_MAX);
        } catch (RuntimeException $e) {
            http_response_code(422);
            echo json_encode(['exito'=>false,'mensaje'=>$e->getMessage()]); exit;
        }

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
    }

    $id = insertarImagen($db, $titulo, $descripcion ?? '', $url_imagen, $activo, $orden);
    echo json_encode(['exito'=>true,'mensaje'=>'Imagen creada','id'=>$id,'url_imagen'=>$url_imagen]);
    exit;
}

if ($method === 'PUT') {
    header('Content-Type: application/json');

    $esMultipart    = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
    $url_nueva      = null;
    $input          = [];

    if ($esMultipart) {
        preg_match('/boundary=(.*)$/', $_SERVER['CONTENT_TYPE'], $bm);
        $boundary = trim($bm[1] ?? '');
        $raw      = file_get_contents('php://input');
        $parts    = array_slice(explode('--' . $boundary, $raw), 1, -1);
        $fileData = null;

        foreach ($parts as $part) {
            [$rawHeaders, $body] = array_pad(explode("\r\n\r\n", $part, 2), 2, '');
            $body = substr($body, 0, -2);
            preg_match('/name="([^"]+)"/', $rawHeaders, $nm);
            $name = $nm[1] ?? '';

            if (str_contains($rawHeaders, 'filename=')) {
                preg_match('/filename="([^"]*)"/', $rawHeaders, $fn);
                if (!empty($fn[1]) && !empty($body)) {
                    $tmp = tempnam(sys_get_temp_dir(), 'put_');
                    file_put_contents($tmp, $body);
                    $fileData = ['tmp_name'=>$tmp,'_raw'=>$body,
                                 'error'=>UPLOAD_ERR_OK,'size'=>strlen($body)];
                }
            } else {
                $input[$name] = $body;
            }
        }

        if ($fileData) {
            try {
                $url_nueva = procesarArchivo($fileData, $TIPOS_PERMITIDOS, $TAMANO_MAX);
                $input['url_imagen'] = $url_nueva;
            } catch (RuntimeException $e) {
                http_response_code(422);
                echo json_encode(['exito'=>false,'mensaje'=>$e->getMessage()]); exit;
            } finally {
                if (!empty($fileData['tmp_name']) && file_exists($fileData['tmp_name'])) {
                    @unlink($fileData['tmp_name']);
                }
            }
        }

    } else {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
    }

    $id = intval($input['id'] ?? 0);
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

    echo json_encode(['exito'=>true,'mensaje'=>'Imagen actualizada','url_imagen'=>$url_nueva]);
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
    $db->prepare("UPDATE imagenes SET activo = 0 WHERE id = :id")->execute([':id'=>$id]);
    echo json_encode(['exito'=>true,'mensaje'=>'Imagen eliminada']);
    exit;
}

http_response_code(405);
header('Content-Type: application/json');
echo json_encode(['exito'=>false,'mensaje'=>'Método no permitido']);
