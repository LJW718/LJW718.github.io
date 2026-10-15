/*!
 * Adapted from Bootstrap docs JavaScript
 */
!function ($) {

  var dropdownBound = false;

  function bindDropdownOnce() {
    if (dropdownBound) return;
    dropdownBound = true;

    $(document)
      .on('mouseleave', '.docs-nav .dropdown', function () {
        var $dropdown = $(this);
        $dropdown.removeClass('open');
        $dropdown.find('.dropdown-toggle').attr('aria-expanded', 'false');
      })
      .on('focusout', '.docs-nav .dropdown', function () {
        var $dropdown = $(this);
        setTimeout(function () {
          if (!$dropdown.find(':focus').length) {
            $dropdown.removeClass('open');
            $dropdown.find('.dropdown-toggle').attr('aria-expanded', 'false');
          }
        }, 0);
      })
      .on('click', '.docs-container [href="#"]', function (e) {
        e.preventDefault();
      });
  }

  window.initApplication = function () {
    var $window = $(window);
    var $body = $(document.body);

    bindDropdownOnce();

    // Reset scrollspy for the new page DOM
    var stickyTop = 50;
    try {
      var raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--sticky-top')
        .trim();
      var parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) stickyTop = parsed;
    } catch (e) {}

    $body.removeData('bs.scrollspy');
    $body.scrollspy({
      target: '.sidebar',
      offset: stickyTop + 8
    });
    $body.scrollspy('refresh');

    if (typeof window.syncStickyOffsets === 'function') {
      window.syncStickyOffsets();
    }

    $('.source-link').each(function () {
      var $el = $(this);
      if ($el.data('bs.popover')) return;

      var id = $el.data('content');
      var content = $('<span>').append($('#' + id)).html();
      $el.attr('data-content', content);

      $el.popover({
        trigger: 'manual',
        container: 'body',
        placement: 'left',
        template: '<div class="popover popover-source"> <div class="arrow"></div> <div class="popover-inner"> <h3 class="popover-title"></h3> <div class="popover-content"> <p></p> </div> </div> </div>',
        html: true,
        delay: { show: 50, hide: 750 }
      }).on('mouseenter', function () {
        var self = this;
        $(this).popover('show');
        $(this).addClass('active');
        $(this).addClass('popover-source');

        $('.popover').on('mouseleave', function () {
          $(self).popover('hide');
          $(self).removeClass('active');
        });
      }).on('mouseleave', function () {
        var self = this;
        setTimeout(function () {
          if (!$('.popover:hover').length) {
            $(self).popover('hide');
            $(self).removeClass('active');
          }
        }, 100);
      });
    });

    setTimeout(function () {
      var $top = $('.top');
      if ($top.length) {
        try { $top.affix('checkPosition'); } catch (e) {}
        $top.affix();
      }
    }, 100);
  };

  $(function () {
    if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
      var msViewportStyle = document.createElement('style');
      msViewportStyle.appendChild(
        document.createTextNode('@-ms-viewport{width:auto!important}')
      );
      document.querySelector('head').appendChild(msViewportStyle);
    }

    window.initApplication();

    $(window).on('load', function () {
      $(document.body).scrollspy('refresh');
    });
  });

}(jQuery)
