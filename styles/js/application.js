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
      .on('keydown', '.docs-nav .dropdown-toggle', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ' && e.keyCode !== 13 && e.keyCode !== 32) return;
        e.preventDefault();
        var $dropdown = $(this).closest('.dropdown');
        var open = !$dropdown.hasClass('open');
        $dropdown.toggleClass('open', open);
        $(this).attr('aria-expanded', open ? 'true' : 'false');
      })
      .on('keydown', function (e) {
        if (e.key !== 'Escape' && e.keyCode !== 27) return;
        var $open = $('.docs-nav .dropdown.open');
        if (!$open.length) return;
        $open.removeClass('open');
        $open.find('.dropdown-toggle').attr('aria-expanded', 'false').trigger('focus');
      })
      .on('click', '.docs-container [href="#"]', function (e) {
        e.preventDefault();
      });
  }

  window.initApplication = function () {
    var $body = $(document.body);

    bindDropdownOnce();

    // TOC highlighting is owned by toc-spy.js (window scroll)
    try { $body.removeData('bs.scrollspy'); } catch (e) {}
    try { $body.off('.bs.scrollspy'); } catch (e2) {}
    try { $('.docs-content').removeData('bs.scrollspy').off('.bs.scrollspy'); } catch (e3) {}

    if (typeof window.syncStickyOffsets === 'function') {
      window.syncStickyOffsets();
    }
    if (typeof window.refreshTocSpy === 'function') {
      window.refreshTocSpy();
    }
  };

  $(function () {
    window.initApplication();

    $(window).on('load', function () {
      try { $(document.body).removeData('bs.scrollspy').off('.bs.scrollspy'); } catch (e) {}
      if (typeof window.refreshTocSpy === 'function') window.refreshTocSpy();
    });
  });

}(jQuery)
