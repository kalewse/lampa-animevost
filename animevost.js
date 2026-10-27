(function () {
    'use strict';

    var NS = 'animevost_v040';
    var FLAG = NS + '_ready';
    var COMPONENT_CATALOG = NS + '_catalog';
    var COMPONENT_DETAIL = NS + '_detail';

    var WORKER = 'https://animevost-lampa.kalewse69.workers.dev/';
    var ORIGIN = 'https://animevost.org';

    var DETAIL_CACHE = {};

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {}
    }

    function clean(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function absoluteUrl(value) {
        value = clean(value);

        if (!value) return '';
        if (/^https?:\/\//i.test(value)) return value;
        if (value.indexOf('//') === 0) return 'https:' + value;
        if (value.charAt(0) !== '/') value = '/' + value;

        return ORIGIN + value;
    }

    function toPath(value) {
        value = clean(value);

        if (!value) return '/';

        try {
            if (/^https?:\/\//i.test(value)) {
                var a = document.createElement('a');

                a.href = value;

                return (
                    a.pathname || '/'
                ) + (
                    a.search || ''
                );
            }
        }
        catch (e) {}

        return value.charAt(0) === '/'
            ? value
            : '/' + value;
    }

    function workerUrl(path) {
        return WORKER +
            '?path=' +
            encodeURIComponent(
                toPath(
                    path || '/'
                )
            );
    }

    function sameAnimeUrl(path) {
        path = toPath(path);

        return /^\/tip\/[^/]+\/[^?#]+\.html(?:\?.*)?$/i
            .test(path);
    }

    function firstMatch(
        text,
        expression
    ) {
        var match =
            String(
                text || ''
            ).match(
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

        var i;

        var links =
            container
                .querySelectorAll(
                    'a[href]'
                );

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
                ) === wanted
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

                    if (linkedSrc) {
                        return absoluteUrl(
                            linkedSrc
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
                    .test(src)
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
            i < 8 && current;
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
                titleCount <= 1
            ) {
                return current;
            }

            if (
                titleCount <= 1
            ) {
                best =
                    current;
            }

            current =
                current.parentElement;
        }

        return best || node;
    }

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
                    .test(path)
            ) {
                add(
                    'types',
                    title,
                    path
                );
            }
        }

        result.years.sort(
            function (a, b) {
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
            ).match(
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
            );

        cleanPath =
            cleanPath
                .replace(
                    /\/page\/\d+\/?$/i,
                    '/'
                );

        if (
            cleanPath.charAt(
                cleanPath.length - 1
            ) !== '/'
        ) {
            cleanPath += '/';
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

        if (
            page <= 1
        ) {
            return base;
        }

        return (
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

            var m =
                href.match(
                    /\/page\/(\d+)\/?/i
                );

            if (m) {
                maxPage =
                    Math.max(
                        maxPage,
                        safeInt(
                            m[1],
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
                maxPage > current
                    ? pagePath(
                        currentPath,
                        current + 1
                    )
                    : ''
        };
    }

    function extractAvailableFromTitle(
        title
    ) {
        title =
            clean(
                title
            );

        var best =
            0;

        var re =
            /\[?\s*1\s*-\s*(\d{1,4})\s*(?:из\s*\d+\+?)?/ig;

        var match;

        while (
            (
                match =
                    re.exec(
                        title
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
                        html || ''
                    ),
                    'text/html'
                );

        var menu =
            parseMenu(
                doc
            );

        var paging =
            parsePaging(
                doc,
                currentPath
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
                )
            ) {
                continue;
            }

            if (
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
                menu,

            paging:
                paging
        };
    }

    function isUsefulEpisodeHref(
        value,
        pagePath
    ) {
        value =
            clean(
                value
            );

        if (!value) {
            return '';
        }

        if (
            /^javascript:/i
                .test(value)
        ) {
            return '';
        }

        if (
            value === '#'
        ) {
            return '';
        }

        var path =
            toPath(
                value
            );

        var current =
            toPath(
                pagePath
            );

        if (
            path === current
        ) {
            return '';
        }

        return absoluteUrl(
            value
        );
    }

    function parseEpisodes(
        doc,
        pagePath,
        fallbackItem,
        episodeText
    ) {
        var episodes = [];
        var seen = {};

        var candidates =
            doc
                .querySelectorAll(
                    'a,button,option,li,span,div,[data-episode],[data-series],[data-seria]'
                );

        var i;

        function add(
            number,
            label,
            url
        ) {
            number =
                safeInt(
                    number,
                    0
                );

            if (
                number <= 0 ||
                number > 2000
            ) {
                return;
            }

            if (
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
                    ),

                href:
                    url ||
                    ''
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

            if (!number) {
                continue;
            }

            var href =
                element
                    .getAttribute(
                        'href'
                    ) ||
                element
                    .getAttribute(
                        'data-href'
                    ) ||
                element
                    .getAttribute(
                        'data-url'
                    ) ||
                '';

            add(
                number,
                label,
                isUsefulEpisodeHref(
                    href,
                    pagePath
                )
            );
        }

        episodes.sort(
            function (a, b) {
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

        var maxEpisode =
            0;

        var text =
            clean(
                episodeText ||
                ''
            );

        var rangeRe =
            /\b1\s*-\s*(\d{1,4})\b/g;

        var rangeMatch;

        while (
            (
                rangeMatch =
                    rangeRe.exec(
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
            fallbackItem.availableEpisodes
        ) {
            maxEpisode =
                safeInt(
                    fallbackItem
                        .availableEpisodes,
                    0
                );
        }

        if (
            !maxEpisode
        ) {
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
                i + ' серия',
                ''
            );
        }

        return episodes;
    }

    function parseDetail(
        html,
        fallbackItem
    ) {
        var parser =
            new DOMParser();

        var doc =
            parser
                .parseFromString(
                    String(
                        html || ''
                    ),
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
                    fallbackItem.title
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

        var rating =
            firstMatch(
                bodyText,
                /Рейтинг:\s*([0-9]+(?:[\.,][0-9]+)?)/i
            );

        rating =
            rating.replace(
                ',',
                '.'
            );

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
                    pagePath,
                    fallbackItem,
                    episodeText
                )
        };
    }

    function openSitePage(url) {
        url =
            absoluteUrl(
                url ||
                '/'
            );

        if (
            url.indexOf(
                ORIGIN
            ) !== 0
        ) {
            notify(
                'AnimeVost: недопустимая ссылка'
            );

            return;
        }

        try {
            var popup =
                window.open(
                    url,
                    '_blank'
                );

            if (popup) {
                return;
            }
        }
        catch (e) {}

        try {
            window.location.href =
                url;
        }
        catch (e2) {
            notify(
                'Не удалось открыть AnimeVost'
            );
        }
    }

    function injectStyle() {
        if (
            $(
                '#animevost-v040-style'
            ).length
        ) {
            return;
        }

        var css =

            '.av40-viewport{' +
                'height:calc(100vh - 6.2em);' +
                'overflow-y:auto;' +
                'overflow-x:hidden;' +
                'box-sizing:border-box;' +
                '-webkit-overflow-scrolling:touch;' +
            '}' +

            '.av40-viewport::-webkit-scrollbar{' +
                'width:0;' +
                'height:0;' +
            '}' +

            '.av40-page{' +
                'padding:1.3em 2.2em 5em;' +
                'box-sizing:border-box;' +
            '}' +

            '.av40-title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'margin:.2em 0 .75em;' +
                'line-height:1.15;' +
            '}' +

            '.av40-nav{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'margin-bottom:1.2em;' +
            '}' +

            '.av40-navbtn,' +
            '.av40-action,' +
            '.av40-pagebtn{' +
                'padding:.7em 1.05em;' +
                'margin:0 .55em .55em 0;' +
                'background:rgba(255,255,255,.10);' +
                'border-radius:.45em;' +
                'font-size:1.05em;' +
            '}' +

            '.av40-navbtn.focus,' +
            '.av40-action.focus,' +
            '.av40-pagebtn.focus,' +
            '.av40-episode.focus{' +
                'background:#fff;' +
                'color:#111;' +
            '}' +

            '.av40-status{' +
                'padding:1.2em 0;' +
                'font-size:1.15em;' +
                'opacity:.8;' +
            '}' +

            '.av40-grid{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.av40-card{' +
                'width:12.2em;' +
                'margin:0 1.05em 1.3em 0;' +
                'border-radius:.55em;' +
                'padding:.45em;' +
                'background:rgba(255,255,255,.04);' +
                'box-sizing:border-box;' +
            '}' +

            '.av40-card.focus{' +
                'background:rgba(255,255,255,.18);' +
                'transform:scale(1.025);' +
            '}' +

            '.av40-poster{' +
                'width:100%;' +
                'height:17.4em;' +
                'border-radius:.4em;' +
                'overflow:hidden;' +
                'background:rgba(255,255,255,.08);' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
            '}' +

            '.av40-poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
                'display:block;' +
            '}' +

            '.av40-fallback{' +
                'font-size:1em;' +
                'opacity:.55;' +
                'text-align:center;' +
                'padding:1em;' +
            '}' +

            '.av40-name{' +
                'font-size:1.03em;' +
                'line-height:1.25;' +
                'margin-top:.6em;' +
                'min-height:2.5em;' +
            '}' +

            '.av40-meta{' +
                'font-size:.83em;' +
                'line-height:1.3;' +
                'opacity:.62;' +
                'margin-top:.35em;' +
                'min-height:2.1em;' +
            '}' +

            '.av40-pages{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'margin-top:.4em;' +
                'padding-bottom:1em;' +
            '}' +

            '.av40-detail-top{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'margin-bottom:1.4em;' +
            '}' +

            '.av40-detail-poster{' +
                'width:15em;' +
                'min-width:15em;' +
                'height:21em;' +
                'margin-right:2em;' +
                'overflow:hidden;' +
                'border-radius:.55em;' +
                'background:rgba(255,255,255,.08);' +
            '}' +

            '.av40-detail-poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
            '}' +

            '.av40-detail-body{' +
                'max-width:68em;' +
            '}' +

            '.av40-detail-original{' +
                'font-size:1.05em;' +
                'opacity:.65;' +
                'margin-top:-.45em;' +
                'margin-bottom:.9em;' +
            '}' +

            '.av40-detail-meta{' +
                'font-size:1.04em;' +
                'line-height:1.55;' +
                'opacity:.78;' +
                'margin-bottom:1em;' +
            '}' +

            '.av40-detail-description{' +
                'font-size:1.05em;' +
                'line-height:1.55;' +
                'white-space:normal;' +
            '}' +

            '.av40-actions{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'margin:1.25em 0 1.3em;' +
            '}' +

            '.av40-section-title{' +
                'font-size:1.45em;' +
                'font-weight:600;' +
                'margin:1.2em 0 .75em;' +
            '}' +

            '.av40-episodes{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.av40-episode{' +
                'min-width:7.3em;' +
                'text-align:center;' +
                'padding:.72em .85em;' +
                'margin:0 .55em .55em 0;' +
                'background:rgba(255,255,255,.09);' +
                'border-radius:.42em;' +
                'box-sizing:border-box;' +
            '}' +

            '.av40-episode.selected{' +
                'box-shadow:' +
                'inset 0 0 0 .16em ' +
                'rgba(255,255,255,.65);' +
            '}' +

            '.av40-note{' +
                'margin-top:1.2em;' +
                'padding:1em 1.15em;' +
                'background:rgba(255,255,255,.07);' +
                'border-radius:.45em;' +
                'opacity:.72;' +
                'font-size:.96em;' +
                'line-height:1.45;' +
            '}';

        $('head').append(
            '<style id="animevost-v040-style">' +
                css +
            '</style>'
        );
    }

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
            var img =
                $('<img alt="">')
                    .attr(
                        'src',
                        posterUrl
                    );

            img.on(
                'error',
                function () {
                    box
                        .empty()
                        .append(
                            '<div class="av40-fallback">' +
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
                '<div class="av40-fallback">' +
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

        var topPad =
            22;

        var bottomPad =
            40;

        if (
            er.bottom >
            vr.bottom -
            bottomPad
        ) {
            vp.scrollTop +=
                er.bottom -
                (
                    vr.bottom -
                    bottomPad
                );
        }

        else if (
            er.top <
            vr.top +
            topPad
        ) {
            vp.scrollTop -=
                (
                    vr.top +
                    topPad
                ) -
                er.top;
        }
    }

    function visibleSelectors(
        root
    ) {
        var result = [];

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
        var rows = [];
        var tolerance = 10;
        var i;

        for (
            i = 0;
            i < elements.length;
            i++
        ) {
            var el =
                elements[i];

            var rect =
                el
                    .getBoundingClientRect();

            var top =
                rect.top;

            var found =
                null;

            var r;

            for (
                r = 0;
                r < rows.length;
                r++
            ) {
                if (
                    Math.abs(
                        rows[r].top -
                        top
                    ) <= tolerance
                ) {
                    found =
                        rows[r];

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
                el
            );
        }

        rows.sort(
            function (a, b) {
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
                    function (a, b) {
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

        var cr =
            current
                .getBoundingClientRect();

        var cx =
            cr.left +
            cr.width /
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
            var ir =
                items[i]
                    .getBoundingClientRect();

            var ix =
                ir.left +
                ir.width /
                2;

            var distance =
                Math.abs(
                    ix -
                    cx
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

        function focus(
            element
        ) {
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

        function move(
            direction
        ) {
            var selectors =
                visibleSelectors(
                    root
                );

            var cur =
                current();

            if (
                !selectors.length ||
                !cur
            ) {
                return false;
            }

            var rows =
                groupRows(
                    selectors
                );

            var rowIndex =
                -1;

            var colIndex =
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
                    selectors[0]
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
                        rows[rowIndex]
                            .items[
                                colIndex -
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
                    colIndex <
                    rows[rowIndex]
                        .items
                        .length -
                    1
                ) {
                    return focus(
                        rows[rowIndex]
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
                        nearestByCenter(
                            rows[
                                rowIndex -
                                1
                            ].items,
                            cur
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
                            cur
                        )
                    );
                }

                return false;
            }

            return false;
        }

        function bindFocusTracking() {
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

            current:
                current,

            bind:
                bindFocusTracking,

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

    function openDetail(
        item
    ) {
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

    function CatalogComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();

        var alive =
            false;

        var viewport =
            $(
                '<div class="av40-viewport"></div>'
            );

        var root =
            $(
                '<div class="av40-page"></div>'
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

        function renderLoading() {
            root.empty();

            viewport[0]
                .scrollTop =
                0;

            root.append(
                $(
                    '<div class="av40-title"></div>'
                ).text(
                    title
                )
            );

            root.append(
                '<div class="av40-status">' +
                    'Загрузка AnimeVost...' +
                '</div>'
            );
        }

        function addTopNavigation() {
            var bar =
                $(
                    '<div class="av40-nav"></div>'
                );

            function add(
                label,
                handler
            ) {
                var button =
                    $(
                        '<div class="av40-navbtn selector"></div>'
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
                    '<div class="av40-card selector"></div>'
                );

            card.append(
                createPosterBox(
                    'av40-poster',
                    item.poster
                )
            );

            card.append(
                $(
                    '<div class="av40-name"></div>'
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
                    '<div class="av40-meta"></div>'
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
                    '<div class="av40-pages"></div>'
                );

            if (
                paging.previous
            ) {
                var prev =
                    $(
                        '<div class="av40-pagebtn selector"></div>'
                    )
                    .text(
                        '← Страница ' +
                        (
                            paging.current -
                            1
                        )
                    );

                prev.on(
                    'hover:enter',

                    function () {
                        openCatalog(
                            paging.previous,
                            title
                        );
                    }
                );

                pages.append(
                    prev
                );
            }

            var current =
                $(
                    '<div class="av40-pagebtn"></div>'
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
                );

            pages.append(
                current
            );

            if (
                paging.next
            ) {
                var next =
                    $(
                        '<div class="av40-pagebtn selector"></div>'
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
                    '<div class="av40-title"></div>'
                )
                .text(
                    title
                )
            );

            root.append(
                $(
                    '<div class="av40-status"></div>'
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
                    '<div class="av40-title"></div>'
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
                    '<div class="av40-status">' +
                        'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );
            }

            else {
                var grid =
                    $(
                        '<div class="av40-grid"></div>'
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

                renderLoading();

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

    function DetailComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();

        var alive =
            false;

        var viewport =
            $(
                '<div class="av40-viewport"></div>'
            );

        var root =
            $(
                '<div class="av40-page"></div>'
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

        function renderLoading() {
            root.empty();

            viewport[0]
                .scrollTop =
                0;

            root.append(
                $(
                    '<div class="av40-title"></div>'
                )
                .text(
                    item.title ||
                    'AnimeVost'
                )
            );

            root.append(
                '<div class="av40-status">' +
                    'Загрузка страницы аниме...' +
                '</div>'
            );
        }

        function watchTarget() {
            if (!detail) {
                return absoluteUrl(
                    item.href ||
                    '/'
                );
            }

            if (
                selectedEpisode >
                0
            ) {
                var i;

                for (
                    i = 0;
                    i <
                    detail.episodes.length;
                    i++
                ) {
                    if (
                        detail
                            .episodes[i]
                            .number ===
                            selectedEpisode &&
                        detail
                            .episodes[i]
                            .href
                    ) {
                        return detail
                            .episodes[i]
                            .href;
                    }
                }
            }

            return absoluteUrl(
                detail.href ||
                item.href ||
                '/'
            );
        }

        function updateEpisodeSelection() {
            root
                .find(
                    '.av40-episode'
                )
                .each(
                    function () {
                        var el =
                            $(
                                this
                            );

                        var number =
                            safeInt(
                                el.attr(
                                    'data-episode'
                                ),
                                0
                            );

                        el.toggleClass(
                            'selected',
                            number ===
                            selectedEpisode
                        );
                    }
                );
        }

        function renderDetail(
            data
        ) {
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
                    '<div class="av40-detail-top"></div>'
                );

            top.append(
                createPosterBox(
                    'av40-detail-poster',
                    data.poster
                )
            );

            var body =
                $(
                    '<div class="av40-detail-body"></div>'
                );

            body.append(
                $(
                    '<div class="av40-title"></div>'
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
                        '<div class="av40-detail-original"></div>'
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
                    '<div class="av40-detail-meta"></div>'
                )
                .text(
                    meta.join(
                        ' • '
                    )
                )
            );

            body.append(
                $(
                    '<div class="av40-detail-description"></div>'
                )
                .text(
                    data.description ||
                    'Описание не найдено.'
                )
            );

            var actions =
                $(
                    '<div class="av40-actions"></div>'
                );

            var watch =
                $(
                    '<div class="av40-action selector">' +
                        'Смотреть на AnimeVost' +
                    '</div>'
                );

            watch.on(
                'hover:enter',

                function () {
                    openSitePage(
                        watchTarget()
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
                '<div class="av40-section-title">' +
                    'Серии' +
                '</div>'
            );

            if (
                data.episodes &&
                data.episodes.length
            ) {
                var episodeGrid =
                    $(
                        '<div class="av40-episodes"></div>'
                    );

                data.episodes.forEach(
                    function (episode) {
                        var button =
                            $(
                                '<div class="av40-episode selector"></div>'
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
                                    episode.number +
                                    '. Нажмите «Смотреть на AnimeVost».'
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

                root.append(
                    '<div class="av40-note">' +
                        'Список серий берётся из текущей страницы AnimeVost. ' +
                        'Если у серии есть отдельная ссылка, кнопка «Смотреть на AnimeVost» откроет её; ' +
                        'иначе откроется обычная страница тайтла с веб-плеером сайта.' +
                    '</div>'
                );
            }

            else {
                root.append(
                    '<div class="av40-status">' +
                        'Список серий на странице не найден.' +
                    '</div>'
                );
            }

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

        function renderError(
            message
        ) {
            if (!alive) {
                return;
            }

            root.empty();

            root.append(
                $(
                    '<div class="av40-title"></div>'
                )
                .text(
                    item.title ||
                    'AnimeVost'
                )
            );

            root.append(
                $(
                    '<div class="av40-status"></div>'
                )
                .text(
                    message
                )
            );

            var open =
                $(
                    '<div class="av40-action selector">' +
                        'Открыть страницу AnimeVost' +
                    '</div>'
                );

            open.on(
                'hover:enter',

                function () {
                    openSitePage(
                        item.href ||
                        '/'
                    );
                }
            );

            root.append(
                open
            );

            nav.bind();

            self.activity
                .loader(
                    false
                );
        }

        this.create =
            function () {
                alive =
                    true;

                viewport.append(
                    root
                );

                renderLoading();

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

    function addMenuButton() {
        if (
            $(
                '.menu .menu__list [data-action="' +
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
                'AnimeVost V0.4 загружен'
            );
        }

        catch (error) {
            console.log(
                'AnimeVost V0.4 init error',
                error
            );

            notify(
                'Ошибка запуска AnimeVost V0.4'
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
