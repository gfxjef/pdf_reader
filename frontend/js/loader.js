function showLoader() {
    $("#loader-overlay").show();
  }
  
  function hideLoader() {
    $("#loader-overlay").fadeOut(500);
  }
  
  $(document).ready(function() {
    showLoader();
  });
  