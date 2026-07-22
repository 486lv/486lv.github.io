(function () {
  function enhanceHomeHero() {
    var header = document.querySelector('#page-header.full_page');
    var siteInfo = header && header.querySelector('#site-info');
    if (!siteInfo) return;
    header.classList.add('minimal-enhanced');
    siteInfo.querySelectorAll('.minimal-hero-showcase').forEach(function (element) { element.remove(); });
    if (siteInfo.querySelector('.minimal-hero-actions')) return;

    var settings = window.__THORN_APPEARANCE__ || {};
    var title = siteInfo.querySelector('#site-title');
    var subtitle = siteInfo.querySelector('#subtitle');
    if (!subtitle) {
      var subtitleWrap = document.createElement('div');
      subtitleWrap.id = 'site-subtitle';
      subtitle = document.createElement('span');
      subtitle.id = 'subtitle';
      subtitleWrap.appendChild(subtitle);
      if (title && title.nextSibling) siteInfo.insertBefore(subtitleWrap, title.nextSibling);
      else siteInfo.appendChild(subtitleWrap);
    }
    if (title && settings.heroTitle) title.textContent = settings.heroTitle;
    if (subtitle && settings.heroSubtitle) subtitle.textContent = settings.heroSubtitle;

    var eyebrow = document.createElement('p');
    eyebrow.className = 'minimal-hero-eyebrow';
    eyebrow.textContent = settings.heroEyebrow || 'THORN · NOTES & FIELDWORK';
    siteInfo.insertBefore(eyebrow, title || siteInfo.firstChild);

    var actions = document.createElement('div');
    actions.className = 'minimal-hero-actions';
    var primary = document.createElement('a');
    primary.href = settings.primaryActionHref || '#content-inner';
    primary.textContent = settings.primaryActionLabel || '阅读文章';
    var secondary = document.createElement('a');
    secondary.href = settings.secondaryActionHref || '/about/';
    secondary.textContent = settings.secondaryActionLabel || '关于我';
    if (settings.showPrimaryAction !== false) actions.appendChild(primary);
    if (settings.showSecondaryAction !== false) actions.appendChild(secondary);
    siteInfo.appendChild(actions);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { header.classList.add('hero-is-ready'); });
    });

  }

  function revealContent() {
    var items = document.querySelectorAll('#recent-posts .recent-post-item:not(.reveal-observed)');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (item) { item.classList.add('reveal-is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.body.classList.add('home-reveal-enabled');
    items.forEach(function (item, index) {
      item.classList.add('reveal-observed');
      item.style.transitionDelay = Math.min(index, 4) * 70 + 'ms';
      observer.observe(item);
    });
  }

  function initMinimalExperience() {
    enhanceHomeHero();
    revealContent();
  }

  document.addEventListener('DOMContentLoaded', initMinimalExperience);
  document.addEventListener('pjax:complete', initMinimalExperience);
})();
