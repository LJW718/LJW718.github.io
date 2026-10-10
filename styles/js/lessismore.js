/*!
 * Adapted from Bootstrap docs JavaScript
 */


!function ($) {

  $(function () {
      
		orderTheLeftNavigations();

    function orderTheLeftNavigations(){
	    $('#navigation .sidenav').html($("#markdown-toc").html());
	    $('#navigation .sidenav ul').addClass("nav");
	    $("#markdown-toc").remove();

      // Add Bootstrap table styles: table-hover
      $(".docs-content table").addClass("table table-hover");
  	}

  	$(window).load(initilizeAfterLoad);

    function initilizeAfterLoad(){
      repairTheImagesWhichCrossTheMaxWidth();
      resetHeadersStyles();
    }

    // Recalculate image display size.
  	function repairTheImagesWhichCrossTheMaxWidth(){
  		var images = $(".docs-content img");
  		if(images != undefined && images.length > 0){
  			for(var i=0; i< images.length;i++){
  				var imgWidth = images[i].width;
  				if( imgWidth >= 757 ){
  					 images[i].width = 757;
  				}
  			}
  		}
  	}

    // Apply heading styles
    function resetHeadersStyles(){
      resetHeaderItemStyles($(".docs-content h1"));
      resetHeaderItemStyles($(".docs-content h2"));
    }

    function resetHeaderItemStyles(headers){
      if(headers != undefined && headers.length > 0){
        for(var i=0; i< headers.length;i++){
          
          var header = headers[i];
          $(header).html($(header).html() + '<span class="anchor-target" id="' + header.id + '"></span>' +
            '<a href="#' + header.id + '" name="' + header.id + '" class="anchor glyphicon glyphicon-link"></a>');
          $(header).removeAttr('id');
        }
      }
    }
  })

}(jQuery)
