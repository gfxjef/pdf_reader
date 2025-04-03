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
  const pdfUrl = selectedPDF || 'catalogo2.pdf';
  console.log("Cargando PDF en tablet:", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  let pagesRendered = 0;
  
  // Cargar el PDF usando PDF.js
  pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
    const numPages = pdf.numPages;
    console.log("Número de páginas:", numPages);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdf.getPage(pageNum).then(function(page) {
        // Escala reducida para tablets
        const scale = 1.0; // Más bajo que en desktop para evitar páginas demasiado grandes
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
      autoCenter: true,
      // En tablets, mostramos una página a la vez en orientación portrait
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
    
    // Porcentajes más altos para tablet para maximizar el espacio
    const maxWidth = viewportWidth * 0.9;
    const maxHeight = viewportHeight * 0.8; // Mantener espacio para navegación
    
    let width, height;
    
    // Detectar orientación
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
  
  // Función para centrar el wrapper en pantalla
  function centerWrapper(width, height) {
    const left = ($(window).width() - width) / 2;
    const top = ($(window).height() - height) / 2;
    
    // Asegurar que el contenedor no sea más grande que la pantalla
    const maxHeight = $(window).height() * 0.85;
    height = Math.min(height, maxHeight);
    
    $("#flipbook-wrapper").css({
      width: width + "px",
      height: height + "px",
      left: left + "px",
      top: top + "px",
      "transform": "scale(1)",
      "transform-origin": "50% 50%",
      "overflow": "hidden" // Evitar desbordamiento durante zoom
    });
  }
  
  // Evento de clic para alternar zoom adaptado para tablets
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    
    if (currentZoom === 1) {
      // Zoom reducido para tablets
      currentZoom = 1.5;
      
      // Calcular la posición del clic relativo al wrapper
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
        // Cambiar entre single y double según la orientación
        const isLandscape = $(window).width() > $(window).height();
        $('#flipbook').turn('display', isLandscape ? 'double' : 'single');
        
        const dimensions = calculateResponsiveDimensions();
        $('#flipbook').turn('size', dimensions.width, dimensions.height);
        centerWrapper(dimensions.width, dimensions.height);
      }
    }, 300); // Pequeño retraso para permitir que se complete el cambio de orientación
  });
});