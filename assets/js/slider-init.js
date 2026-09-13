/***************************************************
==================== JS INDEX ======================
****************************************************
01. High-Performance Video Management & Viewport Controller
02. Swiper Initialization (Hardware-Accelerated Marquee)
****************************************************/

(function ($) {
  "use strict";

  ////////////////////////////////////////////////////
  // 01. High-Performance Video Management & Viewport Controller

  // Safe play helper avoiding uncaught promise rejections
  function safePlay(video) {
    if (!video) return;
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      if (video.paused) {
        var playPromise = video.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {});
        }
      }
    } catch (e) {}
  }

  // Safe pause helper
  function safePause(video) {
    if (!video) return;
    try {
      if (!video.paused) {
        video.pause();
      }
    } catch (e) {}
  }

  // Configure video element for inline, muted, smooth looping
  function setupVideo(v) {
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
        safePlay(v);
      });
    }
  }

  var sectionInView = false;
  var isMobile = window.innerWidth <= 768;

  window.addEventListener('resize', function () {
    isMobile = window.innerWidth <= 768;
  }, { passive: true });

  // 1. Observe the #facilities section
  var facilitySection = document.getElementById('facilities');
  if (facilitySection && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionInView = entry.isIntersecting;
        if (!sectionInView) {
          // Offscreen: pause ALL videos immediately to save 100% CPU/GPU/battery
          var allVids = document.querySelectorAll('#facilities video');
          for (var i = 0; i < allVids.length; i++) {
            safePause(allVids[i]);
          }
        } else {
          // Entering view: dynamically play only videos on screen
          checkVisibleVideos();
        }
      });
    }, {
      root: null,
      rootMargin: '120px 0px 120px 0px',
      threshold: 0
    });

    sectionObserver.observe(facilitySection);
  } else {
    sectionInView = true;
  }

  // 2. Precise viewport visibility check
  // On mobile screens, max 1-2 videos play concurrently at 60 FPS
  function checkVisibleVideos() {
    if (!sectionInView) return;

    var windowW = window.innerWidth || document.documentElement.clientWidth;
    var windowH = window.innerHeight || document.documentElement.clientHeight;

    var videoCards = document.querySelectorAll('#facilities .ksa-facility-video-card');
    for (var i = 0; i < videoCards.length; i++) {
      var card = videoCards[i];
      var video = card.querySelector('video');
      if (!video) continue;
      setupVideo(video);

      var rect = card.getBoundingClientRect();
      // On mobile view, require card to be within screen horizontal boundaries
      var isVisible = (
        rect.bottom > -20 &&
        rect.top < (windowH + 20) &&
        rect.right > (isMobile ? 15 : -50) &&
        rect.left < (windowW - (isMobile ? 15 : -50))
      );

      if (isVisible) {
        safePlay(video);
      } else {
        safePause(video);
      }
    }
  }

  // RAF throttler so scrolling or marquee motion does not cause jank
  var rafPending = false;
  function scheduleVideoCheck() {
    if (rafPending || !sectionInView) return;
    rafPending = true;
    requestAnimationFrame(function () {
      checkVisibleVideos();
      rafPending = false;
    });
  }

  ////////////////////////////////////////////////////
  // 02. Swiper Initialization

  var isSmallScreen = window.innerWidth < 768;

  var tp_text_slide = new Swiper(".tp-text-slide-active", {
    loop: true,
    freemode: true,
    slidesPerView: "auto",
    spaceBetween: isSmallScreen ? 12 : 16,
    centeredSlides: true,
    allowTouchMove: false,
    speed: isSmallScreen ? 12000 : 10000,
    loopedSlides: isSmallScreen ? 4 : 6,
    autoplay: {
      delay: 1,
      disableOnInteraction: false,
    },
    on: {
      init: function () {
        setTimeout(checkVisibleVideos, 350);
      },
      setTranslate: function () {
        scheduleVideoCheck();
      },
      slideChange: function () {
        scheduleVideoCheck();
      },
      transitionEnd: function () {
        scheduleVideoCheck();
      }
    },
  });

  // Event handlers
  $(window).on("load", function () {
    setTimeout(scheduleVideoCheck, 200);
  });
  document.addEventListener("DOMContentLoaded", scheduleVideoCheck);
  window.addEventListener("scroll", scheduleVideoCheck, { passive: true });

  // Mobile touch unlock for media playback
  document.addEventListener("touchstart", function () {
    if (sectionInView) scheduleVideoCheck();
  }, { passive: true, once: true });

  // Tab visibility
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      var allVids = document.querySelectorAll('#facilities video');
      for (var i = 0; i < allVids.length; i++) {
        safePause(allVids[i]);
      }
    } else {
      scheduleVideoCheck();
    }
  });

})(jQuery);
