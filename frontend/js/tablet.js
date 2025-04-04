// Factor de zoom global para tablets: 1 = estado base, 1.5 = zoom in
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  console.log('Modo Tablet: Visualización adaptada para tablets');
  
  if (typeof $.fn.turn !== 'function') {
    console.error('Turn.js NO se ha cargado. Verifica la URL y el orden de los scripts.');
  } else {
    console.log('Turn.js cargado correctamente.');
  }
  
  // URL del PDF - Usa la variable global definida en index.html
  const pdfUrl = selectedPDF || 'pdfs/catalogo2.pdf';
  console.log("Cargando PDF en tablet:", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  let pagesRendered = 0;
  
  // Extraer nombre del archivo PDF sin ruta y extensión
  const pdfFileName = pdfUrl.split('/').pop().replace('.pdf', '');
  
  // NUEVO: Verificar si existen imágenes pre-generadas para este PDF
  checkForPrerenderedImages(pdfFileName)
    .then(imageData => {
      if (imageData.hasImages) {
        console.log(`Usando imágenes pre-generadas (${imageData.pageCount} páginas)`);
        loadPrerenderedImages(imageData.basePath, imageData.pageCount);
      } else {
        console.log('No se encontraron imágenes pre-generadas, renderizando PDF');
        renderPDFDirectly(pdfUrl);
      }
    })
    .catch(error => {
      console.error('Error al verificar imágenes pre-generadas:', error);
      renderPDFDirectly(pdfUrl);
    });
  
  // NUEVA FUNCIÓN: Verificar si existen imágenes pre-generadas para este PDF
  // Modificar la función checkForPrerenderedImages
  async function checkForPrerenderedImages(pdfName) {
    try {
      // Cambiar esto:
      // const response = await fetch('./listar-pdfs-procesados');
      
      // Por esto (ruta absoluta):
      const response = await fetch('/pdf_reader/listar-pdfs-procesados');
      
      const processedPdfs = await response.json();
      
      console.log('PDFs procesados:', processedPdfs); // Añadir para depuración
      console.log('Buscando PDF:', pdfName); // Añadir para depuración
      
      const currentPdf = processedPdfs.find(pdf => 
        pdf.name === pdfName + '.pdf' || 
        pdf.name === pdfName
      );
      
      console.log('PDF encontrado:', currentPdf); // Añadir para depuración
      
      if (currentPdf && currentPdf.has_images) {
        // Cambiar esto:
        // basePath: `./data/images/${currentPdf.name}/pdf`,
        
        // Por esto (ruta absoluta):
        return {
          hasImages: true,
          pageCount: currentPdf.pages,
          basePath: `/pdf_reader/data/images/${currentPdf.name}/pdf`,
          thumbnail: `/pdf_reader${currentPdf.thumbnail}`
        };
      } else {
        return { hasImages: false };
      }
    } catch (error) {
      console.error('Error al verificar imágenes:', error);
      return { hasImages: false };
    }
  }  
  // NUEVA FUNCIÓN: Cargar imágenes pre-generadas
  function loadPrerenderedImages(basePath, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0;
    pageHeight = 0;
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      img.onload = function() {
        imagesLoaded++;
        
        // Guardar las dimensiones de la primera página
        if (pageNum === 1) {
          pageWidth = this.naturalWidth;
          pageHeight = this.naturalHeight;
        }
        
        // Cuando todas las imágenes estén cargadas, inicializar el flipbook
        if (imagesLoaded === pageCount) {
          initializeFlipbook();
          hideLoader();
        }
      };
      
      img.onerror = function() {
        console.error(`Error al cargar imagen para página ${pageNum}`);
        imagesLoaded++;
        
        // Si falla, mostrar una página en blanco con mensaje de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-page';
        errorDiv.innerHTML = `<div class="error-message">Error al cargar página ${pageNum}</div>`;
        $(flipbookContainer).append(errorDiv);
        
        if (imagesLoaded === pageCount) {
          initializeFlipbook();
          hideLoader();
        }
      };
      
      // Establecer la ruta a la imagen WebP de esta página
      img.src = `${basePath}/page_${pageNum}.webp`;
      $(flipbookContainer).append(img);
    }
  }
  
  // FUNCIÓN EXISTENTE MODIFICADA: Renderizado directo de PDF como respaldo
  function renderPDFDirectly(pdfUrl) {
    pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
      const numPages = pdf.numPages;
      console.log("Número de páginas:", numPages);
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        pdf.getPage(pageNum).then(function(page) {
          const scale = 1.0;
          const viewport = page.getViewport({ scale: scale });
          
          if (pageNum === 1) {
            pageWidth = viewport.width;
            pageHeight = viewport.height;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          
          page.render(renderContext).promise.then(function() {
            $(flipbookContainer).append(canvas);
            pagesRendered++;
            if (pagesRendered === numPages) {
              initializeFlipbook();
              hideLoader();
            }
          });
        });
      }
    }).catch(function(error) {
      console.error('Error al cargar el PDF:', error);
    });
  }
  
  // Función para inicializar el flipbook y centrar el wrapper
  function initializeFlipbook() {
    // Calcular dimensiones responsivas
    const dimensions = calculateResponsiveDimensions();
    
    $('#flipbook').turn({
      width: dimensions.width,
      height: dimensions.height,
      autoCenter: true,
      display: $(window).width() > $(window).height() ? 'double' : 'single',
      acceleration: true,
      gradients: true,
      elevation: 50
    });
    
    centerWrapper(dimensions.width, dimensions.height);
    $('#flipbook').turn('page', 1);
  }
  
  // Función para calcular dimensiones responsivas
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = pageWidth / pageHeight;
    
    const maxWidth = viewportWidth * 0.9;
    const maxHeight = viewportHeight * 0.8;
    
    let width, height;
    
    const isLandscape = viewportWidth > viewportHeight;
    const flipbookAspectRatio = isLandscape ? 2 * pageAspectRatio : pageAspectRatio;
    
    if (maxWidth / flipbookAspectRatio <= maxHeight) {
      width = maxWidth;
      height = width / flipbookAspectRatio;
    } else {
      height = maxHeight;
      width = height * flipbookAspectRatio;
    }
    
    return {
      width: width,
      height: height
    };
  }
  
  // El resto del código permanece igual...
  function centerWrapper(width, height) {
    const left = ($(window).width() - width) / 2;
    const top = ($(window).height() - height) / 2;
    
    const maxHeight = $(window).height() * 0.85;
    height = Math.min(height, maxHeight);
    
    $("#flipbook-wrapper").css({
      width: width + "px",
      height: height + "px",
      left: left + "px",
      top: top + "px",
      "transform": "scale(1)",
      "transform-origin": "50% 50%",
      "overflow": "hidden"
    });
  }
  
  // Evento de clic para alternar zoom adaptado para tablets
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    
    if (currentZoom === 1) {
      currentZoom = 1.5;
      
      const offset = wrapper.offset();
      const clickX = event.pageX;
      const clickY = event.pageY;
      const relX = clickX - offset.left;
      const relY = clickY - offset.top;
      const ratioX = relX / wrapper.width();
      const ratioY = relY / wrapper.height();
      
      lastTransformOrigin = (ratioX * 100) + "% " + (ratioY * 100) + "%";
      
      wrapper.css({
        "transform-origin": lastTransformOrigin,
        "transform": `scale(${currentZoom})`
      });
      
    } else {
      currentZoom = 1;
      wrapper.css({
        "transform": "scale(1)",
        "transform-origin": lastTransformOrigin
      });
      
      wrapper.one('transitionend', function() {
        wrapper.css({
          "transform-origin": "50% 50%"
        });
      });
    }
  });
  
  // Botones de navegación con interacción mejorada
  $('#prev-page').on('click', function() {
    $('#flipbook').turn('previous');
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#next-page').on('click', function() {
    $('#flipbook').turn('next');
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#first-page').on('click', function() {
    $('#flipbook').turn('page', 1);
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  // Detectar cambio de orientación para ajustar el modo de visualización
  $(window).on('orientationchange resize', function() {
    setTimeout(function() {
      if ($('#flipbook').data('turn')) {
        const isLandscape = $(window).width() > $(window).height();
        $('#flipbook').turn('display', isLandscape ? 'double' : 'single');
        
        const dimensions = calculateResponsiveDimensions();
        $('#flipbook').turn('size', dimensions.width, dimensions.height);
        centerWrapper(dimensions.width, dimensions.height);
      }
    }, 300);
  });
});