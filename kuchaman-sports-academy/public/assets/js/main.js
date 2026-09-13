/***************************************************
==================== KSA SPORTS ACADEMY ======================
High-Performance Smooth Scrolling (Lenis 1.3.26)
Modern GPU-Accelerated Typography & Scroll Animations
Accessible, Fluid, Zero-Lag Architecture
****************************************************/

(function ($) {
  "use strict";

  var windowOn = $(window);

  /* ===================================================
     01. Preloader & Initial Sequence
     =================================================== */
  function hidePreloader(callback) {
    var $preloader = $("#preloader");
    if ($preloader.length) {
      $preloader.fadeOut(400, function () {
        if (typeof callback === "function") callback();
      });
    } else {
      if (typeof callback === "function") callback();
    }
  }

  /* ===================================================
     02. Mobile Offcanvas Menu
     =================================================== */
  $(".tp-menu-bar").on("click", function () {
    $(".tpoffcanvas").addClass("opened");
    $(".body-overlay").addClass("apply");
  });
  $(".close-btn").on("click", function () {
    $(".tpoffcanvas").removeClass("opened");
    $(".body-overlay").removeClass("apply");
  });
  $(".body-overlay").on("click", function () {
    $(".tpoffcanvas").removeClass("opened");
    $(".body-overlay").removeClass("apply");
  });

  /* ===================================================
     03. DOM Helpers (Backgrounds, Widths, Hover)
     =================================================== */
  $("[data-background]").each(function () {
    $(this).css("background-image", "url(" + $(this).attr("data-background") + ")");
  });

  $("[data-width]").each(function () {
    $(this).css("width", $(this).attr("data-width"));
  });

  $("[data-bg-color]").each(function () {
    $(this).css("background-color", $(this).attr("data-bg-color"));
  });

  $(".tp-btn-hover").on("mouseenter", function (e) {
    var parentOffset = $(this).offset(),
      relX = e.pageX - parentOffset.left,
      relY = e.pageY - parentOffset.top;
    $(this).find("b").css({ top: relY, left: relX });
  });
  $(".tp-btn-hover").on("mouseout", function (e) {
    var parentOffset = $(this).offset(),
      relX = e.pageX - parentOffset.left,
      relY = e.pageY - parentOffset.top;
    $(this).find("b").css({ top: relY, left: relX });
  });

  /* ===================================================
     04. Accordion Component
     =================================================== */
  function initAccordion() {
    const items = document.querySelectorAll(".accordion .accordion-item");
    if (!items.length) return;

    items.forEach((item) => {
      const header = item.querySelector(".accordion-header");
      const collapse = item.querySelector(".accordion-collapse");
      if (!collapse || !header) return;

      const isExpanded = item.dataset.expanded === "true" || collapse.classList.contains("show");
      collapse.style.overflow = "hidden";
      collapse.style.transition = "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease";

      if (isExpanded) {
        openItem(item, false);
      } else {
        closeItem(item, false);
      }

      header.addEventListener("click", function () {
        const isActive = header.classList.contains("active");
        items.forEach((el) => closeItem(el, true));
        if (!isActive) {
          openItem(item, true);
        }
        // Refresh ScrollTrigger after accordion height change
        if (window.ScrollTrigger) {
          setTimeout(() => ScrollTrigger.refresh(), 360);
        }
      });
    });

    function openItem(item, animate) {
      const collapse = item.querySelector(".accordion-collapse");
      const header = item.querySelector(".accordion-header");
      if (!collapse || !header) return;
      const height = collapse.scrollHeight;
      collapse.style.maxHeight = height + "px";
      collapse.style.opacity = "1";
      header.classList.add("active");
      item.classList.add("active");
    }

    function closeItem(item, animate) {
      const collapse = item.querySelector(".accordion-collapse");
      const header = item.querySelector(".accordion-header");
      if (!collapse || !header) return;
      collapse.style.maxHeight = "0";
      collapse.style.opacity = "0";
      header.classList.remove("active");
      item.classList.remove("active");
    }
  }

  /* ===================================================
     05. High-Performance Smooth Scrolling (Lenis 1.3.26)
     =================================================== */
  let lenisInstance = null;

  function initSmoothScrolling() {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      document.documentElement.style.scrollBehavior = "auto";
      return;
    }

    if (typeof Lenis === "undefined") {
      console.warn("Lenis library not loaded, falling back to native scroll.");
      return;
    }

    try {
      lenisInstance = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Apple-like buttery easeOutExpo
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
        infinite: false,
      });

      window.lenis = lenisInstance;

      // GSAP ScrollTrigger Integration
      if (window.gsap && window.ScrollTrigger) {
        lenisInstance.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time) => {
          lenisInstance.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenisInstance.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }

      // Synchronize Sticky Header
      lenisInstance.on("scroll", ({ scroll }) => {
        if (scroll > 280) {
          $("#header-sticky").addClass("header-sticky");
        } else {
          $("#header-sticky").removeClass("header-sticky");
        }
      });

      // Smooth Anchor Navigation without jumps
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
          const href = this.getAttribute("href");
          if (!href || href === "#" || href.length <= 1) return;
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            $(".tpoffcanvas").removeClass("opened");
            $(".body-overlay").removeClass("apply");

            lenisInstance.scrollTo(target, {
              offset: -75,
              duration: 1.05,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          }
        });
      });

      // Prevent nested scrolling issues inside offcanvas menu & modals
      $(".tpoffcanvas, .accordion-collapse").attr("data-lenis-prevent", "");

    } catch (err) {
      console.warn("Lenis initialization warning:", err);
    }
  }

  /* ===================================================
     06. Modern Text & Section Animation System
     =================================================== */
  function initTextAndSectionAnimations() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || typeof gsap === "undefined") {
      // Show all elements immediately for reduced motion
      document.querySelectorAll("[data-tp-animate], .ksa-split-word, .ksa-text-fade-up, .ksa-badge-reveal, .ksa-card-reveal").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    /* --- Helper: Accessible Word Token Wrapper --- */
    function wrapElementWords(element) {
      if (!element || element.getAttribute("data-ksa-split") === "true") return;
      element.setAttribute("data-ksa-split", "true");

      // Preserve clean text for screen readers & SEO
      if (!element.getAttribute("aria-label")) {
        element.setAttribute("aria-label", element.textContent.trim());
      }

      function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue;
          if (!text || !text.trim()) return;

          const parts = text.split(/(\s+)/);
          const frag = document.createDocumentFragment();

          parts.forEach((part) => {
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
            } else if (part.length > 0) {
              const mask = document.createElement("span");
              mask.className = "ksa-split-word-mask";

              const inner = document.createElement("span");
              inner.className = "ksa-split-word";
              inner.textContent = part;

              mask.appendChild(inner);
              frag.appendChild(mask);
            }
          });

          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList && (node.classList.contains("ksa-split-word-mask") || node.classList.contains("ksa-split-word"))) return;
          if (node.tagName === "BR" || node.tagName === "WBR") return;
          const children = Array.from(node.childNodes);
          children.forEach((c) => processNode(c));
        }
      }

      Array.from(element.childNodes).forEach((c) => processNode(c));
    }

    /* ===================================================
       06A. HERO SECTION SEQUENCE (Immediate on Load)
       =================================================== */
    const $hero = $("#home");
    if ($hero.length) {
      const heroBadge = $hero.find("span.border-dashed")[0];
      const heroH1 = $hero.find("h1")[0];
      const heroP = $hero.find("p.max-w-\\[650px\\]")[0];
      const heroBtns = $hero.find("div.flex.smooth")[0];
      const heroCards = $hero.find(".max-w-\\[560px\\] .bg-\\[linear-gradient").toArray();

      const heroTl = gsap.timeline({ delay: 0.1 });

      // 1. Hero Badge
      if (heroBadge) {
        heroBadge.classList.add("ksa-badge-reveal");
        heroTl.fromTo(heroBadge, {
          opacity: 0,
          y: 14,
          scale: 0.96,
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.65,
          ease: "power2.out",
          clearProps: "transform,willChange",
        }, 0);
      }

      // 2. Hero Title (Word by word masked upward reveal)
      if (heroH1) {
        wrapElementWords(heroH1);
        const words = heroH1.querySelectorAll(".ksa-split-word");
        if (words.length) {
          heroTl.fromTo(words, {
            yPercent: 115,
            opacity: 0,
          }, {
            yPercent: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.035,
            ease: "power4.out",
            clearProps: "transform,willChange",
            onComplete: () => {
              heroH1.querySelectorAll(".ksa-split-word-mask").forEach((m) => (m.style.overflow = "visible"));
            },
          }, 0.15);
        }
      }

      // 3. Hero Subtitle
      if (heroP) {
        heroP.classList.add("ksa-text-fade-up");
        heroTl.fromTo(heroP, {
          opacity: 0,
          y: 20,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          clearProps: "transform,willChange",
        }, 0.35);
      }

      // 4. Hero Buttons
      if (heroBtns) {
        heroBtns.classList.add("ksa-text-fade-up");
        heroTl.fromTo(heroBtns, {
          opacity: 0,
          y: 16,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          clearProps: "transform,willChange",
        }, 0.48);
      }

      // 5. Hero Stat Cards
      if (heroCards.length) {
        heroTl.fromTo(heroCards, {
          opacity: 0,
          y: 24,
        }, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.09,
          ease: "power3.out",
          clearProps: "transform,willChange",
        }, 0.6);
      }
    }

    /* ===================================================
       06B. SECTION HEADINGS (Scroll-Triggered Word Reveals)
       =================================================== */
    const sectionHeadings = document.querySelectorAll(
      "#why-ksa h3, #cricket h3, #facilities h3, #faq h2, div[id] h2, div[id] h3, section h2, section h3, .pt-\\[120px\\] h3"
    );

    sectionHeadings.forEach((heading) => {
      // Don't re-animate hero heading
      if (heading.closest("#home")) return;

      wrapElementWords(heading);
      const words = heading.querySelectorAll(".ksa-split-word");
      if (!words.length) return;

      gsap.fromTo(words, {
        yPercent: 115,
        opacity: 0,
      }, {
        yPercent: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.03,
        ease: "power3.out",
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: heading,
          start: "top 88%",
          once: true,
        },
        onComplete: () => {
          heading.querySelectorAll(".ksa-split-word-mask").forEach((m) => (m.style.overflow = "visible"));
        },
      });
    });

    /* ===================================================
       06C. SECTION BADGES & PILL LABELS
       =================================================== */
    const sectionBadges = document.querySelectorAll(
      "span.border-dashed, span.rounded-\\[20px\\]"
    );

    sectionBadges.forEach((badge) => {
      if (badge.closest("#home")) return;
      badge.classList.add("ksa-badge-reveal");

      gsap.fromTo(badge, {
        opacity: 0,
        y: 12,
        scale: 0.96,
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: badge,
          start: "top 90%",
          once: true,
        },
      });
    });

    /* ===================================================
       06D. SUPPORTING PARAGRAPHS
       =================================================== */
    const sectionParagraphs = document.querySelectorAll(
      "#why-ksa p, #cricket p, #facilities p, .pt-\\[120px\\] p, #faq p"
    );

    sectionParagraphs.forEach((p) => {
      if (p.closest("#home") || p.closest(".accordion-collapse")) return;
      p.classList.add("ksa-text-fade-up");

      gsap.fromTo(p, {
        opacity: 0,
        y: 20,
      }, {
        opacity: 1,
        y: 0,
        duration: 0.75,
        delay: 0.1,
        ease: "power2.out",
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: p,
          start: "top 88%",
          once: true,
        },
      });
    });

    /* ===================================================
       06E. CARDS & GRID CONTAINERS (Staggered Entrance)
       =================================================== */
    const cardGroups = [
      ".pt-\\[35px\\] .max-w-\\[1100px\\] > div", // feature bar items
      "#why-ksa .grid > div", // why ksa feature cards
      "#cricket .grid > div", // sports facilities showcase
      "#facilities .grid.grid-cols-1 > div", // academy experience cards
      ".pt-\\[120px\\] .grid-cols-1 > div", // top features included items
      "#faq .accordion-item", // FAQ questions
    ];

    cardGroups.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (!elements.length) return;

      const parentContainer = elements[0].closest(".grid, .accordion, .flex, .max-w-\\[1100px\\]") || elements[0].parentNode;

      elements.forEach((el) => {
        el.classList.add("ksa-card-reveal");
      });

      gsap.fromTo(elements, {
        opacity: 0,
        y: 24,
      }, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power2.out",
        clearProps: "transform,willChange",
        scrollTrigger: {
          trigger: parentContainer,
          start: "top 85%",
          once: true,
        },
      });
    });

    /* ===================================================
       06F. BOTTOM CTA SECTION
       =================================================== */
    const $bottomCTA = $("a.tp-btn[href='#facilities']").closest("div.text-center");
    if ($bottomCTA.length) {
      const ctaHeading = $bottomCTA.find("h3")[0];
      const ctaP = $bottomCTA.find("p")[0];
      const ctaBtn = $bottomCTA.find("a")[0];

      if (ctaHeading) {
        wrapElementWords(ctaHeading);
        const words = ctaHeading.querySelectorAll(".ksa-split-word");
        if (words.length) {
          gsap.to(words, {
            yPercent: 0,
            opacity: 1,
            duration: 0.85,
            stagger: 0.03,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ctaHeading,
              start: "top 85%",
              once: true,
            },
            onComplete: () => {
              ctaHeading.querySelectorAll(".ksa-split-word-mask").forEach((m) => (m.style.overflow = "visible"));
            },
          });
        }
      }

      if (ctaP) {
        ctaP.classList.add("ksa-text-fade-up");
        gsap.to(ctaP, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ctaP,
            start: "top 85%",
            once: true,
          },
        });
      }

      if (ctaBtn) {
        ctaBtn.classList.add("ksa-badge-reveal");
        gsap.to(ctaBtn, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.65,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ctaBtn,
            start: "top 88%",
            once: true,
          },
        });
      }
    }

    // Refresh triggers when everything settles
    setTimeout(() => {
      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }
    }, 500);
  }

  /* ===================================================
     07. DOM Initialization
     =================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    initAccordion();
    initSmoothScrolling();
  });

  // When preloader fades out or window loads, launch animations
  if (document.readyState === "complete") {
    hidePreloader(() => {
      initTextAndSectionAnimations();
    });
  } else {
    windowOn.on("load", function () {
      hidePreloader(() => {
        initTextAndSectionAnimations();
      });
    });
  }

  // Refresh ScrollTrigger and Lenis dimensions on window resize
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.lenis) lenisInstance.resize();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }, 200);
  });

  // Dynamic Booking Portal URL Sync
  if (window.KSA_BOOKING_URL) {
    document.querySelectorAll("a[data-ksa-booking]").forEach((btn) => {
      btn.setAttribute("href", window.KSA_BOOKING_URL);
    });
  } else if (window.location.port === "8080") {
    document.querySelectorAll("a[data-ksa-booking]").forEach((btn) => {
      btn.setAttribute("href", "http://localhost:3000/booking");
    });
  } else {
    document.querySelectorAll("a[data-ksa-booking]").forEach((btn) => {
      btn.setAttribute("href", "/booking");
    });
  }

})(jQuery);
