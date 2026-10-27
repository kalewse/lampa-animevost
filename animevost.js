(function () {
  'use strict';

  var NS = 'animevost_v061';
  var FLAG = NS + '_ready';
  var CATALOG = NS + '_catalog';
  var DETAIL = NS + '_detail';
  var TV = NS + '_tv';

  var WORKER =
    'https://animevost-lampa.kalewse69.workers.dev/';

  var ORIGIN =
    'https://animevost.org';

  var cache = {};
  var tv = null;


  function noty(t) {
    try {
      Lampa.Noty.show(t);
    }
    catch (e) {}
  }


  function clean(t) {
    return String(t || '')
      .replace(
        /\u00a0/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();
  }


  function int(v, d) {
    var n =
      parseInt(
        v,
        10
      );

    return isNaN(n)
      ? d
      : n;
  }


  function path(v) {
    v =
      clean(v);

    if (!v) {
      return '/';
    }

    try {
      if (
        /^https?:\/\//i
          .test(v)
      ) {
        var a =
          document.createElement(
            'a'
          );

        a.href =
          v;

        return (
          a.pathname ||
          '/'
        ) + (
          a.search ||
          ''
        );
      }
    }
    catch (e) {}

    return (
      v.charAt(0) ===
      '/'
    )
      ? v
      : '/' + v;
  }


  function abs(v) {
    v =
      clean(v);

    if (!v) {
      return '';
    }

    if (
      /^https?:\/\//i
        .test(v)
    ) {
      return v;
    }

    if (
      v.indexOf(
        '//'
      ) === 0
    ) {
      return (
        'https:' +
        v
      );
    }

    return (
      ORIGIN +
      (
        v.charAt(0) ===
        '/'
          ? v
          : '/' + v
      )
    );
  }


  function apiUrl(p) {
    return (
      WORKER +
      '?path=' +
      encodeURIComponent(
        path(
          p ||
          '/'
        )
      )
    );
  }


  function tvUrl(
    p,
    ep,
    pl
  ) {
    p =
      path(
        p ||
        '/'
      )
      .replace(
        /\?.*$/,
        ''
      );

    return (
      WORKER
        .replace(
          /\/$/,
          ''
        ) +
      p +
      '?avtv=1' +
      '&episode=' +
      encodeURIComponent(
        ep ||
        0
      ) +
      '&player=' +
      encodeURIComponent(
        pl ||
        1
      ) +
      '&_=' +
      Date.now()
    );
  }


  function match(
    t,
    re
  ) {
    var m =
      String(
        t ||
        ''
      )
      .match(
        re
      );

    return (
      m &&
      m[1]
    )
      ? clean(
          m[1]
        )
      : '';
  }


  function txt(n) {
    try {
      return clean(
        n &&
        n.textContent
          ? n.textContent
          : ''
      );
    }
    catch (e) {
      return '';
    }
  }


  function animePath(p) {
    return /^\/tip\/[^/]+\/[^?#]+\.html(?:\?.*)?$/i
      .test(
        path(p)
      );
  }


  function article(n) {
    var cur =
      n;

    var best =
      n &&
      n.parentElement
        ? n.parentElement
        : n;

    var i;
    var count;
    var text;

    for (
      i = 0;
      i < 8 &&
      cur;
      i++
    ) {
      text =
        txt(cur);

      count =
        0;

      try {
        count =
          cur
            .querySelectorAll(
              'h2 a[href*="/tip/"]'
            )
            .length;
      }
      catch (e) {}

      if (
        text.indexOf(
          'Год выхода:'
        ) >= 0 &&
        (
          text.indexOf(
            'Описание:'
          ) >= 0 ||
          text.indexOf(
            'Количество серий:'
          ) >= 0
        ) &&
        count <= 1
      ) {
        return cur;
      }

      if (
        count <= 1
      ) {
        best =
          cur;
      }

      cur =
        cur.parentElement;
    }

    return (
      best ||
      n
    );
  }


  function poster(
    container,
    href
  ) {
    if (
      !container
    ) {
      return '';
    }

    var want =
      path(href);

    var links =
      container
        .querySelectorAll(
          'a[href]'
        );

    var imgs;
    var i;
    var im;
    var src;
    var alt;
    var low;

    for (
      i = 0;
      i < links.length;
      i++
    ) {
      if (
        path(
          links[i]
            .getAttribute(
              'href'
            ) ||
          ''
        ) ===
        want
      ) {
        im =
          links[i]
            .querySelector(
              'img'
            );

        if (
          im
        ) {
          src =
            im.getAttribute(
              'data-src'
            ) ||
            im.getAttribute(
              'src'
            ) ||
            '';

          if (
            src
          ) {
            return abs(
              src
            );
          }
        }
      }
    }

    imgs =
      container
        .querySelectorAll(
          'img'
        );

    for (
      i = 0;
      i < imgs.length;
      i++
    ) {
      src =
        imgs[i]
          .getAttribute(
            'data-src'
          ) ||
        imgs[i]
          .getAttribute(
            'src'
          ) ||
        '';

      alt =
        clean(
          imgs[i]
            .getAttribute(
              'alt'
            ) ||
          ''
        );

      low =
        src.toLowerCase();

      if (
        !src ||
        /mc\.yandex|smile|rating|counter/
          .test(low)
      ) {
        continue;
      }

      if (
        alt ||
        /uploads|poster|story|covers?/i
          .test(src)
      ) {
        return abs(
          src
        );
      }
    }

    return '';
  }


  function parseMenu(doc) {
    var out = {
      genres: [],
      types: [],
      years: []
    };

    var seen = {};

    var as =
      doc.querySelectorAll(
        'a[href]'
      );

    var i;


    function add(
      g,
      t,
      p
    ) {
      t =
        clean(t);

      p =
        path(p);

      if (
        !t ||
        !p
      ) {
        return;
      }

      var k =
        g +
        '|' +
        p;

      if (
        seen[k]
      ) {
        return;
      }

      seen[k] =
        1;

      out[g].push({
        title:
          t,

        path:
          p
      });
    }


    for (
      i = 0;
      i < as.length;
      i++
    ) {
      var p =
        path(
          as[i]
            .getAttribute(
              'href'
            ) ||
          ''
        );

      var t =
        clean(
          as[i]
            .textContent ||
          ''
        );

      if (
        p.indexOf(
          '/zhanr/'
        ) === 0
      ) {
        add(
          'genres',
          t,
          p
        );
      }

      else if (
        p.indexOf(
          '/god/'
        ) === 0
      ) {
        add(
          'years',
          t,
          p
        );
      }

      else if (
        p.indexOf(
          '/tip/'
        ) === 0 &&
        !/\.html(?:\?|$)/i
          .test(p)
      ) {
        add(
          'types',
          t,
          p
        );
      }
    }


    out.years.sort(
      function (
        a,
        b
      ) {
        return (
          int(
            b.title,
            0
          ) -
          int(
            a.title,
            0
          )
        );
      }
    );


    return out;
  }


  function pageNo(p) {
    var m =
      path(p)
        .match(
          /\/page\/(\d+)\/?/i
        );

    return m
      ? int(
          m[1],
          1
        )
      : 1;
  }


  function basePath(p) {
    p =
      path(p)
        .replace(
          /[?#].*$/,
          ''
        )
        .replace(
          /\/page\/\d+\/?$/i,
          '/'
        );

    return (
      p.charAt(
        p.length -
        1
      ) ===
      '/'
    )
      ? p
      : p + '/';
  }


  function pagePath(
    p,
    n
  ) {
    var b =
      basePath(p);

    return n <= 1
      ? b
      : (
          b +
          'page/' +
          n +
          '/'
        );
  }


  function paging(
    doc,
    p
  ) {
    var cur =
      pageNo(p);

    var max =
      cur;

    var as =
      doc.querySelectorAll(
        'a[href]'
      );

    var i;
    var m;

    for (
      i = 0;
      i < as.length;
      i++
    ) {
      m =
        path(
          as[i]
            .getAttribute(
              'href'
            ) ||
          ''
        )
        .match(
          /\/page\/(\d+)\/?/i
        );

      if (
        m
      ) {
        max =
          Math.max(
            max,
            int(
              m[1],
              cur
            )
          );
      }
    }

    return {
      current:
        cur,

      max:
        max,

      previous:
        cur > 1
          ? pagePath(
              p,
              cur - 1
            )
          : '',

      next:
        max > cur
          ? pagePath(
              p,
              cur + 1
            )
          : ''
    };
  }


  function available(title) {
    var best =
      0;

    var re =
      /\[?\s*1\s*-\s*(\d{1,4})\s*(?:из\s*\d+\+?)?/ig;

    var m;

    while (
      (
        m =
          re.exec(
            clean(title)
          )
      )
    ) {
      best =
        Math.max(
          best,
          int(
            m[1],
            0
          )
        );
    }

    return best;
  }


  function parseCatalog(
    html,
    current
  ) {
    var doc =
      new DOMParser()
        .parseFromString(
          String(
            html ||
            ''
          ),
          'text/html'
        );

    var hs =
      doc.querySelectorAll(
        'h2 a[href*="/tip/"]'
      );

    var items = [];
    var seen = {};
    var i;

    for (
      i = 0;
      i < hs.length;
      i++
    ) {
      var a =
        hs[i];

      var href =
        path(
          a.getAttribute(
            'href'
          ) ||
          ''
        );

      var title =
        clean(
          a.textContent ||
          ''
        );

      if (
        !animePath(
          href
        ) ||
        !title ||
        seen[href]
      ) {
        continue;
      }

      seen[href] =
        1;

      var c =
        article(
          a.parentElement ||
          a
        );

      var t =
        txt(c);

      items.push({
        title:
          title,

        href:
          href,

        poster:
          poster(
            c,
            href
          ),

        year:
          match(
            t,
            /Год выхода:\s*([^Ж]+?)(?=\s+Жанр:|$)/i
          ),

        genre:
          match(
            t,
            /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
          ),

        type:
          match(
            t,
            /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Рейтинг:|$)/i
          ),

        episodes:
          match(
            t,
            /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Рейтинг:|\s+Описание:|$)/i
          ),

        description:
          match(
            t,
            /Описание:\s*(.+?)(?=\s+Смотреть\s|\s+Категории:|$)/i
          ),

        availableEpisodes:
          available(
            title
          )
      });
    }

    return {
      items:
        items,

      menu:
        parseMenu(
          doc
        ),

      paging:
        paging(
          doc,
          current
        )
    };
  }


  function episodeList(
    item,
    text
  ) {
    var max =
      item &&
      item.availableEpisodes
        ? int(
            item.availableEpisodes,
            0
          )
        : 0;

    var m;
    var out = [];
    var i;

    if (
      !max
    ) {
      m =
        clean(text)
          .match(
            /\b1\s*-\s*(\d{1,4})\b/i
          );

      if (
        m
      ) {
        max =
          int(
            m[1],
            0
          );
      }
    }

    if (
      !max
    ) {
      m =
        clean(text)
          .match(
            /\b(\d{1,4})\+?\b/
          );

      if (
        m
      ) {
        max =
          int(
            m[1],
            0
          );
      }
    }

    max =
      Math.max(
        0,
        Math.min(
          500,
          max
        )
      );

    for (
      i = 1;
      i <= max;
      i++
    ) {
      out.push({
        number:
          i,

        title:
          i +
          ' серия'
      });
    }

    return out;
  }


  function parseDetail(
    html,
    item
  ) {
    var doc =
      new DOMParser()
        .parseFromString(
          String(
            html ||
            ''
          ),
          'text/html'
        );

    var t =
      txt(
        doc.body
      );

    var h1 =
      doc.querySelector(
        'h1'
      );

    var title =
      item &&
      item.title
        ? clean(
            item.title
          )
        : '';

    if (
      h1 &&
      clean(
        h1.textContent
      )
    ) {
      title =
        clean(
          h1.textContent
        );
    }

    if (
      !title
    ) {
      title =
        clean(
          doc.title ||
          ''
        )
        .replace(
          /\s*[|—-].*$/,
          ''
        ) ||
        'AnimeVost';
    }

    var year =
      match(
        t,
        /(?:Год выхода|Год):\s*([^Ж]+?)(?=\s+Жанр:|$)/i
      ) ||
      (
        item &&
        item.year
      ) ||
      '';

    var genre =
      match(
        t,
        /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
      ) ||
      (
        item &&
        item.genre
      ) ||
      '';

    var type =
      match(
        t,
        /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|$)/i
      ) ||
      (
        item &&
        item.type
      ) ||
      '';

    var eps =
      match(
        t,
        /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|\s+Описание:|$)/i
      ) ||
      (
        item &&
        item.episodes
      ) ||
      '';

    var desc =
      match(
        t,
        /Описание:\s*(.+?)(?=\s+(?:Теги:|Категории:|Правила для комментаторов|Комментарии)|$)/i
      ) ||
      (
        item &&
        item.description
      ) ||
      '';

    return {
      title:
        title,

      originalTitle:
        match(
          t,
          /(?:Оригинальное название|Оригинал(?:ьное название)?|Английское название):\s*(.+?)(?=\s+(?:Год выхода|Год|Жанр|Тип|Количество серий|Режисс[её]р|Длительность|Рейтинг|Описание):|$)/i
        ),

      href:
        item &&
        item.href
          ? item.href
          : '/',

      poster:
        item &&
        item.poster
          ? item.poster
          : poster(
              doc.body,
              '/'
            ),

      year:
        year,

      genre:
        genre,

      type:
        type,

      episodesText:
        eps,

      director:
        match(
          t,
          /Режисс[её]р:\s*(.+?)(?=\s+(?:Длительность|Рейтинг|Описание|Категории):|$)/i
        ),

      duration:
        match(
          t,
          /(?:Длительность|Продолжительность):\s*(.+?)(?=\s+(?:Рейтинг|Описание|Категории):|$)/i
        ),

      description:
        desc,

      episodes:
        episodeList(
          item,
          eps
        )
    };
  }


  function style() {
    if (
      $(
        '#animevost-v061-style'
      ).length
    ) {
      return;
    }

    $('head').append(
      '<style id="animevost-v061-style">' +

      '.av61-v{' +
        'height:calc(100vh - 6.2em);' +
        'overflow-y:auto;' +
        'overflow-x:hidden;' +
        'box-sizing:border-box;' +
        '-webkit-overflow-scrolling:touch' +
      '}' +

      '.av61-v::-webkit-scrollbar{' +
        'width:0;' +
        'height:0' +
      '}' +

      '.av61-p{' +
        'padding:1.3em 2.2em 5em;' +
        'box-sizing:border-box' +
      '}' +

      '.av61-title{' +
        'font-size:2em;' +
        'font-weight:600;' +
        'margin:.2em 0 .75em;' +
        'line-height:1.15' +
      '}' +

      '.av61-row,' +
      '.av61-grid,' +
      '.av61-pages,' +
      '.av61-actions,' +
      '.av61-eps{' +
        'display:flex;' +
        'flex-wrap:wrap;' +
        'align-items:flex-start' +
      '}' +

      '.av61-row{' +
        'margin-bottom:1.2em' +
      '}' +

      '.av61-btn,' +
      '.av61-pagebtn,' +
      '.av61-action,' +
      '.av61-ep{' +
        'padding:.7em 1.05em;' +
        'margin:0 .55em .55em 0;' +
        'background:rgba(255,255,255,.10);' +
        'border-radius:.45em;' +
        'font-size:1.05em;' +
        'box-sizing:border-box' +
      '}' +

      '.av61-btn.focus,' +
      '.av61-pagebtn.focus,' +
      '.av61-action.focus,' +
      '.av61-ep.focus{' +
        'background:#fff;' +
        'color:#111' +
      '}' +

      '.av61-status{' +
        'padding:1.2em 0;' +
        'font-size:1.15em;' +
        'opacity:.8' +
      '}' +

      '.av61-card{' +
        'width:12.2em;' +
        'margin:0 1.05em 1.3em 0;' +
        'border-radius:.55em;' +
        'padding:.45em;' +
        'background:rgba(255,255,255,.04);' +
        'box-sizing:border-box' +
      '}' +

      '.av61-card.focus{' +
        'background:rgba(255,255,255,.18);' +
        'transform:scale(1.025)' +
      '}' +

      '.av61-poster{' +
        'width:100%;' +
        'height:17.4em;' +
        'border-radius:.4em;' +
        'overflow:hidden;' +
        'background:rgba(255,255,255,.08);' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center' +
      '}' +

      '.av61-poster img,' +
      '.av61-dposter img{' +
        'width:100%;' +
        'height:100%;' +
        'object-fit:cover;' +
        'display:block' +
      '}' +

      '.av61-fallback{' +
        'font-size:1em;' +
        'opacity:.55;' +
        'text-align:center;' +
        'padding:1em' +
      '}' +

      '.av61-name{' +
        'font-size:1.03em;' +
        'line-height:1.25;' +
        'margin-top:.6em;' +
        'min-height:2.5em' +
      '}' +

      '.av61-meta{' +
        'font-size:.83em;' +
        'line-height:1.3;' +
        'opacity:.62;' +
        'margin-top:.35em;' +
        'min-height:2.1em' +
      '}' +

      '.av61-pages{' +
        'margin-top:.4em;' +
        'padding-bottom:1em' +
      '}' +

      '.av61-dtop{' +
        'display:flex;' +
        'align-items:flex-start;' +
        'margin-bottom:1.4em' +
      '}' +

      '.av61-dposter{' +
        'width:15em;' +
        'min-width:15em;' +
        'height:21em;' +
        'margin-right:2em;' +
        'overflow:hidden;' +
        'border-radius:.55em;' +
        'background:rgba(255,255,255,.08)' +
      '}' +

      '.av61-dbody{' +
        'max-width:68em' +
      '}' +

      '.av61-original{' +
        'font-size:1.05em;' +
        'opacity:.65;' +
        'margin-top:-.45em;' +
        'margin-bottom:.9em' +
      '}' +

      '.av61-dmeta{' +
        'font-size:1.04em;' +
        'line-height:1.55;' +
        'opacity:.78;' +
        'margin-bottom:1em' +
      '}' +

      '.av61-desc{' +
        'font-size:1.05em;' +
        'line-height:1.55' +
      '}' +

      '.av61-actions{' +
        'margin:1.25em 0 1.3em' +
      '}' +

      '.av61-primary{' +
        'background:rgba(255,255,255,.18)' +
      '}' +

      '.av61-section{' +
        'font-size:1.45em;' +
        'font-weight:600;' +
        'margin:1.2em 0 .75em' +
      '}' +

      '.av61-ep{' +
        'min-width:7.3em;' +
        'text-align:center' +
      '}' +

      '.av61-ep.selected{' +
        'box-shadow:inset 0 0 0 .16em rgba(255,255,255,.65)' +
      '}' +

      '.av61-note{' +
        'margin-top:1.2em;' +
        'padding:1em 1.15em;' +
        'background:rgba(255,255,255,.07);' +
        'border-radius:.45em;' +
        'opacity:.72;' +
        'font-size:.96em;' +
        'line-height:1.45' +
      '}' +

      '.av61-tv{' +
        'position:fixed;' +
        'left:0;' +
        'top:0;' +
        'right:0;' +
        'bottom:0;' +
        'background:#000;' +
        'z-index:999999;' +
        'display:flex;' +
        'flex-direction:column' +
      '}' +

      '.av61-tvbar{' +
        'height:3.5em;' +
        'min-height:3.5em;' +
        'background:rgba(12,12,12,.98);' +
        'display:flex;' +
        'align-items:center;' +
        'padding:0 1em;' +
        'box-sizing:border-box' +
      '}' +

      '.av61-tvtitle{' +
        'font-size:1em;' +
        'white-space:nowrap;' +
        'overflow:hidden;' +
        'text-overflow:ellipsis;' +
        'flex:1;' +
        'padding-right:1em' +
      '}' +

      '.av61-tvstatus{' +
        'font-size:.82em;' +
        'opacity:.72;' +
        'margin-right:1em;' +
        'white-space:nowrap' +
      '}' +

      '.av61-tvremote{' +
        'padding:.48em .7em;' +
        'border-radius:.35em;' +
        'background:rgba(255,255,255,.14);' +
        'font-size:.82em;' +
        'white-space:nowrap' +
      '}' +

      '.av61-tvremote.focus{' +
        'background:#fff;' +
        'color:#111' +
      '}' +

      '.av61-tv iframe{' +
        'width:100%;' +
        'height:calc(100% - 3.5em);' +
        'border:0;' +
        'background:#000;' +
        'display:block' +
      '}' +

      '</style>'
    );
  }


  function posterBox(
    cls,
    url
  ) {
    var box =
      $(
        '<div class="' +
        cls +
        '"></div>'
      );

    if (
      !url
    ) {
      box.append(
        '<div class="av61-fallback">' +
        'AnimeVost' +
        '</div>'
      );

      return box;
    }

    var img =
      $('<img alt="">')
        .attr(
          'src',
          url
        );

    img.on(
      'error',
      function () {
        box
          .empty()
          .append(
            '<div class="av61-fallback">' +
            'AnimeVost' +
            '</div>'
          );
      }
    );

    box.append(
      img
    );

    return box;
  }


  function ensure(
    viewport,
    el
  ) {
    if (
      !viewport ||
      !viewport[0] ||
      !el
    ) {
      return;
    }

    var vp =
      viewport[0];

    var er =
      el.getBoundingClientRect();

    var vr =
      vp.getBoundingClientRect();

    if (
      er.bottom >
      vr.bottom -
      40
    ) {
      vp.scrollTop +=
        er.bottom -
        (
          vr.bottom -
          40
        );
    }

    else if (
      er.top <
      vr.top +
      22
    ) {
      vp.scrollTop -=
        (
          vr.top +
          22
        ) -
        er.top;
    }
  }


  function selectable(root) {
    var out = [];

    root
      .find(
        '.selector'
      )
      .each(
        function () {
          if (
            this &&
            this.offsetParent !==
              null
          ) {
            out.push(
              this
            );
          }
        }
      );

    return out;
  }


  function makeRows(elements) {
    var rows = [];
    var tol = 10;
    var i;
    var j;
    var top;
    var row;

    for (
      i = 0;
      i < elements.length;
      i++
    ) {
      top =
        elements[i]
          .getBoundingClientRect()
          .top;

      row =
        null;

      for (
        j = 0;
        j < rows.length;
        j++
      ) {
        if (
          Math.abs(
            rows[j].top -
            top
          ) <= tol
        ) {
          row =
            rows[j];

          break;
        }
      }

      if (
        !row
      ) {
        row = {
          top:
            top,

          items:
            []
        };

        rows.push(
          row
        );
      }

      row.items.push(
        elements[i]
      );
    }

    rows.sort(
      function (
        a,
        b
      ) {
        return (
          a.top -
          b.top
        );
      }
    );

    rows.forEach(
      function (r) {
        r.items.sort(
          function (
            a,
            b
          ) {
            return (
              a.getBoundingClientRect().left -
              b.getBoundingClientRect().left
            );
          }
        );
      }
    );

    return rows;
  }


  function near(
    items,
    cur
  ) {
    if (
      !items ||
      !items.length
    ) {
      return null;
    }

    if (
      !cur
    ) {
      return items[0];
    }

    var cr =
      cur.getBoundingClientRect();

    var cx =
      cr.left +
      cr.width /
      2;

    var best =
      items[0];

    var d =
      Infinity;

    var i;

    for (
      i = 0;
      i < items.length;
      i++
    ) {
      var r =
        items[i]
          .getBoundingClientRect();

      var x =
        Math.abs(
          (
            r.left +
            r.width /
            2
          ) -
          cx
        );

      if (
        x < d
      ) {
        d =
          x;

        best =
          items[i];
      }
    }

    return best;
  }


  function nav(
    root,
    viewport,
    edgeLeft,
    edgeUp
  ) {
    var last =
      null;


    function current() {
      if (
        last &&
        document.documentElement
          .contains(
            last
          )
      ) {
        return last;
      }

      var f =
        root
          .find(
            '.selector.focus'
          )[0];

      var l;

      if (
        f
      ) {
        return f;
      }

      l =
        selectable(
          root
        );

      return l.length
        ? l[0]
        : null;
    }


    function focus(el) {
      if (
        !el
      ) {
        return false;
      }

      last =
        el;

      try {
        Lampa.Controller
          .collectionFocus(
            el,
            viewport
          );
      }
      catch (e) {
        try {
          Lampa.Controller
            .focus(
              el
            );
        }
        catch (e2) {}
      }

      ensure(
        viewport,
        el
      );

      return true;
    }


    function move(dir) {
      var list =
        selectable(
          root
        );

      var cur =
        current();

      var rs;
      var ri = -1;
      var ci = -1;
      var r;
      var c;

      if (
        !list.length ||
        !cur
      ) {
        return false;
      }

      rs =
        makeRows(
          list
        );

      for (
        r = 0;
        r < rs.length;
        r++
      ) {
        for (
          c = 0;
          c < rs[r].items.length;
          c++
        ) {
          if (
            rs[r].items[c] ===
            cur
          ) {
            ri =
              r;

            ci =
              c;

            break;
          }
        }

        if (
          ri >= 0
        ) {
          break;
        }
      }

      if (
        ri < 0
      ) {
        return focus(
          list[0]
        );
      }

      if (
        dir ===
        'left'
      ) {
        if (
          ci > 0
        ) {
          return focus(
            rs[ri].items[
              ci -
              1
            ]
          );
        }

        if (
          edgeLeft
        ) {
          edgeLeft();
        }

        return false;
      }

      if (
        dir ===
        'right'
      ) {
        if (
          ci <
          rs[ri].items.length -
          1
        ) {
          return focus(
            rs[ri].items[
              ci +
              1
            ]
          );
        }

        return false;
      }

      if (
        dir ===
        'up'
      ) {
        if (
          ri > 0
        ) {
          return focus(
            near(
              rs[
                ri -
                1
              ].items,
              cur
            )
          );
        }

        if (
          edgeUp
        ) {
          edgeUp();
        }

        return false;
      }

      if (
        dir ===
        'down'
      ) {
        if (
          ri <
          rs.length -
          1
        ) {
          return focus(
            near(
              rs[
                ri +
                1
              ].items,
              cur
            )
          );
        }

        return false;
      }

      return false;
    }


    function bind() {
      root
        .find(
          '.selector'
        )
        .off(
          'hover:focus.' +
          NS
        )
        .on(
          'hover:focus.' +
          NS,

          function () {
            last =
              this;

            ensure(
              viewport,
              this
            );
          }
        );
    }


    return {
      focus:
        focus,

      move:
        move,

      bind:
        bind,

      getLast:
        function () {
          return last;
        }
    };
  }


  function sendTv(key) {
    if (
      !tv ||
      !tv.frame ||
      !tv.frame[0]
    ) {
      return;
    }

    try {
      tv.frame[0]
        .contentWindow
        .postMessage(
          {
            source:
              'animevost-tv-host-v061',

            type:
              'key',

            key:
              key
          },
          '*'
        );
    }
    catch (e) {}
  }


  function closeTv() {
    if (
      !tv
    ) {
      return;
    }

    var s =
      tv;

    tv =
      null;

    try {
      window.removeEventListener(
        'message',
        s.message,
        false
      );
    }
    catch (e) {}

    try {
      s.overlay.remove();
    }
    catch (e2) {}

    try {
      window.focus();
    }
    catch (e3) {}

    try {
      Lampa.Controller
        .toggle(
          'content'
        );
    }
    catch (e4) {}
  }


  function openTv(
    item,
    episode,
    player
  ) {
    closeTv();

    var overlay =
      $(
        '<div class="av61-tv"></div>'
      );

    var bar =
      $(
        '<div class="av61-tvbar"></div>'
      );

    var title =
      $(
        '<div class="av61-tvtitle"></div>'
      )
      .text(
        (
          item.title ||
          'AnimeVost'
        ) +
        (
          episode
            ? ' • ' +
              episode +
              ' серия'
            : ''
        ) +
        ' • Плеер №' +
        player
      );

    var status =
      $(
        '<div class="av61-tvstatus">' +
        'Загрузка TV-режима...' +
        '</div>'
      );

    var remote =
      $(
        '<div class="av61-tvremote selector">' +
        'Пульт • Back — выход' +
        '</div>'
      );

    var frame =
      $(
        '<iframe ' +
        'tabindex="0" ' +
        'allow="autoplay; fullscreen; picture-in-picture" ' +
        'allowfullscreen>' +
        '</iframe>'
      )
      .attr(
        'src',
        tvUrl(
          item.href,
          episode,
          player
        )
      );

    bar
      .append(
        title
      )
      .append(
        status
      )
      .append(
        remote
      );

    overlay
      .append(
        bar
      )
      .append(
        frame
      );

    $('body')
      .append(
        overlay
      );

    var s = {
      overlay:
        overlay,

      frame:
        frame,

      remote:
        remote,

      status:
        status,

      childReady:
        false,

      playerReady:
        false,

      message:
        null
    };

    tv =
      s;


    function focusChild() {
      if (
        tv === s &&
        s.childReady
      ) {
        try {
          frame[0]
            .focus();
        }
        catch (e) {}
      }
    }


    s.message =
      function (event) {
        var d =
          event.data ||
          {};

        if (
          d.source !==
          'animevost-tv-v061'
        ) {
          return;
        }

        if (
          d.type ===
          'ready'
        ) {
          s.childReady =
            true;

          status.text(
            'TV helper готов • пульт передан AnimeVost • Back возвращает в Lampa'
          );

          setTimeout(
            focusChild,
            50
          );
        }

        else if (
          d.type ===
          'request-close'
        ) {
          closeTv();
        }

        else if (
          d.type ===
          'auto-episode'
        ) {
          status.text(
            'Серия ' +
            d.number +
            ' выбрана • загружаю Плеер №' +
            player
          );
        }

        else if (
          d.type ===
          'auto-player'
        ) {
          status.text(
            'Плеер №' +
            d.number +
            ' выбран • ожидаю PlayerJS'
          );
        }

        else if (
          d.type ===
          'player-ready' &&
          !s.playerReady
        ) {
          s.playerReady =
            true;

          status.text(
            (
              d.api
                ? 'PlayerJS API готов'
                : (
                    d.video
                      ? 'HTML5 video готово'
                      : 'Плеер готов'
                  )
            ) +
            ' • OK play/pause • ←/→ 10 сек • Back выход'
          );
        }
      };


    window.addEventListener(
      'message',
      s.message,
      false
    );


    Lampa.Controller.add(
      TV,
      {
        toggle:
          function () {
            Lampa.Controller
              .collectionSet(
                overlay
              );

            Lampa.Controller
              .collectionFocus(
                remote[0],
                overlay
              );
          },

        left:
          function () {
            sendTv(
              'left'
            );
          },

        right:
          function () {
            sendTv(
              'right'
            );
          },

        up:
          function () {
            sendTv(
              'up'
            );
          },

        down:
          function () {
            sendTv(
              'down'
            );
          },

        enter:
          function () {
            sendTv(
              'enter'
            );
          },

        playpause:
          function () {
            sendTv(
              'playpause'
            );
          },

        play:
          function () {
            sendTv(
              'play'
            );
          },

        pause:
          function () {
            sendTv(
              'pause'
            );
          },

        rewindBack:
          function () {
            sendTv(
              'rewind'
            );
          },

        rewindForward:
          function () {
            sendTv(
              'forward'
            );
          },

        back:
          closeTv
      }
    );

    Lampa.Controller
      .toggle(
        TV
      );


    setTimeout(
      function () {
        if (
          tv === s &&
          !s.childReady
        ) {
          status.text(
            'TV helper не ответил • Back безопасно закрывает окно'
          );
        }
      },
      7000
    );
  }


  function openCatalog(
    p,
    title
  ) {
    Lampa.Activity.push({
      url:
        '',

      title:
        title ||
        'AnimeVost',

      component:
        CATALOG,

      av_path:
        p ||
        '/',

      av_title:
        title ||
        'AnimeVost',

      page:
        1
    });
  }


  function openDetail(item) {
    Lampa.Activity.push({
      url:
        '',

      title:
        item.title ||
        'AnimeVost',

      component:
        DETAIL,

      av_item:
        item,

      page:
        1
    });
  }


  function picker(
    title,
    list
  ) {
    if (
      !list ||
      !list.length
    ) {
      return noty(
        'AnimeVost: список не найден'
      );
    }

    Lampa.Select.show({
      title:
        title,

      items:
        list.map(
          function (x) {
            return {
              title:
                x.title,

              av_path:
                x.path
            };
          }
        ),

      onSelect:
        function (x) {
          openCatalog(
            x.av_path,
            x.title
          );
        },

      onBack:
        function () {
          Lampa.Controller
            .toggle(
              'content'
            );
        }
    });
  }


  function CatalogComponent(object) {
    var net =
      new Lampa.Reguest();

    var alive =
      false;

    var viewport =
      $(
        '<div class="av61-v"></div>'
      );

    var root =
      $(
        '<div class="av61-p"></div>'
      );

    var menu = {
      genres: [],
      types: [],
      years: []
    };

    var p =
      object.av_path ||
      '/';

    var title =
      object.av_title ||
      'AnimeVost';

    var self =
      this;

    var n;


    function top() {
      var row =
        $(
          '<div class="av61-row"></div>'
        );


      function b(
        t,
        fn
      ) {
        var e =
          $(
            '<div class="av61-btn selector"></div>'
          )
          .text(
            t
          );

        e.on(
          'hover:enter',
          fn
        );

        row.append(
          e
        );
      }


      b(
        'Главная',
        function () {
          openCatalog(
            '/',
            'Главная'
          );
        }
      );

      b(
        'Жанр',
        function () {
          picker(
            'Жанр',
            menu.genres
          );
        }
      );

      b(
        'Категории',
        function () {
          picker(
            'Категории',
            menu.types
          );
        }
      );

      b(
        'Год',
        function () {
          picker(
            'Год',
            menu.years
          );
        }
      );

      b(
        'Онгоинги',
        function () {
          openCatalog(
            '/ongoing/',
            'Онгоинги'
          );
        }
      );

      b(
        'Анонсы',
        function () {
          openCatalog(
            '/preview/',
            'Анонсы'
          );
        }
      );

      root.append(
        row
      );
    }


    function card(
      grid,
      item
    ) {
      var e =
        $(
          '<div class="av61-card selector"></div>'
        );

      e.append(
        posterBox(
          'av61-poster',
          item.poster
        )
      );

      e.append(
        $(
          '<div class="av61-name"></div>'
        )
        .text(
          item.title
        )
      );

      var m = [];

      if (
        item.year
      ) {
        m.push(
          item.year
        );
      }

      if (
        item.type
      ) {
        m.push(
          item.type
        );
      }

      if (
        item.episodes
      ) {
        m.push(
          item.episodes
            .replace(
              /\s*\([^)]*\)\s*$/,
              ''
            )
        );
      }

      e.append(
        $(
          '<div class="av61-meta"></div>'
        )
        .text(
          m.join(
            ' • '
          )
        )
      );

      e.on(
        'hover:enter',
        function () {
          openDetail(
            item
          );
        }
      );

      grid.append(
        e
      );
    }


    function pages(pg) {
      if (
        !pg ||
        (
          !pg.previous &&
          !pg.next
        )
      ) {
        return;
      }

      var row =
        $(
          '<div class="av61-pages"></div>'
        );

      if (
        pg.previous
      ) {
        var prev =
          $(
            '<div class="av61-pagebtn selector"></div>'
          )
          .text(
            '← Страница ' +
            (
              pg.current -
              1
            )
          );

        prev.on(
          'hover:enter',
          function () {
            openCatalog(
              pg.previous,
              title
            );
          }
        );

        row.append(
          prev
        );
      }

      row.append(
        $(
          '<div class="av61-pagebtn"></div>'
        )
        .text(
          'Страница ' +
          pg.current +
          (
            pg.max > 1
              ? ' / ' +
                pg.max
              : ''
          )
        )
      );

      if (
        pg.next
      ) {
        var next =
          $(
            '<div class="av61-pagebtn selector"></div>'
          )
          .text(
            'Страница ' +
            (
              pg.current +
              1
            ) +
            ' →'
          );

        next.on(
          'hover:enter',
          function () {
            openCatalog(
              pg.next,
              title
            );
          }
        );

        row.append(
          next
        );
      }

      root.append(
        row
      );
    }


    function fail(msg) {
      if (!alive) return;

      root.empty()
        .append(
          $(
            '<div class="av61-title"></div>'
          )
          .text(
            title
          )
        )
        .append(
          $(
            '<div class="av61-status"></div>'
          )
          .text(
            msg
          )
        );

      self.activity
        .loader(
          false
        );
    }


    function draw(data) {
      if (!alive) return;

      root.empty();

      viewport[0]
        .scrollTop =
        0;

      menu =
        data.menu ||
        menu;

      root.append(
        $(
          '<div class="av61-title"></div>'
        )
        .text(
          title
        )
      );

      top();

      if (
        !data.items ||
        !data.items.length
      ) {
        root.append(
          '<div class="av61-status">' +
          'Карточки аниме на этой странице не найдены.' +
          '</div>'
        );
      }

      else {
        var grid =
          $(
            '<div class="av61-grid"></div>'
          );

        data.items
          .forEach(
            function (item) {
              card(
                grid,
                item
              );
            }
          );

        root.append(
          grid
        );
      }

      pages(
        data.paging
      );

      n.bind();

      self.activity
        .loader(
          false
        );

      setTimeout(
        function () {
          if (
            alive
          ) {
            var l =
              selectable(
                root
              );

            if (
              l.length
            ) {
              n.focus(
                l[0]
              );
            }
          }
        },
        80
      );
    }


    this.create =
      function () {
        alive =
          true;

        viewport.append(
          root
        );

        root.append(
          $(
            '<div class="av61-title"></div>'
          )
          .text(
            title
          )
        )
        .append(
          '<div class="av61-status">' +
          'Загрузка AnimeVost...' +
          '</div>'
        );

        this.activity
          .loader(
            true
          );

        n =
          nav(
            root,
            viewport,
            function () {
              Lampa.Controller
                .toggle(
                  'menu'
                );
            },
            function () {
              Lampa.Controller
                .toggle(
                  'head'
                );
            }
          );

        net.timeout(
          20000
        );

        net.silent(
          apiUrl(p),

          function (html) {
            if (
              !alive
            ) {
              return;
            }

            try {
              draw(
                parseCatalog(
                  String(
                    html ||
                    ''
                  ),
                  p
                )
              );
            }

            catch (e) {
              console.log(
                'AnimeVost catalog parse error',
                e
              );

              fail(
                'Ошибка разбора AnimeVost: ' +
                (
                  e &&
                  e.message
                    ? e.message
                    : e
                )
              );
            }
          },

          function (e) {
            if (
              alive
            ) {
              fail(
                'Не удалось загрузить AnimeVost. Код: ' +
                (
                  e &&
                  e.status
                    ? e.status
                    : '?'
                )
              );
            }
          },

          false,

          {
            dataType:
              'text'
          }
        );

        return this.render();
      };


    this.start =
      function () {
        if (
          Lampa.Activity
            .active()
            .activity !==
          this.activity
        ) {
          return;
        }

        Lampa.Controller.add(
          'content',
          {
            toggle:
              function () {
                Lampa.Controller
                  .collectionSet(
                    viewport
                  );

                Lampa.Controller
                  .collectionFocus(
                    n.getLast() ||
                    false,
                    viewport
                  );

                if (
                  n.getLast()
                ) {
                  ensure(
                    viewport,
                    n.getLast()
                  );
                }
              },

            left:
              function () {
                n.move(
                  'left'
                );
              },

            right:
              function () {
                n.move(
                  'right'
                );
              },

            up:
              function () {
                n.move(
                  'up'
                );
              },

            down:
              function () {
                n.move(
                  'down'
                );
              },

            back:
              function () {
                Lampa.Activity
                  .backward();
              }
          }
        );

        Lampa.Controller
          .toggle(
            'content'
          );
      };


    this.pause =
      function () {};

    this.stop =
      function () {};

    this.render =
      function () {
        return viewport;
      };

    this.destroy =
      function () {
        alive =
          false;

        net.clear();

        viewport.remove();

        root.remove();
      };
  }


  function DetailComponent(object) {
    var net =
      new Lampa.Reguest();

    var alive =
      false;

    var viewport =
      $(
        '<div class="av61-v"></div>'
      );

    var root =
      $(
        '<div class="av61-p"></div>'
      );

    var item =
      object.av_item ||
      {};

    var self =
      this;

    var n;

    var selected =
      0;


    function mark() {
      root
        .find(
          '.av61-ep'
        )
        .each(
          function () {
            $(
              this
            )
            .toggleClass(
              'selected',
              int(
                $(
                  this
                )
                .attr(
                  'data-episode'
                ),
                0
              ) ===
              selected
            );
          }
        );
    }


    function fail(msg) {
      if (
        !alive
      ) {
        return;
      }

      root.empty()
        .append(
          $(
            '<div class="av61-title"></div>'
          )
          .text(
            item.title ||
            'AnimeVost'
          )
        )
        .append(
          $(
            '<div class="av61-status"></div>'
          )
          .text(
            msg
          )
        );

      n.bind();

      self.activity
        .loader(
          false
        );
    }


    function draw(data) {
      if (
        !alive
      ) {
        return;
      }

      root.empty();

      viewport[0]
        .scrollTop =
        0;

      if (
        !selected &&
        data.episodes &&
        data.episodes.length
      ) {
        selected =
          data.episodes[0]
            .number;
      }

      var top =
        $(
          '<div class="av61-dtop"></div>'
        );

      var body =
        $(
          '<div class="av61-dbody"></div>'
        );

      top.append(
        posterBox(
          'av61-dposter',
          data.poster
        )
      );

      body.append(
        $(
          '<div class="av61-title"></div>'
        )
        .text(
          data.title ||
          item.title ||
          'AnimeVost'
        )
      );

      if (
        data.originalTitle
      ) {
        body.append(
          $(
            '<div class="av61-original"></div>'
          )
          .text(
            data.originalTitle
          )
        );
      }

      var meta = [];

      if (
        data.year
      ) {
        meta.push(
          'Год: ' +
          data.year
        );
      }

      if (
        data.type
      ) {
        meta.push(
          'Тип: ' +
          data.type
        );
      }

      if (
        data.episodesText
      ) {
        meta.push(
          'Серии: ' +
          data.episodesText
        );
      }

      if (
        data.duration
      ) {
        meta.push(
          'Длительность: ' +
          data.duration
        );
      }

      if (
        data.genre
      ) {
        meta.push(
          'Жанр: ' +
          data.genre
        );
      }

      if (
        data.director
      ) {
        meta.push(
          'Режиссёр: ' +
          data.director
        );
      }

      body.append(
        $(
          '<div class="av61-dmeta"></div>'
        )
        .text(
          meta.join(
            ' • '
          )
        )
      );

      body.append(
        $(
          '<div class="av61-desc"></div>'
        )
        .text(
          data.description ||
          'Описание не найдено.'
        )
      );

      var actions =
        $(
          '<div class="av61-actions"></div>'
        );

      var p1 =
        $(
          '<div class="av61-action av61-primary selector">' +
          '▶ Смотреть • Плеер №1' +
          '</div>'
        );

      var p2 =
        $(
          '<div class="av61-action selector">' +
          '▶ Смотреть • Плеер №2' +
          '</div>'
        );

      p1.on(
        'hover:enter',
        function () {
          openTv(
            data,
            selected,
            1
          );
        }
      );

      p2.on(
        'hover:enter',
        function () {
          openTv(
            data,
            selected,
            2
          );
        }
      );

      actions
        .append(
          p1
        )
        .append(
          p2
        );

      body.append(
        actions
      );

      top.append(
        body
      );

      root.append(
        top
      );

      root.append(
        '<div class="av61-section">' +
        'Серии' +
        '</div>'
      );

      if (
        data.episodes &&
        data.episodes.length
      ) {
        var eps =
          $(
            '<div class="av61-eps"></div>'
          );

        data.episodes
          .forEach(
            function (ep) {
              var b =
                $(
                  '<div class="av61-ep selector"></div>'
                )
                .attr(
                  'data-episode',
                  ep.number
                )
                .text(
                  ep.title ||
                  (
                    ep.number +
                    ' серия'
                  )
                );

              b.on(
                'hover:enter',
                function () {
                  selected =
                    ep.number;

                  mark();

                  noty(
                    'Выбрана серия ' +
                    ep.number
                  );
                }
              );

              eps.append(
                b
              );
            }
          );

        root.append(
          eps
        );

        mark();
      }

      else {
        root.append(
          '<div class="av61-status">' +
          'Список доступных серий не найден.' +
          '</div>'
        );
      }

      root.append(
        '<div class="av61-note">' +

        'V0.6.1: серия и Плеер №1/№2 активируются через ' +
        'mouse/pointer-события AnimeVost. ' +

        'После загрузки TV helper страница получает настоящий ' +
        'LG key event, чтобы PlayerJS видел пользовательский жест. ' +

        'На плеере: OK play/pause, ←/→ ±10 сек, ' +
        '↑/↓ громкость, Back всегда назад в Lampa.' +

        '</div>'
      );

      n.bind();

      self.activity
        .loader(
          false
        );

      setTimeout(
        function () {
          if (
            alive
          ) {
            var l =
              selectable(
                root
              );

            if (
              l.length
            ) {
              n.focus(
                l[0]
              );
            }
          }
        },
        80
      );
    }


    this.create =
      function () {
        alive =
          true;

        viewport.append(
          root
        );

        root.append(
          $(
            '<div class="av61-title"></div>'
          )
          .text(
            item.title ||
            'AnimeVost'
          )
        )
        .append(
          '<div class="av61-status">' +
          'Загрузка страницы аниме...' +
          '</div>'
        );

        this.activity
          .loader(
            true
          );

        n =
          nav(
            root,
            viewport,
            function () {
              Lampa.Controller
                .toggle(
                  'menu'
                );
            },
            function () {
              Lampa.Controller
                .toggle(
                  'head'
                );
            }
          );

        var k =
          path(
            item.href ||
            '/'
          );

        if (
          cache[k]
        ) {
          draw(
            cache[k]
          );

          return this.render();
        }

        net.timeout(
          20000
        );

        net.silent(
          apiUrl(k),

          function (html) {
            if (
              !alive
            ) {
              return;
            }

            try {
              var data =
                parseDetail(
                  String(
                    html ||
                    ''
                  ),
                  item
                );

              cache[k] =
                data;

              draw(
                data
              );
            }

            catch (e) {
              console.log(
                'AnimeVost detail parse error',
                e
              );

              fail(
                'Ошибка разбора страницы аниме: ' +
                (
                  e &&
                  e.message
                    ? e.message
                    : e
                )
              );
            }
          },

          function (e) {
            if (
              alive
            ) {
              fail(
                'Не удалось загрузить страницу аниме. Код: ' +
                (
                  e &&
                  e.status
                    ? e.status
                    : '?'
                )
              );
            }
          },

          false,

          {
            dataType:
              'text'
          }
        );

        return this.render();
      };


    this.start =
      function () {
        if (
          Lampa.Activity
            .active()
            .activity !==
          this.activity
        ) {
          return;
        }

        Lampa.Controller.add(
          'content',
          {
            toggle:
              function () {
                Lampa.Controller
                  .collectionSet(
                    viewport
                  );

                Lampa.Controller
                  .collectionFocus(
                    n.getLast() ||
                    false,
                    viewport
                  );

                if (
                  n.getLast()
                ) {
                  ensure(
                    viewport,
                    n.getLast()
                  );
                }
              },

            left:
              function () {
                n.move(
                  'left'
                );
              },

            right:
              function () {
                n.move(
                  'right'
                );
              },

            up:
              function () {
                n.move(
                  'up'
                );
              },

            down:
              function () {
                n.move(
                  'down'
                );
              },

            back:
              function () {
                Lampa.Activity
                  .backward();
              }
          }
        );

        Lampa.Controller
          .toggle(
            'content'
          );
      };


    this.pause =
      function () {};

    this.stop =
      function () {};

    this.render =
      function () {
        return viewport;
      };

    this.destroy =
      function () {
        alive =
          false;

        net.clear();

        closeTv();

        viewport.remove();

        root.remove();
      };
  }


  function menuButton() {
    if (
      $(
        '.menu .menu__list ' +
        '[data-action="' +
        NS +
        '"]'
      ).length
    ) {
      return;
    }

    var b =
      $(
        '<li class="menu__item selector" ' +
        'data-action="' +
        NS +
        '">' +

        '<div class="menu__ico">' +

        '<svg ' +
        'viewBox="0 0 24 24" ' +
        'xmlns="http://www.w3.org/2000/svg">' +

        '<path ' +
        'fill="currentColor" ' +
        'd="' +
        'M12 2a10 10 0 1 0 0 20 ' +
        '10 10 0 0 0 0-20zm-1 5 ' +
        '6 5-6 5V7z' +
        '"/>' +

        '</svg>' +

        '</div>' +

        '<div class="menu__text">' +
        'AnimeVost' +
        '</div>' +

        '</li>'
      );

    b.on(
      'hover:enter',
      function () {
        openCatalog(
          '/',
          'AnimeVost'
        );
      }
    );

    $('.menu .menu__list')
      .eq(0)
      .append(
        b
      );
  }


  function init() {
    if (
      window[FLAG]
    ) {
      return;
    }

    window[FLAG] =
      true;

    try {
      style();

      Lampa.Component.add(
        CATALOG,
        CatalogComponent
      );

      Lampa.Component.add(
        DETAIL,
        DetailComponent
      );

      menuButton();

      noty(
        'AnimeVost V0.6.1 загружен'
      );
    }

    catch (e) {
      console.log(
        'AnimeVost V0.6.1 init error',
        e
      );

      noty(
        'Ошибка запуска AnimeVost V0.6.1'
      );
    }
  }


  if (
    window.appready
  ) {
    init();
  }

  else {
    Lampa.Listener.follow(
      'app',
      function (e) {
        if (
          e &&
          e.type ===
          'ready'
        ) {
          init();
        }
      }
    );
  }

})();
