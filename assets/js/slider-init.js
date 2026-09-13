/***************************************************
==================== JS INDEX ======================
****************************************************
01. tp-text-slide-active
****************************************************/

(function ($) {
  "use strict";

  ////////////////////////////////////////////////////
  // 01. tp-text-slide-active

  function playAllVideos() {
    document.querySelectorAll('.swiper-container video').forEach(function (v) {
      v.muted = true;
      var p = v.play();
      if (p !== undefined) {
        p.catch(function () {});
      }
    });
  }

  let tp_text_slide = new Swiper(".tp-text-slide-active", {
    loop: true,
    freemode: true,
    slidesPerView: "auto",
    spaceBetween: 16,
    centeredSlides: true,
    allowTouchMove: false,
    speed: 10000,
    loopedSlides: 12,
    autoplay: {
      delay: 1,
      disableOnInteraction: true,
    },
    on: {
      init: function () {
        playAllVideos();
      },
      slideChange: function () {
        playAllVideos();
      },
    },
  });

  $(window).on("load", playAllVideos);
  document.addEventListener("DOMContentLoaded", playAllVideos);
  document.addEventListener("click", playAllVideos, { once: true });
  document.addEventListener("touchstart", playAllVideos, { once: true });
})(jQuery);
