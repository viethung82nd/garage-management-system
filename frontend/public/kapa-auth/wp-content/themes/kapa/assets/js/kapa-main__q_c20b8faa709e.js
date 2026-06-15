(function($) {
	'use strict';

	jQuery(document).on('ready', function () {

		// Header Sticky
		$(window).on('scroll',function() {
			if ($(this).scrollTop() > 30){  
				$('.navbar-area').addClass("is-sticky");
			}
			else{
				$('.navbar-area').removeClass("is-sticky");
			}
		});

		// Mean Menu
		jQuery('.mean-menu').meanmenu({
			meanScreenWidth: "1199"
		});
		
		// Others Option For Responsive JS
		$(".others-option-for-responsive .dot-menu").on("click", function(){
			$(".others-option-for-responsive .container .container").toggleClass("active");
		});

		// Language Switcher
		$(".language-option").each(function() {
			var each = $(this)
			each.find(".lang-name").html(each.find(".language-dropdown-menu a:nth-child(1)").text());
			var allOptions = $(".language-dropdown-menu").children('a');
			each.find(".language-dropdown-menu").on("click", "a", function() {
				allOptions.removeClass('selected');
				$(this).addClass('selected');
				$(this).closest(".language-option").find(".lang-name").html($(this).text());
			});
		})

		// TweenMax JS
		$('.main-banner-wrap-area').mousemove(function(e){
			var wx = $(window).width();
			var wy = $(window).height();
			var x = e.pageX - this.offsetLeft;
			var y = e.pageY - this.offsetTop;
			var newx = x - wx/2;
			var newy = y - wy/2;
			$('.main-banner-wrap-image, .main-banner-shape-1, .main-banner-shape-2').each(function(){
				var speed = $(this).attr('data-speed');
				if($(this).attr('data-revert')) speed *= -.4;
				TweenMax.to($(this), 1, {x: (1 - newx*speed), y: (1 - newy*speed)});
			});
		});

		// Popup Video
		$('.popup-video').magnificPopup({
			disableOn: 320,
			type: 'iframe',
			mainClass: 'mfp-fade',
			removalDelay: 160,
			preloader: false,
			fixedContentPos: false
		});

		// Odometer JS
		$('.odometer').appear(function(e) {
			var odo = $(".odometer");
			odo.each(function() {
				var countNumber = $(this).attr("data-count");
				$(this).html(countNumber);
			});
		});

		// ScrollMagic JS
		var controller = new ScrollMagic.Controller();
		$(".main-banner-content h1, .content h3, .choose-us-content h3, .section-content h2, .process-item h3, .section-title-wrap h2, .estimate-left-content h3, .who-we-are-content h3, .main-banner-wrap-content h1, .services-details-content h3").each(function() {
			var tl = new TimelineMax();
			if(tl.isActive()){
				return false;
			}
			var cov = $(this).find(".overlay");
			tl.from(cov, .5, { scaleX: 0, transformOrigin: "left" });
			tl.to(cov, .5, { scaleX: 0, transformOrigin: "right" }, "reveal");
			var scene = new ScrollMagic.Scene({
				triggerElement: this,
				triggerHook: 0.7
			})
			.setTween(tl)
			.addTo(controller);
		});

		// Nice Select JS
		$('select').niceSelect();

		// Box Active
		$(".single-shop-card").mouseover(function(){
			$('.single-shop-card.active').removeClass('active');
			$(this).addClass('active');
		});

		// Masonry PACKAGED Js
		$('.projects-grid').masonry({
			// options
			itemSelector: '.grid-item',
		});
		$('.gallery-grid').masonry({
			// options
			itemSelector: '.grid-item',
		});

		// WOW Animation JS
		if($('.wow').length){
			var wow = new WOW({
				mobile: false
			});
			wow.init();
		}

		// Go to Top
		$(window).on('scroll', function(){
			var scrolled = $(window).scrollTop();
			if (scrolled > 600) $('.go-top').addClass('active');
			if (scrolled < 600) $('.go-top').removeClass('active');
		});  
		$('.go-top').on('click', function() {
			$("html, body").animate({ scrollTop: "0" },  500);
		});
		
		// Preloader JS
		jQuery(window).on('load',function(){
			jQuery(".preloader").fadeOut(500);
		});
	});

	$( window ).on( 'elementor/frontend/init', function() {
		elementorFrontend.hooks.addAction( 'frontend/element_ready/widget', function( $scope ) {

			// Banner Slides
			$('.banner-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: true,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				// autoplay: true,
				items: 1,

				navText: [
					"<i class='ri-arrow-left-s-line'></i>",
					"<i class='ri-arrow-right-s-line'></i>"
				],
			});
			
			// AOS JS
			AOS.init();
		
			// Testimonials Slides
			$('.testimonials-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: true,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				items: 1,

				navText: [
					"<i class='ri-arrow-left-s-line'></i>",
					"<i class='ri-arrow-right-s-line'></i>"
				],
			});

			// Certified Slides
			$('.certified-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: true,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				
				responsive: {
					0: {
						items: 2
					},
					576: {
						items: 3
					},
					768: {
						items: 3
					},
					1024: {
						items: 4
					},
					1200: {
						items: 5
					}
				}
			});
			$('.certified-wrap-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: true,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				
				responsive: {
					0: {
						items: 2
					},
					576: {
						items: 3
					},
					768: {
						items: 4
					},
					1024: {
						items: 4
					},
					1200: {
						items: 4
					}
				}
			});

			// Projects Slides
			$('.projects-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: false,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				autoHeight: true,

				responsive: {
					0: {
						items: 1
					},
					768: {
						items: 2
					},
					1024: {
						items: 2
					},
					1200: {
						items: 3
					},
					1550: {
						items: 4
					}
				}
			});

			// Partner Slides
			$('.partner-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: false,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				stagePadding: 200,

				responsive: {
					0: {
						items: 2,
						stagePadding: 0,
					},
					576: {
						items: 3,
						stagePadding: 0,
					},
					768: {
						items: 3,
						stagePadding: 0,
					},
					1024: {
						items: 4,
						stagePadding: 0,
					},
					1200: {
						items: 4
					},
					1550: {
						items: 5
					}
				}
			});
			$('.partner-wrap-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: false,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,

				responsive: {
					0: {
						items: 2
					},
					576: {
						items: 3
					},
					768: {
						items: 3
					},
					1024: {
						items: 2
					},
					1200: {
						items: 3
					},
				}
			});

			// Brand Slides
			$('.brand-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: false,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				stagePadding: 250,

				responsive: {
					0: {
						items: 1,
						stagePadding: 0,
					},
					768: {
						items: 3,
						stagePadding: 0,
					},
					1024: {
						items: 3,
						stagePadding: 100,
					},
					1200: {
						items: 4
					},
				}
			});

			// Blog Details Image Slides
			$('.blog-details-image-slides').owlCarousel({
				loop: true,
				nav: true,
				dots: false,
				animateOut: 'fadeOut',
				smartSpeed: 1500,
				autoplayTimeout: 1500,
				autoplayHoverPause: true,
				autoplay: true,
				autoHeight:true,
				margin: 15,
				items: 1,
				navText: [
					"<i class='ri-arrow-left-s-line'></i>",
					"<i class='ri-arrow-right-s-line'></i>"
				],
			});

			// Services Slides
			$('.services-slides').owlCarousel({
				loop: true,
				nav: false,
				dots: true,
				smartSpeed: 500,
				margin: 25,
				autoplayHoverPause: true,
				autoplay: true,
				autoHeight: true,
				responsive: {
					0: {
						items: 1
					},
					768: {
						items: 2
					},
					1024: {
						items: 2
					},
					1200: {
						items: 3
					},
					1550: {
						items: 4
					}
				}
			});

			// Four Testimonial Slider
			$('.four-testimonial-slider').owlCarousel({
				loop: true,
				nav: true,
				dots: false,
				animateOut: 'fadeOut',
				autoplay: false,
				margin: 24,
				items: 3,
				navText: [
					"<i class='ri-arrow-left-line'></i>",
					"<i class='ri-arrow-right-line'></i>"
				],
				responsive: {
					0: {
						items: 1,
					},
					768: {
						items: 2,
					},
					1024: {
						items: 3,
					},
					1200: {
						items: 3
					},
				}
			});




		});
	});
})(jQuery);