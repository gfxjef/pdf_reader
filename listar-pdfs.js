// Este archivo reemplaza la funcionalidad de listar-pdfs.php para entornos sin soporte PHP
// Se usa junto con catalogo.html para listar los PDFs de la carpeta /pdfs/

// Función para explorar la carpeta pdfs/ y encontrar archivos PDF
async function getPDFsFromDirectory() {
    try {
        // Intentamos acceder al directorio pdfs/
        const response = await fetch('pdfs/');
        const html = await response.text();
        
        // Creamos un parser DOM para analizar la respuesta HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Buscamos todos los enlaces (que pueden ser archivos)
        const links = doc.querySelectorAll('a');
        const pdfFiles = [];
        
        // Filtramos para quedarnos solo con archivos PDF
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.toLowerCase().endsWith('.pdf')) {
                // Decodificamos el nombre del archivo (por si tiene espacios u otros caracteres especiales)
                const fileName = decodeURIComponent(href);
                pdfFiles.push(fileName);
            }
        });
        
        return pdfFiles;
    } catch (error) {
        console.error('Error al escanear el directorio:', error);
        // Si falla, devolvemos una lista conocida como respaldo
        return fallbackPdfList();
    }
}

// Lista de respaldo en caso de que falle la detección automática
function fallbackPdfList() {
    return [
        "Catalogo de Alimentos y bebidas - Kossodo 2025.pdf",
        "Catalogo de Industria Farmaceutica - Kossodo 2025.pdf",
        "Catalogo de indutria  Farmaeuticas- Kossodo 2025.pdf",
        "Catalogo de Mineria - Kossodo 2025.pdf",
        "Catalogo de Pesca - Kossodo 2025.pdf",
        "10480528501-R01-E001-28.pdf"
    ];
}

// Ejecutamos la función para obtener los PDFs
getPDFsFromDirectory().then(pdfs => {
    // Configuramos los headers para que se comporte como una API JSON
    const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    // Devolvemos la lista en formato JSON
    document.write(JSON.stringify(pdfs));
}).catch(error => {
    console.error('Error al procesar los PDFs:', error);
    document.write(JSON.stringify(fallbackPdfList()));
});