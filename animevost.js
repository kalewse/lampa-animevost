(function () {
    'use strict';

    var PLUGIN_FLAG = 'animevost_plugin_v02_ready';
    var BASE = 'https://animevost.org';

    function notify(text) {
        try {
            Lampa.Noty.show(text);
        } catch (e) {}
    }

    function showResult(title, text) {
        try {
            Lampa.Modal.open({
                title: title,
                html:
                    '<div style="padding:1.5em;font-size:1.2em;line-height:1.6">' +
                    text +
                    '</div>',
                size: 'medium',
                onBack: function () {
                    Lampa.Modal.close();
                }
            });
        } catch (e) {
            notify(text);
        }
    }

    function testPage(path, name) {
        notify('AnimeVost: проверка соединения...');

        try {
            Lampa.Network.timeout(10000);

            Lampa.Network.silent(
                BASE + path,

                function (data) {
                    var html = '';

                    try {
                        if (typeof data === 'string') {
                            html = data;
                        }
                    } catch (e) {}

                    if (
                        html &&
                        (
                            html.indexOf('animevost') >= 0 ||
                            html.indexOf('Последние обновления') >= 0 ||
                            html.indexOf('<html') >= 0
                        )
                    ) {
                        showResult(
                            'AnimeVost V0.2',
                            '<b>УСПЕШНО</b><br><br>' +
                            'Lampa смогла загрузить AnimeVost напрямую.<br><br>' +
                            'Раздел: ' + name + '<br><br>' +
                            'Это очень хороший результат. ' +
                            'Теперь можно делать настоящий каталог, постеры и страницы аниме.'
                        );
                    }
                    else {
                        showResult(
                            'AnimeVost V0.2',
                            '<b>Ответ получен, но он необычный.</b><br><br>' +
                            'Сам плагин работает нормально. ' +
                            'Нужно будет немного изменить способ чтения сайта.'
                        );
                    }
                },

                function (error) {
                    var status = '?';

                    try {
                        if (
                            error &&
                            typeof error.status !== 'undefined'
                        ) {
                            status = error.status;
                        }
                    } catch (e) {}

                    showResult(
                        'AnimeVost V0.2',
                        '<b>Прямое соединение не прошло.</b><br><br>' +
                        'Код ошибки: ' + status + '<br><br>' +
                        'На LG webOS это скорее всего CORS.<br><br>' +
                        'Это не проблема с Lampa и ничего не сломалось. ' +
                        'В таком случае для каталога сделаем небольшой прокси.'
                    );
                },

                false,

                {
                    dataType: 'text'
                }
            );
        }
        catch (e) {
            showResult(
                'AnimeVost V0.2',
                'Ошибка при запуске сетевого теста.'
            );
        }
    }

    function mainMenu() {
        Lampa.Select.show({
            title: 'AnimeVost V0.2',

            items: [
                {
                    title: 'Главная',
                    path: '/',
                    name: 'Главная'
                },
                {
                    title: 'Онгоинги',
                    path: '/ongoing/',
                    name: 'Онгоинги'
                },
                {
                    title: 'Анонсы',
                    path: '/preview/',
                    name: 'Анонсы'
                },
                {
                    title: 'Фэнтези',
                    path: '/zhanr/fentezi/',
                    name: 'Фэнтези'
                },
                {
                    title: 'ТВ',
                    path: '/tip/tv/',
                    name: 'ТВ'
                },
                {
                    title: '2025',
                    path: '/god/2025/',
                    name: '2025'
                }
            ],

            onSelect: function (item) {
                testPage(
                    item.path,
                    item.name
                );
            },

            onBack: function () {
                try {
                    Lampa.Controller.toggle('menu');
                } catch (e) {}
            }
        });
    }

    function addMenuButton() {
        var button = $(
            '<li class="menu__item selector">' +

                '<div class="menu__ico">' +

                    '<svg viewBox="0 0 24 24" ' +
                        'xmlns="http://www.w3.org/2000/svg">' +

                        '<path fill="currentColor" ' +
                            'd="M12 2a10 10 0 1 0 0 20 ' +
                            '10 10 0 0 0 0-20zm-1 5 ' +
                            '6 5-6 5V7z"/>' +

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
                mainMenu();
            }
        );

        $('.menu .menu__list')
            .eq(0)
            .append(button);

        notify(
            'AnimeVost V0.2 загружен'
        );
    }

    function init() {
        if (window[PLUGIN_FLAG]) {
            return;
        }

        window[PLUGIN_FLAG] = true;

        try {
            addMenuButton();
        }
        catch (e) {
            console.log(
                'AnimeVost V0.2 error:',
                e
            );

            notify(
                'Ошибка запуска AnimeVost'
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
