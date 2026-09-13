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
    document.querySelectorAll('video').forEach(function (v) {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      if (!v.hasAttribute('muted')) v.setAttribute('muted', '');
      if (!v.hasAttribute('playsinline')) v.setAttribute('playsinline', '');
      if (!v.hasAttribute('webkit-playsinline')) v.setAttribute('webkit-playsinline', '');
      
      if (!v._loopAttached) {
        v._loopAttached = true;
        v.addEventListener('ended', function () {
          v.currentTime = 0;
          var retryPlay = v.play();
          if (retryPlay && typeof retryPlay.catch === 'function') retryPlay.catch(function () {});
        });
      }

      if (v.paused) {
        var p = v.play();
        if (p !== undefined && typeof p.catch === 'function') {
          p.catch(function () {});
        }
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
      disableOnInteraction: false,
    },
    on: {
      init: function () {
        playAllVideos();
      },
      slideChange: function () {
        playAllVideos();
      },
      touchEnd: function () {
        playAllVideos();
      },
      transitionEnd: function () {
        playAllVideos();
      },
    },
  });

  $(window).on("load", playAllVideos);
  document.addEventListener("DOMContentLoaded", playAllVideos);
  document.addEventListener("click", playAllVideos);
  document.addEventListener("touchstart", playAllVideos, { passive: true });
  window.addEventListener("scroll", playAllVideos, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) playAllVideos();
  });
  setInterval(playAllVideos, 3000);
})(jQuery);
