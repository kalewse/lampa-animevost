(function () {
    'use strict';

    var FLAG = 'animevost_plugin_v022_ready';
    var COMPONENT = 'animevost_debug_v022';
    var BASE_URL = 'https://animevost.org/';

    function notify(text) {
        try {
            if (window.Lampa && Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show(text);
            }
        } catch (e) {}
    }

    function safeString(value) {
        try {
            if (typeof value === 'string') return value;
            if (value === null) return 'null';
            if (typeof value === 'undefined') return 'undefined';

            return JSON.stringify(value);
        }
        catch (e) {
            try {
                return String(value);
            }
            catch (e2) {
                return '[не удалось преобразовать ответ]';
            }
        }
    }

    function detectResponse(text) {
        var lower = (text || '').toLowerCase();
        var result = [];

        if (lower.indexOf('animevost') >= 0) {
            result.push('найдено слово AnimeVost');
        }

        if (
            lower.indexOf('<html') >= 0 ||
            lower.indexOf('<!doctype') >= 0
        ) {
            result.push('похоже на HTML');
        }

        if (
            lower.indexOf('cloudflare') >= 0 ||
            lower.indexOf('just a moment') >= 0
        ) {
            result.push('похоже на Cloudflare');
        }

        if (
            lower.indexOf('ddos') >= 0 ||
            lower.indexOf('checking your browser') >= 0
        ) {
            result.push('похоже на защитную страницу');
        }

        if (
            lower.indexOf('access denied') >= 0 ||
            lower.indexOf('forbidden') >= 0
        ) {
            result.push('возможна блокировка доступа');
        }

        if (!result.length) {
            result.push('тип ответа пока не определён');
        }

        return result.join(', ');
    }

    function DebugComponent(object) {
        var network = new Lampa.Reguest();
        var alive = true;

        var root = $(
            '<div style="' +
                'padding:2.2em 3em;' +
                'max-width:1200px;' +
            '"></div>'
        );

        var title = $(
            '<div style="' +
                'font-size:2.2em;' +
                'font-weight:600;' +
                'margin-bottom:0.7em;' +
            '">' +
                'AnimeVost V0.2.2' +
            '</div>'
        );

        var status = $(
            '<div style="' +
                'font-size:1.25em;' +
                'line-height:1.55;' +
                'margin-bottom:1em;' +
            '"></div>'
        );

        var meta = $(
            '<div style="' +
                'font-size:1.05em;' +
                'line-height:1.5;' +
                'margin-bottom:1em;' +
            '"></div>'
        );

        var previewTitle = $(
            '<div style="' +
                'font-size:1.15em;' +
                'font-weight:600;' +
                'margin:1em 0 0.5em;' +
            '">' +
                'Начало ответа:' +
            '</div>'
        );

        var preview = $(
            '<div style="' +
                'font-size:0.84em;' +
                'line-height:1.35;' +
                'white-space:pre-wrap;' +
                'word-break:break-word;' +
                'background:rgba(255,255,255,0.08);' +
                'padding:1em;' +
                'border-radius:0.35em;' +
                'max-height:19em;' +
                'overflow:hidden;' +
            '"></div>'
        );

        root.append(title);
        root.append(status);
        root.append(meta);
        root.append(previewTitle);
        root.append(preview);

        function renderLoading() {
            status.text('Загрузка AnimeVost...');

            meta.text(
                'Проверяем сырой ответ сайта через Lampa.Reguest.native().'
            );

            preview.text('Ожидание ответа...');
        }

        function renderSuccess(data) {
            if (!alive) return;

            var text = safeString(data);
            var type = typeof data;
            var first = text.substring(0, 1400);

            status.text(
                'Ответ успешно получен.'
            );

            meta.text(
                'Тип: ' + type +
                '   |   Размер: ' +
                text.length +
                ' символов' +
                '   |   Анализ: ' +
                detectResponse(text)
            );

            preview.text(
                first || '[пустой ответ]'
            );
        }

        function renderError(error, exception) {
            if (!alive) return;

            var code = '?';
            var message = '';
            var body = '';

            try {
                code = network.errorCode(error);
            }
            catch (e) {
                try {
                    if (
                        error &&
                        typeof error.status !== 'undefined'
                    ) {
                        code = error.status;
                    }
                }
                catch (e2) {}
            }

            try {
                message =
                    network.errorDecode(
                        error,
                        exception
                    ) || '';
            }
            catch (e3) {}

            try {
                body =
                    error &&
                    error.responseText
                        ? error.responseText
                        : '';
            }
            catch (e4) {}

            status.text(
                'Ошибка сетевого запроса.'
            );

            meta.text(
                'HTTP/код: ' +
                code +
                (
                    message
                        ? '   |   ' + message
                        : ''
                )
            );

            preview.text(
                (
                    body ||
                    '[нет текста ответа]'
                ).substring(0, 1400)
            );
        }

        this.create = function () {
            renderLoading();

            try {
                network.timeout(15000);

                network.native(
                    BASE_URL,

                    renderSuccess,

                    renderError,

                    null,

                    {
                        dataType: 'text'
                    }
                );
            }
            catch (e) {
                status.text(
                    'Ошибка запуска сетевого теста.'
                );

                meta.text(
                    String(
                        e && e.message
                            ? e.message
                            : e
                    )
                );

                preview.text('');
            }

            return this.render();
        };

        this.start = function () {};

        this.stop = function () {};

        this.destroy = function () {
            alive = false;

            try {
                network.clear();
            }
            catch (e) {}

            root.remove();
        };

        this.render = function () {
            return root;
        };
    }

    function addMenuButton() {
        var button = $(
            '<li class="menu__item selector" ' +
                'data-action="animevost_v022">' +

                '<div class="menu__ico">' +

                    '<svg viewBox="0 0 24 24" ' +
                        'xmlns="http://www.w3.org/2000/svg">' +

                        '<path fill="currentColor" ' +
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
                Lampa.Activity.push({
                    url: '',
                    title: 'AnimeVost',
                    component: COMPONENT,
                    page: 1
                });
            }
        );

        $('.menu .menu__list')
            .eq(0)
            .append(button);
    }

    function init() {
        if (window[FLAG]) {
            return;
        }

        window[FLAG] = true;

        try {
            if (
                !Lampa.Component.get(
                    COMPONENT
                )
            ) {
                Lampa.Component.add(
                    COMPONENT,
                    DebugComponent
                );
            }

            addMenuButton();

            notify(
                'AnimeVost V0.2.2 загружен'
            );
        }
        catch (e) {
            console.log(
                'AnimeVost V0.2.2 init error:',
                e
            );

            notify(
                'Ошибка запуска AnimeVost V0.2.2'
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
                    event.type === 'ready'
                ) {
                    init();
                }
            }
        );
    }

})();
