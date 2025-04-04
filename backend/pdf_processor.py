import os
import shutil
from pdf2image import convert_from_path
from PIL import Image
import logging
import time

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self, base_dir='data/images'):
        """Inicializa el procesador de PDF."""
        self.base_dir = base_dir
        # Asegurar que existan los directorios
        os.makedirs(self.base_dir, exist_ok=True)
        # Estado del procesamiento
        self.current_progress = {
            "status": "idle",
            "current_file": None,
            "current_page": 0,
            "total_pages": 0,
            "percentage": 0
        }
    
    def get_progress(self):
        """Devuelve el estado actual del procesamiento."""
        return self.current_progress
    
    def process_pdf(self, pdf_path, delete_after=False):
        """
        Procesa un PDF y extrae imágenes de todas sus páginas.
        
        Args:
            pdf_path: Ruta al archivo PDF
            delete_after: Si se debe eliminar el PDF original después
            
        Returns:
            dict: Información del procesamiento
        """
        try:
            # Actualizar estado a "procesando"
            pdf_filename = os.path.basename(pdf_path)
            self.current_progress = {
                "status": "processing",
                "current_file": pdf_filename,
                "current_page": 0,
                "total_pages": 0,
                "percentage": 0,
                "start_time": time.time()
            }
            
            # Obtener el nombre del archivo sin la ruta
            pdf_dir = os.path.join(self.base_dir, pdf_filename)
            pdf_images_dir = os.path.join(pdf_dir, 'pdf')
            thumb_images_dir = os.path.join(pdf_dir, 'thumbnail')
            original_dir = os.path.join(pdf_dir, 'original')
            
            # Crear estructura de directorios
            os.makedirs(pdf_dir, exist_ok=True)
            os.makedirs(pdf_images_dir, exist_ok=True)
            os.makedirs(thumb_images_dir, exist_ok=True)
            os.makedirs(original_dir, exist_ok=True)
            
            # Guardar una copia del PDF original
            original_pdf_path = os.path.join(original_dir, pdf_filename)
            shutil.copy2(pdf_path, original_pdf_path)
            logger.info(f"PDF original guardado en: {original_pdf_path}")
            
            # Convertir PDF a imágenes
            logger.info(f"Convirtiendo PDF: {pdf_filename}")
            images = convert_from_path(pdf_path, dpi=300)
            
            # Actualizar total de páginas
            total_pages = len(images)
            self.current_progress["total_pages"] = total_pages
            
            image_paths = []
            
            # Crear miniatura solo de la primera página
            if total_pages > 0:
                first_image = images[0]
                # Crear y guardar miniatura de la primera página
                width, height = first_image.size
                new_width = 500
                new_height = int((new_width / width) * height)
                
                thumb = first_image.resize((new_width, new_height), Image.LANCZOS)
                thumb_path = os.path.join(thumb_images_dir, f"thumb_1.webp")
                thumb.save(thumb_path, 'WEBP', quality=75)
                logger.info(f"Creada miniatura para {pdf_filename}")
            
            # Procesar cada página
            for i, image in enumerate(images):
                # Actualizar progreso
                page_num = i + 1
                self.current_progress["current_page"] = page_num
                self.current_progress["percentage"] = int((page_num / total_pages) * 100)
                
                # Nombre de archivo para la página
                image_filename = f"page_{page_num}.webp"
                
                # Rutas completas
                image_path = os.path.join(pdf_images_dir, image_filename)
                
                # Guardar imagen completa
                image.save(image_path, 'WEBP', quality=90)
                image_paths.append(image_path)
                
                logger.info(f"Procesada página {page_num}/{total_pages} ({self.current_progress['percentage']}%) de {pdf_filename}")
            
            # Opcionalmente eliminar el PDF original
            if delete_after and os.path.exists(pdf_path):
                os.remove(pdf_path)
                logger.info(f"PDF original eliminado: {pdf_path}")
            
            # Calcular tiempo total de procesamiento
            elapsed_time = time.time() - self.current_progress["start_time"]
            
            # Actualizar estado a "completado"
            self.current_progress = {
                "status": "completed",
                "current_file": pdf_filename,
                "current_page": total_pages,
                "total_pages": total_pages,
                "percentage": 100,
                "elapsed_time": elapsed_time
            }
            
            return {
                "success": True,
                "pdf_name": pdf_filename,
                "pages": total_pages,
                "directory": pdf_dir,
                "images": image_paths,
                "thumbnail": os.path.join(thumb_images_dir, "thumb_1.webp"),
                "original_pdf": original_pdf_path,
                "processing_time": elapsed_time
            }
            
        except Exception as e:
            # Actualizar estado a "error"
            self.current_progress = {
                "status": "error",
                "error_message": str(e),
                "current_file": pdf_filename if 'pdf_filename' in locals() else None
            }
            
            logger.error(f"Error procesando PDF {pdf_path}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "pdf_path": pdf_path
            }