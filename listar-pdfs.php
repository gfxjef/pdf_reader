<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Ruta a la carpeta de PDFs
$carpeta = 'pdfs/';
$archivos = [];

// Verificar que la carpeta existe
if (is_dir($carpeta)) {
    if ($dir = opendir($carpeta)) {
        while (($archivo = readdir($dir)) !== false) {
            // Filtrar solo archivos PDF y excluir directorios . y ..
            if ($archivo != "." && $archivo != ".." && pathinfo($archivo, PATHINFO_EXTENSION) == 'pdf') {
                $archivos[] = $archivo;
            }
        }
        closedir($dir);
    }
}

// Ordenar alfabéticamente
sort($archivos);

// Devolver la lista en formato JSON
echo json_encode($archivos);
?>