(function () {
    'use strict';

    function startAnimeVostPlugin() {
        if (window.animevost_plugin_ready) return;

        window.animevost_plugin_ready = true;

        Lampa.Lang.add({
            animevost_title: {
                ru: 'AnimeVost',
                en: 'AnimeVost'
            }
        });

        Lampa.Template.add(
            'animevost_test_main',
            '<div style="padding:3em; max-width:900px;">' +
                '<div style="font-size:2.4em; font-weight:600; margin-bottom:0.8em;">' +
                    'AnimeVost' +
                '</div>' +

                '<div style="font-size:1.3em; line-height:1.6;">' +
                    'Тестовый плагин V0.1 успешно запущен.' +
                    '<br><br>' +

                    'Версия Lampa: <span class="animevost-version"></span>' +
                    '<br><br>' +

                    'Это безопасная тестовая версия.' +
                    '<br>' +

                    'Она пока не подключается к AnimeVost и не запускает видео.' +
                    '<br><br>' +

                    'Если вы видите этот экран, значит плагин работает правильно.' +
                '</div>' +
            '</div>'
        );

        function AnimeVostComponent(object) {
            var html;

            this.create = function () {
                html = Lampa.Template.get('animevost_test_main', {});

                var version = 'неизвестно';

                try {
                    if (
                        Lampa.Manifest &&
                        Lampa.Manifest.app_version
                    ) {
                        version = Lampa.Manifest.app_version;
                    }
                } catch (e) {}

                html.find('.animevost-version').text(version);

                return this.render();
            };

            this.start = function () {};

            this.stop = function () {};

            this.destroy = function () {
                if (html) html.remove();
            };

            this.render = function () {
                return html;
            };
        }

        function init() {
            try {
                Lampa.Component.add(
                    'animevost_test_screen',
                    AnimeVostComponent
                );

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

                button.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'AnimeVost',
                        component: 'animevost_test_screen',
                        page: 1
                    });
                });

                $('.menu .menu__list')
                    .eq(0)
                    .append(button);

                try {
                    Lampa.Noty.show(
                        'AnimeVost V0.1 установлен'
                    );
                } catch (e) {}

            } catch (error) {

                console.log(
                    'AnimeVost plugin error:',
                    error
                );

                try {
                    Lampa.Noty.show(
                        'Ошибка запуска AnimeVost'
                    );
                } catch (e) {}
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
    }

    try {
        if (
            window.Lampa &&
            !window.animevost_plugin_ready
        ) {
            startAnimeVostPlugin();
        }
    }
    catch (error) {
        console.log(
            'AnimeVost startup error:',
            error
        );
    }

})();
