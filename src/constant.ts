import type { ConnectorMetadata } from '@logto/connector-kit';
import { ConnectorConfigFormItemType, ConnectorPlatform } from '@logto/connector-kit';

// Эндпоинты указаны в документации OAuth для Яндекс ID.
export const authorizationEndpoint = 'https://oauth.yandex.ru/authorize';
export const accessTokenEndpoint = 'https://oauth.yandex.ru/token';
export const userInfoEndpoint = 'https://login.yandex.ru/info';

// Эти права нужны для получения имени, адреса электронной почты и аватара пользователя.
export const defaultScope = 'login:info login:email login:avatar';

export const defaultMetadata: ConnectorMetadata = {
  id: 'yandex-universal',
  target: 'yandex',
  platform: ConnectorPlatform.Universal,
  name: {
    en: 'Yandex',
    ru: 'Яндекс',
    'zh-CN': 'Yandex',
    'tr-TR': 'Yandex',
    ko: 'Yandex',
  },
  logo: './logo.svg',
  logoDark: './logo-dark.svg',
  description: {
    en: 'Yandex is a technology company and a popular search engine in Russia.',
    ru: 'Яндекс — технологическая компания и популярная поисковая система.',
    'zh-CN': 'Yandex 是一家科技公司和俄罗斯流行的搜索引擎。',
    'tr-TR': "Yandex, Rusya'nın popüler bir teknoloji şirketi ve arama motorudur.",
    ko: 'Yandex는 기술 기업이자 러시아의 인기 검색 엔진입니다.',
  },
  readme: './README.md',
  formItems: [
    {
      key: 'clientId',
      type: ConnectorConfigFormItemType.Text,
      label: 'Client ID',
      required: true,
    },
    {
      key: 'clientSecret',
      type: ConnectorConfigFormItemType.Text,
      label: 'Client Secret',
      required: true,
    },
    {
      key: 'scope',
      type: ConnectorConfigFormItemType.MultilineText,
      label: 'Scope',
      required: false,
      description:
        'Space-separated Yandex OAuth permissions. By default: login:info login:email login:avatar.',
    },
  ],
};

export const defaultTimeout = 5000;
