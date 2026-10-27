(function () {
    'use strict';

    var NS = 'animevost_v041';
    var FLAG = NS + '_ready';
    var COMPONENT_CATALOG = NS + '_catalog';
    var COMPONENT_DETAIL = NS + '_detail';
    var PLAYER_CONTROLLER = NS + '_player';

    var WORKER =
        'https://animevost-lampa.kalewse69.workers.dev/';

    var ORIGIN =
        'https://animevost.org';

    var DETAIL_CACHE = {};
    var currentPlayerOverlay = null;


    /* ============================================================
       BASIC HELPERS
       ============================================================ */

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        }
        catch (e) {}
    }


    function clean(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }


    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(
                max,
                value
            )
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

        return isNaN(number)
            ? fallback
            : number;
    }


    function decodeEntities(text) {
        var area =
            document.createElement(
                'textarea'
            );

        area.innerHTML =
            String(
                text || ''
            );

        return area.value;
    }


    function absoluteUrl(value) {
        value =
            clean(
                decodeEntities(
                    value
                )
            )
            .replace(
                /\\\//g,
                '/'
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
                var anchor =
                    document.createElement(
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
                    path || '/'
                )
            )
        );
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


    function firstMatch(
        text,
        expression
    ) {
        var match =
            String(
                text || ''
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



    /* ============================================================
       POSTER / ARTICLE HELPERS
       ============================================================ */

    function findPosterInContainer(
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


        /*
         * First attempt:
         * poster located inside
         * the anime-page link.
         */

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
                        ) || ''
                ) ===
                wanted
            ) {
                var linked =
                    links[i]
                        .querySelector(
                            'img'
                        );

                if (linked) {
                    var linkedSrc =
                        linked
                            .getAttribute(
                                'data-src'
                            ) ||
                        linked
                            .getAttribute(
                                'src'
                            ) ||
                        '';

                    if (
                        linkedSrc
                    ) {
                        return absoluteUrl(
                            linkedSrc
                        );
                    }
                }
            }
        }


        /*
         * Second attempt:
         * find sensible image
         * within the anime block.
         */

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

            if (!src) {
                continue;
            }

            if (
                lower.indexOf(
                    'mc.yandex'
                ) >= 0
            ) {
                continue;
            }

            if (
                lower.indexOf(
                    'smile'
                ) >= 0
            ) {
                continue;
            }

            if (
                lower.indexOf(
                    'rating'
                ) >= 0
            ) {
                continue;
            }

            if (
                lower.indexOf(
                    'counter'
                ) >= 0
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

            var titleCount =
                0;

            try {
                titleCount =
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
                titleCount <=
                1
            ) {
                return current;
            }


            if (
                titleCount <=
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



    /* ============================================================
       SITE MENU PARSING
       ============================================================ */

    function parseMenu(doc) {
        var result = {
            genres: [],
            types: [],
            years: []
        };

        var seen = {};

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



    /* ============================================================
       PAGINATION
       ============================================================ */

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
        var cleanPath =
            toPath(
                path
            )
            .replace(
                /[?#].*$/,
                ''
            );


        cleanPath =
            cleanPath
                .replace(
                    /\/page\/\d+\/?$/i,
                    '/'
                );


        if (
            cleanPath.charAt(
                cleanPath.length -
                1
            ) !== '/'
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
            page <= 1
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

        var maxPage =
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
                maxPage =
                    Math.max(
                        maxPage,
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
                maxPage,

            previous:
                current > 1
                    ? pagePath(
                        currentPath,
                        current - 1
                    )
                    : '',

            next:
                maxPage >
                current
                    ? pagePath(
                        currentPath,
                        current + 1
                    )
                    : ''
        };
    }



    /* ============================================================
       CATALOG PARSING
       ============================================================ */

    function extractAvailableFromTitle(
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
        var parser =
            new DOMParser();

        var doc =
            parser
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


        var items = [];
        var seen = {};
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
                    findPosterInContainer(
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
                    extractAvailableFromTitle(
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



    /* ============================================================
       EPISODE PARSING
       ============================================================ */

    function parseEpisodes(
        doc,
        fallbackItem,
        episodeText
    ) {
        var episodes = [];
        var seen = {};

        var candidates =
            doc
                .querySelectorAll(
                    'a,button,option,li,span,div,' +
                    '[data-episode],' +
                    '[data-series],' +
                    '[data-seria]'
                );

        var i;


        function add(
            number,
            label
        ) {
            number =
                safeInt(
                    number,
                    0
                );


            if (
                number <= 0 ||
                number >
                2000 ||
                seen[number]
            ) {
                return;
            }


            seen[number] =
                true;


            episodes.push({
                number:
                    number,

                title:
                    clean(
                        label
                    ) ||
                    (
                        number +
                        ' серия'
                    )
            });
        }


        for (
            i = 0;
            i < candidates.length;
            i++
        ) {
            var element =
                candidates[i];

            var label =
                textOf(
                    element
                );


            var match =
                label.match(
                    /^(\d{1,4})\s*(?:серия|серии|эпизод|episode)\s*$/i
                );


            var number =
                0;


            if (match) {
                number =
                    safeInt(
                        match[1],
                        0
                    );
            }


            else {
                var attr =
                    element
                        .getAttribute(
                            'data-episode'
                        ) ||
                    element
                        .getAttribute(
                            'data-series'
                        ) ||
                    element
                        .getAttribute(
                            'data-seria'
                        ) ||
                    '';


                if (
                    /^\d{1,4}$/
                        .test(
                            clean(
                                attr
                            )
                        )
                ) {
                    number =
                        safeInt(
                            attr,
                            0
                        );

                    label =
                        number +
                        ' серия';
                }
            }


            if (number) {
                add(
                    number,
                    label
                );
            }
        }


        episodes.sort(
            function (
                a,
                b
            ) {
                return (
                    a.number -
                    b.number
                );
            }
        );


        if (
            episodes.length
        ) {
            return episodes;
        }


        /*
         * Fallback:
         * build episode buttons
         * from text such as 1-13.
         */

        var maxEpisode =
            0;

        var text =
            clean(
                episodeText ||
                ''
            );


        var rangeExpression =
            /\b1\s*-\s*(\d{1,4})\b/g;

        var rangeMatch;


        while (
            (
                rangeMatch =
                    rangeExpression.exec(
                        text
                    )
            )
        ) {
            maxEpisode =
                Math.max(
                    maxEpisode,
                    safeInt(
                        rangeMatch[1],
                        0
                    )
                );
        }


        if (
            !maxEpisode &&
            fallbackItem &&
            fallbackItem
                .availableEpisodes
        ) {
            maxEpisode =
                safeInt(
                    fallbackItem
                        .availableEpisodes,
                    0
                );
        }


        if (!maxEpisode) {
            var direct =
                text.match(
                    /\b(\d{1,4})\+?\b/
                );

            if (direct) {
                maxEpisode =
                    safeInt(
                        direct[1],
                        0
                    );
            }
        }


        maxEpisode =
            clamp(
                maxEpisode,
                0,
                500
            );


        for (
            i = 1;
            i <= maxEpisode;
            i++
        ) {
            add(
                i,
                i +
                ' серия'
            );
        }


        return episodes;
    }



    /* ============================================================
       ANIMEVOST PLAYER DETECTION
       ============================================================ */

    function scorePlayerUrl(url) {
        var lower =
            String(
                url ||
                ''
            )
            .toLowerCase();


        if (!lower) {
            return -10000;
        }


        /*
         * Reject obvious adverts.
         */

        if (
            /html5banner|loliland|yandex|doubleclick|googlesyndication|adservice|banner|vk\.com|youtube\.com\/embed/
                .test(
                    lower
                )
        ) {
            return -10000;
        }


        var score =
            0;


        /*
         * Current AnimeVost player.
         */

        if (
            /frame5\.php/
                .test(
                    lower
                )
        ) {
            score +=
                1000;
        }


        /*
         * Historical / alternative
         * AnimeVost player host.
         */

        if (
            /play\.aniland\./
                .test(
                    lower
                )
        ) {
            score +=
                800;
        }


        if (
            /player|video|frame/
                .test(
                    lower
                )
        ) {
            score +=
                150;
        }


        if (
            /animevost\.org/
                .test(
                    lower
                )
        ) {
            score +=
                100;
        }


        if (
            /autoplay/
                .test(
                    lower
                )
        ) {
            score +=
                20;
        }


        return score;
    }


    function playerCandidatesFromRawHtml(
        html
    ) {
        var candidates = [];
        var seen = {};

        var source =
            String(
                html ||
                ''
            );


        var patterns = [
            /["']([^"']*frame5\.php[^"']*)["']/ig,
            /["']([^"']*play\.aniland\.[^"']*)["']/ig
        ];


        var patternIndex;


        for (
            patternIndex = 0;
            patternIndex <
            patterns.length;
            patternIndex++
        ) {
            var match;


            while (
                (
                    match =
                        patterns[
                            patternIndex
                        ]
                        .exec(
                            source
                        )
                )
            ) {
                var raw =
                    clean(
                        match[1]
                    )
                    .replace(
                        /\\\//g,
                        '/'
                    );


                var url =
                    absoluteUrl(
                        raw
                    );


                if (
                    url &&
                    !seen[url]
                ) {
                    seen[url] =
                        true;

                    candidates.push(
                        url
                    );
                }
            }
        }


        return candidates;
    }


    function extractPlayerUrl(
        doc,
        rawHtml
    ) {
        var candidates = [];
        var seen = {};

        var iframes =
            doc
                .querySelectorAll(
                    'iframe[src]'
                );

        var i;


        function add(value) {
            var url =
                absoluteUrl(
                    value
                );


            if (
                !url ||
                seen[url]
            ) {
                return;
            }


            seen[url] =
                true;


            candidates.push(
                url
            );
        }


        /*
         * Actual iframe tags.
         */

        for (
            i = 0;
            i < iframes.length;
            i++
        ) {
            add(
                iframes[i]
                    .getAttribute(
                        'src'
                    ) ||
                ''
            );
        }


        /*
         * Also inspect raw source.
         * Some sites construct the
         * iframe with JavaScript.
         */

        var rawCandidates =
            playerCandidatesFromRawHtml(
                rawHtml
            );


        for (
            i = 0;
            i <
            rawCandidates.length;
            i++
        ) {
            add(
                rawCandidates[i]
            );
        }


        candidates.sort(
            function (
                a,
                b
            ) {
                return (
                    scorePlayerUrl(
                        b
                    ) -
                    scorePlayerUrl(
                        a
                    )
                );
            }
        );


        if (
            !candidates.length ||
            scorePlayerUrl(
                candidates[0]
            ) <= 0
        ) {
            return '';
        }


        return candidates[0];
    }



    /*
     * We ONLY replace an episode
     * number when the player URL
     * already exposes an episode
     * parameter.
     *
     * We don't invent undocumented
     * parameters.
     */

    function applyEpisodeToPlayerUrl(
        url,
        episode
    ) {
        if (
            !url ||
            !episode
        ) {
            return url;
        }


        var keys = [
            'episode',
            'ep',
            'series',
            'seria',
            'serie'
        ];


        var result =
            url;

        var i;


        for (
            i = 0;
            i < keys.length;
            i++
        ) {
            var expression =
                new RegExp(
                    '([?&]' +
                    keys[i] +
                    '=)\\d+',
                    'i'
                );


            if (
                expression.test(
                    result
                )
            ) {
                return result
                    .replace(
                        expression,
                        '$1' +
                        episode
                    );
            }
        }


        return result;
    }



    /* ============================================================
       DETAIL PAGE PARSING
       ============================================================ */

    function parseDetail(
        html,
        fallbackItem
    ) {
        var parser =
            new DOMParser();

        var rawHtml =
            String(
                html ||
                ''
            );


        var doc =
            parser
                .parseFromString(
                    rawHtml,
                    'text/html'
                );


        var bodyText =
            textOf(
                doc.body
            );


        var pagePath =
            fallbackItem &&
            fallbackItem.href
                ? fallbackItem.href
                : '/';


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


        var poster =
            fallbackItem &&
            fallbackItem.poster
                ? fallbackItem.poster
                : '';


        if (!poster) {
            try {
                poster =
                    findPosterInContainer(
                        doc.body,
                        pagePath
                    );
            }
            catch (e) {}
        }


        var originalTitle =
            firstMatch(
                bodyText,
                /(?:Оригинальное название|Оригинал(?:ьное название)?|Английское название):\s*(.+?)(?=\s+(?:Год выхода|Год|Жанр|Тип|Количество серий|Режисс[её]р|Длительность|Рейтинг|Описание):|$)/i
            );


        var year =
            firstMatch(
                bodyText,
                /(?:Год выхода|Год):\s*([^Ж]+?)(?=\s+Жанр:|$)/i
            );


        var genre =
            firstMatch(
                bodyText,
                /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
            );


        var type =
            firstMatch(
                bodyText,
                /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|$)/i
            );


        var episodeText =
            firstMatch(
                bodyText,
                /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Длительность:|\s+Рейтинг:|\s+Описание:|$)/i
            );


        var director =
            firstMatch(
                bodyText,
                /Режисс[её]р:\s*(.+?)(?=\s+(?:Длительность|Рейтинг|Описание|Категории):|$)/i
            );


        var duration =
            firstMatch(
                bodyText,
                /(?:Длительность|Продолжительность):\s*(.+?)(?=\s+(?:Рейтинг|Описание|Категории):|$)/i
            );


        var description =
            firstMatch(
                bodyText,
                /Описание:\s*(.+?)(?=\s+(?:Теги:|Категории:|Правила для комментаторов|Комментарии)|$)/i
            );


        var rating =
            firstMatch(
                bodyText,
                /Рейтинг:\s*([0-9]+(?:[\.,][0-9]+)?)/i
            )
            .replace(
                ',',
                '.'
            );


        /*
         * Fall back to catalogue
         * metadata where needed.
         */

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
                pagePath,

            poster:
                poster,

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

            rating:
                rating,

            description:
                description,

            episodes:
                parseEpisodes(
                    doc,
                    fallbackItem,
                    episodeText
                ),

            playerUrl:
                extractPlayerUrl(
                    doc,
                    rawHtml
                )
        };
    }



    /* ============================================================
       CSS
       ============================================================ */

    function injectStyle() {
        if (
            $(
                '#animevost-v041-style'
            ).length
        ) {
            return;
        }


        var css =

            '.av41-viewport{' +
                'height:calc(100vh - 6.2em);' +
                'overflow-y:auto;' +
                'overflow-x:hidden;' +
                'box-sizing:border-box;' +
                '-webkit-overflow-scrolling:touch;' +
            '}' +

            '.av41-viewport::-webkit-scrollbar{' +
                'width:0;' +
                'height:0;' +
            '}' +

            '.av41-page{' +
                'padding:1.3em 2.2em 5em;' +
                'box-sizing:border-box;' +
            '}' +

            '.av41-title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'margin:.2em 0 .75em;' +
                'line-height:1.15;' +
            '}' +

            '.av41-nav,' +
            '.av41-pages,' +
            '.av41-actions,' +
            '.av41-episodes{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.av41-nav{' +
                'margin-bottom:1.2em;' +
            '}' +

            '.av41-navbtn,' +
            '.av41-action,' +
            '.av41-pagebtn,' +
            '.av41-episode{' +
                'padding:.7em 1.05em;' +
                'margin:0 .55em .55em 0;' +
                'background:rgba(255,255,255,.10);' +
                'border-radius:.45em;' +
                'font-size:1.05em;' +
                'box-sizing:border-box;' +
            '}' +

            '.av41-navbtn.focus,' +
            '.av41-action.focus,' +
            '.av41-pagebtn.focus,' +
            '.av41-episode.focus{' +
                'background:#fff;' +
                'color:#111;' +
            '}' +

            '.av41-status{' +
                'padding:1.2em 0;' +
                'font-size:1.15em;' +
                'opacity:.8;' +
            '}' +

            '.av41-grid{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.av41-card{' +
                'width:12.2em;' +
                'margin:0 1.05em 1.3em 0;' +
                'border-radius:.55em;' +
                'padding:.45em;' +
                'background:rgba(255,255,255,.04);' +
                'box-sizing:border-box;' +
            '}' +

            '.av41-card.focus{' +
                'background:rgba(255,255,255,.18);' +
                'transform:scale(1.025);' +
            '}' +

            '.av41-poster{' +
                'width:100%;' +
                'height:17.4em;' +
                'border-radius:.4em;' +
                'overflow:hidden;' +
                'background:rgba(255,255,255,.08);' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
            '}' +

            '.av41-poster img,' +
            '.av41-detail-poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
                'display:block;' +
            '}' +

            '.av41-fallback{' +
                'font-size:1em;' +
                'opacity:.55;' +
                'text-align:center;' +
                'padding:1em;' +
            '}' +

            '.av41-name{' +
                'font-size:1.03em;' +
                'line-height:1.25;' +
                'margin-top:.6em;' +
                'min-height:2.5em;' +
            '}' +

            '.av41-meta{' +
                'font-size:.83em;' +
                'line-height:1.3;' +
                'opacity:.62;' +
                'margin-top:.35em;' +
                'min-height:2.1em;' +
            '}' +

            '.av41-pages{' +
                'margin-top:.4em;' +
                'padding-bottom:1em;' +
            '}' +

            '.av41-detail-top{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'margin-bottom:1.4em;' +
            '}' +

            '.av41-detail-poster{' +
                'width:15em;' +
                'min-width:15em;' +
                'height:21em;' +
                'margin-right:2em;' +
                'overflow:hidden;' +
                'border-radius:.55em;' +
                'background:rgba(255,255,255,.08);' +
            '}' +

            '.av41-detail-body{' +
                'max-width:68em;' +
            '}' +

            '.av41-detail-original{' +
                'font-size:1.05em;' +
                'opacity:.65;' +
                'margin-top:-.45em;' +
                'margin-bottom:.9em;' +
            '}' +

            '.av41-detail-meta{' +
                'font-size:1.04em;' +
                'line-height:1.55;' +
                'opacity:.78;' +
                'margin-bottom:1em;' +
            '}' +

            '.av41-detail-description{' +
                'font-size:1.05em;' +
                'line-height:1.55;' +
                'white-space:normal;' +
            '}' +

            '.av41-actions{' +
                'margin:1.25em 0 1.3em;' +
            '}' +

            '.av41-section-title{' +
                'font-size:1.45em;' +
                'font-weight:600;' +
                'margin:1.2em 0 .75em;' +
            '}' +

            '.av41-episode{' +
                'min-width:7.3em;' +
                'text-align:center;' +
            '}' +

            '.av41-episode.selected{' +
                'box-shadow:' +
                'inset 0 0 0 .16em ' +
                'rgba(255,255,255,.65);' +
            '}' +

            '.av41-note{' +
                'margin-top:1.2em;' +
                'padding:1em 1.15em;' +
                'background:rgba(255,255,255,.07);' +
                'border-radius:.45em;' +
                'opacity:.72;' +
                'font-size:.96em;' +
                'line-height:1.45;' +
            '}' +


            /* Player */

            '.av41-player{' +
                'position:fixed;' +
                'left:0;' +
                'top:0;' +
                'right:0;' +
                'bottom:0;' +
                'background:#000;' +
                'z-index:999999;' +
                'display:flex;' +
                'flex-direction:column;' +
            '}' +

            '.av41-player__bar{' +
                'height:3.35em;' +
                'min-height:3.35em;' +
                'background:rgba(15,15,15,.96);' +
                'display:flex;' +
                'align-items:center;' +
                'padding:0 1em;' +
                'box-sizing:border-box;' +
            '}' +

            '.av41-player__title{' +
                'font-size:1.05em;' +
                'white-space:nowrap;' +
                'overflow:hidden;' +
                'text-overflow:ellipsis;' +
                'flex:1;' +
                'padding-right:1em;' +
            '}' +

            '.av41-player__close{' +
                'padding:.55em .8em;' +
                'border-radius:.35em;' +
                'background:rgba(255,255,255,.12);' +
            '}' +

            '.av41-player__close.focus{' +
                'background:#fff;' +
                'color:#111;' +
            '}' +

            '.av41-player iframe{' +
                'width:100%;' +
                'height:calc(100% - 3.35em);' +
                'border:0;' +
                'background:#000;' +
                'display:block;' +
            '}' +

            '.av41-player__hint{' +
                'position:absolute;' +
                'left:1em;' +
                'bottom:1em;' +
                'background:rgba(0,0,0,.72);' +
                'padding:.55em .8em;' +
                'border-radius:.35em;' +
                'font-size:.85em;' +
                'pointer-events:none;' +
            '}';


        $('head').append(
            '<style id="animevost-v041-style">' +
                css +
            '</style>'
        );
    }



    /* ============================================================
       GENERIC UI HELPERS
       ============================================================ */

    function createPosterBox(
        className,
        posterUrl
    ) {
        var box =
            $(
                '<div class="' +
                    className +
                '"></div>'
            );


        if (posterUrl) {
            var image =
                $('<img alt="">')
                    .attr(
                        'src',
                        posterUrl
                    );


            image.on(
                'error',
                function () {
                    box
                        .empty()
                        .append(
                            '<div class="av41-fallback">' +
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
                '<div class="av41-fallback">' +
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


        var topPadding =
            22;

        var bottomPadding =
            40;


        if (
            elementRect.bottom >
            viewportRect.bottom -
            bottomPadding
        ) {
            container.scrollTop +=
                elementRect.bottom -
                (
                    viewportRect.bottom -
                    bottomPadding
                );
        }


        else if (
            elementRect.top <
            viewportRect.top +
            topPadding
        ) {
            container.scrollTop -=
                (
                    viewportRect.top +
                    topPadding
                ) -
                elementRect.top;
        }
    }


    function visibleSelectors(root) {
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


    function groupRows(elements) {
        var rows =
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


            var rect =
                element
                    .getBoundingClientRect();


            var top =
                rect.top;


            var found =
                null;

            var rowIndex;


            for (
                rowIndex = 0;
                rowIndex <
                rows.length;
                rowIndex++
            ) {
                if (
                    Math.abs(
                        rows[rowIndex]
                            .top -
                        top
                    ) <=
                    tolerance
                ) {
                    found =
                        rows[rowIndex];

                    break;
                }
            }


            if (!found) {
                found = {
                    top:
                        top,

                    items:
                        []
                };


                rows.push(
                    found
                );
            }


            found.items.push(
                element
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


        for (
            i = 0;
            i < rows.length;
            i++
        ) {
            rows[i]
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


        return rows;
    }


    function nearestByCenter(
        items,
        current
    ) {
        if (
            !items ||
            !items.length ||
            !current
        ) {
            return (
                items &&
                items.length
            )
                ? items[0]
                : null;
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
            i < items.length;
            i++
        ) {
            var rect =
                items[i]
                    .getBoundingClientRect();


            var center =
                rect.left +
                rect.width /
                2;


            var distance =
                Math.abs(
                    center -
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


    function createNavigation(
        root,
        viewport,
        onEdgeLeft,
        onEdgeUp
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


            var selectors =
                visibleSelectors(
                    root
                );


            return selectors.length
                ? selectors[0]
                : null;
        }


        function focus(element) {
            if (!element) {
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


        function move(direction) {
            var selectors =
                visibleSelectors(
                    root
                );


            var currentElement =
                current();


            if (
                !selectors.length ||
                !currentElement
            ) {
                return false;
            }


            var rows =
                groupRows(
                    selectors
                );


            var rowIndex =
                -1;

            var columnIndex =
                -1;


            var r;
            var c;


            for (
                r = 0;
                r < rows.length;
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
                    selectors[0]
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
                        rows[rowIndex]
                            .items[
                                columnIndex -
                                1
                            ]
                    );
                }


                if (
                    typeof onEdgeLeft ===
                    'function'
                ) {
                    onEdgeLeft();
                }


                return false;
            }


            if (
                direction ===
                'right'
            ) {
                if (
                    columnIndex <
                    rows[rowIndex]
                        .items
                        .length -
                    1
                ) {
                    return focus(
                        rows[rowIndex]
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
                        nearestByCenter(
                            rows[
                                rowIndex -
                                1
                            ].items,
                            currentElement
                        )
                    );
                }


                if (
                    typeof onEdgeUp ===
                    'function'
                ) {
                    onEdgeUp();
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
                        nearestByCenter(
                            rows[
                                rowIndex +
                                1
                            ].items,
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
                },

            setLast:
                function (value) {
                    last =
                        value;
                }
        };
    }



    /* ============================================================
       FULLSCREEN EMBEDDED PLAYER
       ============================================================ */

    function closeEmbeddedPlayer() {
        if (
            !currentPlayerOverlay
        ) {
            return;
        }


        try {
            currentPlayerOverlay
                .remove();
        }
        catch (e) {}


        currentPlayerOverlay =
            null;


        try {
            Lampa.Controller
                .toggle(
                    'content'
                );
        }
        catch (e2) {}
    }


    function openEmbeddedPlayer(
        title,
        playerUrl,
        episode
    ) {
        closeEmbeddedPlayer();


        if (!playerUrl) {
            notify(
                'AnimeVost: встроенный плеер не найден на странице.'
            );

            return;
        }


        var finalUrl =
            applyEpisodeToPlayerUrl(
                playerUrl,
                episode
            );


        var overlay =
            $(
                '<div class="av41-player"></div>'
            );


        var bar =
            $(
                '<div class="av41-player__bar"></div>'
            );


        var label =
            $(
                '<div class="av41-player__title"></div>'
            )
            .text(
                title +
                (
                    episode
                        ? ' • серия ' +
                          episode
                        : ''
                )
            );


        var closeButton =
            $(
                '<div class="av41-player__close selector">' +
                    '✕ Закрыть' +
                '</div>'
            );


        var iframe =
            $(
                '<iframe ' +
                    'tabindex="0" ' +
                    'allow="autoplay; fullscreen; picture-in-picture" ' +
                    'allowfullscreen>' +
                '</iframe>'
            );


        var hint =
            $(
                '<div class="av41-player__hint">' +
                    'OK/стрелка — управление плеером • Back — выход' +
                '</div>'
            );


        iframe.attr(
            'src',
            finalUrl
        );


        bar
            .append(
                label
            )
            .append(
                closeButton
            );


        overlay
            .append(
                bar
            )
            .append(
                iframe
            )
            .append(
                hint
            );


        $('body')
            .append(
                overlay
            );


        currentPlayerOverlay =
            overlay;


        /*
         * Important:
         *
         * Focus is moved into
         * the iframe so future
         * remote key events have
         * a chance to be handled
         * by AnimeVost's player.
         */

        function focusFrame() {
            try {
                iframe[0]
                    .focus();
            }
            catch (e) {}


            try {
                if (
                    iframe[0]
                        .contentWindow
                ) {
                    iframe[0]
                        .contentWindow
                        .focus();
                }
            }
            catch (e2) {}
        }


        closeButton.on(
            'hover:enter click',
            closeEmbeddedPlayer
        );


        iframe.on(
            'load',

            function () {
                setTimeout(
                    focusFrame,
                    120
                );


                setTimeout(
                    function () {
                        try {
                            hint.fadeOut(
                                300
                            );
                        }
                        catch (e) {
                            hint.hide();
                        }
                    },
                    3500
                );
            }
        );


        /*
         * Controller intentionally
         * does NOT navigate player
         * controls itself.
         *
         * It only moves focus to
         * the iframe and provides
         * a Back fallback.
         */

        Lampa.Controller.add(
            PLAYER_CONTROLLER,

            {
                toggle:
                    function () {
                        Lampa.Controller
                            .collectionSet(
                                overlay
                            );

                        focusFrame();
                    },


                left:
                    focusFrame,


                right:
                    focusFrame,


                up:
                    focusFrame,


                down:
                    focusFrame,


                ok:
                    focusFrame,


                back:
                    closeEmbeddedPlayer
            }
        );


        Lampa.Controller
            .toggle(
                PLAYER_CONTROLLER
            );


        setTimeout(
            focusFrame,
            80
        );
    }



    /* ============================================================
       OPEN COMPONENT HELPERS
       ============================================================ */

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
                COMPONENT_CATALOG,

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
                COMPONENT_DETAIL,

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



    /* ============================================================
       CATALOG COMPONENT
       ============================================================ */

    function CatalogComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();


        var alive =
            false;


        var viewport =
            $(
                '<div class="av41-viewport"></div>'
            );


        var root =
            $(
                '<div class="av41-page"></div>'
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


        function addTopNavigation() {
            var bar =
                $(
                    '<div class="av41-nav"></div>'
                );


            function add(
                label,
                handler
            ) {
                var button =
                    $(
                        '<div class="av41-navbtn selector"></div>'
                    )
                    .text(
                        label
                    );


                button.on(
                    'hover:enter',
                    handler
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
                    '<div class="av41-card selector"></div>'
                );


            card.append(
                createPosterBox(
                    'av41-poster',
                    item.poster
                )
            );


            card.append(
                $(
                    '<div class="av41-name"></div>'
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
                    '<div class="av41-meta"></div>'
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
            paging
        ) {
            if (
                !paging ||
                (
                    !paging.previous &&
                    !paging.next
                )
            ) {
                return;
            }


            var pages =
                $(
                    '<div class="av41-pages"></div>'
                );


            if (
                paging.previous
            ) {
                var previous =
                    $(
                        '<div class="av41-pagebtn selector"></div>'
                    )
                    .text(
                        '← Страница ' +
                        (
                            paging.current -
                            1
                        )
                    );


                previous.on(
                    'hover:enter',

                    function () {
                        openCatalog(
                            paging.previous,
                            title
                        );
                    }
                );


                pages.append(
                    previous
                );
            }


            pages.append(
                $(
                    '<div class="av41-pagebtn"></div>'
                )
                .text(
                    'Страница ' +
                    paging.current +
                    (
                        paging.max >
                        1
                            ? ' / ' +
                              paging.max
                            : ''
                    )
                )
            );


            if (
                paging.next
            ) {
                var next =
                    $(
                        '<div class="av41-pagebtn selector"></div>'
                    )
                    .text(
                        'Страница ' +
                        (
                            paging.current +
                            1
                        ) +
                        ' →'
                    );


                next.on(
                    'hover:enter',

                    function () {
                        openCatalog(
                            paging.next,
                            title
                        );
                    }
                );


                pages.append(
                    next
                );
            }


            root.append(
                pages
            );
        }


        function renderError(
            message
        ) {
            if (!alive) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av41-title"></div>'
                )
                .text(
                    title
                )
            );


            root.append(
                $(
                    '<div class="av41-status"></div>'
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


        function renderCatalog(
            data
        ) {
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
                    '<div class="av41-title"></div>'
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
                    '<div class="av41-status">' +
                        'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );
            }


            else {
                var grid =
                    $(
                        '<div class="av41-grid"></div>'
                    );


                data.items.forEach(
                    function (item) {
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
                    if (!alive) {
                        return;
                    }


                    var selectors =
                        visibleSelectors(
                            root
                        );


                    if (
                        selectors.length
                    ) {
                        nav.focus(
                            selectors[0]
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
                        '<div class="av41-title"></div>'
                    )
                    .text(
                        title
                    )
                );


                root.append(
                    '<div class="av41-status">' +
                        'Загрузка AnimeVost...' +
                    '</div>'
                );


                this.activity
                    .loader(
                        true
                    );


                nav =
                    createNavigation(
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
                            renderCatalog(
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



    /* ============================================================
       DETAIL COMPONENT
       ============================================================ */

    function DetailComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();


        var alive =
            false;


        var viewport =
            $(
                '<div class="av41-viewport"></div>'
            );


        var root =
            $(
                '<div class="av41-page"></div>'
            );


        var item =
            object.av_item ||
            {};


        var self =
            this;


        var nav;


        var selectedEpisode =
            0;


        var detail =
            null;


        function updateEpisodeSelection() {
            root
                .find(
                    '.av41-episode'
                )
                .each(
                    function () {
                        var element =
                            $(
                                this
                            );


                        var number =
                            safeInt(
                                element.attr(
                                    'data-episode'
                                ),
                                0
                            );


                        element
                            .toggleClass(
                                'selected',
                                number ===
                                selectedEpisode
                            );
                    }
                );
        }


        function renderError(
            message
        ) {
            if (!alive) {
                return;
            }


            root.empty();


            root.append(
                $(
                    '<div class="av41-title"></div>'
                )
                .text(
                    item.title ||
                    'AnimeVost'
                )
            );


            root.append(
                $(
                    '<div class="av41-status"></div>'
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


        function renderDetail(data) {
            if (!alive) {
                return;
            }


            detail =
                data;


            root.empty();


            viewport[0]
                .scrollTop =
                0;


            var top =
                $(
                    '<div class="av41-detail-top"></div>'
                );


            top.append(
                createPosterBox(
                    'av41-detail-poster',
                    data.poster
                )
            );


            var body =
                $(
                    '<div class="av41-detail-body"></div>'
                );


            body.append(
                $(
                    '<div class="av41-title"></div>'
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
                        '<div class="av41-detail-original"></div>'
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
                data.rating
            ) {
                meta.push(
                    'Рейтинг: ' +
                    data.rating
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
                    '<div class="av41-detail-meta"></div>'
                )
                .text(
                    meta.join(
                        ' • '
                    )
                )
            );


            body.append(
                $(
                    '<div class="av41-detail-description"></div>'
                )
                .text(
                    data.description ||
                    'Описание не найдено.'
                )
            );


            /*
             * Main player button.
             */

            var actions =
                $(
                    '<div class="av41-actions"></div>'
                );


            var watch =
                $(
                    '<div class="av41-action selector">' +
                        '▶ Смотреть' +
                    '</div>'
                );


            watch.on(
                'hover:enter',

                function () {
                    if (
                        !data.playerUrl
                    ) {
                        notify(
                            'AnimeVost: ссылка встроенного плеера не найдена.'
                        );

                        return;
                    }


                    openEmbeddedPlayer(
                        data.title ||
                        item.title ||
                        'AnimeVost',

                        data.playerUrl,

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
                '<div class="av41-section-title">' +
                    'Серии' +
                '</div>'
            );


            if (
                data.episodes &&
                data.episodes.length
            ) {
                var episodeGrid =
                    $(
                        '<div class="av41-episodes"></div>'
                    );


                data.episodes.forEach(
                    function (episode) {
                        var button =
                            $(
                                '<div class="av41-episode selector"></div>'
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


                                updateEpisodeSelection();


                                notify(
                                    'Выбрана серия ' +
                                    episode.number
                                );
                            }
                        );


                        episodeGrid.append(
                            button
                        );
                    }
                );


                root.append(
                    episodeGrid
                );
            }


            else {
                root.append(
                    '<div class="av41-status">' +
                        'Список серий на странице не найден.' +
                    '</div>'
                );
            }


            root.append(
                '<div class="av41-note">' +

                    (
                        data.playerUrl

                            ? (
                                'Найден встроенный плеер AnimeVost. ' +
                                'Выберите серию и нажмите «Смотреть». ' +
                                'Если URL плеера содержит параметр серии, ' +
                                'плагин подставит выбранный номер автоматически; ' +
                                'иначе выбор серии остаётся внутри самого плеера.'
                            )

                            : (
                                'В HTML страницы не найден надёжный адрес ' +
                                'встроенного плеера. Каталог и список серий ' +
                                'продолжают работать.'
                            )
                    ) +

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


                    var selectors =
                        visibleSelectors(
                            root
                        );


                    if (
                        selectors.length
                    ) {
                        nav.focus(
                            selectors[0]
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
                        '<div class="av41-title"></div>'
                    )
                    .text(
                        item.title ||
                        'AnimeVost'
                    )
                );


                root.append(
                    '<div class="av41-status">' +
                        'Загрузка страницы аниме...' +
                    '</div>'
                );


                this.activity
                    .loader(
                        true
                    );


                nav =
                    createNavigation(
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


                /*
                 * Session cache.
                 */

                if (
                    DETAIL_CACHE[key]
                ) {
                    renderDetail(
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
                            var parsed =
                                parseDetail(
                                    String(
                                        html ||
                                        ''
                                    ),
                                    item
                                );


                            DETAIL_CACHE[key] =
                                parsed;


                            renderDetail(
                                parsed
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


                viewport.remove();


                root.remove();
            };
    }



    /* ============================================================
       SIDE MENU
       ============================================================ */

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



    /* ============================================================
       INITIALISE PLUGIN
       ============================================================ */

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


            if (
                !Lampa.Component
                    .get(
                        COMPONENT_CATALOG
                    )
            ) {
                Lampa.Component
                    .add(
                        COMPONENT_CATALOG,
                        CatalogComponent
                    );
            }


            if (
                !Lampa.Component
                    .get(
                        COMPONENT_DETAIL
                    )
            ) {
                Lampa.Component
                    .add(
                        COMPONENT_DETAIL,
                        DetailComponent
                    );
            }


            addMenuButton();


            notify(
                'AnimeVost V0.4.1 загружен'
            );
        }


        catch (error) {
            console.log(
                'AnimeVost V0.4.1 init error',
                error
            );


            notify(
                'Ошибка запуска AnimeVost V0.4.1'
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
