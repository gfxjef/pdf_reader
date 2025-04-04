from flask import Flask, send_from_directory, jsonify, redirect, url_for, request, flash
from werkzeug.utils import secure_filename
import os
import uuid
import shutil  # Añadir esta importación
from pdf_processor import PDFProcessor

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
os.makedirs('data/images', exist_ok=True)
os.makedirs(os.path.join(app.static_folder, 'pdfs'), exist_ok=True)  # Asegurar carpeta frontend/pdfs

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

@app.route('/pdfs/<path:filename>')
def serve_pdf(filename):
    """Endpoint para servir archivos PDF directamente"""
    return send_from_directory(os.path.join(app.static_folder, 'pdfs'), filename)

@app.route('/data/images/<path:path>')
def serve_images(path):
    """Endpoint para servir imágenes generadas"""
    directory, file = os.path.split(path)
    return send_from_directory(os.path.join('data/images', directory), file)

@app.route('/listar-pdfs')
def listar_pdfs():
    """Endpoint para listar los PDFs disponibles"""
    pdf_dir = os.path.join(app.static_folder, 'pdfs')
    pdfs = []
    
    if os.path.exists(pdf_dir):
        for archivo in os.listdir(pdf_dir):
            if archivo.lower().endswith('.pdf'):
                pdfs.append(archivo)
    
    pdfs.sort()  # Ordenar alfabéticamente
    return jsonify(pdfs)

@app.route('/listar-pdfs-procesados')
def listar_pdfs_procesados():
    """Endpoint para listar PDFs procesados y contar sus páginas basándose en las imágenes .webp"""
    images_dir = 'data/images'
    processed_pdfs = []
    
    if os.path.exists(images_dir):
        for pdf_folder in os.listdir(images_dir):
            pdf_path = os.path.join(images_dir, pdf_folder)
            
            # Verificar que tenga la estructura esperada de directorios
            if os.path.isdir(pdf_path):
                pdf_images_dir = os.path.join(pdf_path, 'pdf')
                if os.path.exists(pdf_images_dir):
                    # Contar archivos .webp en el directorio pdf/
                    page_count = len([f for f in os.listdir(pdf_images_dir) 
                                   if f.startswith('page_') and f.endswith('.webp')])
                    
                    if page_count > 0:
                        processed_pdfs.append({
                            'name': pdf_folder,
                            'pages': page_count,
                            'has_images': True,
                            'thumbnail': f'/data/images/{pdf_folder}/thumbnail/thumb_1.webp'
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
        # Guardar el archivo subido
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        # Hacer una copia del archivo original antes de procesarlo
        frontend_pdf_path = os.path.join(app.static_folder, 'pdfs', filename)
        shutil.copy2(temp_path, frontend_pdf_path)
        
        # Procesar el PDF (ahora NO eliminamos el original después de procesarlo)
        result = pdf_processor.process_pdf(temp_path, delete_after=False)
        
        # Ahora podemos eliminar el archivo temporal
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
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