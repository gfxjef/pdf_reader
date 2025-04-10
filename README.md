# PDF Reader

Una aplicación web para procesar, gestionar y visualizar documentos PDF, que extrae las páginas como imágenes WebP optimizadas y ofrece una interfaz de visualización adaptativa para diferentes dispositivos.

## Características

- **Procesamiento de PDFs**: Convierte archivos PDF en imágenes WebP de alta calidad
- **Interfaz de catálogo**: Visualiza todos los PDFs disponibles con miniaturas
- **Visor de documentos responsivo**: Adaptado automáticamente a desktop, tablet y móvil
- **Efectos de página**: Animaciones al pasar páginas simulando un libro real
- **Zoom integrado**: Función de zoom para examinar detalles en las páginas
- **Navegación intuitiva**: Controles táctiles y botones para navegar por el documento
- **Seguimiento de progreso**: Monitoreo en tiempo real del procesamiento de PDFs
- **Interfaz de carga**: Carga sencilla de nuevos documentos con arrastrar y soltar

## Requisitos previos

### PyMuPDF (Requerido)

La aplicación utiliza PyMuPDF (fitz) para procesar PDFs. Se instalará automáticamente con los requisitos.

### Poppler (Opcional como respaldo)

Poppler se usa como sistema de respaldo para procesar PDFs en caso de problemas con PyMuPDF:

#### En macOS:

```bash
# Instalar Homebrew si no lo tienes
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Poppler
brew install poppler
```

#### En Windows:

1. Descarga el binario de Poppler para Windows desde [aquí](https://github.com/oschwartz10612/poppler-windows/releases/)
2. Extrae el archivo en una ubicación como `C:\Program Files\poppler`
3. Añade la carpeta `bin` del directorio de Poppler a tu PATH del sistema

#### En Linux (Ubuntu/Debian):

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### Python y dependencias

La aplicación requiere Python 3.8 o superior y las siguientes dependencias principales:
- Flask: Para el servidor web
- PyMuPDF (fitz): Para procesar PDFs
- Pillow: Para manipulación de imágenes
- pdf2image: Como respaldo para la conversión de PDFs

## Instalación

1. Clona este repositorio o descarga los archivos:
```bash
git clone https://github.com/tu-usuario/pdf_reader.git
cd pdf_reader
```

2. Crea un entorno virtual (recomendado):
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instala las dependencias:
```bash
pip install -r backend/requirements.txt
```

4. Verifica que PyMuPDF se haya instalado correctamente:
```bash
python -c "import fitz; print(fitz.__version__)"
```

## Uso

### Iniciar la aplicación

1. Ejecuta el servidor Flask:
```bash
python -m backend.app
```

2. Abre tu navegador en [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

### Navegar por la aplicación

- **Vista de catálogo**: La página principal muestra todos los PDFs disponibles
- **Visor de PDF**: Haz clic en cualquier PDF para abrirlo en el visor
- **Subir nuevo PDF**: Accede a la página de subida desde el botón correspondiente

### Cargar nuevos PDFs

1. Navega a la página de carga (botón "Subir" en el catálogo)
2. Arrastra un archivo PDF o haz clic para seleccionarlo (máximo 50MB)
3. Presiona "Subir y Procesar"
4. Espera a que termine el procesamiento, podrás ver el progreso en tiempo real

## Estructura del proyecto

```
pdf_reader/
├── backend/                # Código del servidor
│   ├── __init__.py
│   ├── app.py              # Aplicación Flask y endpoints API
│   ├── pdf_processor.py    # Lógica de procesamiento de PDFs
│   └── requirements.txt    # Dependencias del proyecto
├── frontend/               # Interfaz de usuario
│   ├── catalogo.html       # Página de listado de PDFs
│   ├── index.html          # Visor de PDFs
│   ├── upload.html         # Página para subir PDFs
│   ├── css/
│   │   └── styles.css      # Estilos de la aplicación
│   ├── js/
│   │   ├── desktop.js      # Lógica para dispositivos de escritorio
│   │   ├── tablet.js       # Lógica para tablets
│   │   ├── mobile.js       # Lógica para dispositivos móviles
│   │   └── loader.js       # Gestión de carga de contenido
│   └── pdf/                # Carpeta donde se almacenan los PDFs procesados
│       └── [nombre_pdf]/   # Una carpeta por cada PDF procesado
│           ├── page_1.webp # Páginas como imágenes WebP
│           ├── page_2.webp
│           ├── ...
│           └── thumb_1.webp # Miniatura del documento
└── uploads/                # Carpeta temporal para archivos subidos
```

## API REST

La aplicación proporciona los siguientes endpoints:

- `GET /`: Redirecciona a la página del catálogo
- `GET /catalogo`: Página principal con listado de PDFs
- `GET /upload`: Página para subir nuevos PDFs
- `POST /upload-pdf`: Endpoint para subir y procesar PDFs
- `GET /progreso-pdf`: Obtiene el estado actual del procesamiento de PDFs
- `GET /listar-pdfs`: Lista los PDFs disponibles
- `GET /listar-pdfs-procesados`: Lista PDFs procesados con metadatos (páginas, miniaturas)
- `GET /pdf/<path>`: Sirve los archivos procesados (imágenes WebP)

## Visualización adaptativa

La aplicación detecta automáticamente el tipo de dispositivo y carga la interfaz optimizada:

- **Escritorio**: Vista de doble página con efectos de libro
- **Tablet**: Vista adaptable que cambia entre simple y doble según orientación
- **Móvil**: Vista de página única con controles táctiles

## Solución de problemas

### El PDF no se procesa correctamente

1. Verifica que el archivo no exceda los 50MB
2. Asegúrate de que PyMuPDF esté instalado correctamente
3. Como alternativa, instala Poppler para usar el sistema de respaldo

### Las imágenes no se cargan en el visor

1. Verifica que la carpeta `frontend/pdf/` exista y tenga permisos de escritura
2. Revisa los logs del servidor para identificar errores durante el procesamiento

### El visor no funciona correctamente

1. Limpia la caché del navegador
2. Verifica que JavaScript esté habilitado
3. Prueba con otro navegador para descartar problemas de compatibilidad

## Licencia

Este proyecto está bajo licencia MIT. Consulta el archivo LICENSE para más detalles.