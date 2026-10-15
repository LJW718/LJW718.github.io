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
        if (!header.id) continue;
        if ($(header).hasClass('post-title')) continue;
        // Categories / Tags listing titles (系统、AI…) — keep id, no clickable anchor
        if ($(header).closest('.home').length) continue;
        if ($(header).find('> .anchor').length) continue;
        $(header).html($(header).html() + '<span class="anchor-target" id="' + header.id + '"></span>' +
          '<a href="#' + header.id + '" name="' + header.id + '" class="anchor glyphicon glyphicon-link"></a>');
        $(header).removeAttr('id');
      }
    }
  }

  function resetHeadersStyles() {
    resetHeaderItemStyles($(".docs-content h1:not(.post-title)"));
    resetHeaderItemStyles($(".docs-content h2"));
    resetHeaderItemStyles($(".docs-content h3"));
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
