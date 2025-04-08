# backend/app.py
from flask import Flask, Blueprint, send_from_directory, jsonify, redirect, url_for, request, flash
import os
from werkzeug.utils import secure_filename
import shutil
import uuid

# Importación relativa del módulo que procesa PDFs
from .pdf_processor import PDFProcessor

# --------------------------
# Configuración de la aplicación
# --------------------------
app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # Limitar a 50 MB
app.secret_key = os.urandom(24)

# Crear los directorios necesarios
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.static_folder, 'pdf'), exist_ok=True)

# Inicializar el procesador de PDF
pdf_processor = PDFProcessor()

# --------------------------
# Definición del Blueprint para PDF
# --------------------------
pdf_bp = Blueprint('pdf_bp', __name__)

# Lista de extensiones permitidas
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@pdf_bp.route('/progreso-pdf')
def progreso_pdf():
    progress = pdf_processor.get_progress()
    return jsonify(progress)

@pdf_bp.route('/listar-directorio')
def listar_directorio():
    dir_path = request.args.get('dir', '')
    allowed_dirs = {
        'pdf': os.path.join(app.static_folder, 'pdf')
    }
    if dir_path not in allowed_dirs or not os.path.exists(allowed_dirs[dir_path]):
        return jsonify([])
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
        return jsonify({'error': str(e)}), 500

@pdf_bp.route('/listar-pdfs')
def listar_pdfs():
    pdfs = []
    pdf_dir = os.path.join(app.static_folder, 'pdf')
    if os.path.exists(pdf_dir):
        for carpeta in os.listdir(pdf_dir):
            pdf_folder = os.path.join(pdf_dir, carpeta)
            if os.path.isdir(pdf_folder):
                for archivo in os.listdir(pdf_folder):
                    if archivo.lower().endswith('.pdf'):
                        pdfs.append(archivo)
    pdfs.sort()
    return jsonify(pdfs)

@pdf_bp.route('/listar-pdfs-procesados')
def listar_pdfs_procesados():
    processed_pdfs = []
    frontend_pdf_dir = os.path.join(app.static_folder, 'pdf')
    if os.path.exists(frontend_pdf_dir):
        for pdf_folder in os.listdir(frontend_pdf_dir):
            folder_path = os.path.join(frontend_pdf_dir, pdf_folder)
            if os.path.isdir(folder_path):
                page_files = [f for f in os.listdir(folder_path) if f.startswith('page_') and f.endswith('.webp')]
                page_count = len(page_files)
                if page_count > 0:
                    thumbnail = None
                    for file in os.listdir(folder_path):
                        if file.startswith('thumb_') and file.endswith('.webp'):
                            thumbnail = f'/pdf/{pdf_folder}/{file}'
                            break
                    processed_pdfs.append({
                        'name': pdf_folder,
                        'pages': page_count,
                        'has_images': True,
                        'thumbnail': thumbnail or f'/pdf/{pdf_folder}/page_1.webp'
                    })
    return jsonify(processed_pdfs)

@pdf_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'pdf' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió archivo PDF'}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No se seleccionó archivo'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)

        result = pdf_processor.process_pdf(temp_path, delete_after=True)
        if result['success']:
            return jsonify({
                'success': True,
                'pdf_name': result['pdf_name'],
                'pages': result['pages'],
                'message': f'PDF procesado correctamente con {result["pages"]} páginas'
            })
        else:
            return jsonify({'success': False, 'error': result['error']}), 500

    return jsonify({'success': False, 'error': 'Tipo de archivo no permitido'}), 400

@pdf_bp.route('/pdf/<path:path>')
def serve_frontend_pdf_files(path):
    directory, file = os.path.split(path)
    return send_from_directory(os.path.join(app.static_folder, 'pdf', directory), file)

# Registrar el blueprint en la aplicación principal
app.register_blueprint(pdf_bp)

# --------------------------
# Rutas de la aplicación principal (HTML)
# --------------------------
@app.route('/')
def index():
    return redirect(url_for('catalogo'))

@app.route('/catalogo')
def catalogo():
    return app.send_static_file('catalogo.html')

@app.route('/upload')
def upload_page():
    return app.send_static_file('upload.html')

# --------------------------
# Punto de entrada para desarrollo
# --------------------------
if __name__ == '__main__':
    app.run(debug=True)
