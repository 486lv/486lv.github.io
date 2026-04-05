(() => {
  const ENABLE_HOME_VIDEO = false;
  if (!ENABLE_HOME_VIDEO) return;

  const SOURCES = ["/images/top.mp4", "/images/wallpaper.mp4"];
  const POSTER = "/images/top-poster.jpg";
  let watchdog = null;

  function isHomePage() {
    const p = window.location.pathname || "/";
    return p === "/" || p === "/index.html" || !!document.getElementById("recent-posts");
  }

  function createVideo(header) {
    const video = document.createElement("video");
    video.className = "lv-header-video";
    video.autoplay = true;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.preload = "auto";
    video.playsInline = true;
    video.controls = false;
    video.volume = 0;
    video.poster = POSTER;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    header.insertBefore(video, header.firstChild);
    return video;
  }

  function tryPlay(video) {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  function mountVideo() {
    if (!isHomePage()) return;
    const header = document.getElementById("page-header");
    if (!header) return;

    let video = header.querySelector(".lv-header-video");
    if (!video) video = createVideo(header);

    document.documentElement.setAttribute("data-lv-video", "mounting");
    header.classList.add("lv-header-video-enabled");
    header.style.backgroundImage = "url('" + POSTER + "')";

    let idx = 0;
    const setSource = (i) => {
      idx = i;
      video.src = SOURCES[idx];
      video.load();
      tryPlay(video);
    };

    video.onerror = () => {
      if (idx + 1 < SOURCES.length) setSource(idx + 1);
    };

    video.onplaying = () => {
      header.classList.add("lv-video-playing");
      document.documentElement.setAttribute("data-lv-video", "playing");
    };

    video.onpause = () => {
      document.documentElement.setAttribute("data-lv-video", "paused");
      tryPlay(video);
    };
    video.onended = () => tryPlay(video);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tryPlay(video);
    });
    window.addEventListener("click", () => tryPlay(video), { once: true });
    window.addEventListener("touchstart", () => tryPlay(video), { once: true });

    if (watchdog) clearInterval(watchdog);
    watchdog = setInterval(() => {
      if (!document.body.contains(video)) {
        clearInterval(watchdog);
        watchdog = null;
        return;
      }
      if (video.readyState < 2 && idx + 1 < SOURCES.length) {
        setSource(idx + 1);
        return;
      }
      if (video.paused) tryPlay(video);
    }, 2500);

    setSource(0);
  }

  document.addEventListener("DOMContentLoaded", mountVideo);
  document.addEventListener("pjax:complete", mountVideo);
  window.addEventListener("load", mountVideo);
  setTimeout(mountVideo, 0);
})();
