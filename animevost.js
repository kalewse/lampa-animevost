(function () {
    'use strict';

    var FLAG = 'animevost_plugin_v030_ready';
    var CATALOG = 'animevost_catalog_v030';
    var DETAIL = 'animevost_detail_v030';

    var WORKER =
        'https://animevost-lampa.kalewse69.workers.dev/';

    var ORIGIN =
        'https://animevost.org';

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {}
    }

    function clean(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function absoluteUrl(value) {
        value = clean(value);

        if (!value) return '';

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
                toPath(path || '/')
            );
    }

    function firstMatch(text, expression) {
        var match =
            String(text || '')
                .match(expression);

        return (
            match &&
            match[1]
        )
            ? clean(match[1])
            : '';
    }

    function findContainer(h2) {
        var node = h2;
        var best =
            h2.parentElement || h2;

        var i;

        for (
            i = 0;
            i < 7 && node;
            i++
        ) {
            var text =
                clean(
                    node.textContent || ''
                );

            var titles = 0;

            try {
                titles =
                    node.querySelectorAll(
                        'h2 a[href*="/tip/"]'
                    ).length;
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

            if (titles <= 1) {
                best = node;
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
            toPath(href);

        var links =
            container.querySelectorAll(
                'a[href]'
            );

        var i;

        /*
         * First try:
         * image contained inside
         * the same anime link.
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
                        linked.getAttribute(
                            'data-src'
                        ) ||
                        linked.getAttribute(
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

        /*
         * Fallback:
         * search images in the
         * article block.
         */

        var images =
            container.querySelectorAll(
                'img'
            );

        for (
            i = 0;
            i < images.length;
            i++
        ) {
            var src =
                images[i].getAttribute(
                    'data-src'
                ) ||
                images[i].getAttribute(
                    'src'
                ) ||
                '';

            var alt =
                clean(
                    images[i]
                        .getAttribute(
                            'alt'
                        ) || ''
                );

            var lower =
                src.toLowerCase();

            if (!src) continue;

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
                clean(title);

            path =
                toPath(path);

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

            if (seen[key]) {
                return;
            }

            seen[key] = true;

            result[group].push({
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
                    ) || '';

            var path =
                toPath(href);

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
            parser.parseFromString(
                String(
                    html || ''
                ),
                'text/html'
            );

        var menu =
            parseMenu(doc);

        var headings =
            doc.querySelectorAll(
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
                    anchor.getAttribute(
                        'href'
                    ) || ''
                );

            var title =
                clean(
                    anchor.textContent ||
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

            seen[href] = true;

            var h2;

            if (
                anchor.parentElement &&
                anchor.parentElement
                    .tagName &&
                anchor.parentElement
                    .tagName
                    .toLowerCase() ===
                    'h2'
            ) {
                h2 =
                    anchor.parentElement;
            }
            else {
                h2 =
                    anchor.parentElement;
            }

            var container =
                findContainer(
                    h2 || anchor
                );

            var text =
                clean(
                    container
                        .textContent ||
                    ''
                );

            var year =
                firstMatch(
                    text,
                    /Год выхода:\s*([^Ж]+?)(?=\s+Жанр:|$)/i
                );

            var genre =
                firstMatch(
                    text,
                    /Жанр:\s*(.+?)(?=\s+Тип:|$)/i
                );

            var type =
                firstMatch(
                    text,
                    /Тип:\s*(.+?)(?=\s+Количество серий:|\s+Режисс[её]р:|\s+Рейтинг:|$)/i
                );

            var episodes =
                firstMatch(
                    text,
                    /Количество серий:\s*(.+?)(?=\s+Режисс[её]р:|\s+Рейтинг:|\s+Описание:|$)/i
                );

            var description =
                firstMatch(
                    text,
                    /Описание:\s*(.+?)(?=\s+Смотреть\s|\s+Категории:|$)/i
                );

            items.push({
                title: title,
                href: href,

                poster:
                    findPoster(
                        container,
                        href
                    ),

                year: year,
                genre: genre,
                type: type,
                episodes: episodes,
                description:
                    description
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
                '#animevost-v030-style'
            ).length
        ) {
            return;
        }

        var css =
            '.animevost-v030{' +
                'padding:1.3em 2.2em 3em;' +
            '}' +

            '.animevost-v030__title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'margin:.2em 0 .75em;' +
            '}' +

            '.animevost-v030__nav{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'margin-bottom:1.2em;' +
            '}' +

            '.animevost-v030__navbtn{' +
                'padding:.7em 1.05em;' +
                'margin:0 .55em .55em 0;' +
                'background:rgba(255,255,255,.10);' +
                'border-radius:.45em;' +
                'font-size:1.05em;' +
            '}' +

            '.animevost-v030__navbtn.focus{' +
                'background:#fff;' +
                'color:#111;' +
            '}' +

            '.animevost-v030__status{' +
                'padding:1.2em 0;' +
                'font-size:1.15em;' +
                'opacity:.8;' +
            '}' +

            '.animevost-v030__grid{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'align-items:flex-start;' +
            '}' +

            '.animevost-v030__card{' +
                'width:12.2em;' +
                'margin:0 1.05em 1.3em 0;' +
                'border-radius:.55em;' +
                'padding:.45em;' +
                'background:rgba(255,255,255,.04);' +
            '}' +

            '.animevost-v030__card.focus{' +
                'background:rgba(255,255,255,.18);' +
                'transform:scale(1.025);' +
            '}' +

            '.animevost-v030__poster{' +
                'width:100%;' +
                'height:17.4em;' +
                'border-radius:.4em;' +
                'overflow:hidden;' +
                'background:rgba(255,255,255,.08);' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
            '}' +

            '.animevost-v030__poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
                'display:block;' +
            '}' +

            '.animevost-v030__fallback{' +
                'font-size:1em;' +
                'opacity:.55;' +
                'text-align:center;' +
                'padding:1em;' +
            '}' +

            '.animevost-v030__name{' +
                'font-size:1.03em;' +
                'line-height:1.25;' +
                'margin-top:.6em;' +
                'min-height:2.5em;' +
            '}' +

            '.animevost-v030__meta{' +
                'font-size:.83em;' +
                'line-height:1.3;' +
                'opacity:.62;' +
                'margin-top:.35em;' +
                'min-height:2.1em;' +
            '}' +

            '.animevost-v030-detail{' +
                'padding:1.5em 2.6em 3em;' +
            '}' +

            '.animevost-v030-detail__wrap{' +
                'display:flex;' +
                'align-items:flex-start;' +
            '}' +

            '.animevost-v030-detail__poster{' +
                'width:15em;' +
                'min-width:15em;' +
                'height:21em;' +
                'margin-right:2em;' +
                'overflow:hidden;' +
                'border-radius:.55em;' +
                'background:rgba(255,255,255,.08);' +
            '}' +

            '.animevost-v030-detail__poster img{' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
            '}' +

            '.animevost-v030-detail__body{' +
                'max-width:62em;' +
            '}' +

            '.animevost-v030-detail__title{' +
                'font-size:2em;' +
                'font-weight:600;' +
                'line-height:1.2;' +
                'margin-bottom:.7em;' +
            '}' +

            '.animevost-v030-detail__meta{' +
                'font-size:1.08em;' +
                'line-height:1.55;' +
                'opacity:.78;' +
                'margin-bottom:1em;' +
            '}' +

            '.animevost-v030-detail__description{' +
                'font-size:1.05em;' +
                'line-height:1.55;' +
            '}' +

            '.animevost-v030-detail__note{' +
                'margin-top:1.4em;' +
                'padding:1em 1.2em;' +
                'background:rgba(255,255,255,.08);' +
                'border-radius:.45em;' +
                'opacity:.8;' +
            '}';

        $('head').append(
            '<style id="animevost-v030-style">' +
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
                path || '/',

            av_title:
                title ||
                'AnimeVost',

            page: 1
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
            title: title,

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
     * Basic detail page.
     *
     * Full AnimeVost page +
     * episode list will come
     * in V0.4.
     */

    function DetailComponent(
        object
    ) {
        var scroll =
            new Lampa.Scroll({
                mask: true,
                over: true
            });

        var root =
            $(
                '<div class="' +
                'animevost-v030-detail' +
                '"></div>'
            );

        var item =
            object.av_item || {};

        this.create =
            function () {
                var wrap =
                    $(
                        '<div class="' +
                        'animevost-v030-detail__wrap' +
                        '"></div>'
                    );

                var poster =
                    $(
                        '<div class="' +
                        'animevost-v030-detail__poster' +
                        '"></div>'
                    );

                var body =
                    $(
                        '<div class="' +
                        'animevost-v030-detail__body' +
                        '"></div>'
                    );

                if (item.poster) {
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
                                    'animevost-v030__fallback' +
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
                        'animevost-v030__fallback' +
                        '">' +
                        'AnimeVost' +
                        '</div>'
                    );
                }

                body.append(
                    $(
                        '<div class="' +
                        'animevost-v030-detail__title' +
                        '"></div>'
                    ).text(
                        item.title ||
                        'AnimeVost'
                    )
                );

                var meta = [];

                if (item.year) {
                    meta.push(
                        'Год: ' +
                        item.year
                    );
                }

                if (item.type) {
                    meta.push(
                        'Тип: ' +
                        item.type
                    );
                }

                if (item.episodes) {
                    meta.push(
                        'Серии: ' +
                        item.episodes
                    );
                }

                if (item.genre) {
                    meta.push(
                        'Жанр: ' +
                        item.genre
                    );
                }

                body.append(
                    $(
                        '<div class="' +
                        'animevost-v030-detail__meta' +
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
                        'animevost-v030-detail__description' +
                        '"></div>'
                    ).text(
                        item.description ||
                        'Описание не найдено.'
                    )
                );

                body.append(
                    '<div class="' +
                    'animevost-v030-detail__note' +
                    '">' +
                    'V0.3: каталог работает. ' +
                    'Список серий и просмотр добавим после проверки этой версии.' +
                    '</div>'
                );

                wrap
                    .append(poster)
                    .append(body);

                root.append(
                    wrap
                );

                scroll.append(
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
                                        scroll.render()
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
                                Lampa.Controller
                                    .toggle(
                                        'head'
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
                return scroll.render();
            };

        this.destroy =
            function () {
                scroll.destroy();
                root.remove();
            };
    }

    /*
     * Main catalogue.
     */

    function CatalogComponent(
        object
    ) {
        var network =
            new Lampa.Reguest();

        var scroll =
            new Lampa.Scroll({
                mask: true,
                over: true
            });

        var root =
            $(
                '<div class="' +
                'animevost-v030' +
                '"></div>'
            );

        var last = null;

        var parsedMenu = {
            genres: [],
            types: [],
            years: []
        };

        var self = this;

        var path =
            object.av_path || '/';

        var title =
            object.av_title ||
            'AnimeVost';

        function addNavigation() {
            var nav =
                $(
                    '<div class="' +
                    'animevost-v030__nav' +
                    '"></div>'
                );

            function button(
                label,
                action
            ) {
                var element =
                    $(
                        '<div class="' +
                        'animevost-v030__navbtn selector' +
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

                        scroll.update(
                            element,
                            true
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
                    'animevost-v030__title' +
                    '"></div>'
                ).text(
                    title
                )
            );

            root.append(
                $(
                    '<div class="' +
                    'animevost-v030__status' +
                    '"></div>'
                ).text(
                    text
                )
            );

            scroll.append(
                root
            );

            self.activity
                .loader(false);

            self.start();
        }

        function renderCatalog(
            data
        ) {
            root.empty();

            root.append(
                $(
                    '<div class="' +
                    'animevost-v030__title' +
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
                    'animevost-v030__status' +
                    '">' +
                    'Карточки аниме на этой странице не найдены.' +
                    '</div>'
                );

                scroll.append(
                    root
                );

                self.activity
                    .loader(false);

                self.start();

                return;
            }

            var grid =
                $(
                    '<div class="' +
                    'animevost-v030__grid' +
                    '"></div>'
                );

            data.items.forEach(
                function (item) {
                    var card =
                        $(
                            '<div class="' +
                            'animevost-v030__card selector' +
                            '"></div>'
                        );

                    var poster =
                        $(
                            '<div class="' +
                            'animevost-v030__poster' +
                            '"></div>'
                        );

                    if (item.poster) {
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
                                        'animevost-v030__fallback' +
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
                            'animevost-v030__fallback' +
                            '">' +
                            'AnimeVost' +
                            '</div>'
                        );
                    }

                    var meta = [];

                    if (item.year) {
                        meta.push(
                            item.year
                        );
                    }

                    if (item.type) {
                        meta.push(
                            item.type
                        );
                    }

                    if (item.episodes) {
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
                            'animevost-v030__name' +
                            '"></div>'
                        ).text(
                            item.title
                        )
                    );

                    card.append(
                        $(
                            '<div class="' +
                            'animevost-v030__meta' +
                            '"></div>'
                        ).text(
                            meta.join(
                                ' • '
                            )
                        )
                    );

                    card.on(
                        'hover:focus',
                        function () {
                            last =
                                card[0];

                            scroll.update(
                                card,
                                true
                            );
                        }
                    );

                    card.on(
                        'hover:enter',
                        function () {
                            Lampa.Activity.push({
                                url: '',

                                title:
                                    item.title,

                                component:
                                    DETAIL,

                                av_item:
                                    item,

                                page: 1
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

            scroll.append(
                root
            );

            self.activity
                .loader(false);

            self.start();
        }

        this.create =
            function () {
                self.activity
                    .loader(true);

                root.append(
                    $(
                        '<div class="' +
                        'animevost-v030__title' +
                        '"></div>'
                    ).text(
                        title
                    )
                );

                root.append(
                    '<div class="' +
                    'animevost-v030__status' +
                    '">' +
                    'Загрузка AnimeVost...' +
                    '</div>'
                );

                scroll.append(
                    root
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
                                        html || ''
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
                        var code = '?';

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
                        dataType: 'text'
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
                                        scroll.render()
                                    );

                                Lampa.Controller
                                    .collectionFocus(
                                        last || false,
                                        scroll.render()
                                    );
                            },

                        left:
                            function () {
                                if (
                                    Navigator
                                        .canmove(
                                            'left'
                                        )
                                ) {
                                    Navigator.move(
                                        'left'
                                    );
                                }
                                else {
                                    Lampa.Controller
                                        .toggle(
                                            'menu'
                                        );
                                }
                            },

                        right:
                            function () {
                                if (
                                    Navigator
                                        .canmove(
                                            'right'
                                        )
                                ) {
                                    Navigator.move(
                                        'right'
                                    );
                                }
                            },

                        up:
                            function () {
                                if (
                                    Navigator
                                        .canmove(
                                            'up'
                                        )
                                ) {
                                    Navigator.move(
                                        'up'
                                    );
                                }
                                else {
                                    Lampa.Controller
                                        .toggle(
                                            'head'
                                        );
                                }
                            },

                        down:
                            function () {
                                if (
                                    Navigator
                                        .canmove(
                                            'down'
                                        )
                                ) {
                                    Navigator.move(
                                        'down'
                                    );
                                }
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
                return scroll.render();
            };

        this.destroy =
            function () {
                network.clear();
                scroll.destroy();
                root.remove();
            };
    }

    function addMenuButton() {
        var button =
            $(
                '<li class="' +
                'menu__item selector' +
                '" data-action="' +
                'animevost_v030' +
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
        if (window[FLAG]) {
            return;
        }

        window[FLAG] = true;

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
                'AnimeVost V0.3 загружен'
            );
        }
        catch (error) {
            console.log(
                'AnimeVost V0.3 init error',
                error
            );

            notify(
                'Ошибка запуска AnimeVost V0.3'
            );
        }
    }

    if (window.appready) {
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
