/* HELL ON EARTH — marketing site interactions */
(function () {
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 })
    : null;
  document.querySelectorAll('.reveal').forEach((el) => {
    if (io) io.observe(el); else el.classList.add('in');
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // hide the trailer block when the clip is not shipped with the static build
  const trailerSection = document.getElementById('trailer');
  const trailerVideo = document.getElementById('trailer-video');
  trailerVideo?.addEventListener('error', () => {
    trailerSection?.remove();
    document.querySelectorAll('a[href="#trailer"]').forEach((a) => a.remove());
  }, true);

  // pause the trailer when it leaves the viewport
  const video = document.getElementById('trailer-video');
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      for (const e of entries) if (!e.isIntersecting && !video.paused) video.pause();
    }, { threshold: 0.15 }).observe(video);
  }
})();
