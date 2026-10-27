(function () {
    'use strict';

    var FLAG = 'animevost_plugin_v032_ready';
    var CATALOG = 'animevost_catalog_v032';
    var DETAIL = 'animevost_detail_v032';

    var WORKER =
        'https://animevost-lampa.kalewse69.workers.dev/';

    var ORIGIN =
        'https://animevost.org';

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        }
        catch (e) {}
    }

    function clean(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function absoluteUrl(value) {
        value = clean(value);

        if (!value) {
            return '';
        }

        if (/^https?:\/\//i.test(value)) {
            return value;
        }

        if (value.indexOf('//') === 0) {
            return 'https:' + value;
        }

        if (value.charAt(0) !== '/') {
            value = '/' + value;
        }

        return ORIGIN + value;
    }

    function toPath(value) {
        value = clean(value);

        if (!value) {
            return '/';
        }

        try {
            if (/^https?:\/\//i.test(value)) {
                var a =
                    document.createElement('a');

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

    function findContainer(h2) {
        var node =
            h2;

        var best =
            h2.parentElement ||
            h2;

        var i;

        for (
            i = 0;
            i < 7 && node;
            i++
        ) {
            var text =
                clean(
                    node.textContent ||
                    ''
                );

            var titles =
                0;

            try {
                titles =
                    node
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
                text.indexOf(
                    'Описание:'
                ) >= 0 &&
                titles <= 1
            ) {
                return node;
            }

            if (
                titles <= 1
            ) {
                best =
                    node;
            }

            node =
                node.parentElement;
        }

        return best;
    }

    function findPoster(
        container,
        href
    ) {
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
                        )
                ) === wanted
            ) {
                var linked =
                    links[i]
                        .querySelector(
                            'img'
                        );

                if (linked) {
                    var source =
                        linked
                            .getAttribute(
                                'data-src'
                            ) ||
                        linked
                            .getAttribute(
                                'src'
                            ) ||
                        '';

                    if (source) {
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
                alt ||
                /uploads|poster|story/i
                    .test(src)
            ) {
                return absoluteUrl(
                    src
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

        var seen = {};

        var anchors =
            doc.querySelectorAll(
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
                .push({
                    title: title,
                    path: path
                });
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
                    parseInt(
                        b.title,
                        10
                    ) -
                    parseInt(
                        a.title,
                        10
                    )
                );
            }
        );

        return result;
    }

    function parseItems(html) {
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
                !href ||
                !/\/tip\/[^/]+\/[^?#]+\.html/i
                    .test(href)
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
                findContainer(
                    anchor.parentElement ||
                    anchor
                );

            var text =
                clean(
                    container
                        .textContent ||
                    ''
                );

            items.push({
                title: title,

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
                    )
            });
        }

        return {
            items: items,
            menu: menu
        };
    }

    function injectStyle() {
        if (
            $(
                '#animevost-v032-style'
            ).length
        ) {
            return;
        }

        var css =

            '.animevost-v032-viewport{' +
                'height:calc(100vh - 6.2em);' +
                'overflow-y:auto;' +
                'overflow-x:hidden;' +
                'box-sizing:border-box;' +
                '-webkit-overflow-scrolling:touch;' +
            '}' +

            '.animevost-v032-viewport::-webkit-scrollbar{' +
                'width:0;' +
                'height:0;' +
            '}' +

            '.animevost-v032{' +
                'padding:1.3em 2.2em 5em;' +
                'box-sizing:border-box;' +
            '}' +

            '.animevost-v032__title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'margin:.2em 0 .75em;' +
            '}' +

            '.animevost-v032__nav{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'margin-bottom:1.2em;' +
            '}' +

            '.animevost-v032__navbtn{' +
                'padding:.7em 1.05em;' +
                'margin:0 .55em .55em 0;' +
                'background:rgba(255,255,255,.10);' +
                'border-radius:.45em;' +
                'font-size:1.05em;' +
            '}' +

            '.animevost-v032__navbtn.focus{' +
                'background:#fff;' +
                'color:#111;' +
            '}' +

            '.animevost-v032__status{' +
                'padding:1.2em 0;' +
                'font-size:1.15em;' +
                'opacity:.8;' +
            '}' +

            '.animevost-v032__grid{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.animevost-v032__card{' +
                'width:12.2em;' +
                'margin:0 1.05em 1.3em 0;' +
                'border-radius:.55em;' +
                'padding:.45em;' +
                'background:rgba(255,255,255,.04);' +
                'box-sizing:border-box;' +
            '}' +

            '.animevost-v032__card.focus{' +
                'background:rgba(255,255,255,.18);' +
                'transform:scale(1.025);' +
            '}' +

            '.animevost-v032__poster{' +
                'width:100%;' +
                'height:17.4em;' +
                'border-radius:.4em;' +
                'overflow:hidden;' +
                'background:rgba(255,255,255,.08);' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
            '}' +

            '.animevost-v032__poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
                'display:block;' +
            '}' +

            '.animevost-v032__fallback{' +
                'font-size:1em;' +
                'opacity:.55;' +
                'text-align:center;' +
                'padding:1em;' +
            '}' +

            '.animevost-v032__name{' +
                'font-size:1.03em;' +
                'line-height:1.25;' +
                'margin-top:.6em;' +
                'min-height:2.5em;' +
            '}' +

            '.animevost-v032__meta{' +
                'font-size:.83em;' +
                'line-height:1.3;' +
                'opacity:.62;' +
                'margin-top:.35em;' +
                'min-height:2.1em;' +
            '}' +

            '.animevost-v032-detail-viewport{' +
                'height:calc(100vh - 6.2em);' +
                'overflow-y:auto;' +
                'overflow-x:hidden;' +
                'box-sizing:border-box;' +
            '}' +

            '.animevost-v032-detail-viewport::-webkit-scrollbar{' +
                'width:0;' +
                'height:0;' +
            '}' +

            '.animevost-v032-detail{' +
                'padding:1.5em 2.6em 5em;' +
            '}' +

            '.animevost-v032-detail__wrap{' +
                'display:flex;' +
                'align-items:flex-start;' +
            '}' +

            '.animevost-v032-detail__poster{' +
                'width:15em;' +
                'min-width:15em;' +
                'height:21em;' +
                'margin-right:2em;' +
                'overflow:hidden;' +
                'border-radius:.55em;' +
                'background:rgba(255,255,255,.08);' +
            '}' +

            '.animevost-v032-detail__poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
            '}' +

            '.animevost-v032-detail__body{' +
                'max-width:62em;' +
            '}' +

            '.animevost-v032-detail__title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'line-height:1.2;' +
                'margin-bottom:.7em;' +
            '}' +

            '.animevost-v032-detail__meta{' +
                'font-size:1.08em;' +
                'line-height:1.55;' +
                'opacity:.78;' +
                'margin-bottom:1em;' +
            '}' +

            '.animevost-v032-detail__description{' +
                'font-size:1.05em;' +
                'line-height:1.55;' +
            '}' +

            '.animevost-v032-detail__note{' +
                'margin-top:1.4em;' +
                'padding:1em 1.2em;' +
                'background:rgba(255,255,255,.08);' +
                'border-radius:.45em;' +
                'opacity:.8;' +
            '}';

        $('head').append(
            '<style id="animevost-v032-style">' +
                css +
            '</style>'
        );
    }

    function openCatalog(
        path,
        title
    ) {
        Lampa.Activity.push({
            url: '',

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

    /*
     * Detail page
     */

    function DetailComponent(
        object
    ) {
        var viewport =
            $(
                '<div class="' +
                'animevost-v032-detail-viewport' +
                '"></div>'
            );

        var root =
            $(
                '<div class="' +
                'animevost-v032-detail' +
                '"></div>'
            );

        var item =
            object.av_item ||
            {};

        this.create =
            function () {

                var wrap =
                    $(
                        '<div class="' +
                        'animevost-v032-detail__wrap' +
                        '"></div>'
                    );

                var poster =
                    $(
                        '<div class="' +
                        'animevost-v032-detail__poster' +
                        '"></div>'
                    );

                var body =
                    $(
                        '<div class="' +
                        'animevost-v032-detail__body' +
                        '"></div>'
                    );

                if (
                    item.poster
                ) {
                    var image =
                        $('<img alt="">')
                            .attr(
                                'src',
                                item.poster
                            );

                    image.on(
                        'error',
                        function () {
                            poster
                                .empty()
                                .append(
                                    '<div class="' +
                                    'animevost-v032__fallback' +
                                    '">' +
                                    'AnimeVost' +
                                    '</div>'
                                );
                        }
                    );

                    poster.append(
                        image
                    );
                }

                else {
                    poster.append(
                        '<div class="' +
                        'animevost-v032__fallback' +
                        '">' +
                        'AnimeVost' +
                        '</div>'
                    );
                }

                body.append(
                    $(
                        '<div class="' +
                        'animevost-v032-detail__title' +
                        '"></div>'
                    ).text(
                        item.title ||
                        'AnimeVost'
                    )
                );

                var meta = [];

                if (
                    item.year
                ) {
                    meta.push(
                        'Год: ' +
                        item.year
                    );
                }

                if (
                    item.type
                ) {
                    meta.push(
                        'Тип: ' +
                        item.type
                    );
                }

                if (
                    item.episodes
                ) {
                    meta.push(
                        'Серии: ' +
                        item.episodes
                    );
                }

                if (
                    item.genre
                ) {
                    meta.push(
                        'Жанр: ' +
                        item.genre
                    );
                }

                body.append(
                    $(
                        '<div class="' +
                        'animevost-v032-detail__meta' +
                        '"></div>'
                    ).text(
                        meta.join(
                            '  •  '
                        )
                    )
                );

                body.append(
                    $(
                        '<div class="' +
                        'animevost-v032-detail__description' +
                        '"></div>'
                    ).text(
                        item.description ||
                        'Описание не найдено.'
                    )
                );

                body.append(
                    '<div class="' +
                    'animevost-v032-detail__note' +
                    '">' +
                    'V0.3.2: каталог использует собственную вертикальную прокрутку. ' +
                    'Серии добавим после проверки навигации.' +
                    '</div>'
                );

                wrap
                    .append(
                        poster
                    )
                    .append(
                        body
                    );

                root.append(
                    wrap
                );

                viewport.append(
                    root
                );

                return this.render();
            };

        this.start =
            function () {

                Lampa.Controller.add(
                    'content',

                    {
                        toggle:
                            function () {
                                Lampa.Controller
                                    .collectionSet(
                                        viewport
                                    );
                            },

                        left:
                            function () {
                                Lampa.Controller
                                    .toggle(
                                        'menu'
                                    );
                            },

                        up:
                            function () {
                                viewport[0]
                                    .scrollTop =
                                    Math.max(
                                        0,
                                        viewport[0]
                                            .scrollTop -
                                            260
                                    );
                            },

                        down:
                            function () {
                                viewport[0]
                                    .scrollTop +=
                                    260;
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
                viewport.remove();
                root.remove();
            };
    }

    /*
     * Catalogue
     */

    function CatalogComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();

        /*
         * Important change:
         *
         * This is now a REAL
         * vertically scrollable
         * browser container.
         */

        var viewport =
            $(
                '<div class="' +
                'animevost-v032-viewport' +
                '"></div>'
            );

        var root =
            $(
                '<div class="' +
                'animevost-v032' +
                '"></div>'
            );

        var last =
            null;

        var parsedMenu = {
            genres: [],
            types: [],
            years: []
        };

        var self =
            this;

        var path =
            object.av_path ||
            '/';

        var title =
            object.av_title ||
            'AnimeVost';

        function getCards() {
            return root
                .find(
                    '.animevost-v032__card'
                )
                .toArray();
        }

        function getNavButtons() {
            return root
                .find(
                    '.animevost-v032__navbtn'
                )
                .toArray();
        }

        function getCurrent() {

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

            var nav =
                getNavButtons();

            if (
                nav.length
            ) {
                return nav[0];
            }

            var cards =
                getCards();

            return cards.length
                ? cards[0]
                : null;
        }

        /*
         * This actually scrolls
         * the catalogue viewport.
         */

        function ensureVisible(
            element
        ) {
            if (
                !element ||
                !viewport[0]
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
                38;

            /*
             * Focused row is below
             * visible TV area.
             */

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

            /*
             * Focused row is above
             * visible TV area.
             */

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

        function focusElement(
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
            catch (e) {}

            ensureVisible(
                element
            );

            return true;
        }

        /*
         * Count actual columns
         * in first rendered row.
         *
         * On your TV this should
         * return 6.
         */

        function cardColumns() {
            var cards =
                getCards();

            if (
                !cards.length
            ) {
                return 0;
            }

            if (
                cards.length === 1
            ) {
                return 1;
            }

            var firstTop =
                cards[0]
                    .offsetTop;

            var count =
                1;

            var i;

            for (
                i = 1;
                i < cards.length;
                i++
            ) {
                if (
                    Math.abs(
                        cards[i]
                            .offsetTop -
                        firstTop
                    ) <= 8
                ) {
                    count++;
                }

                else {
                    break;
                }
            }

            return Math.max(
                1,
                count
            );
        }

        /*
         * When pressing Up from
         * the first anime row,
         * find the menu button
         * above that card.
         */

        function closestNavToCard(
            card
        ) {
            var nav =
                getNavButtons();

            if (
                !nav.length ||
                !card
            ) {
                return null;
            }

            var cr =
                card
                    .getBoundingClientRect();

            var cx =
                cr.left +
                cr.width / 2;

            var best =
                nav[0];

            var bestDistance =
                Infinity;

            var i;

            for (
                i = 0;
                i < nav.length;
                i++
            ) {
                var nr =
                    nav[i]
                        .getBoundingClientRect();

                var nx =
                    nr.left +
                    nr.width / 2;

                var distance =
                    Math.abs(
                        nx -
                        cx
                    );

                if (
                    distance <
                    bestDistance
                ) {
                    bestDistance =
                        distance;

                    best =
                        nav[i];
                }
            }

            return best;
        }

        /*
         * Explicit row / column
         * navigation.
         */

        function move(
            direction
        ) {
            var current =
                getCurrent();

            if (
                !current
            ) {
                return false;
            }

            var isNav =
                $(
                    current
                ).hasClass(
                    'animevost-v032__navbtn'
                );

            var isCard =
                $(
                    current
                ).hasClass(
                    'animevost-v032__card'
                );

            var nav =
                getNavButtons();

            var cards =
                getCards();

            var target =
                null;

            var index;
            var columns;

            /*
             * Top menu navigation
             */

            if (
                isNav
            ) {
                index =
                    nav.indexOf(
                        current
                    );

                if (
                    direction ===
                    'left' &&
                    index > 0
                ) {
                    target =
                        nav[
                            index - 1
                        ];
                }

                else if (
                    direction ===
                    'right' &&
                    index >= 0 &&
                    index <
                    nav.length - 1
                ) {
                    target =
                        nav[
                            index + 1
                        ];
                }

                /*
                 * Down from top menu
                 * finds the closest
                 * card horizontally.
                 */

                else if (
                    direction ===
                    'down' &&
                    cards.length
                ) {
                    var nr =
                        current
                            .getBoundingClientRect();

                    var nx =
                        nr.left +
                        nr.width / 2;

                    var bestDistance =
                        Infinity;

                    var i;

                    for (
                        i = 0;
                        i <
                        Math.min(
                            cardColumns(),
                            cards.length
                        );
                        i++
                    ) {
                        var cr =
                            cards[i]
                                .getBoundingClientRect();

                        var cx =
                            cr.left +
                            cr.width / 2;

                        var d =
                            Math.abs(
                                cx -
                                nx
                            );

                        if (
                            d <
                            bestDistance
                        ) {
                            bestDistance =
                                d;

                            target =
                                cards[i];
                        }
                    }
                }
            }

            /*
             * Anime card navigation
             */

            if (
                isCard
            ) {
                index =
                    cards.indexOf(
                        current
                    );

                columns =
                    cardColumns();

                if (
                    index < 0 ||
                    !columns
                ) {
                    return false;
                }

                var row =
                    Math.floor(
                        index /
                        columns
                    );

                var col =
                    index %
                    columns;

                /*
                 * SAME ROW LEFT
                 */

                if (
                    direction ===
                    'left' &&
                    col > 0
                ) {
                    target =
                        cards[
                            index - 1
                        ];
                }

                /*
                 * SAME ROW RIGHT
                 */

                else if (
                    direction ===
                    'right' &&
                    col <
                    columns - 1 &&
                    index + 1 <
                    cards.length
                ) {
                    target =
                        cards[
                            index + 1
                        ];
                }

                /*
                 * EXACT SAME COLUMN
                 * ON NEXT ROW
                 */

                else if (
                    direction ===
                    'down'
                ) {
                    var downIndex =
                        index +
                        columns;

                    if (
                        downIndex <
                        cards.length
                    ) {
                        target =
                            cards[
                                downIndex
                            ];
                    }
                }

                /*
                 * EXACT SAME COLUMN
                 * ON PREVIOUS ROW
                 */

                else if (
                    direction ===
                    'up'
                ) {
                    if (
                        row > 0
                    ) {
                        var upIndex =
                            index -
                            columns;

                        if (
                            upIndex >= 0
                        ) {
                            target =
                                cards[
                                    upIndex
                                ];
                        }
                    }

                    else {
                        target =
                            closestNavToCard(
                                current
                            );
                    }
                }
            }

            return target
                ? focusElement(
                    target
                )
                : false;
        }

        function addNavigation() {

            var nav =
                $(
                    '<div class="' +
                    'animevost-v032__nav' +
                    '"></div>'
                );

            function button(
                label,
                action
            ) {
                var element =
                    $(
                        '<div class="' +
                        'animevost-v032__navbtn selector' +
                        '"></div>'
                    ).text(
                        label
                    );

                element.on(
                    'hover:enter',
                    action
                );

                element.on(
                    'hover:focus',
                    function () {
                        last =
                            element[0];

                        ensureVisible(
                            element[0]
                        );
                    }
                );

                nav.append(
                    element
                );
            }

            button(
                'Главная',
                function () {
                    openCatalog(
                        '/',
                        'Главная'
                    );
                }
            );

            button(
                'Жанр',
                function () {
                    showSelect(
                        'Жанр',
                        parsedMenu.genres
                    );
                }
            );

            button(
                'Категории',
                function () {
                    showSelect(
                        'Категории',
                        parsedMenu.types
                    );
                }
            );

            button(
                'Год',
                function () {
                    showSelect(
                        'Год',
                        parsedMenu.years
                    );
                }
            );

            button(
                'Онгоинги',
                function () {
                    openCatalog(
                        '/ongoing/',
                        'Онгоинги'
                    );
                }
            );

            button(
                'Анонсы',
                function () {
                    openCatalog(
                        '/preview/',
                        'Анонсы'
                    );
                }
            );

            root.append(
                nav
            );
        }

        function renderError(
            text
        ) {
            root.empty();

            root.append(
                $(
                    '<div class="' +
                    'animevost-v032__title' +
                    '"></div>'
                ).text(
                    title
                )
            );

            root.append(
                $(
                    '<div class="' +
                    'animevost-v032__status' +
                    '"></div>'
                ).text(
                    text
                )
            );

            self.activity
                .loader(
                    false
                );

            self.start();
        }

        function renderCatalog(
            data
        ) {
            root.empty();

            last =
                null;

            /*
             * Reset catalogue back
             * to top whenever a new
             * section is opened.
             */

            viewport[0]
                .scrollTop =
                0;

            root.append(
                $(
                    '<div class="' +
                    'animevost-v032__title' +
                    '"></div>'
                ).text(
                    title
                )
            );

            addNavigation();

            if (
                !data.items.length
            ) {
                root.append(
                    '<div class="' +
                    'animevost-v032__status' +
                    '">' +
                    'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );

                self.activity
                    .loader(
                        false
                    );

                self.start();

                return;
            }

            var grid =
                $(
                    '<div class="' +
                    'animevost-v032__grid' +
                    '"></div>'
                );

            data.items.forEach(
                function (item) {

                    var card =
                        $(
                            '<div class="' +
                            'animevost-v032__card selector' +
                            '"></div>'
                        );

                    var poster =
                        $(
                            '<div class="' +
                            'animevost-v032__poster' +
                            '"></div>'
                        );

                    if (
                        item.poster
                    ) {
                        var image =
                            $('<img alt="">')
                                .attr(
                                    'src',
                                    item.poster
                                );

                        image.on(
                            'error',
                            function () {
                                poster
                                    .empty()
                                    .append(
                                        '<div class="' +
                                        'animevost-v032__fallback' +
                                        '">' +
                                        'AnimeVost' +
                                        '</div>'
                                    );
                            }
                        );

                        poster.append(
                            image
                        );
                    }

                    else {
                        poster.append(
                            '<div class="' +
                            'animevost-v032__fallback' +
                            '">' +
                            'AnimeVost' +
                            '</div>'
                        );
                    }

                    var meta = [];

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
                        poster
                    );

                    card.append(
                        $(
                            '<div class="' +
                            'animevost-v032__name' +
                            '"></div>'
                        ).text(
                            item.title
                        )
                    );

                    card.append(
                        $(
                            '<div class="' +
                            'animevost-v032__meta' +
                            '"></div>'
                        ).text(
                            meta.join(
                                ' • '
                            )
                        )
                    );

                    /*
                     * Whenever a card
                     * receives focus,
                     * make absolutely
                     * sure it is visible.
                     */

                    card.on(
                        'hover:focus',
                        function () {
                            last =
                                card[0];

                            ensureVisible(
                                card[0]
                            );
                        }
                    );

                    card.on(
                        'hover:enter',
                        function () {
                            Lampa.Activity.push({
                                url:
                                    '',

                                title:
                                    item.title,

                                component:
                                    DETAIL,

                                av_item:
                                    item,

                                page:
                                    1
                            });
                        }
                    );

                    grid.append(
                        card
                    );
                }
            );

            root.append(
                grid
            );

            self.activity
                .loader(
                    false
                );

            self.start();

            setTimeout(
                function () {

                    var nav =
                        getNavButtons();

                    var cards =
                        getCards();

                    if (
                        nav.length
                    ) {
                        focusElement(
                            nav[0]
                        );
                    }

                    else if (
                        cards.length
                    ) {
                        focusElement(
                            cards[0]
                        );
                    }
                },
                80
            );
        }

        this.create =
            function () {

                self.activity
                    .loader(
                        true
                    );

                viewport.append(
                    root
                );

                root.append(
                    $(
                        '<div class="' +
                        'animevost-v032__title' +
                        '"></div>'
                    ).text(
                        title
                    )
                );

                root.append(
                    '<div class="' +
                    'animevost-v032__status' +
                    '">' +
                    'Загрузка AnimeVost...' +
                    '</div>'
                );

                network.timeout(
                    20000
                );

                network.silent(

                    workerUrl(
                        path
                    ),

                    function (html) {

                        try {
                            var parsed =
                                parseItems(
                                    String(
                                        html ||
                                        ''
                                    )
                                );

                            parsedMenu =
                                parsed.menu;

                            renderCatalog(
                                parsed
                            );
                        }

                        catch (error) {

                            console.log(
                                'AnimeVost parse error',
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
                                        last ||
                                        false,
                                        viewport
                                    );

                                if (
                                    last
                                ) {
                                    ensureVisible(
                                        last
                                    );
                                }
                            },

                        left:
                            function () {

                                if (
                                    !move(
                                        'left'
                                    )
                                ) {
                                    Lampa.Controller
                                        .toggle(
                                            'menu'
                                        );
                                }
                            },

                        right:
                            function () {
                                move(
                                    'right'
                                );
                            },

                        up:
                            function () {

                                if (
                                    !move(
                                        'up'
                                    )
                                ) {
                                    Lampa.Controller
                                        .toggle(
                                            'head'
                                        );
                                }
                            },

                        /*
                         * Down now moves
                         * by exact row and
                         * forces scrolling.
                         */

                        down:
                            function () {
                                move(
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
                network.clear();

                viewport.remove();

                root.remove();
            };
    }

    function addMenuButton() {

        var button =
            $(
                '<li class="' +
                'menu__item selector' +
                '" ' +
                'data-action="' +
                'animevost_v032' +
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
                'AnimeVost V0.3.2 загружен'
            );
        }

        catch (error) {

            console.log(
                'AnimeVost V0.3.2 init error',
                error
            );

            notify(
                'Ошибка запуска AnimeVost V0.3.2'
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
