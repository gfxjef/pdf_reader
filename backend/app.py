from flask import Flask, send_from_directory, jsonify, redirect, url_for, request, flash
from werkzeug.utils import secure_filename
import os
import uuid
import shutil  # Añadir esta importación
from .pdf_processor import PDFProcessor

# Configuración de carga de archivos
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}

app = Flask(__name__, 
            static_folder='../frontend',
            static_url_path='')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # Limitar a 50MB
app.secret_key = os.urandom(24)  # Para mensajes flash

# Asegurar que existan los directorios necesarios
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.join(app.static_folder, 'pdf'), exist_ok=True)  # Asegurar carpeta frontend/pdf

# Inicializar el procesador de PDF
pdf_processor = PDFProcessor()

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    # Redirigir a la página de catálogo
    return redirect(url_for('catalogo'))

# Añadir este nuevo endpoint después de los otros endpoints
@app.route('/progreso-pdf')
def progreso_pdf():
    """Endpoint para consultar el progreso del procesamiento de PDF"""
    progress = pdf_processor.get_progress()
    return jsonify(progress)

@app.route('/catalogo')
def catalogo():
    return app.send_static_file('catalogo.html')

@app.route('/upload')
def upload_page():
    return app.send_static_file('upload.html')

# Nuevo endpoint para servir archivos desde la carpeta pdf/
@app.route('/pdf/<path:path>')
def serve_frontend_pdf_files(path):
    """Endpoint para servir archivos desde la carpeta pdf en frontend"""
    directory, file = os.path.split(path)
    return send_from_directory(os.path.join(app.static_folder, 'pdf', directory), file)

# Nuevo endpoint para listar directorios
@app.route('/listar-directorio')
def listar_directorio():
    """Endpoint para listar contenidos de un directorio específico"""
    dir_path = request.args.get('dir', '')
    
    # Por seguridad, solo permitir directorios específicos
    allowed_dirs = {
        'pdf': os.path.join(app.static_folder, 'pdf')
    }
    
    if dir_path not in allowed_dirs or not os.path.exists(allowed_dirs[dir_path]):
        return jsonify([])
    
    # Listar contenidos del directorio
    try:
        items = []
        for item in os.listdir(allowed_dirs[dir_path]):
            item_path = os.path.join(allowed_dirs[dir_path], item)
            is_dir = os.path.isdir(item_path)
            items.append({
                'name': item + ('/' if is_dir else ''),
                'isDirectory': is_dir,
                'path': os.path.join(dir_path, item)
            })
        return jsonify(items)
    except Exception as e:
        print(f"Error al listar directorio {dir_path}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/listar-pdfs')
def listar_pdfs():
    """Endpoint para listar los PDFs disponibles"""
    pdfs = []
    
    # Buscar en frontend/pdf
    pdf_dir = os.path.join(app.static_folder, 'pdf')
    if os.path.exists(pdf_dir):
        for carpeta in os.listdir(pdf_dir):
            pdf_folder = os.path.join(pdf_dir, carpeta)
            if os.path.isdir(pdf_folder):
                # Buscar archivos PDF dentro de esta carpeta
                for archivo in os.listdir(pdf_folder):
                    if archivo.lower().endswith('.pdf'):
                        pdfs.append(archivo)
    
    pdfs.sort()  # Ordenar alfabéticamente
    return jsonify(pdfs)

@app.route('/listar-pdfs-procesados')
def listar_pdfs_procesados():
    """Endpoint para listar PDFs procesados y contar sus páginas basándose en las imágenes .webp"""
    processed_pdfs = []
    
    # Buscar en frontend/pdf (nueva estructura)
    frontend_pdf_dir = os.path.join(app.static_folder, 'pdf')
    if os.path.exists(frontend_pdf_dir):
        for pdf_folder in os.listdir(frontend_pdf_dir):
            folder_path = os.path.join(frontend_pdf_dir, pdf_folder)
            
            if os.path.isdir(folder_path):
                # Contar archivos .webp en la carpeta
                page_files = [f for f in os.listdir(folder_path) 
                           if f.startswith('page_') and f.endswith('.webp')]
                page_count = len(page_files)
                
                if page_count > 0:
                    # Buscar un archivo thumbnail
                    thumbnail = None
                    for file in os.listdir(folder_path):
                        if file.startswith('thumb_') and file.endswith('.webp'):
                            thumbnail = f'/pdf/{pdf_folder}/{file}'
                            break
                    
                    processed_pdfs.append({
                        'name': pdf_folder,
                        'pages': page_count,
                        'has_images': True,
                        'thumbnail': thumbnail or f'/pdf/{pdf_folder}/page_1.webp'  # Usar la primera página como miniatura si no hay una específica
                    })
    
    return jsonify(processed_pdfs)

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Endpoint para subir y procesar un PDF"""
    if 'pdf' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió archivo PDF'}), 400
    
    file = request.files['pdf']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No se seleccionó archivo'}), 400
    
    if file and allowed_file(file.filename):
        # Guardar el archivo subido temporalmente
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        # Procesar el PDF 
        result = pdf_processor.process_pdf(temp_path, delete_after=True)
        
        if result['success']:
            return jsonify({
                'success': True,
                'pdf_name': result['pdf_name'],
                'pages': result['pages'],
                'message': f'PDF procesado correctamente con {result["pages"]} páginas'
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
    
    return jsonify({'success': False, 'error': 'Tipo de archivo no permitido'}), 400

if __name__ == '__main__':
    app.run(debug=True)