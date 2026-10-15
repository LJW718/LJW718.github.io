/*!
 * Adapted from Bootstrap docs JavaScript
 */
!function ($) {

  function orderTheLeftNavigations() {
    var $toc = $("#markdown-toc");
    if ($toc.length) {
      $('#navigation .sidenav').html($toc.html());
      $('#navigation .sidenav ul').addClass("nav");
      $toc.remove();
    }
    $(".docs-content table").addClass("table table-hover");
  }

  function repairTheImagesWhichCrossTheMaxWidth() {
    var images = $(".docs-content img");
    if (images != undefined && images.length > 0) {
      for (var i = 0; i < images.length; i++) {
        var imgWidth = images[i].width;
        if (imgWidth >= 757) {
          images[i].width = 757;
        }
      }
    }
  }

  function resetHeaderItemStyles(headers) {
    if (headers != undefined && headers.length > 0) {
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if ($(header).find('> .anchor').length) continue;
        $(header).html($(header).html() + '<span class="anchor-target" id="' + header.id + '"></span>' +
          '<a href="#' + header.id + '" name="' + header.id + '" class="anchor glyphicon glyphicon-link"></a>');
        $(header).removeAttr('id');
      }
    }
  }

  function resetHeadersStyles() {
    resetHeaderItemStyles($(".docs-content h1"));
    resetHeaderItemStyles($(".docs-content h2"));
  }

  window.initLessismore = function () {
    orderTheLeftNavigations();
    repairTheImagesWhichCrossTheMaxWidth();
    resetHeadersStyles();
  };

  $(function () {
    window.initLessismore();
    $(window).on('load', function () {
      repairTheImagesWhichCrossTheMaxWidth();
      resetHeadersStyles();
    });
  });

}(jQuery)
