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
  const pdfUrl = selectedPDF || 'pdfs/catalogo2.pdf';
  console.log("Cargando PDF en móvil:", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  // Limpiamos el flipbook para evitar duplicación de páginas
  $(flipbookContainer).empty();
  
  let pagesRendered = 0;
  let canvasPages = []; // Array para almacenar los canvas o imágenes de cada página
  
  // Extraer nombre base del PDF para búsqueda de imágenes
  // Usar la variable pdfBaseName que está definida en index.html
  const pdfBaseName = window.pdfBaseName || pdfUrl.split('/').pop().replace('.pdf', '');
  console.log("Nombre base del PDF para buscar imágenes:", pdfBaseName);
  
  // Construir la ruta a la carpeta donde están las imágenes
  // Las imágenes están en frontend/pdf/[nombre_catalogo]/page_X.webp
  const basePath = `pdf/${pdfBaseName}`;
  console.log("Buscando imágenes en:", basePath);
  
  // Verificar si existen imágenes contando cuántas hay
  checkForPrerenderedImages(pdfBaseName)
    .then(imageData => {
      if (imageData.hasImages) {
        console.log(`Usando imágenes pre-generadas (${imageData.pageCount} páginas)`);
        loadPrerenderedImages(imageData.basePath, imageData.pageCount);
      } else {
        console.log('No se encontraron imágenes pre-generadas, intentando con nombre alternativo');
        
        // Intentar con versiones alternativas del nombre (con guiones bajos)
        const altBaseName = pdfBaseName.replace(/ /g, '_');
        const altPath = `pdf/${altBaseName}`;
        console.log("Intentando ruta alternativa:", altPath);
        
        // Verificar si existe la carpeta alternativa
        testImageExists(`${altPath}/page_1.webp`)
          .then(exists => {
            if (exists) {
              console.log("Encontrada ruta alternativa con éxito");
              // Contar las imágenes en esta carpeta
              countImagesInFolder(altPath)
                .then(count => {
                  if (count > 0) {
                    loadPrerenderedImages(altPath, count);
                  } else {
                    renderPDFDirectly(pdfUrl);
                  }
                });
            } else {
              console.log("No se encontraron imágenes en ninguna ruta");
              renderPDFDirectly(pdfUrl);
            }
          });
      }
    })
    .catch(error => {
      console.error('Error al verificar imágenes pre-generadas:', error);
      renderPDFDirectly(pdfUrl);
    });
  
  // Función para probar si una imagen existe
  function testImageExists(imagePath) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }
  
  // Función para contar imágenes en una carpeta
  function countImagesInFolder(folderPath) {
    return new Promise(resolve => {
      let count = 0;
      let checking = true;
      
      function checkNext(pageNum) {
        if (!checking) return;
        
        const img = new Image();
        img.onload = () => {
          count = pageNum;
          checkNext(pageNum + 1);
        };
        img.onerror = () => {
          checking = false;
          resolve(count);
        };
        img.src = `${folderPath}/page_${pageNum}.webp`;
      }
      
      checkNext(1);
    });
  }
  
  // FUNCIÓN MODIFICADA: Verificar si existen imágenes pre-generadas para este PDF
  async function checkForPrerenderedImages(pdfName) {
    try {
      // Primero intentamos con el endpoint de PDFs procesados
      const response = await fetch(`./listar-pdfs-procesados`);
      
      if (!response.ok) {
        console.warn(`Error HTTP al consultar PDFs procesados: ${response.status}`);
        // Intentar verificar directamente si existen imágenes
        const count = await countImagesInFolder(`pdf/${pdfName}`);
        return {
          hasImages: count > 0,
          pageCount: count,
          basePath: `pdf/${pdfName}`
        };
      }
      
      const processedPdfs = await response.json();
      console.log('PDFs procesados:', processedPdfs);
      console.log('Buscando PDF:', pdfName);
      
      // Buscar nuestro PDF en la lista de procesados
      const currentPdf = processedPdfs.find(pdf => 
        pdf.name === pdfName || 
        pdf.name === pdfName + '.pdf' ||
        pdf.name === pdfName.replace(/ /g, '_') ||
        pdf.name === pdfName.replace(/ /g, '_') + '.pdf'
      );
      
      console.log('PDF encontrado:', currentPdf);
      
      if (currentPdf && currentPdf.has_images) {
        return {
          hasImages: true,
          pageCount: currentPdf.pages,
          basePath: `pdf/${currentPdf.name}`, // Usar ruta a frontend/pdf/[nombre]
          thumbnail: currentPdf.thumbnail
        };
      } else {
        // Verificar directamente si existen imágenes en frontend/pdf/[nombre]
        const count = await countImagesInFolder(`pdf/${pdfName}`);
        return {
          hasImages: count > 0,
          pageCount: count,
          basePath: `pdf/${pdfName}`
        };
      }
    } catch (error) {
      console.error('Error al verificar imágenes:', error);
      return { hasImages: false };
    }
  }
  
  // FUNCIÓN MODIFICADA: Cargar imágenes pre-generadas (versión móvil)
  function loadPrerenderedImages(basePath, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0;
    pageHeight = 0;
    
    console.log(`Cargando ${pageCount} imágenes desde ${basePath}`);
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      img.onload = function() {
        imagesLoaded++;
        console.log(`Imagen ${pageNum}/${pageCount} cargada`);
        
        // Guardar las dimensiones de la primera página
        if (pageNum === 1) {
          pageWidth = this.naturalWidth;
          pageHeight = this.naturalHeight;
        }
        
        // Guardamos la imagen en el array de páginas
        canvasPages[pageNum-1] = img;
        
        // Cuando todas las imágenes estén cargadas, inicializar el flipbook
        if (imagesLoaded === pageCount) {
          prepareFlipbook(canvasPages, pageCount);
          hideLoader();
        }
      };
      
      img.onerror = function() {
        console.error(`Error al cargar imagen para página ${pageNum}: ${img.src}`);
        imagesLoaded++;
        
        // Crear una imagen de error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-page';
        errorDiv.innerHTML = `<div class="error-message">Error al cargar página ${pageNum}</div>`;
        canvasPages[pageNum-1] = errorDiv;
        
        if (imagesLoaded === pageCount) {
          prepareFlipbook(canvasPages, pageCount);
          hideLoader();
        }
      };
      
      // Establecer la ruta a la imagen WebP de esta página con la nueva estructura
      img.src = `${basePath}/page_${pageNum}.webp`;
    }
  }
  
  // FUNCIÓN EXISTENTE MODIFICADA: Renderizado directo de PDF como respaldo
  function renderPDFDirectly(pdfUrl) {
    console.log("Intentando renderizar PDF directamente:", pdfUrl);
    
    pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
      const numPages = pdf.numPages;
      console.log("Número de páginas:", numPages);
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        pdf.getPage(pageNum).then(function(page) {
          const scale = 1.5;
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
            canvasPages[pageNum-1] = canvas;
            pagesRendered++;
            
            if (pagesRendered === numPages) {
              prepareFlipbook(canvasPages, numPages);
              hideLoader();
            }
          });
        });
      }
    }).catch(function(error) {
      console.error('Error al cargar el PDF:', error);
      
      // Mostrar mensaje de error
      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-page';
      errorMsg.innerHTML = `
        <div class="error-message">
          <h3>No se pudo cargar el PDF</h3>
          <p>${error.message}</p>
        </div>
      `;
      $(flipbookContainer).append(errorMsg);
      hideLoader();
    });
  }
  
  // Función para preparar el flipbook después de renderizar todas las páginas
  function prepareFlipbook(pages, totalPages) {
    // Limpiamos el flipbook de nuevo por seguridad
    $(flipbookContainer).empty();
    
    // Agregamos solo la primera página inicialmente
    $(flipbookContainer).append(pages[0]);
    
    // Aplicamos estilo para que el elemento ocupe el 100% del contenedor
    $(flipbookContainer).find('canvas, img').css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
    
    // Guardamos todas las páginas en un objeto de datos
    $(flipbookContainer).data('allPages', pages);
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
  
  // El resto del código permanece igual
  function setupNavigation() {
    $('#prev-page').off('click').on('click', function() {
      const $flipbook = $('#flipbook');
      const currentPage = $flipbook.data('currentPage');
      
      if (currentPage > 1) {
        showPage(currentPage - 1);
      }
    });
    
    $('#next-page').off('click').on('click', function() {
      const $flipbook = $('#flipbook');
      const currentPage = $flipbook.data('currentPage');
      const totalPages = $flipbook.data('totalPages');
      
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
      }
    });
    
    $('#first-page').off('click').on('click', function() {
      showPage(1);
    });
    
    setupSwipeNavigation();
  }
  
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
      if (currentZoom === 1) {
        const swipeThreshold = 50;
        
        if (touchEndX < touchStartX - swipeThreshold) {
          $('#next-page').click();
        }
        
        if (touchEndX > touchStartX + swipeThreshold) {
          $('#prev-page').click();
        }
      }
    }
  }
  
  function showPage(pageNumber) {
    const $flipbook = $('#flipbook');
    const allPages = $flipbook.data('allPages');
    const totalPages = $flipbook.data('totalPages');
    
    if (pageNumber < 1 || pageNumber > totalPages) {
      return;
    }
    
    $flipbook.data('currentPage', pageNumber);
    $flipbook.empty();
    $flipbook.append(allPages[pageNumber-1]);
    
    $flipbook.find('canvas, img').css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
    
    const dimensions = calculateResponsiveDimensions();
    centerWrapper(dimensions.width, dimensions.height);
    
    console.log(`Mostrando página ${pageNumber} de ${totalPages}`);
  }
  
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = pageWidth / pageHeight;
    
    const maxWidth = viewportWidth * 0.92;
    const maxHeight = viewportHeight * 0.85;
    
    const flipbookAspectRatio = pageAspectRatio;
    
    let width, height;
    
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
  
  function centerWrapper(width, height) {
    const left = Math.max(0, ($(window).width() - width) / 2);
    const top = Math.max(0, ($(window).height() - height) / 2);
    
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
    
    $("#flipbook").css({
      width: "100%",
      height: "100%",
      display: "flex",
      "justify-content": "center",
      "align-items": "center"
    });
    
    $("#flipbook canvas, #flipbook img").css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
  }
  
  // Zooming and resize handlers remain the same
  $('#flipbook-wrapper').on('click', function(event) {
    event.stopPropagation();
    
    const wrapper = $(this);
    
    if (currentZoom === 1) {
      currentZoom = 1.7;
      
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
  
  $(window).resize(function() {
    const dimensions = calculateResponsiveDimensions();
    centerWrapper(dimensions.width, dimensions.height);
    
    $("#flipbook canvas, #flipbook img").css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
  });
});