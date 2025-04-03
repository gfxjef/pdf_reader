from flask import Flask, send_from_directory, jsonify, redirect, url_for
import os

app = Flask(__name__, 
            static_folder='../frontend',
            static_url_path='')  # Cambiado a '' en lugar de '/static'

@app.route('/')
def index():
    # Redirigir a la página de catálogo
    return redirect(url_for('catalogo'))

@app.route('/catalogo')
def catalogo():
    return app.send_static_file('catalogo.html')

@app.route('/pdfs/<path:filename>')
def serve_pdf(filename):
    """Endpoint para servir archivos PDF directamente"""
    return send_from_directory(os.path.join(app.static_folder, 'pdfs'), filename)

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

if __name__ == '__main__':
    app.run(debug=True)