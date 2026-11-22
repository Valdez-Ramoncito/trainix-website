(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var headerOffset = 76;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function setupHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
      if (window.scrollY > 12) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function setupMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    function close() {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }

    function open() {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    toggle.addEventListener("click", function () {
      if (document.body.classList.contains("nav-open")) {
        close();
      } else {
        open();
      }
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", close);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) close();
    });
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateScrollTo(targetY, duration) {
    if (reduceMotion || duration <= 0) {
      window.scrollTo(0, targetY);
      return;
    }

    var startY = window.pageYOffset || document.documentElement.scrollTop;
    var distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  function getScrollTargetY(el) {
    var rect = el.getBoundingClientRect();
    var current = window.pageYOffset || document.documentElement.scrollTop;
    return Math.max(0, rect.top + current - headerOffset);
  }

  function setupSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("href");
        if (!id || id === "#") return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();

        var y = getScrollTargetY(target);
        var distance = Math.abs(y - (window.pageYOffset || document.documentElement.scrollTop));
        var duration = Math.min(1200, Math.max(450, distance * 0.55));

        animateScrollTo(y, duration);

        if (history.pushState) {
          history.pushState(null, "", id);
        }
      });
    });
  }

  function setupReveals() {
    var nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      nodes.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
      }
    );

    nodes.forEach(function (el) {
      observer.observe(el);
    });
  }

  function setupLightbox() {
    var lightbox = document.getElementById("lightbox");
    var image = document.getElementById("lightbox-image");
    var caption = document.getElementById("lightbox-caption");
    if (!lightbox || !image || !caption) return;

    var lastFocus = null;

    function open(src, text) {
      lastFocus = document.activeElement;
      image.src = src;
      image.alt = text || "";
      caption.textContent = text || "";
      lightbox.hidden = false;
      lightbox.classList.add("is-open");
      document.body.classList.add("lightbox-open");
      var closeBtn = lightbox.querySelector(".lightbox-close");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      image.removeAttribute("src");
      caption.textContent = "";
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
    }

    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".gallery-open");
      if (!btn) return;
      e.preventDefault();
      var src = btn.getAttribute("data-full");
      var text = btn.getAttribute("data-caption") || "";
      if (src) open(src, text);
    });

    lightbox.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close") || e.target === lightbox) {
        close();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
    });
  }

  function setupMarquees() {
    var wraps = document.querySelectorAll(".marquee-wrap");
    if (!wraps.length) return;

    wraps.forEach(function (wrap) {
      var track = wrap.querySelector(".marquee-track");
      if (!track) return;

      var originals = Array.prototype.slice.call(track.children);
      if (!originals.length) return;

      // Duplicate set for seamless loop
      originals.forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });

      var offset = 0;
      var speed = wrap.getAttribute("data-marquee") === "trainer" ? 0.45 : 0.55;
      var paused = false;
      var lastTs = null;
      var rafId = null;

      function measureSetWidth() {
        var cards = track.children;
        if (cards.length < 2) return 1;
        var half = Math.floor(cards.length / 2);
        var first = cards[0].getBoundingClientRect();
        var mid = cards[half].getBoundingClientRect();
        return Math.max(1, mid.left - first.left);
      }

      var setWidth = measureSetWidth();

      function updateCenter() {
        var viewportRect = wrap.getBoundingClientRect();
        var centerX = viewportRect.left + viewportRect.width / 2;
        var cards = track.querySelectorAll(".marquee-card");
        var best = null;
        var bestDist = Infinity;
        var near = [];

        cards.forEach(function (card) {
          card.classList.remove("is-center", "is-near");
          var rect = card.getBoundingClientRect();
          var cardCenter = rect.left + rect.width / 2;
          var dist = Math.abs(cardCenter - centerX);
          if (dist < bestDist) {
            bestDist = dist;
            best = card;
          }
          if (dist < rect.width * 1.15) {
            near.push(card);
          }
        });

        near.forEach(function (c) {
          if (c !== best) c.classList.add("is-near");
        });
        if (best) best.classList.add("is-center");
      }

      function tick(ts) {
        if (lastTs == null) lastTs = ts;
        var dt = Math.min(48, ts - lastTs);
        lastTs = ts;

        if (!paused && !reduceMotion) {
          offset += (speed * dt) / 16;
          if (offset >= setWidth) {
            offset -= setWidth;
          }
          track.style.transform = "translate3d(" + -offset + "px, 0, 0)";
        }

        updateCenter();
        rafId = window.requestAnimationFrame(tick);
      }

      wrap.addEventListener("mouseenter", function () {
        paused = true;
      });
      wrap.addEventListener("mouseleave", function () {
        paused = false;
      });
      wrap.addEventListener(
        "touchstart",
        function () {
          paused = true;
        },
        { passive: true }
      );
      wrap.addEventListener(
        "touchend",
        function () {
          setTimeout(function () {
            paused = false;
          }, 1800);
        },
        { passive: true }
      );

      var resizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          setWidth = measureSetWidth();
          if (offset >= setWidth) offset = 0;
        }, 120);
      });

      if (reduceMotion) {
        track.style.transform = "translate3d(0, 0, 0)";
        updateCenter();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    });
  }

  onReady(function () {
    setupHeader();
    setupMobileNav();
    setupSmoothAnchors();
    setupReveals();
    setupLightbox();
    setupMarquees();
  });
})();
