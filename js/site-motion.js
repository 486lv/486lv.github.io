(function () {
  var systemReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = {
    get matches() {
      return systemReduceMotion.matches || document.documentElement.dataset.motion === 'reduced';
    }
  };
  var progressFrame = 0;
  var sectionObserver = null;
  var transitionRecoveryTimer = 0;
  var heroPointerFrame = 0;
  var heroPointerX = '50%';
  var heroPointerY = '45%';

  function revealSections() {
    if (sectionObserver) {
      sectionObserver.disconnect();
      sectionObserver = null;
    }
    var elements = document.querySelectorAll(
      '.editorial-page-head, .about-section, .about-facts, .fp-card, .gallery-item, ' +
      '.category-list-item, .tag-cloud-list a, :is(#archive, #category, #tag) .article-sort-title, ' +
      '.article-sort-item, .pagination-post, #post-comment, .media-empty, ' +
      '.flink-list-item, .type-music .aplayer'
    );

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      document.body.classList.remove('motion-enabled');
      elements.forEach(function (element) { element.classList.remove('motion-section', 'is-visible'); });
      return;
    }

    document.body.classList.add('motion-enabled');
    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        sectionObserver.unobserve(entry.target);
        var delay = Number.parseInt(entry.target.style.transitionDelay, 10) || 0;
        window.setTimeout(function () {
          entry.target.classList.remove('motion-section', 'is-visible');
          entry.target.style.removeProperty('transition-delay');
        }, 1050 + delay);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    elements.forEach(function (element, index) {
      if (element.classList.contains('motion-section')) return;
      element.classList.add('motion-section');
      element.style.transitionDelay = Math.min(index % 4, 3) * 55 + 'ms';
      sectionObserver.observe(element);
    });
  }

  function trackHeroPointer() {
    var hero = document.querySelector('#page-header.full_page');
    if (!hero || hero.dataset.pointerMotion === 'true' || reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;
    hero.dataset.pointerMotion = 'true';
    hero.addEventListener('pointermove', function (event) {
      var rect = hero.getBoundingClientRect();
      heroPointerX = ((event.clientX - rect.left) / rect.width * 100).toFixed(2) + '%';
      heroPointerY = ((event.clientY - rect.top) / rect.height * 100).toFixed(2) + '%';
      if (heroPointerFrame) return;
      heroPointerFrame = requestAnimationFrame(function () {
        heroPointerFrame = 0;
        hero.style.setProperty('--hero-x', heroPointerX);
        hero.style.setProperty('--hero-y', heroPointerY);
      });
    }, { passive: true });
  }

  function enhanceControls() {
    document.querySelectorAll('.about-action, .minimal-hero-actions a').forEach(function (element) {
      if (element.dataset.magnetic === 'true') return;
      element.dataset.magnetic = 'true';
      element.classList.add('interactive-magnetic');
      if (reduceMotion.matches) return;
      element.addEventListener('pointermove', function (event) {
        var rect = element.getBoundingClientRect();
        element.style.setProperty('--magnetic-x', ((event.clientX - rect.left - rect.width / 2) * .07).toFixed(1) + 'px');
        element.style.setProperty('--magnetic-y', ((event.clientY - rect.top - rect.height / 2) * .1).toFixed(1) + 'px');
      });
      element.addEventListener('pointerleave', function () {
        element.style.removeProperty('--magnetic-x');
        element.style.removeProperty('--magnetic-y');
      });
    });
  }

  function markCurrentNavigation() {
    var current = window.location.pathname.replace(/\/+$/, '') || '/';
    document.querySelectorAll('#nav .site-page.group, #sidebar-menus .site-page.group').forEach(function (item) {
      item.classList.remove('is-current');
      item.removeAttribute('aria-current');
    });
    document.querySelectorAll('#nav a.site-page, #sidebar-menus a.site-page').forEach(function (link) {
      var target;
      try { target = new URL(link.href, window.location.origin); } catch (error) { return; }
      if (target.origin !== window.location.origin) return;
      var path = target.pathname.replace(/\/+$/, '') || '/';
      var isCurrent = path === current || (path !== '/' && current.indexOf(path + '/') === 0);
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (!isCurrent) return;
      var group = link.closest('.menus_item');
      var groupLabel = group && group.querySelector(':scope > .site-page.group');
      if (groupLabel) groupLabel.classList.add('is-current');
    });
  }

  function clickFromKeyboard(element, event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    element.click();
  }

  function enhanceNavigationAccessibility() {
    document.querySelectorAll('#nav .site-page.group, #sidebar-menus .site-page.group').forEach(function (trigger, index) {
      if (trigger.dataset.a11yReady === 'true') return;
      trigger.dataset.a11yReady = 'true';
      var menu = trigger.parentElement && trigger.parentElement.querySelector(':scope > .menus_item_child');
      if (!menu) return;
      if (!menu.id) menu.id = 'thorn-submenu-' + index;
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-controls', menu.id);
      trigger.setAttribute('aria-expanded', 'false');
      menu.removeAttribute('role');
      menu.querySelectorAll('a').forEach(function (link) { link.removeAttribute('role'); });

      function setOpen(open) {
        trigger.parentElement.classList.toggle('keyboard-open', open);
        trigger.setAttribute('aria-expanded', String(open));
      }
      trigger.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          setOpen(false);
          trigger.focus();
          return;
        }
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          setOpen(true);
          var first = menu.querySelector('a');
          if (first) first.focus();
        }
      });
      trigger.parentElement.addEventListener('focusout', function (event) {
        if (!trigger.parentElement.contains(event.relatedTarget)) setOpen(false);
      });
      trigger.parentElement.addEventListener('mouseenter', function () { trigger.setAttribute('aria-expanded', 'true'); });
      trigger.parentElement.addEventListener('mouseleave', function () {
        if (!trigger.parentElement.classList.contains('keyboard-open')) trigger.setAttribute('aria-expanded', 'false');
      });
    });

    [
      ['#search-button .site-page', '打开站内搜索'],
      ['#toggle-menu .site-page', '打开导航菜单']
    ].forEach(function (item) {
      var element = document.querySelector(item[0]);
      if (!element || element.dataset.a11yReady === 'true') return;
      element.dataset.a11yReady = 'true';
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', item[1]);
      element.addEventListener('keydown', function (event) { clickFromKeyboard(element, event); });
    });
  }

  function enhanceSearchAccessibility() {
    var dialog = document.querySelector('#local-search .search-dialog');
    if (!dialog || dialog.dataset.a11yReady === 'true') return;
    dialog.dataset.a11yReady = 'true';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', '站内搜索');
    var input = dialog.querySelector('input');
    var close = dialog.querySelector('.search-close-button');
    if (input) input.setAttribute('aria-label', '搜索文章');
    if (close) close.setAttribute('aria-label', '关闭搜索');
    var trigger = document.querySelector('#search-button .site-page');
    if (trigger && input) trigger.addEventListener('click', function () { setTimeout(function () { input.focus(); }, 80); });
    if (close && trigger) close.addEventListener('click', function () { setTimeout(function () { trigger.focus(); }, 0); });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && close) {
        event.preventDefault();
        close.click();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = Array.from(dialog.querySelectorAll('button, input, a[href], [tabindex="0"]')).filter(function (element) {
        return !element.disabled && element.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function enhanceContentAccessibility() {
    document.querySelectorAll('#article-container .table-wrap, #article-container .katex-display, #article-container figure.highlight').forEach(function (region) {
      if (region.dataset.a11yReady === 'true') return;
      region.dataset.a11yReady = 'true';
      window.requestAnimationFrame(function () {
        if (region.scrollWidth <= region.clientWidth + 2) return;
        region.setAttribute('tabindex', '0');
        region.setAttribute('role', 'region');
        if (region.matches('.table-wrap')) region.setAttribute('aria-label', '可横向滚动的数据表格');
        else if (region.matches('.katex-display')) region.setAttribute('aria-label', '可横向滚动的数学公式');
        else region.setAttribute('aria-label', '可横向滚动的代码块');
      });
    });
    document.querySelectorAll('.highlight-tools .expand, .highlight-tools .copy-button, .highlight-tools .fullpage-button, .code-expand-btn').forEach(function (control) {
      if (control.dataset.a11yReady === 'true') return;
      control.dataset.a11yReady = 'true';
      control.setAttribute('role', 'button');
      control.setAttribute('tabindex', '0');
      var isCopy = control.classList.contains('copy-button');
      var isExpand = control.classList.contains('expand') || control.classList.contains('code-expand-btn');
      control.setAttribute('aria-label', isCopy ? '复制代码' : (isExpand ? '展开或折叠代码' : '切换代码全屏显示'));
      if (isExpand) control.setAttribute('aria-expanded', 'false');
      control.addEventListener('keydown', function (event) { clickFromKeyboard(control, event); });
      control.addEventListener('click', function () {
        if (isExpand) setTimeout(function () {
          var container = control.closest('figure.highlight');
          var tools = container && container.querySelector('.highlight-tools');
          var expanded = control.classList.contains('code-expand-btn')
            ? control.classList.contains('expand-done')
            : Boolean(tools && !tools.classList.contains('closed'));
          control.setAttribute('aria-expanded', String(expanded));
        }, 0);
      });
    });
    document.querySelectorAll('.copy-notice').forEach(function (notice) { notice.setAttribute('aria-live', 'polite'); });
  }

  function enhanceAboutNavigation() {
    var nav = document.querySelector('.about-top-nav');
    if (!nav || nav.dataset.sectionTracking === 'true') return;
    nav.dataset.sectionTracking = 'true';
    var links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (link) { return document.querySelector(link.getAttribute('href')); }).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; }).sort(function (a, b) {
        return Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top);
      })[0];
      if (!visible) return;
      links.forEach(function (link) {
        var active = link.getAttribute('href') === '#' + visible.target.id;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
    sections.forEach(function (section) { observer.observe(section); });
  }

  function updateReadingProgress() {
    progressFrame = 0;
    var bar = document.querySelector('.thorn-reading-progress');
    if (!bar) return;
    var article = document.querySelector('#article-container');
    if (!article) return;
    var rect = article.getBoundingClientRect();
    var start = window.scrollY + rect.top - Math.min(120, window.innerHeight * .18);
    var end = start + article.offsetHeight - Math.min(window.innerHeight * .72, 680);
    var value = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
    bar.style.transform = 'scaleX(' + value.toFixed(4) + ')';
  }

  function scheduleReadingProgress() {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateReadingProgress);
  }

  function ensureReadingProgress() {
    var isPost = Boolean(document.querySelector('#body-wrap.post'));
    var bar = document.querySelector('.thorn-reading-progress');
    if (!isPost) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'thorn-reading-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    scheduleReadingProgress();
  }

  function beginPageTransition() {
    if (reduceMotion.matches) return;
    window.clearTimeout(transitionRecoveryTimer);
    document.body.classList.add('is-navigating');
    transitionRecoveryTimer = window.setTimeout(function () {
      document.body.classList.remove('is-navigating', 'is-page-entering');
    }, 4000);
  }

  function finishPageTransition() {
    window.clearTimeout(transitionRecoveryTimer);
    document.body.classList.remove('is-navigating');
    if (reduceMotion.matches) return;
    document.body.classList.add('is-page-entering');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.remove('is-page-entering'); });
    });
  }

  function initMotion() {
    revealSections();
    trackHeroPointer();
    enhanceControls();
    markCurrentNavigation();
    enhanceNavigationAccessibility();
    enhanceSearchAccessibility();
    enhanceContentAccessibility();
    enhanceAboutNavigation();
    ensureReadingProgress();
    ensureSkipLink();
    enhanceHomeSemantics();
  }

  function ensureSkipLink() {
    if (document.querySelector('.thorn-skip-link')) return;
    var target = document.querySelector('#content-inner, #article-container, main');
    if (!target) return;
    if (!target.id) target.id = 'thorn-main-content';
    var link = document.createElement('a');
    link.className = 'thorn-skip-link';
    link.href = '#' + target.id;
    link.textContent = '跳到正文';
    document.body.insertBefore(link, document.body.firstChild);
  }

  function enhanceHomeSemantics() {
    document.querySelectorAll('#recent-posts .article-title').forEach(function (title) {
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '2');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMotion);
  else initMotion();
  if (!window.__thornMotionEventsBound) {
    window.__thornMotionEventsBound = true;
    window.addEventListener('scroll', scheduleReadingProgress, { passive: true });
    window.addEventListener('resize', scheduleReadingProgress, { passive: true });
    document.addEventListener('pjax:send', beginPageTransition);
    document.addEventListener('pjax:complete', function () {
      initMotion();
      finishPageTransition();
    });
    document.addEventListener('pjax:error', finishPageTransition);
  }
})();
