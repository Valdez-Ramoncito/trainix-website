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
    if (!lightbox || !image || !caption) {
      console.warn("TRAINIX lightbox markup missing");
      return;
    }

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

  onReady(function () {
    setupHeader();
    setupSmoothAnchors();
    setupReveals();
    setupLightbox();
  });
})();
