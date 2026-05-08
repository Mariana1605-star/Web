<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard – Proyecto</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <style>
        /* Estilos específicos para las flechas dentro del carrusel */
        .carousel-custom-container {
            position: relative;
            border-radius: 15px;
            overflow: hidden;
            background-color: #1e293b;
            min-height: 450px;
        }

        .nav-btn-custom {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            background-color: rgba(0, 0, 0, 0.3); /* Fondo oscuro sutil */
            border: none;
            color: white;
            padding: 20px 10px;
            transition: background-color 0.3s;
        }

        .nav-btn-custom:hover {
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
        }

        #btn-prev { left: 0; border-radius: 0 5px 5px 0; }
        #btn-next { right: 0; border-radius: 5px 0 0 5px; }

        .carousel-caption-custom {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 5;
        }
    </style>
</head>
<body>

<div class="container-fluid p-3 p-md-4">
    <div class="row g-4">

        <aside class="col-12 col-lg-2">
            <div class="sidebar-container">
                <div class="sidebar-title text-center text-lg-start">Prácticas</div>
                <nav class="nav flex-column nav-pills-custom">
                    <a class="nav-link active" href="#secCarrusel" data-section="carrusel">Carrusel</a>
                    <a class="nav-link" href="#secAdmin" data-section="admin">Administrar</a>
                    <a class="nav-link" href="#">Bordes</a>
                    <a class="nav-link" href="#">Formularios</a>
                    <a class="nav-link" href="#">Ajax</a>
                </nav>
                <div class="mt-4">
                    <a href="logout.php" class="btn btn-outline-danger btn-sm w-100">Cerrar sesión</a>
                </div>
            </div>
        </aside>

        <main class="col-12 col-lg-10 ps-lg-5">
            <h1 class="main-header-title text-center text-lg-start">Proyecto Primer Parcial</h1>

            <section id="secCarrusel" class="mb-5">
                <div class="carousel-custom-container shadow-lg mb-3">
                    
                    <button class="nav-btn-custom" id="btn-prev">
                        <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>

                    <div id="contenedor-ajax" class="d-flex flex-column justify-content-center align-items-center h-100 w-100">
                        <div class="text-white text-center">
                            <div class="spinner-border text-light mb-2"></div>
                            <p>Cargando contenido...</p>
                        </div>
                    </div>

                    <button class="nav-btn-custom" id="btn-next">
                        <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                    </button>

                    <div class="carousel-caption-custom">
                        <span id="contador" class="badge bg-primary mb-1">...</span>
                        <div id="nombre-foto" class="fw-bold"></div>
                    </div>
                </div>

                <div id="infoImagen" class="card p-3 shadow-sm" style="display:none; border-left: 5px solid #0d6efd;">
                    <h5 id="imgTitulo" class="mb-1 fw-bold text-primary"></h5>
                    <p id="imgDescripcion" class="text-muted mb-0"></p>
                </div>
            </section>

            <section id="secAdmin" class="mb-5">
                <div class="admin-panel">
                    <div class="admin-panel-header">
                        <h4 class="admin-panel-title">Administrar Imágenes</h4>
                        <button id="btnNuevaImagen" class="btn-admin-new">Nueva imagen</button>
                    </div>
                    <div class="table-responsive mt-3">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Vista</th>
                                    <th>Título</th>
                                    <th class="text-center">Orden</th>
                                    <th class="text-center">Estado</th>
                                    <th class="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tablaImagenes">
                                <tr><td colspan="5" class="text-center py-4">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="script.js"></script>
</body>
</html>
