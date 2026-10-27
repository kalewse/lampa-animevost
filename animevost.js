(function () {
    'use strict';

    var NS =
        'animevost_v051';

    var FLAG =
        NS +
        '_ready';

    var CATALOG =
        NS +
        '_catalog';

    var DETAIL =
        NS +
        '_detail';

    var TV_CONTROLLER =
        NS +
        '_tv';


    var WORKER =
        'https://animevost-lampa.kalewse69.workers.dev/';

    var ORIGIN =
        'https://animevost.org';


    var DETAIL_CACHE =
        {};

    var tvSession =
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
        .replace(
            /^\s+|\s+$/g,
            ''
        );
    }


    function safeInt(
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


        if (
            value.charAt(
                0
            ) !==
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


    function workerUrl(
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


    function tvUrl(
        path,
        episode,
        player
    ) {
        var cleanPath =
            toPath(
                path ||
                '/'
            );


        var queryIndex =
            cleanPath.indexOf(
                '?'
            );


        if (
            queryIndex >=
            0
        ) {
            cleanPath =
                cleanPath.substring(
                    0,
                    queryIndex
                );
        }


        return (
            WORKER
                .replace(
                    /\/$/,
                    ''
                ) +

            cleanPath +

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


    function sameAnimeUrl(
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
            i < images.length;
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
                !src
            ) {
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
                .push(
                    {
                        title:
                            title,

                        path:
                            path
                    }
                );
        }


        var i;


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
                ) ===
                0
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
                ) ===
                0
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
                ) ===
                    0 &&

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


        result.years.sort(
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


    function parsePageNumber(
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
            ? safeInt(
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


        if (
            cleanPath.charAt(
                cleanPath.length -
                1
            ) !==
            '/'
        ) {
            cleanPath +=
                '/';
        }


        return cleanPath;
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


            if (
                match
            ) {
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


    function availableFromTitle(
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


            items.push(
                {
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


        if (
            !max
        ) {
            var range =
                clean(
                    episodeText ||
                    ''
                )
                .match(
                    /\b1\s*-\s*(\d{1,4})\b/i
                );


            if (
                range
            ) {
                max =
                    safeInt(
                        range[1],
                        0
                    );
            }
        }


        if (
            !max
        ) {
            var direct =
                clean(
                    episodeText ||
                    ''
                )
                .match(
                    /\b(\d{1,4})\+?\b/
                );


            if (
                direct
            ) {
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
                '#animevost-v051-style'
            ).length
        ) {
            return;
        }


        $('head')
            .append(

                '<style id="animevost-v051-style">' +

                '.av51-viewport{' +
                    'height:calc(100vh - 6.2em);' +
                    'overflow-y:auto;' +
                    'overflow-x:hidden;' +
                    'box-sizing:border-box;' +
                    '-webkit-overflow-scrolling:touch' +
                '}' +

                '.av51-viewport::-webkit-scrollbar{' +
                    'width:0;' +
                    'height:0' +
                '}' +

                '.av51-page{' +
                    'padding:1.3em 2.2em 5em;' +
                    'box-sizing:border-box' +
                '}' +

                '.av51-title{' +
                    'font-size:2em;' +
                    'font-weight:600;' +
                    'margin:.2em 0 .75em;' +
                    'line-height:1.15' +
                '}' +

                '.av51-nav,' +
                '.av51-grid,' +
                '.av51-pages,' +
                '.av51-actions,' +
                '.av51-episodes{' +
                    'display:flex;' +
                    'flex-wrap:wrap;' +
                    'align-items:flex-start' +
                '}' +

                '.av51-nav{' +
                    'margin-bottom:1.2em' +
                '}' +

                '.av51-navbtn,' +
                '.av51-pagebtn,' +
                '.av51-action,' +
                '.av51-episode{' +

                    'padding:.7em 1.05em;' +

                    'margin:0 .55em .55em 0;' +

                    'background:rgba(255,255,255,.10);' +

                    'border-radius:.45em;' +

                    'font-size:1.05em;' +

                    'box-sizing:border-box' +

                '}' +

                '.av51-navbtn.focus,' +
                '.av51-pagebtn.focus,' +
                '.av51-action.focus,' +
                '.av51-episode.focus{' +
                    'background:#fff;' +
                    'color:#111' +
                '}' +

                '.av51-status{' +
                    'padding:1.2em 0;' +
                    'font-size:1.15em;' +
                    'opacity:.8' +
                '}' +

                '.av51-card{' +

                    'width:12.2em;' +

                    'margin:0 1.05em 1.3em 0;' +

                    'border-radius:.55em;' +

                    'padding:.45em;' +

                    'background:rgba(255,255,255,.04);' +

                    'box-sizing:border-box' +

                '}' +

                '.av51-card.focus{' +
                    'background:rgba(255,255,255,.18);' +
                    'transform:scale(1.025)' +
                '}' +

                '.av51-poster{' +

                    'width:100%;' +

                    'height:17.4em;' +

                    'border-radius:.4em;' +

                    'overflow:hidden;' +

                    'background:rgba(255,255,255,.08);' +

                    'display:flex;' +

                    'align-items:center;' +

                    'justify-content:center' +

                '}' +

                '.av51-poster img,' +
                '.av51-detail-poster img{' +
                    'width:100%;' +
                    'height:100%;' +
                    'object-fit:cover;' +
                    'display:block' +
                '}' +

                '.av51-fallback{' +
                    'font-size:1em;' +
                    'opacity:.55;' +
                    'text-align:center;' +
                    'padding:1em' +
                '}' +

                '.av51-name{' +
                    'font-size:1.03em;' +
                    'line-height:1.25;' +
                    'margin-top:.6em;' +
                    'min-height:2.5em' +
                '}' +

                '.av51-meta{' +
                    'font-size:.83em;' +
                    'line-height:1.3;' +
                    'opacity:.62;' +
                    'margin-top:.35em;' +
                    'min-height:2.1em' +
                '}' +

                '.av51-pages{' +
                    'margin-top:.4em;' +
                    'padding-bottom:1em' +
                '}' +

                '.av51-detail-top{' +
                    'display:flex;' +
                    'align-items:flex-start;' +
                    'margin-bottom:1.4em' +
                '}' +

                '.av51-detail-poster{' +

                    'width:15em;' +

                    'min-width:15em;' +

                    'height:21em;' +

                    'margin-right:2em;' +

                    'overflow:hidden;' +

                    'border-radius:.55em;' +

                    'background:rgba(255,255,255,.08)' +

                '}' +

                '.av51-detail-body{' +
                    'max-width:68em' +
                '}' +

                '.av51-detail-original{' +
                    'font-size:1.05em;' +
                    'opacity:.65;' +
                    'margin-top:-.45em;' +
                    'margin-bottom:.9em' +
                '}' +

                '.av51-detail-meta{' +
                    'font-size:1.04em;' +
                    'line-height:1.55;' +
                    'opacity:.78;' +
                    'margin-bottom:1em' +
                '}' +

                '.av51-detail-description{' +
                    'font-size:1.05em;' +
                    'line-height:1.55' +
                '}' +

                '.av51-actions{' +
                    'margin:1.25em 0 1.3em' +
                '}' +

                '.av51-action--primary{' +
                    'background:rgba(255,255,255,.18)' +
                '}' +

                '.av51-section-title{' +
                    'font-size:1.45em;' +
                    'font-weight:600;' +
                    'margin:1.2em 0 .75em' +
                '}' +

                '.av51-episode{' +
                    'min-width:7.3em;' +
                    'text-align:center' +
                '}' +

                '.av51-episode.selected{' +
                    'box-shadow:' +
                    'inset 0 0 0 .16em rgba(255,255,255,.65)' +
                '}' +

                '.av51-note{' +

                    'margin-top:1.2em;' +

                    'padding:1em 1.15em;' +

                    'background:rgba(255,255,255,.07);' +

                    'border-radius:.45em;' +

                    'opacity:.72;' +

                    'font-size:.96em;' +

                    'line-height:1.45' +

                '}' +

                '.av51-tv{' +

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

                '.av51-tvbar{' +

                    'height:3.5em;' +

                    'min-height:3.5em;' +

                    'background:rgba(12,12,12,.98);' +

                    'display:flex;' +

                    'align-items:center;' +

                    'padding:0 1em;' +

                    'box-sizing:border-box' +

                '}' +

                '.av51-tvtitle{' +

                    'font-size:1em;' +

                    'white-space:nowrap;' +

                    'overflow:hidden;' +

                    'text-overflow:ellipsis;' +

                    'flex:1;' +

                    'padding-right:1em' +

                '}' +

                '.av51-tvstatus{' +

                    'font-size:.82em;' +

                    'opacity:.7;' +

                    'margin-right:1.2em;' +

                    'white-space:nowrap' +

                '}' +

                '.av51-tvclose{' +

                    'padding:.55em .8em;' +

                    'border-radius:.35em;' +

                    'background:rgba(255,255,255,.14)' +

                '}' +

                '.av51-tv iframe{' +

                    'width:100%;' +

                    'height:calc(100% - 3.5em);' +

                    'border:0;' +

                    'background:#000;' +

                    'display:block' +

                '}' +

                '.av51-sink{' +

                    'position:absolute!important;' +

                    'left:-9999px!important;' +

                    'top:-9999px!important;' +

                    'width:1px!important;' +

                    'height:1px!important;' +

                    'opacity:0!important;' +

                    'pointer-events:none!important' +

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
            url
        ) {
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
                            '<div class="av51-fallback">' +
                            'AnimeVost' +
                            '</div>'
                        );
                }
            );


            box.append(
                image
            );
        }


        else {
            box.append(
                '<div class="av51-fallback">' +
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


    function selectorList(
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
            i < elements.length;
            i++
        ) {
            var element =
                elements[i];


            var top =
                element
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
                element
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


        var distance =
            Infinity;


        var i;


        for (
            i = 0;
            i < items.length;
            i++
        ) {
            var rect =
                items[i]
                    .getBoundingClientRect();


            var d =
                Math.abs(

                    (
                        rect.left +
                        rect.width /
                        2
                    ) -

                    currentCenter
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


            if (
                focused
            ) {
                return focused;
            }


            var list =
                selectorList(
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
                selectorList(
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
                        grouped[
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


    /*
     * TV mode.
     *
     * IMPORTANT:
     *
     * The iframe NEVER receives
     * real LG keyboard focus.
     */

    function sendTvKey(
        key
    ) {
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
                            'animevost-tv-host-v051',

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


    function closeTvPlayer() {
        if (
            !tvSession
        ) {
            return;
        }


        var session =
            tvSession;


        tvSession =
            null;


        try {
            window
                .removeEventListener(
                    'message',
                    session
                        .messageHandler,
                    false
                );
        }

        catch (e) {}


        try {
            window
                .removeEventListener(
                    'keydown',
                    session
                        .mediaHandler,
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


        /*
         * This is deliberately
         * unconditional.
         *
         * Back MUST always get
         * the user out of TV mode.
         */

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
                '<div class="av51-tv"></div>'
            );


        var bar =
            $(
                '<div class="av51-tvbar"></div>'
            );


        var title =
            $(
                '<div class="av51-tvtitle"></div>'
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
                '<div class="av51-tvstatus">' +
                'Загрузка TV-режима...' +
                '</div>'
            );


        var closeLabel =
            $(
                '<div class="av51-tvclose">' +
                'Back — закрыть' +
                '</div>'
            );


        /*
         * Invisible Lampa focus target.
         *
         * Lampa always keeps its
         * controller here.
         */

        var sink =
            $(
                '<div ' +
                    'class="av51-sink selector" ' +
                    'tabindex="0">' +
                '</div>'
            );


        /*
         * No selector class,
         * tabindex = -1.
         *
         * The iframe itself must not
         * receive LG remote focus.
         */

        var frame =
            $(
                '<iframe ' +
                    'tabindex="-1" ' +
                    'allow="' +
                        'autoplay; fullscreen; picture-in-picture' +
                    '" ' +
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
                closeLabel
            )
            .append(
                sink
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

            sink:
                sink,

            status:
                status,

            messageHandler:
                null,

            mediaHandler:
                null
        };


        tvSession =
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
                    'animevost-tv-v051'
                ) {
                    return;
                }


                if (
                    data.type ===
                    'ready'
                ) {
                    status.text(
                        'TV-режим готов • стрелки/OK управляют страницей • Back закрывает'
                    );
                }
            };


        window.addEventListener(
            'message',
            session.messageHandler,
            false
        );


        /*
         * Physical Play/Pause/
         * rewind/forward keys.
         */

        session.mediaHandler =
            function (
                event
            ) {
                if (
                    tvSession !==
                    session
                ) {
                    return;
                }


                var code =
                    event.keyCode ||
                    event.which;


                var key =
                    '';


                if (
                    code ===
                    415
                ) {
                    key =
                        'play';
                }


                else if (
                    code ===
                    19
                ) {
                    key =
                        'pause';
                }


                else if (
                    code ===
                    179
                ) {
                    key =
                        'playpause';
                }


                else if (
                    code ===
                    412
                ) {
                    key =
                        'rewind';
                }


                else if (
                    code ===
                    417
                ) {
                    key =
                        'forward';
                }


                if (
                    key
                ) {
                    sendTvKey(
                        key
                    );


                    try {
                        event
                            .preventDefault();

                        event
                            .stopPropagation();
                    }

                    catch (e) {}
                }
            };


        window.addEventListener(
            'keydown',
            session.mediaHandler,
            true
        );


        /*
         * Explicit Lampa remote
         * controller.
         *
         * THIS fixes OK.
         */

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
                                sink[0],
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


                ok:
                    function () {
                        sendTvKey(
                            'enter'
                        );
                    },


                /*
                 * Back no longer enters
                 * the AnimeVost iframe.
                 *
                 * It ALWAYS closes.
                 */

                back:
                    function () {
                        closeTvPlayer();
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
                    Lampa.Controller
                        .collectionFocus(
                            sink[0],
                            overlay
                        );
                }

                catch (e) {}
            },

            120
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
                '<div class="av51-viewport"></div>'
            );


        var root =
            $(
                '<div class="av51-page"></div>'
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


        var nav;


        function addTopNavigation() {
            var bar =
                $(
                    '<div class="av51-nav"></div>'
                );


            function add(
                label,
                action
            ) {
                var button =
                    $(
                        '<div class="' +
                        'av51-navbtn selector' +
                        '"></div>'
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


        function addCard(
            grid,
            item
        ) {
            var card =
                $(
                    '<div class="' +
                    'av51-card selector' +
                    '"></div>'
                );


            card.append(
                posterBox(
                    'av51-poster',
                    item.poster
                )
            );


            card.append(
                $(
                    '<div class="av51-name"></div>'
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
                    '<div class="av51-meta"></div>'
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


            var bar =
                $(
                    '<div class="av51-pages"></div>'
                );


            if (
                data.previous
            ) {
                var previous =
                    $(
                        '<div class="' +
                        'av51-pagebtn selector' +
                        '"></div>'
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
                    '<div class="av51-pagebtn"></div>'
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
                        '<div class="' +
                        'av51-pagebtn selector' +
                        '"></div>'
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


        function renderError(
            message
        ) {
            if (
                !alive
            ) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av51-title"></div>'
                )
                .text(
                    title
                )
            );


            root.append(
                $(
                    '<div class="av51-status"></div>'
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
                    '<div class="av51-title"></div>'
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
                    '<div class="av51-status">' +
                    'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );
            }


            else {
                var grid =
                    $(
                        '<div class="av51-grid"></div>'
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


            nav.bind();


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
                        selectorList(
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
                        '<div class="av51-title"></div>'
                    )
                    .text(
                        title
                    )
                );


                root.append(
                    '<div class="av51-status">' +
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

                    function (
                        error
                    ) {
                        if (
                            !alive
                        ) {
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


    function DetailComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();


        var alive =
            false;


        var viewport =
            $(
                '<div class="av51-viewport"></div>'
            );


        var root =
            $(
                '<div class="av51-page"></div>'
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
                    '.av51-episode'
                )
                .each(
                    function () {
                        var element =
                            $(
                                this
                            );


                        element
                            .toggleClass(

                                'selected',

                                safeInt(
                                    element
                                        .attr(
                                            'data-episode'
                                        ),

                                    0
                                ) ===
                                selectedEpisode
                            );
                    }
                );
        }


        function renderError(
            message
        ) {
            if (
                !alive
            ) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av51-title"></div>'
                )
                .text(
                    item.title ||
                    'AnimeVost'
                )
            );


            root.append(
                $(
                    '<div class="av51-status"></div>'
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


            var top =
                $(
                    '<div class="av51-detail-top"></div>'
                );


            top.append(
                posterBox(
                    'av51-detail-poster',
                    data.poster
                )
            );


            var body =
                $(
                    '<div class="av51-detail-body"></div>'
                );


            body.append(
                $(
                    '<div class="av51-title"></div>'
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
                        '<div class="av51-detail-original"></div>'
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
                    '<div class="av51-detail-meta"></div>'
                )
                .text(
                    meta.join(
                        ' • '
                    )
                )
            );


            body.append(
                $(
                    '<div class="av51-detail-description"></div>'
                )
                .text(
                    data.description ||
                    'Описание не найдено.'
                )
            );


            var actions =
                $(
                    '<div class="av51-actions"></div>'
                );


            var player1 =
                $(
                    '<div class="' +
                    'av51-action ' +
                    'av51-action--primary ' +
                    'selector">' +

                    '▶ Смотреть • Плеер №1' +

                    '</div>'
                );


            var player2 =
                $(
                    '<div class="' +
                    'av51-action selector">' +

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
                '<div class="av51-section-title">' +
                'Серии' +
                '</div>'
            );


            if (
                data.episodes &&
                data.episodes.length
            ) {
                var grid =
                    $(
                        '<div class="av51-episodes"></div>'
                    );


                data.episodes
                    .forEach(
                        function (
                            episode
                        ) {
                            var button =
                                $(
                                    '<div class="' +
                                    'av51-episode selector' +
                                    '"></div>'
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
                    '<div class="av51-status">' +
                    'Список доступных серий не найден.' +
                    '</div>'
                );
            }


            root.append(

                '<div class="av51-note">' +

                'V0.5.1: TV-страница больше не получает ' +
                'фокус клавиатуры. ' +

                'Lampa остаётся владельцем пульта и передаёт ' +
                'стрелки и OK странице AnimeVost. ' +

                'Back всегда закрывает TV-режим ' +
                'и возвращает сюда.' +

                '</div>'
            );


            nav.bind();


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
                        selectorList(
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
                        '<div class="av51-title"></div>'
                    )
                    .text(
                        item.title ||
                        'AnimeVost'
                    )
                );


                root.append(
                    '<div class="av51-status">' +
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
                    DETAIL_CACHE[
                        key
                    ]
                ) {
                    render(
                        DETAIL_CACHE[
                            key
                        ]
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


                            DETAIL_CACHE[
                                key
                            ] =
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

                    function (
                        error
                    ) {
                        if (
                            !alive
                        ) {
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
                'AnimeVost V0.5.1 загружен'
            );
        }


        catch (error) {
            console.log(
                'AnimeVost V0.5.1 init error',
                error
            );


            notify(
                'Ошибка запуска AnimeVost V0.5.1'
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
