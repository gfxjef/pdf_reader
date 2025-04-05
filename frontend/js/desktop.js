// Versión optimizada para escritorio que usa imágenes WebP pre-generadas

var currentZoom = 1;
var pageWidth, pageHeight;
var lastTransformOrigin = '50% 50%';
// Constante para URL base - cambiar a ruta relativa
var baseUrl = './';

$(document).ready(function() {
  console.log('Modo Desktop: Usando imágenes pre-generadas');
  
  // URL del PDF - Usa la variable global definida en index.html
  const pdfUrl = selectedPDF || 'pdfs/catalogo2.pdf';
  console.log("PDF seleccionado:", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  
  // Extraer nombre base del PDF para búsqueda de imágenes
  // Usar la variable pdfBaseName que está definida en index.html
  const pdfBaseName = window.pdfBaseName || pdfUrl.split('/').pop().replace('.pdf', '');
  console.log("Nombre base del PDF para buscar imágenes:", pdfBaseName);
  
  // Construir la ruta a la carpeta donde están las imágenes
  // Las imágenes están en frontend/pdf/[nombre_catalogo]/page_X.webp
  const basePath = `${baseUrl}pdf/${pdfBaseName}`;
  console.log("Buscando imágenes en:", basePath);
  
  // Verificar si existen imágenes contando cuántas hay
  countImagesInFolder(pdfBaseName)
    .then(imageCount => {
      if (imageCount > 0) {
        console.log(`Encontradas ${imageCount} imágenes pre-generadas`);
        loadPrerenderedImages(basePath, imageCount);
      } else {
        console.log('No se encontraron imágenes pre-generadas, intentando con nombre alternativo');
        
        // Intentar con versiones alternativas del nombre (con guiones bajos)
        const altBaseName = pdfBaseName.replace(/ /g, '_');
        const altPath = `${baseUrl}pdf/${altBaseName}`;
        console.log("Intentando ruta alternativa:", altPath);
        
        // Verificar si existe la carpeta alternativa
        testImageExists(`${altPath}/page_1.webp`)
          .then(exists => {
            if (exists) {
              console.log("Encontrada ruta alternativa con éxito");
              // Contar las imágenes en esta carpeta
              countImagesInAltFolder(altPath)
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
      console.error('Error al verificar imágenes:', error);
      renderPDFDirectly(pdfUrl);
    });
  
  // Función para probar si una imagen existe
  function testImageExists(imagePath) {
    return new Promise(resolve => {
      console.log("Verificando existencia de:", imagePath);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }
  
  // Función para contar imágenes en una carpeta alternativa
  function countImagesInAltFolder(folderPath) {
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
  
  // FUNCIÓN MODIFICADA: Contar imágenes en la estructura de carpetas
  async function countImagesInFolder(pdfName) {
    try {
      // Primero intentamos con el endpoint de PDFs procesados
      const response = await fetch(`${baseUrl}listar-pdfs-procesados`);
      
      if (!response.ok) {
        console.warn(`Error HTTP al consultar PDFs procesados: ${response.status}`);
        // Intentar verificar directamente si existen imágenes
        return checkDirectImageExistence(`${baseUrl}pdf/${pdfName}`);
      }
      
      const processedPdfs = await response.json();
      console.log("PDFs procesados encontrados:", processedPdfs);
      
      // Buscar nuestro PDF en la lista de procesados
      const currentPdf = processedPdfs.find(pdf => 
        pdf.name === pdfName || 
        pdf.name === pdfName + '.pdf' ||
        pdf.name === pdfName.replace(/ /g, '_') ||
        pdf.name === pdfName.replace(/ /g, '_') + '.pdf'
      );
      
      if (currentPdf && currentPdf.pages > 0) {
        console.log("PDF encontrado en la lista de procesados:", currentPdf);
        return currentPdf.pages;
      }
      
      // Si no se encuentra en el listado, verificar directamente
      return checkDirectImageExistence(`${baseUrl}pdf/${pdfName}`);
    } catch (error) {
      console.error('Error al contar imágenes:', error);
      // Verificar directamente como último recurso
      return checkDirectImageExistence(`${baseUrl}pdf/${pdfName}`);
    }
  }
  
  // Nueva función para verificar directamente si existen imágenes
  function checkDirectImageExistence(basePath) {
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
        img.src = `${basePath}/page_${pageNum}.webp`;
      }
      
      // Iniciar la verificación
      console.log("Verificando imágenes en:", basePath);
      checkNext(1);
    });
  }
  
  // FUNCIÓN MEJORADA: Cargar imágenes pre-generadas desde la ubicación correcta
  function loadPrerenderedImages(basePath, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0;
    pageHeight = 0;
    
    console.log(`Cargando ${pageCount} imágenes desde ${basePath}`);
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      
      img.onload = function() {
        imagesLoaded++;
        console.log(`Imagen ${pageNum}/${pageCount} cargada: ${img.src}`);
        
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
        console.error(`Error al cargar imagen para página ${pageNum}: ${img.src}`);
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
      const imgUrl = `${basePath}/page_${pageNum}.webp`;
      console.log(`Intentando cargar: ${imgUrl}`);
      img.src = imgUrl;
      $(flipbookContainer).append(img);
    }
  }
  
  // FUNCIÓN EXISTENTE MODIFICADA: Renderizado directo de PDF como respaldo
  function renderPDFDirectly(pdfUrl) {
    console.log("Intentando renderizar PDF directamente:", pdfUrl);
    
    let pdfDoc = null;
    let pagesRendered = 0;
    
    // Asegurarse de que la URL del PDF incluya el prefijo correcto
    const fullPdfUrl = pdfUrl.startsWith(baseUrl) || pdfUrl.startsWith('http') ? 
                      pdfUrl : baseUrl + pdfUrl;
    
    console.log("URL completa del PDF:", fullPdfUrl);
    
    pdfjsLib.getDocument(fullPdfUrl).promise
      .then(function(pdf) {
        pdfDoc = pdf;
        const numPages = pdf.numPages;
        console.log("Número de páginas:", numPages);
        
        // Primero renderizar la página 1 para obtener las dimensiones
        return pdf.getPage(1);
      })
      .then(function(page) {
        const scale = 1.2;
        const viewport = page.getViewport({ scale: scale });
        
        pageWidth = viewport.width;
        pageHeight = viewport.height;
        
        // Una vez tenemos las dimensiones, renderizar todas las páginas
        renderAllPages(pdfDoc);
      })
      .catch(function(error) {
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
  
  function renderAllPages(pdfDoc) {
    const numPages = pdfDoc.numPages;
    let pagesRendered = 0;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.2;
        const viewport = page.getViewport({ scale: scale });
        
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
  }
  
  // Función para inicializar el flipbook y centrar el wrapper
  function initializeFlipbook() {
    // Calcular dimensiones responsivas
    const dimensions = calculateResponsiveDimensions();
    
    $('#flipbook').turn({
      width: dimensions.width,
      height: dimensions.height,
      autoCenter: true,
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
    
    const maxWidth = viewportWidth * 0.88;
    const maxHeight = viewportHeight * 0.85;
    
    const flipbookAspectRatio = 2 * pageAspectRatio;
    
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
  
  // Función para centrar el wrapper en pantalla
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
  
  // Evento de clic para alternar zoom
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