# Коннектор Yandex для Logto

Социальный коннектор Logto для входа пользователей через **Yandex OAuth 2.0**.

## Создание приложения Yandex

1. Откройте [Yandex OAuth](https://oauth.yandex.ru/) и создайте приложение типа **«Для авторизации пользователей»**.
2. В разделе веб-сервисов укажите callback URL указаных на странице настроек коннектора в Logto.
3. Выдайте приложению права `login:info`, `login:email` и `login:avatar`.
4. Сохраните Client ID и Client Secret из свойств приложения.

## Настройка в Logto

Заполните параметры коннектора:

| Параметр | Тип | Описание |
| --- | --- | --- |
| `clientId` | `string` | Идентификатор приложения Yandex OAuth. |
| `clientSecret` | `string` | Секрет приложения Yandex OAuth. |
| `scope` | `string` | Необязательный список прав через пробел. По умолчанию: `login:info login:email login:avatar`. |

Коннектор использует следующие API Yandex:

- авторизация: `https://oauth.yandex.ru/authorize`;
- обмен кода на токен: `https://oauth.yandex.ru/token`;
- профиль пользователя: `https://login.yandex.ru/info`.

## Ссылки

- [Документация Yandex OAuth](https://yandex.ru/dev/id/doc/ru/);
- [Получение кода подтверждения из URL](https://yandex.ru/dev/id/doc/ru/codes/code-url);
- [Обмен кода на OAuth-токен](https://yandex.ru/dev/id/doc/ru/codes/code-and-token);
- [Данные пользователя](https://yandex.ru/dev/id/doc/ru/user-information).
