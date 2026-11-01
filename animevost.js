(function () {
  'use strict';

  var NS = 'animevost_v080';
  var FLAG = NS + '_ready';
  var HOME = NS + '_home';
  var CATALOG = NS + '_catalog';
  var DETAIL = NS + '_detail';
  var CLEAN_PLAYER = NS + '_player';
  var RECENT_KEY = NS + '_recent';

  var WORKER = 'https://animevost-lampa.kalewse69.workers.dev/';
  var ORIGIN = 'https://animevost.org';

  var detailCache = {};
  var playerSession = null;

  /* -------------------------------------------------------
   * Basics
   * ----------------------------------------------------- */

  function notify(text) {
    try { Lampa.Noty.show(text); } catch (e) {}
  }

  function clean(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toInt(value, fallback) {
    var number = parseInt(value, 10);
    return isNaN(number) ? fallback : number;
  }

  function clip(text, limit) {
    text = clean(text);
    if (!limit || text.length <= limit) return text;
    return text.substring(0, limit).replace(/\s+\S*$/, '') + '…';
  }

  function toPath(value) {
    value = clean(value);
    if (!value) return '/';

    try {
      if (/^https?:\/\//i.test(value)) {
        var anchor = document.createElement('a');
        anchor.href = value;
        return (anchor.pathname || '/') + (anchor.search || '');
      }
    } catch (e) {}

    return value.charAt(0) === '/' ? value : '/' + value;
  }

  function absoluteUrl(value) {
    value = clean(value);
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf('//') === 0) return 'https:' + value;
    return ORIGIN + (value.charAt(0) === '/' ? value : '/' + value);
  }

  function apiUrl(path) {
    return WORKER + '?path=' + encodeURIComponent(toPath(path || '/'));
  }

  function cleanPlayerUrl(path, episode) {
    var cleanPath = toPath(path || '/').replace(/\?.*$/, '');
    return WORKER.replace(/\/$/, '') + cleanPath +
      '?avclean=1&episode=' + encodeURIComponent(episode || 0) + '&_=' + Date.now();
  }

  function searchPath(query) {
    return '/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=' +
      encodeURIComponent(query);
  }

  function firstMatch(text, expression) {
    var match = String(text || '').match(expression);
    return match && match[1] ? clean(match[1]) : '';
  }

  function textOf(node) {
    try { return clean(node && node.textContent ? node.textContent : ''); }
    catch (e) { return ''; }
  }

  function safeTextOf(node) {
    if (!node) return '';
    try {
      var clone = node.cloneNode(true);
      var junk = clone.querySelectorAll('script,style,noscript,iframe,object,embed,canvas,svg,form');
      for (var i = junk.length - 1; i >= 0; i--) {
        if (junk[i].parentNode) junk[i].parentNode.removeChild(junk[i]);
      }
      return clean(clone.textContent || '');
    } catch (e) {
      return textOf(node);
    }
  }

  function extractDescription(text, fallback) {
    var value = firstMatch(
      text,
      /Описание:\s*(.+?)(?=\s+(?:Это аниме состоит из:|Понравился сайт\?|Быстрый переход|Режим кинотеатра|Теги:|Категории:|Правила для комментаторов|Комментарии:?\b)|$)/i
    );

    if (!value) value = clean(fallback || '');

    return value
      .replace(/\s*window\.yaContextCb\.push[\s\S]*$/i, '')
      .replace(/\s*var\s+[a-zA-Z_$][\w$]*\s*=\s*[\s\S]*$/i, '')
      .replace(/\s*function\s*\([^)]*\)[\s\S]*$/i, '')
      .trim();
  }

  function isAnimePath(path) {
    return /^\/tip\/[^/]+\/[^?#]+\.html(?:\?.*)?$/i.test(toPath(path));
  }

  /* -------------------------------------------------------
   * AnimeVost parsing
   * ----------------------------------------------------- */

  function findArticleContainer(node) {
    var current = node;
    var best = node && node.parentElement ? node.parentElement : node;

    for (var i = 0; i < 8 && current; i++) {
      var text = safeTextOf(current);
      var count = 0;
      try { count = current.querySelectorAll('h2 a[href*="/tip/"]').length; } catch (e) {}

      if (
        text.indexOf('Год выхода:') >= 0 &&
        (text.indexOf('Описание:') >= 0 || text.indexOf('Количество серий:') >= 0) &&
        count <= 1
      ) return current;

      if (count <= 1) best = current;
      current = current.parentElement;
    }

    return best || node;
  }

  function findPoster(container, href) {
    if (!container) return '';
    var wanted = toPath(href);
    var links = container.querySelectorAll('a[href]');
    var i;

    for (i = 0; i < links.length; i++) {
      if (toPath(links[i].getAttribute('href') || '') === wanted) {
        var image = links[i].querySelector('img');
        if (image) {
          var source = image.getAttribute('data-src') || image.getAttribute('src') || '';
          if (source) return absoluteUrl(source);
        }
      }
    }

    var images = container.querySelectorAll('img');
    for (i = 0; i < images.length; i++) {
      var src = images[i].getAttribute('data-src') || images[i].getAttribute('src') || '';
      var alt = clean(images[i].getAttribute('alt') || '');
      var lower = src.toLowerCase();
      if (!src || /mc\.yandex|smile|rating|counter|loliland|banner/.test(lower)) continue;
      if (alt || /uploads|poster|story|covers?/i.test(src)) return absoluteUrl(src);
    }

    return '';
  }

  function findWatchHref(container, fallbackHref) {
    if (!container) return toPath(fallbackHref || '/');
    var links = container.querySelectorAll('a[href]');

    for (var i = 0; i < links.length; i++) {
      var title = clean(links[i].textContent || '');
      var href = toPath(links[i].getAttribute('href') || '');
      if (/^смотреть$/i.test(title) && isAnimePath(href)) return href;
    }

    return toPath(fallbackHref || '/');
  }

  function parseMenu(doc) {
    var result = { genres: [], types: [], years: [] };
    var seen = {};
    var anchors = doc.querySelectorAll('a[href]');

    function add(group, title, path) {
      title = clean(title);
      path = toPath(path);
      if (!title || !path) return;
      var key = group + '|' + path;
      if (seen[key]) return;
      seen[key] = true;
      result[group].push({ title: title, path: path });
    }

    for (var i = 0; i < anchors.length; i++) {
      var href = toPath(anchors[i].getAttribute('href') || '');
      var title = clean(anchors[i].textContent || '');

      if (href.indexOf('/zhanr/') === 0) add('genres', title, href);
      else if (href.indexOf('/god/') === 0) add('years', title, href);
      else if (href.indexOf('/tip/') === 0 && !/\.html(?:\?|$)/i.test(href)) add('types', title, href);
    }

    result.years.sort(function (a, b) {
      return toInt(b.title, 0) - toInt(a.title, 0);
    });

    return result;
  }

  function pageNumber(path) {
    var match = toPath(path).match(/\/page\/(\d+)\/?/i);
    return match ? toInt(match[1], 1) : 1;
  }

  function baseSectionPath(path) {
    var cleanPath = toPath(path)
      .replace(/[?#].*$/, '')
      .replace(/\/page\/\d+\/?$/i, '/');
    return cleanPath.charAt(cleanPath.length - 1) === '/' ? cleanPath : cleanPath + '/';
  }

  function makePagePath(path, page) {
    var base = baseSectionPath(path);
    return page <= 1 ? base : base + 'page/' + page + '/';
  }

  function parsePaging(doc, currentPath) {
    var current = pageNumber(currentPath);
    var max = current;
    var anchors = doc.querySelectorAll('a[href]');

    for (var i = 0; i < anchors.length; i++) {
      var href = toPath(anchors[i].getAttribute('href') || '');
      var match = href.match(/\/page\/(\d+)\/?/i);
      if (match) max = Math.max(max, toInt(match[1], current));
    }

    return {
      current: current,
      max: max,
      previous: current > 1 ? makePagePath(currentPath, current - 1) : '',
      next: max > current ? makePagePath(currentPath, current + 1) : ''
    };
  }

  function availableEpisodesFromTitle(title) {
    var best = 0;
    var expression = /\[?\s*1\s*-\s*(\d{1,4})\s*(?:из\s*\d+\+?)?/ig;
    var match;

    while ((match = expression.exec(clean(title)))) {
      best = Math.max(best, toInt(match[1], 0));
    }

    return best;
  }

  function parseCatalog(html, currentPath) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var headings = doc.querySelectorAll('h2 a[href*="/tip/"]');
    var items = [];
    var seen = {};

    for (var i = 0; i < headings.length; i++) {
      var anchor = headings[i];
      var href = toPath(anchor.getAttribute('href') || '');
      var title = clean(anchor.textContent || '');

      if (!isAnimePath(href) || !title || seen[href]) continue;
      seen[href] = true;

      var container = findArticleContainer(anchor.parentElement || anchor);
      var text = safeTextOf(container);

      items.push({
        title: title,
        href: href,
        watchHref: findWatchHref(container, href),
        poster: findPoster(container, href),
        year: firstMatch(text, /Год выхода:\s*([^Ж]+?)(?=\s+Жанр:|$)/i),
        genre: firstMatch(text, /Жанр:\s*(.+?)(?=\s+Тип:|$)/i),
        type: firstMatch(text, /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Рейтинг:|$)/i),
        episodes: firstMatch(text, /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Рейтинг:|\s+Описание:|$)/i),
        description: extractDescription(text, ''),
        availableEpisodes: availableEpisodesFromTitle(title)
      });
    }

    return {
      items: items,
      menu: parseMenu(doc),
      paging: parsePaging(doc, currentPath)
    };
  }

  function buildEpisodes(item, episodeText) {
    var max = item && item.availableEpisodes ? toInt(item.availableEpisodes, 0) : 0;
    var match;

    if (!max) {
      match = clean(episodeText).match(/\b1\s*-\s*(\d{1,4})\b/i);
      if (match) max = toInt(match[1], 0);
    }

    if (!max) {
      match = clean(episodeText).match(/\b(\d{1,4})\+?\b/);
      if (match) max = toInt(match[1], 0);
    }

    max = Math.max(0, Math.min(500, max));
    var result = [];
    for (var i = 1; i <= max; i++) result.push({ number: i, title: i + ' серия' });
    return result;
  }

  function parseDetail(html, item) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var text = safeTextOf(doc.body);
    var heading = doc.querySelector('h1');
    var title = item && item.title ? clean(item.title) : '';

    if (heading && clean(heading.textContent)) title = clean(heading.textContent);
    if (!title) title = clean(doc.title || '').replace(/\s*[|—-].*$/, '') || 'AnimeVost';

    var year = firstMatch(text, /(?:Год выхода|Год):\s*([^Ж]+?)(?=\s+Жанр:|$)/i) || (item && item.year) || '';
    var genre = firstMatch(text, /Жанр:\s*(.+?)(?=\s+Тип:|$)/i) || (item && item.genre) || '';
    var type = firstMatch(text, /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|$)/i) || (item && item.type) || '';
    var episodesText = firstMatch(text, /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|\s+Описание:|$)/i) || (item && item.episodes) || '';

    return {
      title: title,
      href: item && item.href ? item.href : '/',
      watchHref: item && item.watchHref ? item.watchHref : (item && item.href ? item.href : '/'),
      poster: item && item.poster ? item.poster : findPoster(doc.body, '/'),
      year: year,
      genre: genre,
      type: type,
      episodesText: episodesText,
      director: firstMatch(text, /Режисс[её]р:\s*(.+?)(?=\s+(?:Длительность|Рейтинг|Описание|Категории):|$)/i),
      duration: firstMatch(text, /(?:Длительность|Продолжительность):\s*(.+?)(?=\s+(?:Рейтинг|Описание|Категории):|$)/i),
      description: extractDescription(text, item && item.description ? item.description : ''),
      availableEpisodes: item && item.availableEpisodes ? item.availableEpisodes : availableEpisodesFromTitle(title),
      episodes: buildEpisodes(item, episodesText)
    };
  }

  /* -------------------------------------------------------
   * Local recent / continue shelf
   * ----------------------------------------------------- */

  function recentItems() {
    try {
      var list = Lampa.Storage.get(RECENT_KEY, []);
      return list && list.length ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecent(item, episode) {
    if (!item || !item.href) return;
    var list = recentItems();
    var next = [];

    next.push({
      title: item.title || 'AnimeVost',
      href: item.href,
      watchHref: item.watchHref || item.href,
      poster: item.poster || '',
      year: item.year || '',
      genre: item.genre || '',
      type: item.type || '',
      episodes: typeof item.episodes === 'string' ? item.episodes : (item.episodesText || ''),
      description: item.description || '',
      availableEpisodes: item.availableEpisodes || (item.episodes ? item.episodes.length : 0),
      savedEpisode: episode || 1,
      savedAt: Date.now()
    });

    for (var i = 0; i < list.length && next.length < 12; i++) {
      if (list[i] && list[i].href !== item.href) next.push(list[i]);
    }

    try { Lampa.Storage.set(RECENT_KEY, next); } catch (e) {}
  }

  /* -------------------------------------------------------
   * Styling
   * ----------------------------------------------------- */

  function injectStyle() {
    if ($('#animevost-v080-style').length) return;

    $('head').append(
      '<style id="animevost-v080-style">' +
      ':root{--av80-bg:#090b0f;--av80-panel:#11151b;--av80-soft:#171c24;--av80-text:#f4f6f8;--av80-muted:#a9b1bc;--av80-accent:#ff8a1f;--av80-accent2:#ffad55;}' +
      '.av80-view{height:calc(100vh - 6.1em);overflow-y:auto;overflow-x:hidden;background:linear-gradient(180deg,#0a0d12,#080a0e 70%);color:var(--av80-text);box-sizing:border-box;-webkit-overflow-scrolling:touch;}' +
      '.av80-view::-webkit-scrollbar,.av80-shelf-track::-webkit-scrollbar,.av80-episodes::-webkit-scrollbar{width:0;height:0;}' +
      '.av80-page{padding:0 2.2em 5em;box-sizing:border-box;min-height:100%;}' +
      '.av80-topbar{height:4.6em;display:flex;align-items:center;gap:1.25em;position:relative;z-index:20;}' +
      '.av80-brand{font-size:1.55em;font-weight:800;letter-spacing:.03em;white-space:nowrap;color:#fff;}' +
      '.av80-brand span{color:var(--av80-accent);}' +
      '.av80-nav{display:flex;align-items:center;gap:.35em;flex-wrap:nowrap;overflow:hidden;}' +
      '.av80-navbtn{padding:.62em .82em;border-radius:999px;font-size:.92em;color:#c7ced7;white-space:nowrap;transition:transform .14s ease,background .14s ease,color .14s ease;}' +
      '.av80-navbtn.focus{background:#fff;color:#0b0d11;transform:scale(1.04);}' +
      '.av80-searchmark{font-size:1.05em;margin-right:.28em;opacity:.85;}' +

      '.av80-hero{position:relative;height:46vh;min-height:24em;max-height:32em;border-radius:1.1em;overflow:hidden;background:#11151b;margin-bottom:2em;isolation:isolate;}' +
      '.av80-hero-bg{position:absolute;inset:-2em;z-index:-3;width:calc(100% + 4em);height:calc(100% + 4em);object-fit:cover;filter:blur(22px) brightness(.46) saturate(1.08);transform:scale(1.06);}' +
      '.av80-hero-shade{position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,rgba(7,9,13,.97) 0%,rgba(7,9,13,.86) 36%,rgba(7,9,13,.28) 68%,rgba(7,9,13,.12) 100%),linear-gradient(0deg,rgba(7,9,13,.72),transparent 45%);}' +
      '.av80-hero-poster{position:absolute;right:5%;top:7%;height:86%;width:31%;object-fit:cover;border-radius:1em;box-shadow:0 30px 90px rgba(0,0,0,.58);opacity:.9;}' +
      '.av80-hero-content{position:absolute;left:4%;top:10%;bottom:9%;width:52%;display:flex;flex-direction:column;justify-content:center;z-index:2;}' +
      '.av80-kicker{font-size:.78em;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--av80-accent2);margin-bottom:.7em;}' +
      '.av80-hero-title{font-size:3.05em;font-weight:800;line-height:1.02;letter-spacing:-.025em;margin-bottom:.42em;text-shadow:0 8px 34px rgba(0,0,0,.6);}' +
      '.av80-meta-line{display:flex;flex-wrap:wrap;gap:.45em;align-items:center;color:#d8dde5;font-size:.94em;margin-bottom:.85em;}' +
      '.av80-chip{padding:.3em .62em;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.1);}' +
      '.av80-chip.accent{background:rgba(255,138,31,.15);border-color:rgba(255,138,31,.5);color:#ffb267;}' +
      '.av80-hero-desc{font-size:1.02em;line-height:1.48;color:#c3cbd5;max-width:48em;margin-bottom:1.25em;text-shadow:0 2px 18px rgba(0,0,0,.5);}' +
      '.av80-hero-actions{display:flex;gap:.65em;align-items:center;}' +
      '.av80-action{display:flex;align-items:center;gap:.45em;padding:.72em 1.1em;border-radius:.55em;background:rgba(255,255,255,.11);color:#fff;font-weight:650;transition:transform .14s ease,background .14s ease;}' +
      '.av80-action.primary{background:linear-gradient(180deg,#ff9b36,#f57f0d);color:#15100a;}' +
      '.av80-action.focus{background:#fff;color:#0b0d11;transform:scale(1.045);box-shadow:0 8px 30px rgba(0,0,0,.35);}' +

      '.av80-shelf{margin:0 0 1.55em;}' +
      '.av80-shelf-title{font-size:1.38em;font-weight:750;margin:0 0 .7em;letter-spacing:-.01em;}' +
      '.av80-shelf-track{display:flex;gap:1em;overflow-x:auto;overflow-y:hidden;padding:.35em .25em .75em;scroll-behavior:smooth;}' +
      '.av80-card{position:relative;flex:0 0 10.4em;width:10.4em;border-radius:.72em;padding:.35em;background:transparent;transition:transform .15s ease,background .15s ease,box-shadow .15s ease;box-sizing:border-box;}' +
      '.av80-card.focus{transform:scale(1.065);background:rgba(255,255,255,.08);box-shadow:0 16px 42px rgba(0,0,0,.42);z-index:3;}' +
      '.av80-card-poster{position:relative;width:100%;height:14.7em;border-radius:.62em;overflow:hidden;background:#151a22;box-shadow:0 10px 26px rgba(0,0,0,.24);}' +
      '.av80-card-poster img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.av80-card-shade{position:absolute;left:0;right:0;bottom:0;height:42%;background:linear-gradient(transparent,rgba(0,0,0,.78));}' +
      '.av80-badge{position:absolute;left:.55em;bottom:.55em;padding:.3em .52em;border-radius:.38em;background:rgba(9,11,15,.88);font-size:.72em;color:#fff;border:1px solid rgba(255,255,255,.16);}' +
      '.av80-badge.orange{background:rgba(255,138,31,.9);color:#170e05;border-color:transparent;font-weight:700;}' +
      '.av80-card-name{font-size:.9em;font-weight:650;line-height:1.2;margin:.62em .1em .2em;min-height:2.15em;color:#f2f4f7;}' +
      '.av80-card-meta{font-size:.72em;color:#8f99a7;margin:0 .1em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +

      '.av80-section-head{padding:.6em 0 1.1em;}' +
      '.av80-page-title{font-size:2.15em;font-weight:800;letter-spacing:-.02em;margin:.15em 0 .25em;}' +
      '.av80-page-sub{font-size:.95em;color:#929baa;}' +
      '.av80-grid{display:flex;flex-wrap:wrap;gap:1.05em;padding-top:.6em;}' +
      '.av80-grid .av80-card{flex:0 0 10.9em;width:10.9em;margin-bottom:.8em;}' +
      '.av80-pages{display:flex;gap:.7em;align-items:center;margin:1em 0 0;}' +
      '.av80-pagebtn{padding:.66em .95em;border-radius:.55em;background:#151a22;color:#d6dce4;}' +
      '.av80-pagebtn.focus{background:#fff;color:#0a0c10;}' +
      '.av80-status{padding:2em 0;color:#a6afba;font-size:1.05em;}' +

      '.av80-detail-hero{position:relative;min-height:33em;border-radius:1.1em;overflow:hidden;margin-bottom:1.55em;isolation:isolate;}' +
      '.av80-detail-bg{position:absolute;inset:-2em;z-index:-4;width:calc(100% + 4em);height:calc(100% + 4em);object-fit:cover;filter:blur(24px) brightness(.34) saturate(1.12);transform:scale(1.08);}' +
      '.av80-detail-shade{position:absolute;inset:0;z-index:-3;background:linear-gradient(90deg,rgba(7,9,13,.98) 0%,rgba(7,9,13,.87) 53%,rgba(7,9,13,.35) 100%),linear-gradient(0deg,rgba(7,9,13,.95),rgba(7,9,13,.08) 70%);}' +
      '.av80-detail-content{display:flex;gap:2.2em;padding:2.2em;align-items:center;min-height:28em;box-sizing:border-box;}' +
      '.av80-detail-poster{width:15.5em;min-width:15.5em;height:22em;border-radius:.9em;overflow:hidden;background:#151a22;box-shadow:0 26px 68px rgba(0,0,0,.55);}' +
      '.av80-detail-poster img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.av80-detail-copy{max-width:56em;}' +
      '.av80-detail-title{font-size:3em;line-height:1.03;font-weight:850;letter-spacing:-.025em;margin-bottom:.45em;}' +
      '.av80-detail-meta{display:flex;flex-wrap:wrap;gap:.45em;margin-bottom:1em;}' +
      '.av80-detail-desc{font-size:1.03em;line-height:1.58;color:#c3cbd5;max-width:52em;margin-bottom:1.25em;}' +
      '.av80-detail-note{font-size:.82em;color:#858e9b;margin-top:.8em;}' +
      '.av80-episodes-title{font-size:1.45em;font-weight:760;margin:0 0 .8em;}' +
      '.av80-episodes{display:flex;gap:.65em;overflow-x:auto;overflow-y:hidden;padding:.3em .2em 1em;}' +
      '.av80-episode{flex:0 0 8.1em;height:5.3em;border-radius:.65em;background:#141921;border:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;justify-content:center;padding:.7em;box-sizing:border-box;transition:transform .14s ease,background .14s ease,border-color .14s ease;}' +
      '.av80-episode-num{font-size:1.03em;font-weight:750;}' +
      '.av80-episode-sub{font-size:.72em;color:#8f99a6;margin-top:.25em;}' +
      '.av80-episode.selected{border-color:rgba(255,138,31,.7);background:rgba(255,138,31,.09);}' +
      '.av80-episode.focus{transform:scale(1.05);background:#fff;color:#0b0d11;border-color:#fff;}' +
      '.av80-episode.focus .av80-episode-sub{color:#535b66;}' +

      '.av80-player-shell{position:fixed;inset:0;z-index:999999;background:#05070a;color:#fff;display:flex;flex-direction:column;}' +
      '.av80-player-top{height:4.4em;min-height:4.4em;display:flex;align-items:center;padding:0 1.3em;background:linear-gradient(180deg,#11151b,#090c10);border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;}' +
      '.av80-player-back{width:2.5em;height:2.5em;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);font-size:1.25em;margin-right:.85em;}' +
      '.av80-player-back.focus{background:var(--av80-accent);color:#110b05;}' +
      '.av80-player-title{font-size:1.05em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}' +
      '.av80-player-episode{font-size:.8em;color:#aeb7c2;margin-left:.8em;padding:.42em .72em;border-radius:999px;background:#151a21;white-space:nowrap;}' +
      '.av80-player-status{font-size:.76em;color:#838d9a;margin-left:.8em;white-space:nowrap;max-width:36%;overflow:hidden;text-overflow:ellipsis;}' +
      '.av80-player-shell>iframe{width:100%;height:calc(100% - 4.4em);border:0;background:#07090c;display:block;}' +

      '.av80-fallback{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(145deg,#171c24,#0e1116);color:#77818e;text-align:center;padding:1em;box-sizing:border-box;}' +
      '</style>'
    );
  }

  /* -------------------------------------------------------
   * Common UI helpers
   * ----------------------------------------------------- */

  function posterImage(url, fallbackText) {
    var wrap = $('<div></div>');
    if (!url) {
      wrap.append('<div class="av80-fallback">' + escapeHtml(fallbackText || 'AnimeVost') + '</div>');
      return wrap;
    }

    var img = $('<img alt="">').attr('src', url);
    img.on('error', function () {
      wrap.empty().append('<div class="av80-fallback">' + escapeHtml(fallbackText || 'AnimeVost') + '</div>');
    });
    wrap.append(img);
    return wrap;
  }

  function metaSummary(item) {
    var parts = [];
    if (item.year) parts.push(item.year);
    if (item.type) parts.push(item.type);
    if (item.availableEpisodes) parts.push(item.availableEpisodes + ' сер.');
    else if (item.episodes) parts.push(clean(item.episodes).replace(/\s*\([^)]*\)\s*$/, ''));
    return parts.join(' • ');
  }

  function makeTopBar(menu, onHome) {
    var top = $('<div class="av80-topbar"></div>');
    var brand = $('<div class="av80-brand">Anime<span>Vost</span></div>');
    var nav = $('<div class="av80-nav"></div>');

    function add(label, handler, search) {
      var button = $('<div class="av80-navbtn selector"></div>');
      if (search) button.html('<span class="av80-searchmark">⌕</span>' + escapeHtml(label));
      else button.text(label);
      button.on('hover:enter', handler);
      nav.append(button);
    }

    add('Главная', function () {
      if (typeof onHome === 'function') onHome();
      else openHome();
    });

    add('Поиск', function () { openSearchInput(); }, true);
    add('Жанр', function () { showSelect('Жанр', menu.genres || []); });
    add('Категории', function () { showSelect('Категории', menu.types || []); });
    add('Год', function () { showSelect('Год', menu.years || []); });
    add('Онгоинги', function () { openCatalog('/ongoing/', 'Онгоинги'); });
    add('Анонсы', function () { openCatalog('/preview/', 'Анонсы'); });

    top.append(brand).append(nav);
    return top;
  }

  function ensureVisible(viewport, element) {
    if (!viewport || !viewport[0] || !element) return;
    var container = viewport[0];
    var er = element.getBoundingClientRect();
    var vr = container.getBoundingClientRect();

    if (er.bottom > vr.bottom - 38) container.scrollTop += er.bottom - (vr.bottom - 38);
    else if (er.top < vr.top + 18) container.scrollTop -= (vr.top + 18) - er.top;

    var scroller = element.parentElement;
    while (scroller && scroller !== container) {
      try {
        var style = window.getComputedStyle ? window.getComputedStyle(scroller) : null;
        var overflowX = style ? style.overflowX : '';
        if (overflowX === 'auto' || overflowX === 'scroll') {
          var sr = scroller.getBoundingClientRect();
          var rr = element.getBoundingClientRect();
          if (rr.right > sr.right - 24) scroller.scrollLeft += rr.right - (sr.right - 24);
          else if (rr.left < sr.left + 24) scroller.scrollLeft -= (sr.left + 24) - rr.left;
          break;
        }
      } catch (e) {}
      scroller = scroller.parentElement;
    }
  }

  function visibleSelectors(root) {
    var result = [];
    root.find('.selector').each(function () {
      if (this && this.offsetParent !== null) result.push(this);
    });
    return result;
  }

  function groupRows(elements) {
    var rows = [];
    var tolerance = 12;

    for (var i = 0; i < elements.length; i++) {
      var rect = elements[i].getBoundingClientRect();
      var centerY = rect.top + rect.height / 2;
      var row = null;

      for (var j = 0; j < rows.length; j++) {
        if (Math.abs(rows[j].centerY - centerY) <= tolerance + rect.height * 0.12) {
          row = rows[j];
          break;
        }
      }

      if (!row) {
        row = { centerY: centerY, items: [] };
        rows.push(row);
      }

      row.items.push(elements[i]);
    }

    rows.sort(function (a, b) { return a.centerY - b.centerY; });
    rows.forEach(function (row) {
      row.items.sort(function (a, b) {
        return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
      });
    });

    return rows;
  }

  function nearest(items, current) {
    if (!items || !items.length) return null;
    if (!current) return items[0];

    var cr = current.getBoundingClientRect();
    var cx = cr.left + cr.width / 2;
    var best = items[0];
    var bestDistance = Infinity;

    for (var i = 0; i < items.length; i++) {
      var r = items[i].getBoundingClientRect();
      var distance = Math.abs((r.left + r.width / 2) - cx);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = items[i];
      }
    }

    return best;
  }

  function makeNavigation(root, viewport, edgeLeft, edgeUp) {
    var last = null;

    function current() {
      if (last && document.documentElement.contains(last) && last.offsetParent !== null) return last;
      var focused = root.find('.selector.focus')[0];
      if (focused) return focused;
      var list = visibleSelectors(root);
      return list.length ? list[0] : null;
    }

    function focus(element) {
      if (!element) return false;
      last = element;

      try { Lampa.Controller.collectionFocus(element, viewport); }
      catch (e) {
        try { Lampa.Controller.focus(element); } catch (e2) {}
      }

      ensureVisible(viewport, element);
      $(element).trigger('av80:focus');
      return true;
    }

    function move(direction) {
      var list = visibleSelectors(root);
      var cur = current();
      if (!list.length || !cur) return false;

      var rows = groupRows(list);
      var rowIndex = -1;
      var columnIndex = -1;

      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].items.length; c++) {
          if (rows[r].items[c] === cur) {
            rowIndex = r;
            columnIndex = c;
            break;
          }
        }
        if (rowIndex >= 0) break;
      }

      if (rowIndex < 0) return focus(list[0]);

      if (direction === 'left') {
        if (columnIndex > 0) return focus(rows[rowIndex].items[columnIndex - 1]);
        if (typeof edgeLeft === 'function') edgeLeft();
        return false;
      }

      if (direction === 'right') {
        if (columnIndex < rows[rowIndex].items.length - 1) return focus(rows[rowIndex].items[columnIndex + 1]);
        return false;
      }

      if (direction === 'up') {
        if (rowIndex > 0) return focus(nearest(rows[rowIndex - 1].items, cur));
        if (typeof edgeUp === 'function') edgeUp();
        return false;
      }

      if (direction === 'down') {
        if (rowIndex < rows.length - 1) return focus(nearest(rows[rowIndex + 1].items, cur));
        return false;
      }

      return false;
    }

    function bind() {
      root.find('.selector')
        .off('hover:focus.' + NS)
        .on('hover:focus.' + NS, function () {
          last = this;
          ensureVisible(viewport, this);
          $(this).trigger('av80:focus');
        });
    }

    return {
      focus: focus,
      move: move,
      bind: bind,
      getLast: function () { return last; }
    };
  }

  function makePosterCard(item, options) {
    options = options || {};
    var card = $('<div class="av80-card selector"></div>');
    var poster = $('<div class="av80-card-poster"></div>');
    var imageWrap = posterImage(item.poster, item.title);
    var image = imageWrap.find('img');

    if (image.length) poster.append(image);
    else poster.append(imageWrap.children());

    poster.append('<div class="av80-card-shade"></div>');

    var badge = '';
    if (options.recent && item.savedEpisode) badge = 'Серия ' + item.savedEpisode;
    else if (item.availableEpisodes) badge = item.availableEpisodes + ' сер.';
    else if (item.year) badge = item.year;

    if (badge) poster.append('<div class="av80-badge' + (options.recent ? ' orange' : '') + '">' + escapeHtml(badge) + '</div>');

    card.append(poster);
    card.append($('<div class="av80-card-name"></div>').text(item.title || 'AnimeVost'));
    card.append($('<div class="av80-card-meta"></div>').text(metaSummary(item) || item.genre || ''));

    card.data('av-item', item);
    card.on('hover:enter', function () { openDetail(item); });
    return card;
  }

  /* -------------------------------------------------------
   * Navigation actions / search
   * ----------------------------------------------------- */

  function openHome() {
    Lampa.Activity.push({ url: '', title: 'AnimeVost', component: HOME, page: 1 });
  }

  function openCatalog(path, title) {
    Lampa.Activity.push({
      url: '',
      title: title || 'AnimeVost',
      component: CATALOG,
      av_path: path || '/',
      av_title: title || 'AnimeVost',
      page: 1
    });
  }

  function openDetail(item) {
    Lampa.Activity.push({
      url: '',
      title: item.title || 'AnimeVost',
      component: DETAIL,
      av_item: item,
      page: 1
    });
  }

  function showSelect(title, list) {
    if (!list || !list.length) {
      notify('AnimeVost: список не найден');
      return;
    }

    Lampa.Select.show({
      title: title,
      items: list.map(function (item) {
        return { title: item.title, av_path: item.path };
      }),
      onSelect: function (item) { openCatalog(item.av_path, item.title); },
      onBack: function () { Lampa.Controller.toggle('content'); }
    });
  }

  function openSearchInput() {
    if (!Lampa.Input || typeof Lampa.Input.edit !== 'function') {
      notify('Поиск недоступен в этой сборке Lampa');
      return;
    }

    try {
      Lampa.Input.edit(
        {
          title: 'Поиск AnimeVost',
          value: '',
          free: true,
          nosave: true
        },
        function (result) {
          try { Lampa.Controller.toggle('content'); } catch (e) {}

          var value = result;
          if (result && typeof result === 'object' && typeof result.value !== 'undefined') value = result.value;
          var query = clean(value || '');
          if (!query) return;

          openCatalog(searchPath(query), 'Поиск: ' + query);
        }
      );
    } catch (e) {
      console.log('AnimeVost search input error', e);
      notify('Не удалось открыть поиск');
    }
  }

  /* -------------------------------------------------------
   * Clean player shell
   * ----------------------------------------------------- */

  function sendPlayerKey(key) {
    if (!playerSession || !playerSession.frame || !playerSession.frame[0]) return;
    try {
      playerSession.frame[0].contentWindow.postMessage({
        source: 'animevost-clean-host-v080',
        type: 'key',
        key: key
      }, '*');
    } catch (e) {}
  }

  function closeCleanPlayer() {
    if (!playerSession) return;
    var session = playerSession;
    playerSession = null;

    try { window.removeEventListener('message', session.messageHandler, false); } catch (e) {}
    try { session.overlay.remove(); } catch (e2) {}
    try { window.focus(); } catch (e3) {}
    try { Lampa.Controller.toggle('content'); } catch (e4) {}
  }

  function openCleanPlayer(item, episode) {
    closeCleanPlayer();
    episode = episode || 1;
    saveRecent(item, episode);

    var overlay = $('<div class="av80-player-shell"></div>');
    var top = $('<div class="av80-player-top"></div>');
    var back = $('<div class="av80-player-back selector">‹</div>');
    var title = $('<div class="av80-player-title"></div>').text(item.title || 'AnimeVost');
    var episodeChip = $('<div class="av80-player-episode"></div>').text('Серия ' + episode);
    var status = $('<div class="av80-player-status">Подготовка плеера…</div>');
    var frame = $('<iframe tabindex="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>')
      .attr('src', cleanPlayerUrl(item.watchHref || item.href, episode));

    top.append(back).append(title).append(episodeChip).append(status);
    overlay.append(top).append(frame);
    $('body').append(overlay);

    var session = {
      overlay: overlay,
      frame: frame,
      status: status,
      back: back,
      ready: false,
      messageHandler: null
    };

    playerSession = session;

    session.messageHandler = function (event) {
      var data = event.data || {};
      if (data.source !== 'animevost-clean-v080') return;

      if (data.type === 'ready') {
        session.ready = true;
        status.text('Загрузка…');
      } else if (data.type === 'isolated') {
        status.text('Выбираю серию…');
      } else if (data.type === 'episode-selected') {
        status.text('Серия ' + data.number + ' • загружаю видео…');
      } else if (data.type === 'player-ready') {
        status.text('OK play/pause • ←/→ 10 сек • Back назад');
        setTimeout(function () {
          if (playerSession === session) {
            try { frame[0].focus(); } catch (e) {}
          }
        }, 80);
      } else if (data.type === 'clean-error') {
        status.text('Плеер не подготовлен • Back назад');
      } else if (data.type === 'request-close') {
        closeCleanPlayer();
      }
    };

    window.addEventListener('message', session.messageHandler, false);
    back.on('hover:enter click', closeCleanPlayer);

    Lampa.Controller.add(CLEAN_PLAYER, {
      toggle: function () {
        Lampa.Controller.collectionSet(overlay);
        Lampa.Controller.collectionFocus(back[0], overlay);
      },
      left: function () { sendPlayerKey('left'); },
      right: function () { sendPlayerKey('right'); },
      up: function () { sendPlayerKey('up'); },
      down: function () { sendPlayerKey('down'); },
      enter: function () { sendPlayerKey('enter'); },
      playpause: function () { sendPlayerKey('playpause'); },
      play: function () { sendPlayerKey('play'); },
      pause: function () { sendPlayerKey('pause'); },
      rewindBack: function () { sendPlayerKey('rewind'); },
      rewindForward: function () { sendPlayerKey('forward'); },
      back: closeCleanPlayer
    });

    Lampa.Controller.toggle(CLEAN_PLAYER);

    setTimeout(function () {
      if (playerSession === session && !session.ready) status.text('Плеер загружается дольше обычного • Back назад');
    }, 7000);
  }

  /* -------------------------------------------------------
   * HOME — cinematic hero + horizontal shelves
   * ----------------------------------------------------- */

  function HomeComponent(object) {
    var network = new Lampa.Reguest();
    var alive = false;
    var viewport = $('<div class="av80-view"></div>');
    var root = $('<div class="av80-page"></div>');
    var self = this;
    var navigation;
    var menu = { genres: [], types: [], years: [] };
    var datasets = { home: null, ongoing: null, preview: null };
    var pending = 3;
    var rendered = false;
    var heroItem = null;

    function load(path, key) {
      network.silent(
        apiUrl(path),
        function (html) {
          if (!alive) return;
          try {
            datasets[key] = parseCatalog(String(html || ''), path);
            if (key === 'home' && datasets[key].menu) menu = datasets[key].menu;
          } catch (e) {
            console.log('AnimeVost home parse error', key, e);
            datasets[key] = { items: [], menu: menu, paging: {} };
          }
          pending--;
          if (pending <= 0) render();
        },
        function () {
          if (!alive) return;
          datasets[key] = { items: [], menu: menu, paging: {} };
          pending--;
          if (pending <= 0) render();
        },
        false,
        { dataType: 'text' }
      );
    }

    function buildHero() {
      var hero = $('<div class="av80-hero"></div>');
      hero.append('<img class="av80-hero-bg" alt="">');
      hero.append('<div class="av80-hero-shade"></div>');
      hero.append('<img class="av80-hero-poster" alt="">');

      var content = $('<div class="av80-hero-content"></div>');
      content.append('<div class="av80-kicker">Рекомендуем</div>');
      content.append('<div class="av80-hero-title"></div>');
      content.append('<div class="av80-meta-line"></div>');
      content.append('<div class="av80-hero-desc"></div>');

      var actions = $('<div class="av80-hero-actions"></div>');
      var watch = $('<div class="av80-action primary selector">▶ Смотреть</div>');
      var info = $('<div class="av80-action selector">ⓘ Подробнее</div>');

      watch.on('hover:enter', function () {
        if (!heroItem) return;
        openCleanPlayer(heroItem, heroItem.savedEpisode || 1);
      });

      info.on('hover:enter', function () {
        if (heroItem) openDetail(heroItem);
      });

      actions.append(watch).append(info);
      content.append(actions);
      hero.append(content);
      return hero;
    }

    function updateHero(item) {
      if (!item) return;
      heroItem = item;

      var hero = root.find('.av80-hero');
      hero.find('.av80-hero-title').text(item.title || 'AnimeVost');
      hero.find('.av80-hero-desc').text(clip(item.description || item.genre || 'Новое аниме на AnimeVost.', 280));

      var bg = hero.find('.av80-hero-bg');
      var poster = hero.find('.av80-hero-poster');
      if (item.poster) {
        bg.attr('src', item.poster).show();
        poster.attr('src', item.poster).show();
      } else {
        bg.hide();
        poster.hide();
      }

      var meta = hero.find('.av80-meta-line').empty();
      if (item.year) meta.append('<span class="av80-chip">' + escapeHtml(item.year) + '</span>');
      if (item.type) meta.append('<span class="av80-chip">' + escapeHtml(item.type) + '</span>');
      if (item.availableEpisodes) meta.append('<span class="av80-chip">' + item.availableEpisodes + ' серий</span>');
      if (item.genre) meta.append('<span class="av80-chip accent">' + escapeHtml(clip(item.genre, 50)) + '</span>');
    }

    function addShelf(title, items, options) {
      if (!items || !items.length) return;
      options = options || {};

      var shelf = $('<div class="av80-shelf"></div>');
      shelf.append($('<div class="av80-shelf-title"></div>').text(title));
      var track = $('<div class="av80-shelf-track"></div>');

      items.slice(0, 18).forEach(function (item) {
        var card = makePosterCard(item, options);
        card.on('av80:focus hover:focus', function () { updateHero(item); });
        track.append(card);
      });

      shelf.append(track);
      root.append(shelf);
    }

    function render() {
      if (!alive || rendered) return;
      rendered = true;
      self.activity.loader(false);
      root.empty();
      viewport[0].scrollTop = 0;

      root.append(makeTopBar(menu, function () {}));
      root.append(buildHero());

      var homeItems = datasets.home && datasets.home.items ? datasets.home.items : [];
      var ongoingItems = datasets.ongoing && datasets.ongoing.items ? datasets.ongoing.items : [];
      var previewItems = datasets.preview && datasets.preview.items ? datasets.preview.items : [];
      var recent = recentItems();

      var initial = recent.length ? recent[0] : (homeItems.length ? homeItems[0] : (ongoingItems.length ? ongoingItems[0] : null));
      if (initial) updateHero(initial);

      addShelf('Продолжить просмотр', recent, { recent: true });
      addShelf('Новинки', homeItems, {});
      addShelf('Онгоинги', ongoingItems, {});
      addShelf('Анонсы', previewItems, {});

      if (!recent.length && !homeItems.length && !ongoingItems.length && !previewItems.length) {
        root.append('<div class="av80-status">Не удалось загрузить каталог AnimeVost.</div>');
      }

      navigation.bind();
      setTimeout(function () {
        if (!alive) return;
        var firstCard = root.find('.av80-card.selector')[0] || root.find('.selector')[0];
        if (firstCard) navigation.focus(firstCard);
      }, 100);
    }

    this.create = function () {
      alive = true;
      viewport.append(root);
      root.append(makeTopBar(menu, function () {}));
      root.append('<div class="av80-status">Загружаю домашнюю страницу…</div>');
      this.activity.loader(true);

      navigation = makeNavigation(
        root,
        viewport,
        function () { Lampa.Controller.toggle('menu'); },
        function () { Lampa.Controller.toggle('head'); }
      );

      network.timeout(20000);
      load('/', 'home');
      load('/ongoing/', 'ongoing');
      load('/preview/', 'preview');

      setTimeout(function () {
        if (alive && !rendered) {
          pending = 0;
          render();
        }
      }, 9000);

      return this.render();
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;

      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(viewport);
          Lampa.Controller.collectionFocus(navigation.getLast() || false, viewport);
          if (navigation.getLast()) ensureVisible(viewport, navigation.getLast());
        },
        left: function () { navigation.move('left'); },
        right: function () { navigation.move('right'); },
        up: function () { navigation.move('up'); },
        down: function () { navigation.move('down'); },
        back: function () { Lampa.Activity.backward(); }
      });

      Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return viewport; };
    this.destroy = function () {
      alive = false;
      network.clear();
      viewport.remove();
      root.remove();
    };
  }

  /* -------------------------------------------------------
   * Catalog / search / genre / year pages
   * ----------------------------------------------------- */

  function CatalogComponent(object) {
    var network = new Lampa.Reguest();
    var alive = false;
    var viewport = $('<div class="av80-view"></div>');
    var root = $('<div class="av80-page"></div>');
    var self = this;
    var navigation;
    var menu = { genres: [], types: [], years: [] };
    var path = object.av_path || '/';
    var title = object.av_title || 'AnimeVost';

    function render(data) {
      if (!alive) return;
      root.empty();
      viewport[0].scrollTop = 0;
      menu = data.menu || menu;

      root.append(makeTopBar(menu));
      var head = $('<div class="av80-section-head"></div>');
      head.append($('<div class="av80-page-title"></div>').text(title));
      head.append($('<div class="av80-page-sub"></div>').text(data.items && data.items.length ? data.items.length + ' результатов на странице' : ''));
      root.append(head);

      if (!data.items || !data.items.length) {
        root.append('<div class="av80-status">По этому разделу ничего не найдено.</div>');
      } else {
        var grid = $('<div class="av80-grid"></div>');
        data.items.forEach(function (item) { grid.append(makePosterCard(item)); });
        root.append(grid);
      }

      if (data.paging && (data.paging.previous || data.paging.next)) {
        var pages = $('<div class="av80-pages"></div>');

        if (data.paging.previous) {
          var prev = $('<div class="av80-pagebtn selector">← Страница ' + (data.paging.current - 1) + '</div>');
          prev.on('hover:enter', function () { openCatalog(data.paging.previous, title); });
          pages.append(prev);
        }

        pages.append('<div class="av80-pagebtn">Страница ' + data.paging.current + (data.paging.max > 1 ? ' / ' + data.paging.max : '') + '</div>');

        if (data.paging.next) {
          var next = $('<div class="av80-pagebtn selector">Страница ' + (data.paging.current + 1) + ' →</div>');
          next.on('hover:enter', function () { openCatalog(data.paging.next, title); });
          pages.append(next);
        }

        root.append(pages);
      }

      navigation.bind();
      self.activity.loader(false);

      setTimeout(function () {
        if (!alive) return;
        var first = root.find('.av80-card.selector')[0] || root.find('.selector')[0];
        if (first) navigation.focus(first);
      }, 80);
    }

    function fail(message) {
      if (!alive) return;
      root.empty().append(makeTopBar(menu));
      root.append($('<div class="av80-page-title"></div>').text(title));
      root.append($('<div class="av80-status"></div>').text(message));
      self.activity.loader(false);
    }

    this.create = function () {
      alive = true;
      viewport.append(root);
      root.append(makeTopBar(menu));
      root.append('<div class="av80-status">Загрузка…</div>');
      this.activity.loader(true);

      navigation = makeNavigation(
        root,
        viewport,
        function () { Lampa.Controller.toggle('menu'); },
        function () { Lampa.Controller.toggle('head'); }
      );

      network.timeout(20000);
      network.silent(
        apiUrl(path),
        function (html) {
          if (!alive) return;
          try { render(parseCatalog(String(html || ''), path)); }
          catch (error) {
            console.log('AnimeVost catalog parse error', error);
            fail('Ошибка разбора AnimeVost: ' + (error && error.message ? error.message : error));
          }
        },
        function (error) {
          if (alive) fail('Не удалось загрузить AnimeVost. Код: ' + (error && error.status ? error.status : '?'));
        },
        false,
        { dataType: 'text' }
      );

      return this.render();
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;

      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(viewport);
          Lampa.Controller.collectionFocus(navigation.getLast() || false, viewport);
          if (navigation.getLast()) ensureVisible(viewport, navigation.getLast());
        },
        left: function () { navigation.move('left'); },
        right: function () { navigation.move('right'); },
        up: function () { navigation.move('up'); },
        down: function () { navigation.move('down'); },
        back: function () { Lampa.Activity.backward(); }
      });

      Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return viewport; };
    this.destroy = function () {
      alive = false;
      network.clear();
      viewport.remove();
      root.remove();
    };
  }

  /* -------------------------------------------------------
   * Detail page — cinematic artwork + episode carousel
   * ----------------------------------------------------- */

  function DetailComponent(object) {
    var network = new Lampa.Reguest();
    var alive = false;
    var viewport = $('<div class="av80-view"></div>');
    var root = $('<div class="av80-page"></div>');
    var item = object.av_item || {};
    var self = this;
    var navigation;
    var selectedEpisode = item.savedEpisode || 1;

    function render(data) {
      if (!alive) return;
      root.empty();
      viewport[0].scrollTop = 0;

      var hero = $('<div class="av80-detail-hero"></div>');
      if (data.poster) hero.append($('<img class="av80-detail-bg" alt="">').attr('src', data.poster));
      hero.append('<div class="av80-detail-shade"></div>');

      var content = $('<div class="av80-detail-content"></div>');
      var poster = $('<div class="av80-detail-poster"></div>');
      var posterWrap = posterImage(data.poster, data.title);
      if (posterWrap.find('img').length) poster.append(posterWrap.find('img'));
      else poster.append(posterWrap.children());

      var copy = $('<div class="av80-detail-copy"></div>');
      copy.append('<div class="av80-kicker">AnimeVost</div>');
      copy.append($('<div class="av80-detail-title"></div>').text(data.title || item.title || 'AnimeVost'));

      var meta = $('<div class="av80-detail-meta"></div>');
      if (data.year) meta.append('<span class="av80-chip">' + escapeHtml(data.year) + '</span>');
      if (data.type) meta.append('<span class="av80-chip">' + escapeHtml(data.type) + '</span>');
      if (data.episodesText) meta.append('<span class="av80-chip">' + escapeHtml(data.episodesText) + '</span>');
      if (data.duration) meta.append('<span class="av80-chip">' + escapeHtml(data.duration) + '</span>');
      if (data.genre) meta.append('<span class="av80-chip accent">' + escapeHtml(clip(data.genre, 72)) + '</span>');
      copy.append(meta);

      copy.append($('<div class="av80-detail-desc"></div>').text(data.description || 'Описание не найдено.'));

      var actions = $('<div class="av80-hero-actions"></div>');
      var watch = $('<div class="av80-action primary selector">▶ Смотреть</div>');
      watch.on('hover:enter', function () { openCleanPlayer(data, selectedEpisode || 1); });
      actions.append(watch);
      copy.append(actions);

      if (data.director) copy.append($('<div class="av80-detail-note"></div>').text('Режиссёр: ' + data.director));

      content.append(poster).append(copy);
      hero.append(content);
      root.append(hero);

      root.append('<div class="av80-episodes-title">Серии</div>');
      var episodes = $('<div class="av80-episodes"></div>');

      if (data.episodes && data.episodes.length) {
        if (selectedEpisode > data.episodes.length) selectedEpisode = data.episodes.length;

        data.episodes.forEach(function (episode) {
          var ep = $('<div class="av80-episode selector"></div>')
            .attr('data-episode', episode.number)
            .append('<div class="av80-episode-num">Серия ' + episode.number + '</div>')
            .append('<div class="av80-episode-sub">AnimeVost</div>');

          if (episode.number === selectedEpisode) ep.addClass('selected');

          ep.on('hover:enter', function () {
            selectedEpisode = episode.number;
            episodes.find('.av80-episode').removeClass('selected');
            ep.addClass('selected');
          });

          episodes.append(ep);
        });
      } else {
        episodes.append('<div class="av80-status">Список серий не найден.</div>');
      }

      root.append(episodes);
      navigation.bind();
      self.activity.loader(false);

      setTimeout(function () {
        if (!alive) return;
        var first = root.find('.av80-action.selector')[0] || root.find('.selector')[0];
        if (first) navigation.focus(first);
      }, 90);
    }

    function fail(message) {
      if (!alive) return;
      root.empty();
      root.append($('<div class="av80-page-title"></div>').text(item.title || 'AnimeVost'));
      root.append($('<div class="av80-status"></div>').text(message));
      self.activity.loader(false);
    }

    this.create = function () {
      alive = true;
      viewport.append(root);
      root.append('<div class="av80-status">Загрузка страницы аниме…</div>');
      this.activity.loader(true);

      navigation = makeNavigation(
        root,
        viewport,
        function () { Lampa.Activity.backward(); },
        function () { Lampa.Controller.toggle('head'); }
      );

      var key = toPath(item.href || '/');
      if (detailCache[key]) {
        render(detailCache[key]);
        return this.render();
      }

      network.timeout(20000);
      network.silent(
        apiUrl(key),
        function (html) {
          if (!alive) return;
          try {
            var data = parseDetail(String(html || ''), item);
            detailCache[key] = data;
            render(data);
          } catch (error) {
            console.log('AnimeVost detail parse error', error);
            fail('Ошибка разбора страницы: ' + (error && error.message ? error.message : error));
          }
        },
        function (error) {
          if (alive) fail('Не удалось загрузить страницу. Код: ' + (error && error.status ? error.status : '?'));
        },
        false,
        { dataType: 'text' }
      );

      return this.render();
    };

    this.start = function () {
      if (Lampa.Activity.active().activity !== this.activity) return;

      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(viewport);
          Lampa.Controller.collectionFocus(navigation.getLast() || false, viewport);
          if (navigation.getLast()) ensureVisible(viewport, navigation.getLast());
        },
        left: function () { navigation.move('left'); },
        right: function () { navigation.move('right'); },
        up: function () { navigation.move('up'); },
        down: function () { navigation.move('down'); },
        back: function () { Lampa.Activity.backward(); }
      });

      Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return viewport; };
    this.destroy = function () {
      alive = false;
      network.clear();
      closeCleanPlayer();
      viewport.remove();
      root.remove();
    };
  }

  /* -------------------------------------------------------
   * Menu + boot
   * ----------------------------------------------------- */

  function addMenuButton() {
    if ($('.menu .menu__list [data-action="' + NS + '"]').length) return;

    var button = $(
      '<li class="menu__item selector" data-action="' + NS + '">' +
        '<div class="menu__ico">' +
          '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5 6 5-6 5V7z"/>' +
          '</svg>' +
        '</div>' +
        '<div class="menu__text">AnimeVost</div>' +
      '</li>'
    );

    button.on('hover:enter', openHome);
    $('.menu .menu__list').eq(0).append(button);
  }

  function init() {
    if (window[FLAG]) return;
    window[FLAG] = true;

    try {
      injectStyle();
      Lampa.Component.add(HOME, HomeComponent);
      Lampa.Component.add(CATALOG, CatalogComponent);
      Lampa.Component.add(DETAIL, DetailComponent);
      addMenuButton();
      notify('AnimeVost V0.8.0 • Cinematic UI загружен');
    } catch (error) {
      console.log('AnimeVost V0.8.0 init error', error);
      notify('Ошибка запуска AnimeVost V0.8.0');
    }
  }

  if (window.appready) init();
  else {
    Lampa.Listener.follow('app', function (event) {
      if (event && event.type === 'ready') init();
    });
  }
})();
