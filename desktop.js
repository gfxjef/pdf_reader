// Versión optimizada para escritorio - dos páginas a la vez y aprovechamiento de espacio

// Factor de zoom global: 1 = estado base, 1.7 = zoom in.
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página.
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  console.log('Modo Desktop: Visualización óptima de catálogo');
  
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
        // ⭐ MODIFICADO: Reducir la escala para mejor visualización
        const scale = 1.2; // Reducido considerablemente de 2.0 a 1.2
        const viewport = page.getViewport({ scale: scale });
        
        // Guardar dimensiones de la primera página para referencia
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
  
  // Función para inicializar el flipbook y centrar el wrapper
  function initializeFlipbook() {
    // Calcular dimensiones responsivas
    const dimensions = calculateResponsiveDimensions();
    
    $('#flipbook').turn({
      width: dimensions.width,
      height: dimensions.height,
      autoCenter: true, // Cambiado a true para mejor centrado
      display: 'double',
      acceleration: true,
      gradients: true,
      elevation: 50,
      when: {
        turning: function(e, page, view) {
          // Efectos durante el giro
          const book = $(this);
          if (page >= 2) {
            book.addClass('hard-shadow');
          } else {
            book.removeClass('hard-shadow');
          }
        }
      }
    });
    
    centerWrapper(dimensions.width, dimensions.height);
    $('#flipbook').turn('page', 1);
  }
  
  // Función para calcular dimensiones responsivas
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = pageWidth / pageHeight;
    
    // ⭐ MODIFICADO: Ajustar porcentajes para mejor visualización
    const maxWidth = viewportWidth * 0.88; // Reducido para evitar páginas demasiado grandes
    const maxHeight = viewportHeight * 0.85; // Mantener espacio para navegación
    
    // Calcular dimensiones basadas en pantalla doble (2 páginas lado a lado)
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
    
    // ⭐ MODIFICADO: Asegurar que el contenedor no sea más grande que la pantalla
    const maxHeight = $(window).height() * 0.85;
    height = Math.min(height, maxHeight);
    
    $("#flipbook-wrapper").css({
      width: width + "px",
      height: height + "px",
      left: left + "px",
      top: top + "px",
      "transform": "scale(1)", // Estado base
      "transform-origin": "50% 50%",
      "overflow": "hidden" // Evitar desbordamiento durante zoom
    });
  }
  
  // Evento de clic para alternar zoom
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    
    if (currentZoom === 1) {
      // ⭐ MODIFICADO: Zoom reducido para mejor visualización
      currentZoom = 1.5; // Reducido de 2.0 a 1.5
      
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
        "transform": `scale(${currentZoom})`
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
  
  // Botones de navegación con interacción mejorada
  $('#prev-page').on('click', function() {
    $('#flipbook').turn('previous');
    // Efecto visual en el botón
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#next-page').on('click', function() {
    $('#flipbook').turn('next');
    // Efecto visual en el botón
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#first-page').on('click', function() {
    $('#flipbook').turn('page', 1);
    // Efecto visual en el botón
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  // Ajustar el tamaño del flipbook al redimensionar la ventana
  $(window).resize(function() {
    if ($('#flipbook').data('turn')) {
      const dimensions = calculateResponsiveDimensions();
      $('#flipbook').turn('size', dimensions.width, dimensions.height);
      centerWrapper(dimensions.width, dimensions.height);
    }
  });
  
  // Teclas de navegación (característica adicional para desktop)
  $(document).keydown(function(e) {
    switch(e.which) {
      case 37: // Flecha izquierda
        $('#flipbook').turn('previous');
        e.preventDefault();
        break;
      case 39: // Flecha derecha
        $('#flipbook').turn('next');
        e.preventDefault();
        break;
      case 36: // Home
        $('#flipbook').turn('page', 1);
        e.preventDefault();
        break;
    }
  });
});