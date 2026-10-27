(function () {
    'use strict';

    var NS = 'animevost_v050';
    var FLAG = NS + '_ready';
    var CATALOG = NS + '_catalog';
    var DETAIL = NS + '_detail';
    var TV_CONTROLLER = NS + '_tv';

    var WORKER =
        'https://animevost-lampa.kalewse69.workers.dev/';

    var ORIGIN =
        'https://animevost.org';

    var DETAIL_CACHE = {};

    var tvSession =
        null;


    function notify(text) {
        try {
            Lampa.Noty.show(
                text
            );
        }
        catch (e) {}
    }


    function clean(text) {
        return String(
            text || ''
        )
        .replace(
            /\u00a0/g,
            ' '
        )
        .replace(
            /\s+/g,
            ' '
        )
        .replace(
            /^\s+|\s+$/g,
            ''
        );
    }


    function safeInt(
        value,
        fallback
    ) {
        var n =
            parseInt(
                value,
                10
            );

        return isNaN(n)
            ? fallback
            : n;
    }


    function absoluteUrl(value) {
        value =
            clean(
                value
            );

        if (!value) {
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
            ) === 0
        ) {
            return (
                'https:' +
                value
            );
        }

        if (
            value.charAt(0) !==
            '/'
        ) {
            value =
                '/' +
                value;
        }

        return (
            ORIGIN +
            value
        );
    }


    function toPath(value) {
        value =
            clean(
                value
            );

        if (!value) {
            return '/';
        }

        try {
            if (
                /^https?:\/\//i
                    .test(
                        value
                    )
            ) {
                var a =
                    document
                        .createElement(
                            'a'
                        );

                a.href =
                    value;

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
            value.charAt(0) ===
            '/'
        )
            ? value
            : '/' + value;
    }


    function workerUrl(path) {
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


    function tvUrl(
        path,
        episode,
        player
    ) {
        var p =
            toPath(
                path ||
                '/'
            );

        var q =
            p.indexOf(
                '?'
            );

        if (
            q >= 0
        ) {
            p =
                p.substring(
                    0,
                    q
                );
        }

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
                episode ||
                0
            ) +
            '&player=' +
            encodeURIComponent(
                player ||
                1
            ) +
            '&_=' +
            new Date()
                .getTime()
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


    function textOf(node) {
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


    function sameAnimeUrl(path) {
        return (
            /^\/tip\/[^/]+\/[^?#]+\.html(?:\?.*)?$/i
                .test(
                    toPath(
                        path
                    )
                )
        );
    }


    function findArticleContainer(node) {
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
            i < 8 &&
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
                ) >= 0 &&
                (
                    text.indexOf(
                        'Описание:'
                    ) >= 0 ||
                    text.indexOf(
                        'Количество серий:'
                    ) >= 0
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
        if (!container) {
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
            i < links.length;
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
                var img =
                    links[i]
                        .querySelector(
                            'img'
                        );


                if (img) {
                    var src =
                        img
                            .getAttribute(
                                'data-src'
                            ) ||
                        img
                            .getAttribute(
                                'src'
                            ) ||
                        '';


                    if (src) {
                        return absoluteUrl(
                            src
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
            i < images.length;
            i++
        ) {
            var source =
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
                source
                    .toLowerCase();


            if (!source) {
                continue;
            }


            if (
                /mc\.yandex|smile|rating|counter/
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
                        source
                    )
            ) {
                return absoluteUrl(
                    source
                );
            }
        }


        return '';
    }


    function parseMenu(doc) {
        var result = {
            genres: [],
            types: [],
            years: []
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


            result[group]
                .push({
                    title:
                        title,

                    path:
                        path
                });
        }


        for (
            i = 0;
            i < anchors.length;
            i++
        ) {
            var href =
                anchors[i]
                    .getAttribute(
                        'href'
                    ) ||
                '';


            var path =
                toPath(
                    href
                );


            var title =
                clean(
                    anchors[i]
                        .textContent ||
                    ''
                );


            if (
                path.indexOf(
                    '/zhanr/'
                ) === 0
            ) {
                add(
                    'genres',
                    title,
                    path
                );
            }


            else if (
                path.indexOf(
                    '/god/'
                ) === 0
            ) {
                add(
                    'years',
                    title,
                    path
                );
            }


            else if (
                path.indexOf(
                    '/tip/'
                ) === 0 &&
                !/\.html(?:\?|$)/i
                    .test(
                        path
                    )
            ) {
                add(
                    'types',
                    title,
                    path
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
                        safeInt(
                            b.title,
                            0
                        ) -
                        safeInt(
                            a.title,
                            0
                        )
                    );
                }
            );


        return result;
    }


    function parsePageNumber(path) {
        var match =
            toPath(
                path
            )
            .match(
                /\/page\/(\d+)\/?/i
            );


        return match
            ? safeInt(
                match[1],
                1
            )
            : 1;
    }


    function baseSectionPath(path) {
        var p =
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


        if (
            p.charAt(
                p.length -
                1
            ) !== '/'
        ) {
            p +=
                '/';
        }


        return p;
    }


    function pagePath(
        base,
        page
    ) {
        base =
            baseSectionPath(
                base
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
            parsePageNumber(
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
            i < anchors.length;
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


            if (match) {
                max =
                    Math.max(
                        max,
                        safeInt(
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
                    ? pagePath(
                        currentPath,
                        current -
                        1
                    )
                    : '',

            next:
                max >
                current
                    ? pagePath(
                        currentPath,
                        current +
                        1
                    )
                    : ''
        };
    }


    function availableFromTitle(title) {
        var best =
            0;


        var re =
            /\[?\s*1\s*-\s*(\d{1,4})\s*(?:из\s*\d+\+?)?/ig;


        var match;


        while (
            (
                match =
                    re.exec(
                        clean(
                            title
                        )
                    )
            )
        ) {
            best =
                Math.max(
                    best,
                    safeInt(
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
            i < headings.length;
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
                !sameAnimeUrl(
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


            items.push({
                title:
                    title,

                href:
                    href,

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
                    availableFromTitle(
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
                parsePaging(
                    doc,
                    currentPath
                )
        };
    }


    function parseEpisodes(
        fallbackItem,
        episodeText
    ) {
        var max =
            fallbackItem &&
            fallbackItem
                .availableEpisodes

                ? safeInt(
                    fallbackItem
                        .availableEpisodes,
                    0
                )

                : 0;


        if (!max) {
            var range =
                clean(
                    episodeText ||
                    ''
                )
                .match(
                    /\b1\s*-\s*(\d{1,4})\b/i
                );


            if (range) {
                max =
                    safeInt(
                        range[1],
                        0
                    );
            }
        }


        if (!max) {
            var direct =
                clean(
                    episodeText ||
                    ''
                )
                .match(
                    /\b(\d{1,4})\+?\b/
                );


            if (direct) {
                max =
                    safeInt(
                        direct[1],
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
            i <= max;
            i++
        ) {
            result.push({
                number:
                    i,

                title:
                    i +
                    ' серия'
            });
        }


        return result;
    }


    function parseDetail(
        html,
        fallbackItem
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


        var h1 =
            doc
                .querySelector(
                    'h1'
                );


        var title =
            fallbackItem &&
            fallbackItem.title
                ? clean(
                    fallbackItem
                        .title
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


        if (!title) {
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
            );


        var genre =
            firstMatch(
                text,
                /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
            );


        var type =
            firstMatch(
                text,
                /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|$)/i
            );


        var episodeText =
            firstMatch(
                text,
                /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|\s+Описание:|$)/i
            );


        var director =
            firstMatch(
                text,
                /Режисс[её]р:\s*(.+?)(?=\s+(?:Длительность|Рейтинг|Описание|Категории):|$)/i
            );


        var duration =
            firstMatch(
                text,
                /(?:Длительность|Продолжительность):\s*(.+?)(?=\s+(?:Рейтинг|Описание|Категории):|$)/i
            );


        var description =
            firstMatch(
                text,
                /Описание:\s*(.+?)(?=\s+(?:Теги:|Категории:|Правила для комментаторов|Комментарии)|$)/i
            );


        var originalTitle =
            firstMatch(
                text,
                /(?:Оригинальное название|Оригинал(?:ьное название)?|Английское название):\s*(.+?)(?=\s+(?:Год выхода|Год|Жанр|Тип|Количество серий|Режисс[её]р|Длительность|Рейтинг|Описание):|$)/i
            );


        if (
            !year &&
            fallbackItem
        ) {
            year =
                fallbackItem.year ||
                '';
        }


        if (
            !genre &&
            fallbackItem
        ) {
            genre =
                fallbackItem.genre ||
                '';
        }


        if (
            !type &&
            fallbackItem
        ) {
            type =
                fallbackItem.type ||
                '';
        }


        if (
            !episodeText &&
            fallbackItem
        ) {
            episodeText =
                fallbackItem.episodes ||
                '';
        }


        if (
            !description &&
            fallbackItem
        ) {
            description =
                fallbackItem.description ||
                '';
        }


        return {
            title:
                title,

            originalTitle:
                originalTitle,

            href:
                fallbackItem &&
                fallbackItem.href
                    ? fallbackItem.href
                    : '/',

            poster:
                fallbackItem &&
                fallbackItem.poster
                    ? fallbackItem.poster
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
                episodeText,

            director:
                director,

            duration:
                duration,

            description:
                description,

            episodes:
                parseEpisodes(
                    fallbackItem,
                    episodeText
                )
        };
    }


    function injectStyle() {
        if (
            $(
                '#animevost-v050-style'
            ).length
        ) {
            return;
        }


        $('head')
            .append(
                '<style id="animevost-v050-style">' +

                '.av50-viewport{' +
                    'height:calc(100vh - 6.2em);' +
                    'overflow-y:auto;' +
                    'overflow-x:hidden;' +
                    'box-sizing:border-box;' +
                    '-webkit-overflow-scrolling:touch' +
                '}' +

                '.av50-viewport::-webkit-scrollbar{' +
                    'width:0;' +
                    'height:0' +
                '}' +

                '.av50-page{' +
                    'padding:1.3em 2.2em 5em;' +
                    'box-sizing:border-box' +
                '}' +

                '.av50-title{' +
                    'font-size:2em;' +
                    'font-weight:600;' +
                    'margin:.2em 0 .75em;' +
                    'line-height:1.15' +
                '}' +

                '.av50-nav,' +
                '.av50-grid,' +
                '.av50-pages,' +
                '.av50-actions,' +
                '.av50-episodes{' +
                    'display:flex;' +
                    'flex-wrap:wrap;' +
                    'align-items:flex-start' +
                '}' +

                '.av50-nav{' +
                    'margin-bottom:1.2em' +
                '}' +

                '.av50-navbtn,' +
                '.av50-pagebtn,' +
                '.av50-action,' +
                '.av50-episode{' +
                    'padding:.7em 1.05em;' +
                    'margin:0 .55em .55em 0;' +
                    'background:rgba(255,255,255,.10);' +
                    'border-radius:.45em;' +
                    'font-size:1.05em;' +
                    'box-sizing:border-box' +
                '}' +

                '.av50-navbtn.focus,' +
                '.av50-pagebtn.focus,' +
                '.av50-action.focus,' +
                '.av50-episode.focus{' +
                    'background:#fff;' +
                    'color:#111' +
                '}' +

                '.av50-status{' +
                    'padding:1.2em 0;' +
                    'font-size:1.15em;' +
                    'opacity:.8' +
                '}' +

                '.av50-card{' +
                    'width:12.2em;' +
                    'margin:0 1.05em 1.3em 0;' +
                    'border-radius:.55em;' +
                    'padding:.45em;' +
                    'background:rgba(255,255,255,.04);' +
                    'box-sizing:border-box' +
                '}' +

                '.av50-card.focus{' +
                    'background:rgba(255,255,255,.18);' +
                    'transform:scale(1.025)' +
                '}' +

                '.av50-poster{' +
                    'width:100%;' +
                    'height:17.4em;' +
                    'border-radius:.4em;' +
                    'overflow:hidden;' +
                    'background:rgba(255,255,255,.08);' +
                    'display:flex;' +
                    'align-items:center;' +
                    'justify-content:center' +
                '}' +

                '.av50-poster img,' +
                '.av50-detail-poster img{' +
                    'width:100%;' +
                    'height:100%;' +
                    'object-fit:cover;' +
                    'display:block' +
                '}' +

                '.av50-fallback{' +
                    'font-size:1em;' +
                    'opacity:.55;' +
                    'text-align:center;' +
                    'padding:1em' +
                '}' +

                '.av50-name{' +
                    'font-size:1.03em;' +
                    'line-height:1.25;' +
                    'margin-top:.6em;' +
                    'min-height:2.5em' +
                '}' +

                '.av50-meta{' +
                    'font-size:.83em;' +
                    'line-height:1.3;' +
                    'opacity:.62;' +
                    'margin-top:.35em;' +
                    'min-height:2.1em' +
                '}' +

                '.av50-pages{' +
                    'margin-top:.4em;' +
                    'padding-bottom:1em' +
                '}' +

                '.av50-detail-top{' +
                    'display:flex;' +
                    'align-items:flex-start;' +
                    'margin-bottom:1.4em' +
                '}' +

                '.av50-detail-poster{' +
                    'width:15em;' +
                    'min-width:15em;' +
                    'height:21em;' +
                    'margin-right:2em;' +
                    'overflow:hidden;' +
                    'border-radius:.55em;' +
                    'background:rgba(255,255,255,.08)' +
                '}' +

                '.av50-detail-body{' +
                    'max-width:68em' +
                '}' +

                '.av50-detail-original{' +
                    'font-size:1.05em;' +
                    'opacity:.65;' +
                    'margin-top:-.45em;' +
                    'margin-bottom:.9em' +
                '}' +

                '.av50-detail-meta{' +
                    'font-size:1.04em;' +
                    'line-height:1.55;' +
                    'opacity:.78;' +
                    'margin-bottom:1em' +
                '}' +

                '.av50-detail-description{' +
                    'font-size:1.05em;' +
                    'line-height:1.55' +
                '}' +

                '.av50-actions{' +
                    'margin:1.25em 0 1.3em' +
                '}' +

                '.av50-action--primary{' +
                    'background:rgba(255,255,255,.18)' +
                '}' +

                '.av50-section-title{' +
                    'font-size:1.45em;' +
                    'font-weight:600;' +
                    'margin:1.2em 0 .75em' +
                '}' +

                '.av50-episode{' +
                    'min-width:7.3em;' +
                    'text-align:center' +
                '}' +

                '.av50-episode.selected{' +
                    'box-shadow:inset 0 0 0 .16em rgba(255,255,255,.65)' +
                '}' +

                '.av50-note{' +
                    'margin-top:1.2em;' +
                    'padding:1em 1.15em;' +
                    'background:rgba(255,255,255,.07);' +
                    'border-radius:.45em;' +
                    'opacity:.72;' +
                    'font-size:.96em;' +
                    'line-height:1.45' +
                '}' +

                '.av50-tv{' +
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

                '.av50-tvbar{' +
                    'height:3.5em;' +
                    'min-height:3.5em;' +
                    'background:rgba(12,12,12,.98);' +
                    'display:flex;' +
                    'align-items:center;' +
                    'padding:0 1em;' +
                    'box-sizing:border-box' +
                '}' +

                '.av50-tvtitle{' +
                    'font-size:1em;' +
                    'white-space:nowrap;' +
                    'overflow:hidden;' +
                    'text-overflow:ellipsis;' +
                    'flex:1;' +
                    'padding-right:1em' +
                '}' +

                '.av50-tvstatus{' +
                    'font-size:.82em;' +
                    'opacity:.7;' +
                    'margin-right:1.2em;' +
                    'white-space:nowrap' +
                '}' +

                '.av50-tvclose{' +
                    'padding:.55em .8em;' +
                    'border-radius:.35em;' +
                    'background:rgba(255,255,255,.14)' +
                '}' +

                '.av50-tvclose.focus{' +
                    'background:#fff;' +
                    'color:#111' +
                '}' +

                '.av50-tv iframe{' +
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
        className,
        url
    ) {
        var box =
            $(
                '<div class="' +
                className +
                '"></div>'
            );


        if (url) {
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
                            '<div class="av50-fallback">' +
                                'AnimeVost' +
                            '</div>'
                        );
                }
            );


            box.append(
                img
            );
        }


        else {
            box.append(
                '<div class="av50-fallback">' +
                    'AnimeVost' +
                '</div>'
            );
        }


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


        var vp =
            viewport[0];


        var er =
            element
                .getBoundingClientRect();


        var vr =
            vp
                .getBoundingClientRect();


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


    function selectors(root) {
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


    function rows(elements) {
        var result =
            [];


        var tolerance =
            10;


        var i;


        for (
            i = 0;
            i < elements.length;
            i++
        ) {
            var el =
                elements[i];


            var top =
                el
                    .getBoundingClientRect()
                    .top;


            var row =
                null;


            var r;


            for (
                r = 0;
                r < result.length;
                r++
            ) {
                if (
                    Math.abs(
                        result[r]
                            .top -
                        top
                    ) <=
                    tolerance
                ) {
                    row =
                        result[r];

                    break;
                }
            }


            if (!row) {
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
                el
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


        for (
            i = 0;
            i < result.length;
            i++
        ) {
            result[i]
                .items
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


        if (!current) {
            return items[0];
        }


        var cr =
            current
                .getBoundingClientRect();


        var cx =
            cr.left +
            cr.width /
            2;


        var best =
            items[0];


        var distance =
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


            var d =
                Math.abs(
                    (
                        r.left +
                        r.width /
                        2
                    ) -
                    cx
                );


            if (
                d <
                distance
            ) {
                distance =
                    d;

                best =
                    items[i];
            }
        }


        return best;
    }


    function navigation(
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
                document
                    .documentElement
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


            if (focused) {
                return focused;
            }


            var list =
                selectors(
                    root
                );


            return list.length
                ? list[0]
                : null;
        }


        function focus(el) {
            if (!el) {
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


            ensureVisible(
                viewport,
                el
            );


            return true;
        }


        function move(direction) {
            var list =
                selectors(
                    root
                );


            var cur =
                current();


            if (
                !list.length ||
                !cur
            ) {
                return false;
            }


            var grouped =
                rows(
                    list
                );


            var rowIndex =
                -1;


            var colIndex =
                -1;


            var r;
            var c;


            for (
                r = 0;
                r < grouped.length;
                r++
            ) {
                for (
                    c = 0;
                    c <
                    grouped[r]
                        .items
                        .length;
                    c++
                ) {
                    if (
                        grouped[r]
                            .items[c] ===
                        cur
                    ) {
                        rowIndex =
                            r;

                        colIndex =
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
                    colIndex >
                    0
                ) {
                    return focus(
                        grouped[
                            rowIndex
                        ]
                        .items[
                            colIndex -
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
                    colIndex <
                    grouped[
                        rowIndex
                    ]
                    .items
                    .length -
                    1
                ) {
                    return focus(
                        grouped[
                            rowIndex
                        ]
                        .items[
                            colIndex +
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
                            grouped[
                                rowIndex -
                                1
                            ]
                            .items,
                            cur
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
                    grouped.length -
                    1
                ) {
                    return focus(
                        nearest(
                            grouped[
                                rowIndex +
                                1
                            ]
                            .items,
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


    function sendTvKey(key) {
        if (
            !tvSession ||
            !tvSession.frame ||
            !tvSession.frame[0]
        ) {
            return;
        }


        try {
            tvSession
                .frame[0]
                .contentWindow
                .postMessage(
                    {
                        source:
                            'animevost-tv-host',

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


    function sendTvBack() {
        if (
            !tvSession ||
            !tvSession.frame ||
            !tvSession.frame[0]
        ) {
            return;
        }


        try {
            tvSession
                .frame[0]
                .contentWindow
                .postMessage(
                    {
                        source:
                            'animevost-tv-host',

                        type:
                            'back'
                    },
                    '*'
                );
        }

        catch (e) {}
    }


    function closeTvPlayer() {
        if (!tvSession) {
            return;
        }


        var session =
            tvSession;


        tvSession =
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
            window.removeEventListener(
                'keydown',
                session.mediaHandler,
                true
            );
        }
        catch (e2) {}


        try {
            session
                .overlay
                .remove();
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


    function openTvPlayer(
        item,
        episode,
        player
    ) {
        closeTvPlayer();


        var overlay =
            $(
                '<div class="av50-tv"></div>'
            );


        var bar =
            $(
                '<div class="av50-tvbar"></div>'
            );


        var title =
            $(
                '<div class="av50-tvtitle"></div>'
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
                '<div class="av50-tvstatus">' +
                    'Загрузка TV-режима...' +
                '</div>'
            );


        var close =
            $(
                '<div class="av50-tvclose selector">' +
                    '✕ Закрыть' +
                '</div>'
            );


        var frame =
            $(
                '<iframe ' +
                    'class="selector" ' +
                    'tabindex="0" ' +
                    'allow="autoplay; fullscreen; picture-in-picture" ' +
                    'allowfullscreen>' +
                '</iframe>'
            );


        frame.attr(
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

            playerMode:
                false,

            messageHandler:
                null,

            mediaHandler:
                null
        };


        tvSession =
            session;


        function updateStatus() {
            if (
                !tvSession ||
                tvSession !==
                session
            ) {
                return;
            }


            session
                .status
                .text(
                    session.playerMode
                        ? 'Плеер: OK пауза • ←/→ 10 сек • ↑/↓ громкость • Back назад'
                        : 'Стрелки — выбор • OK — нажать • Back — закрыть'
                );
        }


        session.messageHandler =
            function (event) {
                var data =
                    event.data ||
                    {};


                if (
                    data.source !==
                    'animevost-tv'
                ) {
                    return;
                }


                if (
                    data.type ===
                    'ready'
                ) {
                    status.text(
                        'TV-режим готов • стрелки/OK управляют страницей'
                    );
                }


                else if (
                    data.type ===
                    'player-mode'
                ) {
                    session.playerMode =
                        !!data.active;


                    updateStatus();
                }


                else if (
                    data.type ===
                    'request-close'
                ) {
                    closeTvPlayer();
                }
            };


        window.addEventListener(
            'message',
            session.messageHandler,
            false
        );


        session.mediaHandler =
            function (event) {
                var code =
                    event.keyCode ||
                    event.which;


                var key =
                    '';


                if (
                    code === 415
                ) {
                    key =
                        'play';
                }


                else if (
                    code === 19
                ) {
                    key =
                        'pause';
                }


                else if (
                    code === 179
                ) {
                    key =
                        'playpause';
                }


                else if (
                    code === 412
                ) {
                    key =
                        'rewind';
                }


                else if (
                    code === 417
                ) {
                    key =
                        'forward';
                }


                if (
                    key &&
                    tvSession ===
                    session
                ) {
                    sendTvKey(
                        key
                    );


                    try {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    catch (e) {}
                }
            };


        window.addEventListener(
            'keydown',
            session.mediaHandler,
            true
        );


        close.on(
            'hover:enter click',
            closeTvPlayer
        );


        frame.on(
            'hover:enter',

            function () {
                sendTvKey(
                    'enter'
                );
            }
        );


        Lampa.Controller.add(
            TV_CONTROLLER,

            {
                toggle:
                    function () {
                        Lampa.Controller
                            .collectionSet(
                                overlay
                            );


                        Lampa.Controller
                            .collectionFocus(
                                frame[0],
                                overlay
                            );
                    },


                left:
                    function () {
                        sendTvKey(
                            'left'
                        );
                    },


                right:
                    function () {
                        sendTvKey(
                            'right'
                        );
                    },


                up:
                    function () {
                        sendTvKey(
                            'up'
                        );
                    },


                down:
                    function () {
                        sendTvKey(
                            'down'
                        );
                    },


                back:
                    function () {
                        if (
                            session.playerMode
                        ) {
                            sendTvBack();


                            session.playerMode =
                                false;


                            updateStatus();
                        }


                        else {
                            closeTvPlayer();
                        }
                    }
            }
        );


        Lampa.Controller
            .toggle(
                TV_CONTROLLER
            );


        setTimeout(
            function () {
                if (
                    tvSession !==
                    session
                ) {
                    return;
                }


                try {
                    frame[0]
                        .focus();
                }

                catch (e) {}
            },

            150
        );
    }


    function openCatalog(
        path,
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
                path ||
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


        Lampa.Select.show({
            title:
                title,

            items:
                list.map(
                    function (item) {
                        return {
                            title:
                                item.title,

                            av_path:
                                item.path
                        };
                    }
                ),

            onSelect:
                function (item) {
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
        });
    }


    function CatalogComponent(object) {
        var network =
            new Lampa.Reguest();


        var alive =
            false;


        var viewport =
            $(
                '<div class="av50-viewport"></div>'
            );


        var root =
            $(
                '<div class="av50-page"></div>'
            );


        var menu = {
            genres: [],
            types: [],
            years: []
        };


        var path =
            object.av_path ||
            '/';


        var title =
            object.av_title ||
            'AnimeVost';


        var self =
            this;


        var nav;


        function topNavigation() {
            var bar =
                $(
                    '<div class="av50-nav"></div>'
                );


            function add(
                label,
                action
            ) {
                var button =
                    $(
                        '<div class="av50-navbtn selector"></div>'
                    )
                    .text(
                        label
                    );


                button.on(
                    'hover:enter',
                    action
                );


                bar.append(
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
                bar
            );
        }


        function card(
            grid,
            item
        ) {
            var el =
                $(
                    '<div class="av50-card selector"></div>'
                );


            el.append(
                posterBox(
                    'av50-poster',
                    item.poster
                )
            );


            el.append(
                $(
                    '<div class="av50-name"></div>'
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


            el.append(
                $(
                    '<div class="av50-meta"></div>'
                )
                .text(
                    meta.join(
                        ' • '
                    )
                )
            );


            el.on(
                'hover:enter',

                function () {
                    openDetail(
                        item
                    );
                }
            );


            grid.append(
                el
            );
        }


        function paging(data) {
            if (
                !data ||
                (
                    !data.previous &&
                    !data.next
                )
            ) {
                return;
            }


            var bar =
                $(
                    '<div class="av50-pages"></div>'
                );


            if (
                data.previous
            ) {
                var previous =
                    $(
                        '<div class="av50-pagebtn selector"></div>'
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


                bar.append(
                    previous
                );
            }


            bar.append(
                $(
                    '<div class="av50-pagebtn"></div>'
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
                        '<div class="av50-pagebtn selector"></div>'
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


                bar.append(
                    next
                );
            }


            root.append(
                bar
            );
        }


        function renderError(message) {
            if (!alive) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av50-title"></div>'
                )
                .text(
                    title
                )
            );


            root.append(
                $(
                    '<div class="av50-status"></div>'
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


        function render(data) {
            if (!alive) {
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
                    '<div class="av50-title"></div>'
                )
                .text(
                    title
                )
            );


            topNavigation();


            if (
                !data.items ||
                !data.items.length
            ) {
                root.append(
                    '<div class="av50-status">' +
                        'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );
            }


            else {
                var grid =
                    $(
                        '<div class="av50-grid"></div>'
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


            paging(
                data.paging
            );


            nav.bind();


            self.activity
                .loader(
                    false
                );


            setTimeout(
                function () {
                    if (!alive) {
                        return;
                    }


                    var list =
                        selectors(
                            root
                        );


                    if (
                        list.length
                    ) {
                        nav.focus(
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
                        '<div class="av50-title"></div>'
                    )
                    .text(
                        title
                    )
                );


                root.append(
                    '<div class="av50-status">' +
                        'Загрузка AnimeVost...' +
                    '</div>'
                );


                this.activity
                    .loader(
                        true
                    );


                nav =
                    navigation(
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
                    workerUrl(
                        path
                    ),

                    function (html) {
                        if (!alive) {
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


                        catch (error) {
                            console.log(
                                'AnimeVost catalog parse error',
                                error
                            );


                            renderError(
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

                    function (error) {
                        if (!alive) {
                            return;
                        }


                        var code =
                            '?';


                        try {
                            code =
                                error.status;
                        }
                        catch (e) {}


                        renderError(
                            'Не удалось загрузить AnimeVost. Код: ' +
                            code
                        );
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
                                        nav.getLast() ||
                                        false,
                                        viewport
                                    );


                                if (
                                    nav.getLast()
                                ) {
                                    ensureVisible(
                                        viewport,
                                        nav.getLast()
                                    );
                                }
                            },


                        left:
                            function () {
                                nav.move(
                                    'left'
                                );
                            },


                        right:
                            function () {
                                nav.move(
                                    'right'
                                );
                            },


                        up:
                            function () {
                                nav.move(
                                    'up'
                                );
                            },


                        down:
                            function () {
                                nav.move(
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


    function DetailComponent(object) {
        var network =
            new Lampa.Reguest();


        var alive =
            false;


        var viewport =
            $(
                '<div class="av50-viewport"></div>'
            );


        var root =
            $(
                '<div class="av50-page"></div>'
            );


        var item =
            object.av_item ||
            {};


        var self =
            this;


        var nav;


        var selectedEpisode =
            0;


        function updateSelection() {
            root
                .find(
                    '.av50-episode'
                )
                .each(
                    function () {
                        var el =
                            $(
                                this
                            );


                        el.toggleClass(
                            'selected',

                            safeInt(
                                el.attr(
                                    'data-episode'
                                ),
                                0
                            ) ===
                            selectedEpisode
                        );
                    }
                );
        }


        function renderError(message) {
            if (!alive) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av50-title"></div>'
                )
                .text(
                    item.title ||
                    'AnimeVost'
                )
            );


            root.append(
                $(
                    '<div class="av50-status"></div>'
                )
                .text(
                    message
                )
            );


            nav.bind();


            self.activity
                .loader(
                    false
                );
        }


        function render(data) {
            if (!alive) {
                return;
            }


            root.empty();


            viewport[0]
                .scrollTop =
                0;


            var top =
                $(
                    '<div class="av50-detail-top"></div>'
                );


            top.append(
                posterBox(
                    'av50-detail-poster',
                    data.poster
                )
            );


            var body =
                $(
                    '<div class="av50-detail-body"></div>'
                );


            body.append(
                $(
                    '<div class="av50-title"></div>'
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
                        '<div class="av50-detail-original"></div>'
                    )
                    .text(
                        data.originalTitle
                    )
                );
            }


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
                    '<div class="av50-detail-meta"></div>'
                )
                .text(
                    meta.join(
                        ' • '
                    )
                )
            );


            body.append(
                $(
                    '<div class="av50-detail-description"></div>'
                )
                .text(
                    data.description ||
                    'Описание не найдено.'
                )
            );


            var actions =
                $(
                    '<div class="av50-actions"></div>'
                );


            var player1 =
                $(
                    '<div class="av50-action av50-action--primary selector">' +
                        '▶ Смотреть • Плеер №1' +
                    '</div>'
                );


            var player2 =
                $(
                    '<div class="av50-action selector">' +
                        '▶ Смотреть • Плеер №2' +
                    '</div>'
                );


            player1.on(
                'hover:enter',

                function () {
                    openTvPlayer(
                        data,
                        selectedEpisode,
                        1
                    );
                }
            );


            player2.on(
                'hover:enter',

                function () {
                    openTvPlayer(
                        data,
                        selectedEpisode,
                        2
                    );
                }
            );


            actions
                .append(
                    player1
                )
                .append(
                    player2
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
                '<div class="av50-section-title">' +
                    'Серии' +
                '</div>'
            );


            if (
                data.episodes &&
                data.episodes.length
            ) {
                var grid =
                    $(
                        '<div class="av50-episodes"></div>'
                    );


                data.episodes
                    .forEach(
                        function (episode) {
                            var button =
                                $(
                                    '<div class="av50-episode selector"></div>'
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


                                    updateSelection();


                                    notify(
                                        'Выбрана серия ' +
                                        episode.number
                                    );
                                }
                            );


                            grid.append(
                                button
                            );
                        }
                    );


                root.append(
                    grid
                );
            }


            else {
                root.append(
                    '<div class="av50-status">' +
                        'Список доступных серий не найден.' +
                    '</div>'
                );
            }


            root.append(
                '<div class="av50-note">' +

                'V0.5 использует TV-режим страницы AnimeVost. ' +
                'Выберите доступную серию, затем Плеер №1 или №2. ' +

                'На странице AnimeVost стрелки и OK передаются через плагин; ' +
                'когда фокус войдёт в видеоплеер, OK переключает паузу, ' +
                '←/→ перематывают примерно на 10 секунд, ' +
                '↑/↓ меняют громкость. ' +

                'Back сначала выходит из режима плеера, ' +
                'затем закрывает TV-страницу.' +

                '</div>'
            );


            nav.bind();


            self.activity
                .loader(
                    false
                );


            setTimeout(
                function () {
                    if (!alive) {
                        return;
                    }


                    var list =
                        selectors(
                            root
                        );


                    if (
                        list.length
                    ) {
                        nav.focus(
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
                        '<div class="av50-title"></div>'
                    )
                    .text(
                        item.title ||
                        'AnimeVost'
                    )
                );


                root.append(
                    '<div class="av50-status">' +
                        'Загрузка страницы аниме...' +
                    '</div>'
                );


                this.activity
                    .loader(
                        true
                    );


                nav =
                    navigation(
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
                    DETAIL_CACHE[key]
                ) {
                    render(
                        DETAIL_CACHE[key]
                    );


                    return this.render();
                }


                network.timeout(
                    20000
                );


                network.silent(
                    workerUrl(
                        key
                    ),

                    function (html) {
                        if (!alive) {
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


                            DETAIL_CACHE[key] =
                                data;


                            render(
                                data
                            );
                        }


                        catch (error) {
                            console.log(
                                'AnimeVost detail parse error',
                                error
                            );


                            renderError(
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

                    function (error) {
                        if (!alive) {
                            return;
                        }


                        var code =
                            '?';


                        try {
                            code =
                                error.status;
                        }
                        catch (e) {}


                        renderError(
                            'Не удалось загрузить страницу аниме. Код: ' +
                            code
                        );
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
                                        nav.getLast() ||
                                        false,
                                        viewport
                                    );


                                if (
                                    nav.getLast()
                                ) {
                                    ensureVisible(
                                        viewport,
                                        nav.getLast()
                                    );
                                }
                            },


                        left:
                            function () {
                                nav.move(
                                    'left'
                                );
                            },


                        right:
                            function () {
                                nav.move(
                                    'right'
                                );
                            },


                        up:
                            function () {
                                nav.move(
                                    'up'
                                );
                            },


                        down:
                            function () {
                                nav.move(
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


                closeTvPlayer();


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
                                '"' +
                            '/>' +

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
            .eq(0)
            .append(
                button
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
                'AnimeVost V0.5 загружен'
            );
        }


        catch (error) {
            console.log(
                'AnimeVost V0.5 init error',
                error
            );


            notify(
                'Ошибка запуска AnimeVost V0.5'
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

            function (event) {
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
