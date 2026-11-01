(function () {
  'use strict';


  var NS =
    'animevost_v072';


  var FLAG =
    NS +
    '_ready';


  var CATALOG =
    NS +
    '_catalog';


  var DETAIL =
    NS +
    '_detail';


  var CLEAN_PLAYER =
    NS +
    '_clean_player';


  var WORKER =
    'https://animevost-lampa.kalewse69.workers.dev/';


  var ORIGIN =
    'https://animevost.org';


  var detailCache =
    {};


  var playerSession =
    null;


  function notify(
    text
  ) {
    try {
      Lampa.Noty.show(
        text
      );
    }

    catch (e) {}
  }


  function clean(
    text
  ) {
    return String(
      text ||
      ''
    )
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


  function toInt(
    value,
    fallback
  ) {
    var number =
      parseInt(
        value,
        10
      );


    return isNaN(
      number
    )
      ? fallback
      : number;
  }


  function toPath(
    value
  ) {
    value =
      clean(
        value
      );


    if (
      !value
    ) {
      return '/';
    }


    try {
      if (
        /^https?:\/\//i
          .test(
            value
          )
      ) {
        var anchor =
          document
            .createElement(
              'a'
            );


        anchor.href =
          value;


        return (
          anchor.pathname ||
          '/'
        ) + (
          anchor.search ||
          ''
        );
      }
    }

    catch (e) {}


    return (
      value.charAt(
        0
      ) ===
      '/'
    )
      ? value
      : '/' + value;
  }


  function absoluteUrl(
    value
  ) {
    value =
      clean(
        value
      );


    if (
      !value
    ) {
      return '';
    }


    if (
      /^https?:\/\//i
        .test(
          value
        )
    ) {
      return value;
    }


    if (
      value.indexOf(
        '//'
      ) ===
      0
    ) {
      return (
        'https:' +
        value
      );
    }


    return (
      ORIGIN +

      (
        value.charAt(
          0
        ) ===
        '/'

          ? value

          : '/' + value
      )
    );
  }


  function apiUrl(
    path
  ) {
    return (

      WORKER +

      '?path=' +

      encodeURIComponent(
        toPath(
          path ||
          '/'
        )
      )
    );
  }


  /*
   * New V0.7.2 clean-player URL:
   *
   * episode only.
   *
   * No mandatory Player №1/№2 because the LG diagnostic
   * proved the Ao Ashi page has zero such DOM buttons.
   */
  function cleanPlayerUrl(
    path,
    episode
  ) {
    var cleanPath =
      toPath(
        path ||
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

      cleanPath +

      '?avclean=1' +

      '&episode=' +
      encodeURIComponent(
        episode ||
        0
      ) +

      '&_=' +
      Date.now()
    );
  }


  function firstMatch(
    text,
    expression
  ) {
    var match =
      String(
        text ||
        ''
      )
      .match(
        expression
      );


    return (
      match &&
      match[1]
    )
      ? clean(
          match[1]
        )
      : '';
  }


  function textOf(
    node
  ) {
    try {
      return clean(

        node &&
        node.textContent

          ? node.textContent

          : ''
      );
    }

    catch (e) {
      return '';
    }
  }


  function isAnimePath(
    path
  ) {
    return /^\/tip\/[^/]+\/[^?#]+\.html(?:\?.*)?$/i
      .test(
        toPath(
          path
        )
      );
  }


  function findArticleContainer(
    node
  ) {
    var current =
      node;


    var best =

      node &&
      node.parentElement

        ? node.parentElement

        : node;


    var i;


    for (
      i = 0;
      i <
      8 &&
      current;
      i++
    ) {
      var text =
        textOf(
          current
        );


      var count =
        0;


      try {
        count =
          current
            .querySelectorAll(
              'h2 a[href*="/tip/"]'
            )
            .length;
      }

      catch (e) {}


      if (
        text.indexOf(
          'Год выхода:'
        ) >=
          0 &&

        (
          text.indexOf(
            'Описание:'
          ) >=
            0 ||

          text.indexOf(
            'Количество серий:'
          ) >=
            0
        ) &&

        count <=
          1
      ) {
        return current;
      }


      if (
        count <=
        1
      ) {
        best =
          current;
      }


      current =
        current.parentElement;
    }


    return (
      best ||
      node
    );
  }


  function findPoster(
    container,
    href
  ) {
    if (
      !container
    ) {
      return '';
    }


    var wanted =
      toPath(
        href
      );


    var links =
      container
        .querySelectorAll(
          'a[href]'
        );


    var i;


    for (
      i = 0;
      i <
      links.length;
      i++
    ) {
      if (
        toPath(

          links[i]
            .getAttribute(
              'href'
            ) ||

          ''
        ) ===
        wanted
      ) {
        var image =
          links[i]
            .querySelector(
              'img'
            );


        if (
          image
        ) {
          var source =

            image
              .getAttribute(
                'data-src'
              ) ||

            image
              .getAttribute(
                'src'
              ) ||

            '';


          if (
            source
          ) {
            return absoluteUrl(
              source
            );
          }
        }
      }
    }


    var images =
      container
        .querySelectorAll(
          'img'
        );


    for (
      i = 0;
      i <
      images.length;
      i++
    ) {
      var src =

        images[i]
          .getAttribute(
            'data-src'
          ) ||

        images[i]
          .getAttribute(
            'src'
          ) ||

        '';


      var alt =
        clean(

          images[i]
            .getAttribute(
              'alt'
            ) ||

          ''
        );


      var lower =
        src.toLowerCase();


      if (
        !src ||

        /mc\.yandex|smile|rating|counter|loliland/
          .test(
            lower
          )
      ) {
        continue;
      }


      if (
        alt ||

        /uploads|poster|story|covers?/i
          .test(
            src
          )
      ) {
        return absoluteUrl(
          src
        );
      }
    }


    return '';
  }


  /*
   * Prefer the explicit AnimeVost "Смотреть" anchor.
   *
   * Your desktop inspector confirmed this is the canonical
   * dedicated anime page URL.
   */
  function findWatchHref(
    container,
    fallbackHref
  ) {
    if (
      !container
    ) {
      return toPath(
        fallbackHref ||
        '/'
      );
    }


    var links =
      container
        .querySelectorAll(
          'a[href]'
        );


    var i;


    for (
      i = 0;
      i <
      links.length;
      i++
    ) {
      var title =
        clean(
          links[i]
            .textContent ||
          ''
        );


      var href =
        toPath(

          links[i]
            .getAttribute(
              'href'
            ) ||

          ''
        );


      if (
        /^смотреть$/i
          .test(
            title
          ) &&

        isAnimePath(
          href
        )
      ) {
        return href;
      }
    }


    return toPath(
      fallbackHref ||
      '/'
    );
  }


  function parseMenu(
    doc
  ) {
    var result = {

      genres:
        [],

      types:
        [],

      years:
        []
    };


    var seen =
      {};


    var anchors =
      doc
        .querySelectorAll(
          'a[href]'
        );


    var i;


    function add(
      group,
      title,
      path
    ) {
      title =
        clean(
          title
        );


      path =
        toPath(
          path
        );


      if (
        !title ||
        !path
      ) {
        return;
      }


      var key =
        group +
        '|' +
        path;


      if (
        seen[key]
      ) {
        return;
      }


      seen[key] =
        true;


      result[
        group
      ]
      .push(
        {
          title:
            title,

          path:
            path
        }
      );
    }


    for (
      i = 0;
      i <
      anchors.length;
      i++
    ) {
      var href =
        toPath(

          anchors[i]
            .getAttribute(
              'href'
            ) ||

          ''
        );


      var title =
        clean(
          anchors[i]
            .textContent ||
          ''
        );


      if (
        href.indexOf(
          '/zhanr/'
        ) ===
        0
      ) {
        add(
          'genres',
          title,
          href
        );
      }


      else if (
        href.indexOf(
          '/god/'
        ) ===
        0
      ) {
        add(
          'years',
          title,
          href
        );
      }


      else if (
        href.indexOf(
          '/tip/'
        ) ===
          0 &&

        !/\.html(?:\?|$)/i
          .test(
            href
          )
      ) {
        add(
          'types',
          title,
          href
        );
      }
    }


    result.years
      .sort(
        function (
          a,
          b
        ) {
          return (
            toInt(
              b.title,
              0
            ) -

            toInt(
              a.title,
              0
            )
          );
        }
      );


    return result;
  }


  function pageNumber(
    path
  ) {
    var match =
      toPath(
        path
      )
      .match(
        /\/page\/(\d+)\/?/i
      );


    return match

      ? toInt(
          match[1],
          1
        )

      : 1;
  }


  function baseSectionPath(
    path
  ) {
    var cleanPath =
      toPath(
        path
      )
      .replace(
        /[?#].*$/,
        ''
      )
      .replace(
        /\/page\/\d+\/?$/i,
        '/'
      );


    return (
      cleanPath.charAt(
        cleanPath.length -
        1
      ) ===
      '/'
    )
      ? cleanPath

      : cleanPath +
        '/';
  }


  function makePagePath(
    path,
    page
  ) {
    var base =
      baseSectionPath(
        path
      );


    return (
      page <=
      1
    )
      ? base

      : (
          base +
          'page/' +
          page +
          '/'
        );
  }


  function parsePaging(
    doc,
    currentPath
  ) {
    var current =
      pageNumber(
        currentPath
      );


    var max =
      current;


    var anchors =
      doc
        .querySelectorAll(
          'a[href]'
        );


    var i;


    for (
      i = 0;
      i <
      anchors.length;
      i++
    ) {
      var href =
        toPath(

          anchors[i]
            .getAttribute(
              'href'
            ) ||

          ''
        );


      var match =
        href.match(
          /\/page\/(\d+)\/?/i
        );


      if (
        match
      ) {
        max =
          Math.max(

            max,

            toInt(
              match[1],
              current
            )
          );
      }
    }


    return {
      current:
        current,

      max:
        max,

      previous:

        current >
        1

          ? makePagePath(
              currentPath,
              current -
              1
            )

          : '',

      next:

        max >
        current

          ? makePagePath(
              currentPath,
              current +
              1
            )

          : ''
    };
  }


  function availableEpisodesFromTitle(
    title
  ) {
    var best =
      0;


    var expression =
      /\[?\s*1\s*-\s*(\d{1,4})\s*(?:из\s*\d+\+?)?/ig;


    var match;


    while (
      (
        match =
          expression.exec(
            clean(
              title
            )
          )
      )
    ) {
      best =
        Math.max(

          best,

          toInt(
            match[1],
            0
          )
        );
    }


    return best;
  }


  function parseCatalog(
    html,
    currentPath
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


    var headings =
      doc
        .querySelectorAll(
          'h2 a[href*="/tip/"]'
        );


    var items =
      [];


    var seen =
      {};


    var i;


    for (
      i = 0;
      i <
      headings.length;
      i++
    ) {
      var anchor =
        headings[i];


      var href =
        toPath(

          anchor
            .getAttribute(
              'href'
            ) ||

          ''
        );


      var title =
        clean(
          anchor
            .textContent ||
          ''
        );


      if (
        !isAnimePath(
          href
        ) ||

        !title ||

        seen[href]
      ) {
        continue;
      }


      seen[href] =
        true;


      var container =
        findArticleContainer(

          anchor.parentElement ||
          anchor
        );


      var text =
        textOf(
          container
        );


      var watchHref =
        findWatchHref(
          container,
          href
        );


      items.push(
        {
          title:
            title,

          href:
            href,

          watchHref:
            watchHref,

          poster:
            findPoster(
              container,
              href
            ),

          year:
            firstMatch(
              text,
              /Год выхода:\s*([^Ж]+?)(?=\s+Жанр:|$)/i
            ),

          genre:
            firstMatch(
              text,
              /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
            ),

          type:
            firstMatch(
              text,
              /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Рейтинг:|$)/i
            ),

          episodes:
            firstMatch(
              text,
              /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Рейтинг:|\s+Описание:|$)/i
            ),

          description:
            firstMatch(
              text,
              /Описание:\s*(.+?)(?=\s+Смотреть\s|\s+Категории:|$)/i
            ),

          availableEpisodes:
            availableEpisodesFromTitle(
              title
            )
        }
      );
    }


    return {
      items:
        items,

      menu:
        parseMenu(
          doc
        ),

      paging:
        parsePaging(
          doc,
          currentPath
        )
    };
  }


  function buildEpisodes(
    item,
    episodeText
  ) {
    var max =

      item &&
      item.availableEpisodes

        ? toInt(
            item.availableEpisodes,
            0
          )

        : 0;


    var match;


    if (
      !max
    ) {
      match =
        clean(
          episodeText
        )
        .match(
          /\b1\s*-\s*(\d{1,4})\b/i
        );


      if (
        match
      ) {
        max =
          toInt(
            match[1],
            0
          );
      }
    }


    if (
      !max
    ) {
      match =
        clean(
          episodeText
        )
        .match(
          /\b(\d{1,4})\+?\b/
        );


      if (
        match
      ) {
        max =
          toInt(
            match[1],
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


    var result =
      [];


    var i;


    for (
      i = 1;
      i <=
      max;
      i++
    ) {
      result.push(
        {
          number:
            i,

          title:
            i +
            ' серия'
        }
      );
    }


    return result;
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


    var text =
      textOf(
        doc.body
      );


    var heading =
      doc
        .querySelector(
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
      heading &&
      clean(
        heading.textContent
      )
    ) {
      title =
        clean(
          heading.textContent
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

      firstMatch(
        text,
        /(?:Год выхода|Год):\s*([^Ж]+?)(?=\s+Жанр:|$)/i
      ) ||

      (
        item &&
        item.year
      ) ||

      '';


    var genre =

      firstMatch(
        text,
        /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
      ) ||

      (
        item &&
        item.genre
      ) ||

      '';


    var type =

      firstMatch(
        text,
        /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|$)/i
      ) ||

      (
        item &&
        item.type
      ) ||

      '';


    var episodesText =

      firstMatch(
        text,
        /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|\s+Описание:|$)/i
      ) ||

      (
        item &&
        item.episodes
      ) ||

      '';


    var description =

      firstMatch(
        text,
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

      href:

        item &&
        item.href

          ? item.href

          : '/',

      watchHref:

        item &&
        item.watchHref

          ? item.watchHref

          : (
              item &&
              item.href

                ? item.href

                : '/'
            ),

      poster:

        item &&
        item.poster

          ? item.poster

          : findPoster(
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
        episodesText,

      director:
        firstMatch(
          text,
          /Режисс[её]р:\s*(.+?)(?=\s+(?:Длительность|Рейтинг|Описание|Категории):|$)/i
        ),

      duration:
        firstMatch(
          text,
          /(?:Длительность|Продолжительность):\s*(.+?)(?=\s+(?:Рейтинг|Описание|Категории):|$)/i
        ),

      description:
        description,

      episodes:
        buildEpisodes(
          item,
          episodesText
        )
    };
  }


  function injectStyle() {
    if (
      $(
        '#animevost-v072-style'
      ).length
    ) {
      return;
    }


    $('head')
      .append(

        '<style id="animevost-v072-style">' +

        '.av72-v{' +
          'height:calc(100vh - 6.2em);' +
          'overflow-y:auto;' +
          'overflow-x:hidden;' +
          'box-sizing:border-box;' +
          '-webkit-overflow-scrolling:touch' +
        '}' +

        '.av72-v::-webkit-scrollbar{' +
          'width:0;' +
          'height:0' +
        '}' +

        '.av72-p{' +
          'padding:1.3em 2.2em 5em;' +
          'box-sizing:border-box' +
        '}' +

        '.av72-title{' +
          'font-size:2em;' +
          'font-weight:600;' +
          'margin:.2em 0 .75em;' +
          'line-height:1.15' +
        '}' +

        '.av72-row,' +
        '.av72-grid,' +
        '.av72-pages,' +
        '.av72-actions,' +
        '.av72-eps{' +
          'display:flex;' +
          'flex-wrap:wrap;' +
          'align-items:flex-start' +
        '}' +

        '.av72-row{' +
          'margin-bottom:1.2em' +
        '}' +

        '.av72-btn,' +
        '.av72-pagebtn,' +
        '.av72-action,' +
        '.av72-ep{' +
          'padding:.7em 1.05em;' +
          'margin:0 .55em .55em 0;' +
          'background:rgba(255,255,255,.10);' +
          'border-radius:.45em;' +
          'font-size:1.05em;' +
          'box-sizing:border-box' +
        '}' +

        '.av72-btn.focus,' +
        '.av72-pagebtn.focus,' +
        '.av72-action.focus,' +
        '.av72-ep.focus,' +
        '.av72-close.focus{' +
          'background:#fff;' +
          'color:#111' +
        '}' +

        '.av72-status{' +
          'padding:1.2em 0;' +
          'font-size:1.15em;' +
          'opacity:.8' +
        '}' +

        '.av72-card{' +
          'width:12.2em;' +
          'margin:0 1.05em 1.3em 0;' +
          'border-radius:.55em;' +
          'padding:.45em;' +
          'background:rgba(255,255,255,.04);' +
          'box-sizing:border-box' +
        '}' +

        '.av72-card.focus{' +
          'background:rgba(255,255,255,.18);' +
          'transform:scale(1.025)' +
        '}' +

        '.av72-poster{' +
          'width:100%;' +
          'height:17.4em;' +
          'border-radius:.4em;' +
          'overflow:hidden;' +
          'background:rgba(255,255,255,.08);' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:center' +
        '}' +

        '.av72-poster img,' +
        '.av72-dposter img{' +
          'width:100%;' +
          'height:100%;' +
          'object-fit:cover;' +
          'display:block' +
        '}' +

        '.av72-fallback{' +
          'font-size:1em;' +
          'opacity:.55;' +
          'text-align:center;' +
          'padding:1em' +
        '}' +

        '.av72-name{' +
          'font-size:1.03em;' +
          'line-height:1.25;' +
          'margin-top:.6em;' +
          'min-height:2.5em' +
        '}' +

        '.av72-meta{' +
          'font-size:.83em;' +
          'line-height:1.3;' +
          'opacity:.62;' +
          'margin-top:.35em;' +
          'min-height:2.1em' +
        '}' +

        '.av72-pages{' +
          'margin-top:.4em;' +
          'padding-bottom:1em' +
        '}' +

        '.av72-dtop{' +
          'display:flex;' +
          'align-items:flex-start;' +
          'margin-bottom:1.4em' +
        '}' +

        '.av72-dposter{' +
          'width:15em;' +
          'min-width:15em;' +
          'height:21em;' +
          'margin-right:2em;' +
          'overflow:hidden;' +
          'border-radius:.55em;' +
          'background:rgba(255,255,255,.08)' +
        '}' +

        '.av72-dbody{' +
          'max-width:68em' +
        '}' +

        '.av72-dmeta{' +
          'font-size:1.04em;' +
          'line-height:1.55;' +
          'opacity:.78;' +
          'margin-bottom:1em' +
        '}' +

        '.av72-desc{' +
          'font-size:1.05em;' +
          'line-height:1.55' +
        '}' +

        '.av72-actions{' +
          'margin:1.25em 0 1.3em' +
        '}' +

        '.av72-primary{' +
          'background:rgba(255,255,255,.18)' +
        '}' +

        '.av72-section{' +
          'font-size:1.45em;' +
          'font-weight:600;' +
          'margin:1.2em 0 .75em' +
        '}' +

        '.av72-ep{' +
          'min-width:7.3em;' +
          'text-align:center' +
        '}' +

        '.av72-ep.selected{' +
          'box-shadow:' +
            'inset 0 0 0 .16em rgba(255,255,255,.65)' +
        '}' +

        '.av72-note{' +
          'margin-top:1.2em;' +
          'padding:1em 1.15em;' +
          'background:rgba(255,255,255,.07);' +
          'border-radius:.45em;' +
          'opacity:.72;' +
          'font-size:.96em;' +
          'line-height:1.45' +
        '}' +

        '.av72-player{' +
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

        '.av72-playerbar{' +
          'height:3.4em;' +
          'min-height:3.4em;' +
          'background:#111;' +
          'display:flex;' +
          'align-items:center;' +
          'padding:0 1em;' +
          'box-sizing:border-box' +
        '}' +

        '.av72-playertitle{' +
          'font-size:1em;' +
          'white-space:nowrap;' +
          'overflow:hidden;' +
          'text-overflow:ellipsis;' +
          'flex:1;' +
          'padding-right:1em' +
        '}' +

        '.av72-playerstatus{' +
          'font-size:.8em;' +
          'opacity:.72;' +
          'margin-right:1em;' +
          'white-space:nowrap' +
        '}' +

        '.av72-close{' +
          'padding:.48em .72em;' +
          'border-radius:.35em;' +
          'background:rgba(255,255,255,.14);' +
          'white-space:nowrap' +
        '}' +

        '.av72-player iframe{' +
          'width:100%;' +
          'height:calc(100% - 3.4em);' +
          'border:0;' +
          'background:#000;' +
          'display:block' +
        '}' +

        '</style>'
      );
  }


  function posterBox(
    className,
    url
  ) {
    var box =
      $(
        '<div class="' +
        className +
        '"></div>'
      );


    if (
      !url
    ) {
      box.append(
        '<div class="av72-fallback">' +
        'AnimeVost' +
        '</div>'
      );


      return box;
    }


    var image =
      $('<img alt="">')
        .attr(
          'src',
          url
        );


    image.on(
      'error',

      function () {
        box
          .empty()
          .append(
            '<div class="av72-fallback">' +
            'AnimeVost' +
            '</div>'
          );
      }
    );


    box.append(
      image
    );


    return box;
  }


  function ensureVisible(
    viewport,
    element
  ) {
    if (
      !viewport ||
      !viewport[0] ||
      !element
    ) {
      return;
    }


    var container =
      viewport[0];


    var elementRect =
      element
        .getBoundingClientRect();


    var viewportRect =
      container
        .getBoundingClientRect();


    if (
      elementRect.bottom >
      viewportRect.bottom -
      40
    ) {
      container.scrollTop +=

        elementRect.bottom -

        (
          viewportRect.bottom -
          40
        );
    }


    else if (
      elementRect.top <
      viewportRect.top +
      22
    ) {
      container.scrollTop -=

        (
          viewportRect.top +
          22
        ) -

        elementRect.top;
    }
  }


  function visibleSelectors(
    root
  ) {
    var result =
      [];


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
            result.push(
              this
            );
          }
        }
      );


    return result;
  }


  function groupRows(
    elements
  ) {
    var result =
      [];


    var tolerance =
      10;


    var i;


    for (
      i = 0;
      i <
      elements.length;
      i++
    ) {
      var top =
        elements[i]
          .getBoundingClientRect()
          .top;


      var row =
        null;


      var j;


      for (
        j = 0;
        j <
        result.length;
        j++
      ) {
        if (
          Math.abs(
            result[j].top -
            top
          ) <=
          tolerance
        ) {
          row =
            result[j];

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


        result.push(
          row
        );
      }


      row.items.push(
        elements[i]
      );
    }


    result.sort(
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


    result.forEach(
      function (
        row
      ) {
        row.items
          .sort(
            function (
              a,
              b
            ) {
              return (

                a
                  .getBoundingClientRect()
                  .left -

                b
                  .getBoundingClientRect()
                  .left
              );
            }
          );
      }
    );


    return result;
  }


  function nearest(
    items,
    current
  ) {
    if (
      !items ||
      !items.length
    ) {
      return null;
    }


    if (
      !current
    ) {
      return items[0];
    }


    var currentRect =
      current
        .getBoundingClientRect();


    var currentCenter =
      currentRect.left +
      currentRect.width /
      2;


    var best =
      items[0];


    var bestDistance =
      Infinity;


    var i;


    for (
      i = 0;
      i <
      items.length;
      i++
    ) {
      var rect =
        items[i]
          .getBoundingClientRect();


      var distance =
        Math.abs(

          (
            rect.left +
            rect.width /
            2
          ) -

          currentCenter
        );


      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        best =
          items[i];
      }
    }


    return best;
  }


  function makeNavigation(
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


      var focused =
        root
          .find(
            '.selector.focus'
          )[0];


      if (
        focused
      ) {
        return focused;
      }


      var list =
        visibleSelectors(
          root
        );


      return list.length
        ? list[0]
        : null;
    }


    function focus(
      element
    ) {
      if (
        !element
      ) {
        return false;
      }


      last =
        element;


      try {
        Lampa.Controller
          .collectionFocus(
            element,
            viewport
          );
      }


      catch (e) {
        try {
          Lampa.Controller
            .focus(
              element
            );
        }

        catch (e2) {}
      }


      ensureVisible(
        viewport,
        element
      );


      return true;
    }


    function move(
      direction
    ) {
      var list =
        visibleSelectors(
          root
        );


      var currentElement =
        current();


      if (
        !list.length ||
        !currentElement
      ) {
        return false;
      }


      var rows =
        groupRows(
          list
        );


      var rowIndex =
        -1;


      var columnIndex =
        -1;


      var r;

      var c;


      for (
        r = 0;
        r <
        rows.length;
        r++
      ) {
        for (
          c = 0;
          c <
          rows[r]
            .items
            .length;
          c++
        ) {
          if (
            rows[r]
              .items[c] ===
            currentElement
          ) {
            rowIndex =
              r;

            columnIndex =
              c;

            break;
          }
        }


        if (
          rowIndex >=
          0
        ) {
          break;
        }
      }


      if (
        rowIndex <
        0
      ) {
        return focus(
          list[0]
        );
      }


      if (
        direction ===
        'left'
      ) {
        if (
          columnIndex >
          0
        ) {
          return focus(

            rows[
              rowIndex
            ]
            .items[
              columnIndex -
              1
            ]
          );
        }


        if (
          typeof edgeLeft ===
          'function'
        ) {
          edgeLeft();
        }


        return false;
      }


      if (
        direction ===
        'right'
      ) {
        if (
          columnIndex <
          rows[
            rowIndex
          ]
          .items
          .length -
          1
        ) {
          return focus(

            rows[
              rowIndex
            ]
            .items[
              columnIndex +
              1
            ]
          );
        }


        return false;
      }


      if (
        direction ===
        'up'
      ) {
        if (
          rowIndex >
          0
        ) {
          return focus(

            nearest(

              rows[
                rowIndex -
                1
              ]
              .items,

              currentElement
            )
          );
        }


        if (
          typeof edgeUp ===
          'function'
        ) {
          edgeUp();
        }


        return false;
      }


      if (
        direction ===
        'down'
      ) {
        if (
          rowIndex <
          rows.length -
          1
        ) {
          return focus(

            nearest(

              rows[
                rowIndex +
                1
              ]
              .items,

              currentElement
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


            ensureVisible(
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


  /*
   * Fallback commands from Lampa to the clean page.
   *
   * Once frame5.php is ready, real LG focus will be
   * transferred into the iframe and its own capture
   * listener handles the physical key.
   */
  function sendPlayerKey(
    key
  ) {
    if (
      !playerSession ||
      !playerSession.frame ||
      !playerSession.frame[0]
    ) {
      return;
    }


    try {
      playerSession
        .frame[0]
        .contentWindow
        .postMessage(

          {
            source:
              'animevost-clean-host-v072',

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


  function closeCleanPlayer() {
    if (
      !playerSession
    ) {
      return;
    }


    var session =
      playerSession;


    playerSession =
      null;


    try {
      window.removeEventListener(
        'message',
        session.messageHandler,
        false
      );
    }

    catch (e) {}


    try {
      session.overlay
        .remove();
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


  /*
   * V0.7.2:
   *
   * One clean Watch action.
   *
   * The selected episode is passed to the Worker helper.
   * Any alternate-player controls AnimeVost genuinely creates
   * stay visible inside #playerbox automatically.
   */
  function openCleanPlayer(
    item,
    episode
  ) {
    closeCleanPlayer();


    var overlay =
      $(
        '<div class="av72-player"></div>'
      );


    var bar =
      $(
        '<div class="av72-playerbar"></div>'
      );


    var title =
      $(
        '<div class="av72-playertitle"></div>'
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
        )
      );


    var status =
      $(
        '<div class="av72-playerstatus">' +
        'Загрузка чистого плеера...' +
        '</div>'
      );


    var close =
      $(
        '<div class="av72-close selector">' +
        'Back — назад' +
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

        cleanPlayerUrl(

          item.watchHref ||
          item.href,

          episode
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
        close
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


    var session = {

      overlay:
        overlay,

      frame:
        frame,

      status:
        status,

      close:
        close,

      ready:
        false,

      isolated:
        false,

      playerReady:
        false,

      messageHandler:
        null
    };


    playerSession =
      session;


    session.messageHandler =
      function (
        event
      ) {
        var data =
          event.data ||
          {};


        if (
          data.source !==
          'animevost-clean-v072'
        ) {
          return;
        }


        if (
          data.type ===
          'ready'
        ) {
          session.ready =
            true;


          status.text(
            'Ищу #playerbox и серию...'
          );
        }


        else if (
          data.type ===
          'isolated'
        ) {
          session.isolated =
            true;


          status.text(
            'Чистый #playerbox готов • выбираю серию...'
          );
        }


        else if (
          data.type ===
          'episode-selected'
        ) {
          status.text(

            'Серия ' +
            data.number +
            ' выбрана • загружаю видео...'
          );
        }


        else if (
          data.type ===
          'player-ready'
        ) {
          session.playerReady =
            true;


          status.text(

            'Видео готово' +

            ' • OK play/pause' +

            ' • ←/→ 10 сек' +

            ' • ↑ к сериям' +

            ' • Back назад'
          );


          setTimeout(

            function () {
              if (
                playerSession ===
                session
              ) {
                try {
                  frame[0]
                    .focus();
                }

                catch (e) {}
              }
            },

            80
          );
        }


        else if (
          data.type ===
          'clean-error'
        ) {
          status.text(
            'Не удалось подготовить чистый плеер • Back назад'
          );
        }


        else if (
          data.type ===
          'request-close'
        ) {
          closeCleanPlayer();
        }
      };


    window.addEventListener(
      'message',
      session.messageHandler,
      false
    );


    close.on(
      'hover:enter click',
      closeCleanPlayer
    );


    /*
     * Official Lampa handler names:
     * enter / playpause / play / pause /
     * rewindBack / rewindForward / back.
     */
    Lampa.Controller.add(

      CLEAN_PLAYER,

      {
        toggle:
          function () {
            Lampa.Controller
              .collectionSet(
                overlay
              );


            Lampa.Controller
              .collectionFocus(
                close[0],
                overlay
              );
          },


        left:
          function () {
            sendPlayerKey(
              'left'
            );
          },


        right:
          function () {
            sendPlayerKey(
              'right'
            );
          },


        up:
          function () {
            sendPlayerKey(
              'up'
            );
          },


        down:
          function () {
            sendPlayerKey(
              'down'
            );
          },


        enter:
          function () {
            sendPlayerKey(
              'enter'
            );
          },


        playpause:
          function () {
            sendPlayerKey(
              'playpause'
            );
          },


        play:
          function () {
            sendPlayerKey(
              'play'
            );
          },


        pause:
          function () {
            sendPlayerKey(
              'pause'
            );
          },


        rewindBack:
          function () {
            sendPlayerKey(
              'rewind'
            );
          },


        rewindForward:
          function () {
            sendPlayerKey(
              'forward'
            );
          },


        back:
          closeCleanPlayer
      }
    );


    Lampa.Controller
      .toggle(
        CLEAN_PLAYER
      );


    setTimeout(

      function () {
        if (
          playerSession ===
            session &&

          !session.ready
        ) {
          status.text(
            'Helper не ответил • Back безопасно закрывает окно'
          );
        }
      },

      7000
    );
  }


  function openCatalog(
    path,
    title
  ) {
    Lampa.Activity.push(
      {
        url:
          '',

        title:
          title ||
          'AnimeVost',

        component:
          CATALOG,

        av_path:
          path ||
          '/',

        av_title:
          title ||
          'AnimeVost',

        page:
          1
      }
    );
  }


  function openDetail(
    item
  ) {
    Lampa.Activity.push(
      {
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
      }
    );
  }


  function showSelect(
    title,
    list
  ) {
    if (
      !list ||
      !list.length
    ) {
      notify(
        'AnimeVost: список не найден'
      );


      return;
    }


    Lampa.Select.show(
      {
        title:
          title,

        items:
          list.map(
            function (
              item
            ) {
              return {
                title:
                  item.title,

                av_path:
                  item.path
              };
            }
          ),

        onSelect:
          function (
            item
          ) {
            openCatalog(
              item.av_path,
              item.title
            );
          },

        onBack:
          function () {
            Lampa.Controller
              .toggle(
                'content'
              );
          }
      }
    );
  }


  function CatalogComponent(
    object
  ) {
    var network =
      new Lampa.Reguest();


    var alive =
      false;


    var viewport =
      $(
        '<div class="av72-v"></div>'
      );


    var root =
      $(
        '<div class="av72-p"></div>'
      );


    var menu = {

      genres:
        [],

      types:
        [],

      years:
        []
    };


    var path =
      object.av_path ||
      '/';


    var title =
      object.av_title ||
      'AnimeVost';


    var self =
      this;


    var navigation;


    function addTopNavigation() {
      var row =
        $(
          '<div class="av72-row"></div>'
        );


      function add(
        label,
        handler
      ) {
        var button =
          $(
            '<div class="av72-btn selector"></div>'
          )
          .text(
            label
          );


        button.on(
          'hover:enter',
          handler
        );


        row.append(
          button
        );
      }


      add(
        'Главная',

        function () {
          openCatalog(
            '/',
            'Главная'
          );
        }
      );


      add(
        'Жанр',

        function () {
          showSelect(
            'Жанр',
            menu.genres
          );
        }
      );


      add(
        'Категории',

        function () {
          showSelect(
            'Категории',
            menu.types
          );
        }
      );


      add(
        'Год',

        function () {
          showSelect(
            'Год',
            menu.years
          );
        }
      );


      add(
        'Онгоинги',

        function () {
          openCatalog(
            '/ongoing/',
            'Онгоинги'
          );
        }
      );


      add(
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


    function addCard(
      grid,
      item
    ) {
      var card =
        $(
          '<div class="av72-card selector"></div>'
        );


      card.append(
        posterBox(
          'av72-poster',
          item.poster
        )
      );


      card.append(
        $(
          '<div class="av72-name"></div>'
        )
        .text(
          item.title
        )
      );


      var meta =
        [];


      if (
        item.year
      ) {
        meta.push(
          item.year
        );
      }


      if (
        item.type
      ) {
        meta.push(
          item.type
        );
      }


      if (
        item.episodes
      ) {
        meta.push(

          item.episodes
            .replace(
              /\s*\([^)]*\)\s*$/,
              ''
            )
        );
      }


      card.append(
        $(
          '<div class="av72-meta"></div>'
        )
        .text(
          meta.join(
            ' • '
          )
        )
      );


      card.on(
        'hover:enter',

        function () {
          openDetail(
            item
          );
        }
      );


      grid.append(
        card
      );
    }


    function addPaging(
      data
    ) {
      if (
        !data ||
        (
          !data.previous &&
          !data.next
        )
      ) {
        return;
      }


      var row =
        $(
          '<div class="av72-pages"></div>'
        );


      if (
        data.previous
      ) {
        var previous =
          $(
            '<div class="av72-pagebtn selector"></div>'
          )
          .text(

            '← Страница ' +
            (
              data.current -
              1
            )
          );


        previous.on(
          'hover:enter',

          function () {
            openCatalog(
              data.previous,
              title
            );
          }
        );


        row.append(
          previous
        );
      }


      row.append(
        $(
          '<div class="av72-pagebtn"></div>'
        )
        .text(

          'Страница ' +
          data.current +

          (
            data.max >
            1

              ? ' / ' +
                data.max

              : ''
          )
        )
      );


      if (
        data.next
      ) {
        var next =
          $(
            '<div class="av72-pagebtn selector"></div>'
          )
          .text(

            'Страница ' +
            (
              data.current +
              1
            ) +

            ' →'
          );


        next.on(
          'hover:enter',

          function () {
            openCatalog(
              data.next,
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


    function fail(
      message
    ) {
      if (
        !alive
      ) {
        return;
      }


      root
        .empty()
        .append(
          $(
            '<div class="av72-title"></div>'
          )
          .text(
            title
          )
        )
        .append(
          $(
            '<div class="av72-status"></div>'
          )
          .text(
            message
          )
        );


      self.activity
        .loader(
          false
        );
    }


    function render(
      data
    ) {
      if (
        !alive
      ) {
        return;
      }


      root.empty();


      viewport[0]
        .scrollTop =
        0;


      menu =
        data.menu ||
        menu;


      root.append(
        $(
          '<div class="av72-title"></div>'
        )
        .text(
          title
        )
      );


      addTopNavigation();


      if (
        !data.items ||
        !data.items.length
      ) {
        root.append(

          '<div class="av72-status">' +

          'Карточки аниме на этой странице не найдены.' +

          '</div>'
        );
      }


      else {
        var grid =
          $(
            '<div class="av72-grid"></div>'
          );


        data.items
          .forEach(
            function (
              item
            ) {
              addCard(
                grid,
                item
              );
            }
          );


        root.append(
          grid
        );
      }


      addPaging(
        data.paging
      );


      navigation.bind();


      self.activity
        .loader(
          false
        );


      setTimeout(

        function () {
          if (
            !alive
          ) {
            return;
          }


          var list =
            visibleSelectors(
              root
            );


          if (
            list.length
          ) {
            navigation.focus(
              list[0]
            );
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
            '<div class="av72-title"></div>'
          )
          .text(
            title
          )
        );


        root.append(

          '<div class="av72-status">' +

          'Загрузка AnimeVost...' +

          '</div>'
        );


        this.activity
          .loader(
            true
          );


        navigation =
          makeNavigation(

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


        network.timeout(
          20000
        );


        network.silent(

          apiUrl(
            path
          ),

          function (
            html
          ) {
            if (
              !alive
            ) {
              return;
            }


            try {
              render(

                parseCatalog(

                  String(
                    html ||
                    ''
                  ),

                  path
                )
              );
            }


            catch (
              error
            ) {
              console.log(
                'AnimeVost catalog parse error',
                error
              );


              fail(

                'Ошибка разбора AnimeVost: ' +

                (
                  error &&
                  error.message

                    ? error.message

                    : error
                )
              );
            }
          },

          function (
            error
          ) {
            if (
              alive
            ) {
              fail(

                'Не удалось загрузить AnimeVost. Код: ' +

                (
                  error &&
                  error.status

                    ? error.status

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

                    navigation.getLast() ||
                    false,

                    viewport
                  );


                if (
                  navigation.getLast()
                ) {
                  ensureVisible(
                    viewport,
                    navigation.getLast()
                  );
                }
              },


            left:
              function () {
                navigation.move(
                  'left'
                );
              },


            right:
              function () {
                navigation.move(
                  'right'
                );
              },


            up:
              function () {
                navigation.move(
                  'up'
                );
              },


            down:
              function () {
                navigation.move(
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


        network.clear();


        viewport.remove();


        root.remove();
      };
  }


  function DetailComponent(
    object
  ) {
    var network =
      new Lampa.Reguest();


    var alive =
      false;


    var viewport =
      $(
        '<div class="av72-v"></div>'
      );


    var root =
      $(
        '<div class="av72-p"></div>'
      );


    var item =
      object.av_item ||
      {};


    var self =
      this;


    var navigation;


    var selectedEpisode =
      0;


    function updateSelectedEpisode() {
      root
        .find(
          '.av72-ep'
        )
        .each(
          function () {
            var element =
              $(
                this
              );


            element.toggleClass(

              'selected',

              toInt(

                element.attr(
                  'data-episode'
                ),

                0
              ) ===
              selectedEpisode
            );
          }
        );
    }


    function fail(
      message
    ) {
      if (
        !alive
      ) {
        return;
      }


      root
        .empty()
        .append(
          $(
            '<div class="av72-title"></div>'
          )
          .text(
            item.title ||
            'AnimeVost'
          )
        )
        .append(
          $(
            '<div class="av72-status"></div>'
          )
          .text(
            message
          )
        );


      navigation.bind();


      self.activity
        .loader(
          false
        );
    }


    function render(
      data
    ) {
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
        !selectedEpisode &&
        data.episodes &&
        data.episodes.length
      ) {
        selectedEpisode =
          data.episodes[0]
            .number;
      }


      var top =
        $(
          '<div class="av72-dtop"></div>'
        );


      top.append(
        posterBox(
          'av72-dposter',
          data.poster
        )
      );


      var body =
        $(
          '<div class="av72-dbody"></div>'
        );


      body.append(
        $(
          '<div class="av72-title"></div>'
        )
        .text(

          data.title ||
          item.title ||
          'AnimeVost'
        )
      );


      var meta =
        [];


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
          '<div class="av72-dmeta"></div>'
        )
        .text(
          meta.join(
            ' • '
          )
        )
      );


      body.append(
        $(
          '<div class="av72-desc"></div>'
        )
        .text(

          data.description ||
          'Описание не найдено.'
        )
      );


      /*
       * One Watch button.
       *
       * The page itself keeps any genuine alternate-player
       * controls if AnimeVost creates them for that title.
       */
      var actions =
        $(
          '<div class="av72-actions"></div>'
        );


      var watch =
        $(
          '<div class="' +
          'av72-action av72-primary selector">' +
          '▶ Смотреть' +
          '</div>'
        );


      watch.on(
        'hover:enter',

        function () {
          openCleanPlayer(
            data,
            selectedEpisode
          );
        }
      );


      actions.append(
        watch
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

        '<div class="av72-section">' +

        'Серии' +

        '</div>'
      );


      if (
        data.episodes &&
        data.episodes.length
      ) {
        var episodes =
          $(
            '<div class="av72-eps"></div>'
          );


        data.episodes
          .forEach(
            function (
              episode
            ) {
              var button =
                $(
                  '<div class="av72-ep selector"></div>'
                )
                .attr(
                  'data-episode',
                  episode.number
                )
                .text(

                  episode.title ||

                  (
                    episode.number +
                    ' серия'
                  )
                );


              button.on(
                'hover:enter',

                function () {
                  selectedEpisode =
                    episode.number;


                  updateSelectedEpisode();


                  notify(
                    'Выбрана серия ' +
                    episode.number
                  );
                }
              );


              episodes.append(
                button
              );
            }
          );


        root.append(
          episodes
        );


        updateSelectedEpisode();
      }


      else {
        root.append(

          '<div class="av72-status">' +

          'Список доступных серий не найден.' +

          '</div>'
        );
      }


      root.append(

        '<div class="av72-note">' +

        'V0.7.2: выберите серию и нажмите «Смотреть». ' +

        'Плеер открывается через точный AnimeVost-контейнер #playerbox; ' +

        'реклама, описание и комментарии скрываются. ' +

        'Если сам AnimeVost показывает альтернативный выбор плеера, ' +

        'он останется внутри чистого playerbox.' +

        '</div>'
      );


      navigation.bind();


      self.activity
        .loader(
          false
        );


      setTimeout(

        function () {
          if (
            !alive
          ) {
            return;
          }


          var list =
            visibleSelectors(
              root
            );


          if (
            list.length
          ) {
            navigation.focus(
              list[0]
            );
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
            '<div class="av72-title"></div>'
          )
          .text(
            item.title ||
            'AnimeVost'
          )
        );


        root.append(

          '<div class="av72-status">' +

          'Загрузка страницы аниме...' +

          '</div>'
        );


        this.activity
          .loader(
            true
          );


        navigation =
          makeNavigation(

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


        var key =
          toPath(
            item.href ||
            '/'
          );


        if (
          detailCache[
            key
          ]
        ) {
          render(
            detailCache[
              key
            ]
          );


          return this.render();
        }


        network.timeout(
          20000
        );


        network.silent(

          apiUrl(
            key
          ),

          function (
            html
          ) {
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


              detailCache[
                key
              ] =
                data;


              render(
                data
              );
            }


            catch (
              error
            ) {
              console.log(
                'AnimeVost detail parse error',
                error
              );


              fail(

                'Ошибка разбора страницы аниме: ' +

                (
                  error &&
                  error.message

                    ? error.message

                    : error
                )
              );
            }
          },

          function (
            error
          ) {
            if (
              alive
            ) {
              fail(

                'Не удалось загрузить страницу аниме. Код: ' +

                (
                  error &&
                  error.status

                    ? error.status

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

                    navigation.getLast() ||
                    false,

                    viewport
                  );


                if (
                  navigation.getLast()
                ) {
                  ensureVisible(
                    viewport,
                    navigation.getLast()
                  );
                }
              },


            left:
              function () {
                navigation.move(
                  'left'
                );
              },


            right:
              function () {
                navigation.move(
                  'right'
                );
              },


            up:
              function () {
                navigation.move(
                  'up'
                );
              },


            down:
              function () {
                navigation.move(
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


        network.clear();


        closeCleanPlayer();


        viewport.remove();


        root.remove();
      };
  }


  function addMenuButton() {
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


    var button =
      $(

        '<li ' +
        'class="menu__item selector" ' +
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


    button.on(
      'hover:enter',

      function () {
        openCatalog(
          '/',
          'AnimeVost'
        );
      }
    );


    $('.menu .menu__list')
      .eq(
        0
      )
      .append(
        button
      );
  }


  function init() {
    if (
      window[
        FLAG
      ]
    ) {
      return;
    }


    window[
      FLAG
    ] =
      true;


    try {
      injectStyle();


      Lampa.Component.add(
        CATALOG,
        CatalogComponent
      );


      Lampa.Component.add(
        DETAIL,
        DetailComponent
      );


      addMenuButton();


      notify(
        'AnimeVost V0.7.2 загружен'
      );
    }


    catch (
      error
    ) {
      console.log(
        'AnimeVost V0.7.2 init error',
        error
      );


      notify(
        'Ошибка запуска AnimeVost V0.7.2'
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

      function (
        event
      ) {
        if (
          event &&
          event.type ===
          'ready'
        ) {
          init();
        }
      }
    );
  }

})();
