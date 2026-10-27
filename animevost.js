(function () {
    'use strict';

    var FLAG = 'animevost_debug_v021';
    var BASE = 'https://animevost.org/';

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {}
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showDebug(data) {
        var type = typeof data;
        var text = '';

        try {
            if (typeof data === 'string') {
                text = data;
            } else {
                text = JSON.stringify(data);
            }
        } catch (e) {
            text = String(data);
        }

        var preview = text.substring(0, 700);

        Lampa.Modal.open({
            title: 'AnimeVost V0.2.1',

            html:
                '<div style="padding:1.3em;font-size:1.05em;line-height:1.45;">' +

                    '<b>Ответ получен</b><br><br>' +

                    'Тип: <b>' + escapeHtml(type) + '</b><br>' +
                    'Размер: <b>' + text.length + '</b> символов<br><br>' +

                    '<b>Начало ответа:</b><br><br>' +

                    '<div style="' +
                        'font-size:0.85em;' +
                        'background:rgba(255,255,255,0.08);' +
                        'padding:1em;' +
                        'word-break:break-all;' +
                        'white-space:pre-wrap;' +
                    '">' +

                        escapeHtml(preview) +

                    '</div>' +

                '</div>',

            size: 'large',

            onBack: function () {
                Lampa.Modal.close();
            }
        });
    }

    function test() {
        notify('AnimeVost: загрузка...');

        Lampa.Network.timeout(15000);

        Lampa.Network.silent(
            BASE,

            function (data) {
                showDebug(data);
            },

            function (error) {
                var status = '?';
                var response = '';

                try {
                    status = error.status;
                    response = error.responseText || '';
                } catch (e) {}

                Lampa.Modal.open({
                    title: 'AnimeVost V0.2.1',

                    html:
                        '<div style="padding:1.5em;">' +
                        '<b>Ошибка запроса</b><br><br>' +
                        'HTTP: ' + escapeHtml(status) +
                        '<br><br>' +
                        escapeHtml(response.substring(0, 500)) +
                        '</div>',

                    size: 'large',

                    onBack: function () {
                        Lampa.Modal.close();
                    }
                });
            },

            false,

            {
                dataType: 'text'
            }
        );
    }

    function addMenu() {
        var button = $(
            '<li class="menu__item selector">' +
                '<div class="menu__ico">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path fill="currentColor" ' +
                        'd="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5 6 5-6 5V7z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">AnimeVost</div>' +
            '</li>'
        );

        button.on('hover:enter', function () {
            test();
        });

        $('.menu .menu__list')
            .eq(0)
            .append(button);

        notify('AnimeVost V0.2.1 загружен');
    }

    function init() {
        if (window[FLAG]) return;

        window[FLAG] = true;

        try {
            addMenu();
        } catch (e) {
            console.log('AnimeVost debug error:', e);
            notify('Ошибка AnimeVost');
        }
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') {
                init();
            }
        });
    }

})();
