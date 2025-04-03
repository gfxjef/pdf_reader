// Factor de zoom global: 1 = estado base, 2.0 = zoom in.
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página.
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  if (typeof $.fn.turn !== 'function') {
    console.error('Turn.js NO se ha cargado. Verifica la URL y el orden de los scripts.');
  } else {
    console.log('Turn.js cargado correctamente.');
  }
  
  // URL del PDF (modifica esta variable según corresponda)
  const pdfUrl = 'catalogo2.pdf';
  
  const flipbookContainer = document.getElementById('flipbook');
  let pagesRendered = 0;
  
  // Cargar el PDF usando PDF.js
  pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
    const numPages = pdf.numPages;
    console.log("Número de páginas:", numPages);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdf.getPage(pageNum).then(function(page) {
        // Usar una escala mayor para buena calidad
        const scale = 2.0;
        const viewport = page.getViewport({ scale: scale });
        
        // Guardar dimensiones de la primera página para referencia
        if (pageNum === 1) {
          pageWidth = viewport.width;
          pageHeight = viewport.height;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
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
  
  // Función para inicializar el flipbook y centrar el wrapper
  function initializeFlipbook() {
    // Calcular dimensiones responsivas
    const dimensions = calculateResponsiveDimensions();
    
    $('#flipbook').turn({
      width: dimensions.width,
      height: dimensions.height,
      autoCenter: false,
      display: 'double'
    });
    
    centerWrapper(dimensions.width, dimensions.height);
    $('#flipbook').turn('page', 1);
  }
  
  // Función para calcular dimensiones responsivas
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = pageWidth / pageHeight;
    
    // Determinar si estamos limitados por ancho o por alto
    // Reservar espacio para botones y márgenes (ajustar según necesidad)
    const maxWidth = viewportWidth * 0.95;
    const maxHeight = viewportHeight * 0.9;
    
    // Calcular dimensiones basadas en pantalla doble (2 páginas lado a lado)
    // Para una sola página, el aspect ratio sería pageAspectRatio
    // Para dos páginas, el aspect ratio es 2 * pageAspectRatio
    const flipbookAspectRatio = 2 * pageAspectRatio;
    
    let width, height;
    
    // Si el ancho disponible dividido por la relación de aspecto es menor que la altura máxima,
    // entonces el ancho es el factor limitante
    if (maxWidth / flipbookAspectRatio <= maxHeight) {
      width = maxWidth;
      height = width / flipbookAspectRatio;
    } else {
      // La altura es el factor limitante
      height = maxHeight;
      width = height * flipbookAspectRatio;
    }
    
    return {
      width: width,
      height: height
    };
  }
  
  // Función para centrar el wrapper en pantalla
  function centerWrapper(width, height) {
    const left = ($(window).width() - width) / 2;
    const top = ($(window).height() - height) / 2;
    $("#flipbook-wrapper").css({
      width: width + "px",
      height: height + "px",
      left: left + "px",
      top: top + "px",
      "transform": "scale(1)", // Estado base
      "transform-origin": "50% 50%"
    });
  }
  
  // Evento de clic para alternar zoom
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    
    if (currentZoom === 1) {
      // Zoom in: aplicar escala 2.0
      currentZoom = 2.0;
      
      // Calcular la posición del clic relativo al wrapper
      const offset = wrapper.offset();
      const clickX = event.pageX;
      const clickY = event.pageY;
      const relX = clickX - offset.left;
      const relY = clickY - offset.top;
      const ratioX = relX / wrapper.width();
      const ratioY = relY / wrapper.height();
      
      // Guardar el punto de origen para usarlo en el zoom out
      lastTransformOrigin = (ratioX * 100) + "% " + (ratioY * 100) + "%";
      
      // Configurar el transform-origin y aplicar zoom
      wrapper.css({
        "transform-origin": lastTransformOrigin,
        "transform": "scale(2)"
      });
      
    } else {
      // Zoom out: mantener el mismo punto de origen que se usó para el zoom in
      currentZoom = 1;
      wrapper.css({
        "transform": "scale(1)",
        "transform-origin": lastTransformOrigin // Mantener el mismo origen durante el zoom out
      });
      
      // Solo después de completar la animación de zoom out, resetear el origen al centro
      wrapper.one('transitionend', function() {
        wrapper.css({
          "transform-origin": "50% 50%"
        });
      });
    }
  });
  
  // Botones de navegación
  $('#prev-page').on('click', function() {
    $('#flipbook').turn('previous');
  });
  
  $('#next-page').on('click', function() {
    $('#flipbook').turn('next');
  });
  
  $('#first-page').on('click', function() {
    $('#flipbook').turn('page', 1);
  });
  
  // Ajustar el tamaño del flipbook al redimensionar la ventana
  $(window).resize(function() {
    if ($('#flipbook').data('turn')) {
      const dimensions = calculateResponsiveDimensions();
      $('#flipbook').turn('size', dimensions.width, dimensions.height);
      centerWrapper(dimensions.width, dimensions.height);
    }
  });
});
