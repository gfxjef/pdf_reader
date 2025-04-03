// Versión optimizada para celulares - muestra una sola página a la vez

// Factor de zoom global: 1 = estado base, 2.0 = zoom in.
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  console.log('Modo Mobile: Visualización de una página a la vez');
  
  if (typeof $.fn.turn !== 'function') {
    console.error('Turn.js NO se ha cargado. Verifica la URL y el orden de los scripts.');
  } else {
    console.log('Turn.js cargado correctamente.');
  }
  
  // URL del PDF - Usa la variable global definida en index.html
  const pdfUrl = selectedPDF || 'catalogo2.pdf';
  console.log("Cargando PDF en móvil:", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  // Limpiamos el flipbook para evitar duplicación de páginas
  $(flipbookContainer).empty();
  
  let pagesRendered = 0;
  let canvasPages = []; // Array para almacenar los canvas de cada página
  
  // Cargar el PDF usando PDF.js
  pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
    const numPages = pdf.numPages;
    console.log("Número de páginas:", numPages);
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdf.getPage(pageNum).then(function(page) {
        // ⭐ MODIFICADO: Reducir la escala para evitar páginas demasiado grandes
        const scale = 1.5; // Reducido de 2.0 a 1.5
        const viewport = page.getViewport({ scale: scale });
        
        // Guardar dimensiones de la primera página para referencia
        if (pageNum === 1) {
          pageWidth = viewport.width;
          pageHeight = viewport.height;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        // Usar willReadFrequently para mejorar el rendimiento
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
          // Guardamos el canvas en el array en la posición correcta
          canvasPages[pageNum-1] = canvas;
          pagesRendered++;
          
          if (pagesRendered === numPages) {
            // Una vez que todas las páginas están renderizadas, inicializamos
            prepareFlipbook(canvasPages, numPages);
            hideLoader();
          }
        });
      });
    }
  }).catch(function(error) {
    console.error('Error al cargar el PDF:', error);
  });
  
  // Función para preparar el flipbook después de renderizar todas las páginas
  function prepareFlipbook(canvasPages, totalPages) {
    // Limpiamos el flipbook de nuevo por seguridad
    $(flipbookContainer).empty();
    
    // Agregamos solo la primera página inicialmente
    $(flipbookContainer).append(canvasPages[0]);
    
    // Aplicamos estilo para que el canvas ocupe el 100% del contenedor
    $(flipbookContainer).find('canvas').css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
    
    // Guardamos todas las páginas en un objeto de datos
    $(flipbookContainer).data('allPages', canvasPages);
    $(flipbookContainer).data('currentPage', 1);
    $(flipbookContainer).data('totalPages', totalPages);
    
    // Calculamos dimensiones para una sola página
    const dimensions = calculateResponsiveDimensions();
    
    // Centramos el wrapper
    centerWrapper(dimensions.width, dimensions.height);
    
    // Agregamos funcionalidad a los botones
    setupNavigation();
    
    console.log('Flipbook móvil inicializado en modo página única');
  }
  
  // Función para configurar la navegación específica para el modo móvil
  function setupNavigation() {
    // Botón anterior
    $('#prev-page').off('click').on('click', function() {
      const $flipbook = $('#flipbook');
      const currentPage = $flipbook.data('currentPage');
      
      if (currentPage > 1) {
        showPage(currentPage - 1);
      }
    });
    
    // Botón siguiente
    $('#next-page').off('click').on('click', function() {
      const $flipbook = $('#flipbook');
      const currentPage = $flipbook.data('currentPage');
      const totalPages = $flipbook.data('totalPages');
      
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
      }
    });
    
    // Botón primera página
    $('#first-page').off('click').on('click', function() {
      showPage(1);
    });
    
    // Navegación por swipe para móviles
    setupSwipeNavigation();
  }
  
  // Configurar gestos de swipe para navegación táctil
  function setupSwipeNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.getElementById('flipbook-wrapper').addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    document.getElementById('flipbook-wrapper').addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, false);
    
    function handleSwipe() {
      // Solo procesar swipe si no estamos en zoom
      if (currentZoom === 1) {
        const swipeThreshold = 50; // Umbral para detectar un swipe
        
        if (touchEndX < touchStartX - swipeThreshold) {
          // Swipe izquierda -> Página siguiente
          $('#next-page').click();
        }
        
        if (touchEndX > touchStartX + swipeThreshold) {
          // Swipe derecha -> Página anterior
          $('#prev-page').click();
        }
      }
    }
  }
  
  // Función para mostrar una página específica
  function showPage(pageNumber) {
    const $flipbook = $('#flipbook');
    const allPages = $flipbook.data('allPages');
    const totalPages = $flipbook.data('totalPages');
    
    // Validamos el número de página
    if (pageNumber < 1 || pageNumber > totalPages) {
      return;
    }
    
    // Guardamos la página actual
    $flipbook.data('currentPage', pageNumber);
    
    // Limpiamos el flipbook
    $flipbook.empty();
    
    // Agregamos la página solicitada
    $flipbook.append(allPages[pageNumber-1]);
    
    // Aplicamos estilo para que el canvas ocupe el 100% del contenedor
    $flipbook.find('canvas').css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
    
    // Actualizamos el tamaño del contenedor si es necesario
    const canvas = allPages[pageNumber-1];
    const dimensions = calculateResponsiveDimensions();
    centerWrapper(dimensions.width, dimensions.height);
    
    console.log(`Mostrando página ${pageNumber} de ${totalPages}`);
  }
  
  // Función para calcular dimensiones responsivas para MÓVILES
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = pageWidth / pageHeight;
    
    // ⭐ MODIFICADO: Aumentar el porcentaje del viewport para mejor visualización
    const maxWidth = viewportWidth * 0.92; // Usar 92% del ancho disponible
    const maxHeight = viewportHeight * 0.85; // Usar 85% de la altura disponible
    
    // IMPORTANTE: Calcular dimensiones para UNA SOLA PÁGINA en móviles
    const flipbookAspectRatio = pageAspectRatio;
    
    let width, height;
    
    // ⭐ MODIFICADO: Cálculo simplificado para ajustar al viewport móvil
    if (maxWidth / flipbookAspectRatio <= maxHeight) {
      // Si el ancho es el factor limitante
      width = maxWidth;
      height = width / flipbookAspectRatio;
    } else {
      // Si la altura es el factor limitante
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
    const left = Math.max(0, ($(window).width() - width) / 2);
    const top = Math.max(0, ($(window).height() - height) / 2);
    
    // ⭐ MODIFICADO: Asegurar que el flipbook no sea más grande que la pantalla
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
    
    // Ajustar tamaño del flipbook
    $("#flipbook").css({
      width: "100%",
      height: "100%",
      display: "flex",
      "justify-content": "center",
      "align-items": "center"
    });
    
    // Asegurar que los canvas ocupen el 100% del flipbook
    $("#flipbook canvas").css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
  }
  
  // Evento de clic para alternar zoom (simplificado para móviles)
  $('#flipbook-wrapper').on('click', function(event) {
    // Evitar la propagación para que no interfiera con los botones
    event.stopPropagation();
    
    const wrapper = $(this);
    
    if (currentZoom === 1) {
      // ⭐ MODIFICADO: Zoom reducido para mejor visualización
      currentZoom = 1.7; // Reducido de 2.0 a 1.7
      
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
      // Zoom out
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
  
  // Ajustar el tamaño del flipbook al redimensionar la ventana
  $(window).resize(function() {
    const dimensions = calculateResponsiveDimensions();
    centerWrapper(dimensions.width, dimensions.height);
    
    // Re-aplicar estilos a los canvas después del redimensionamiento
    $("#flipbook canvas").css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
  });
});