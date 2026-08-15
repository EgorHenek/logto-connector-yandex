import nock from 'nock';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectorError, ConnectorErrorCodes } from '@logto/connector-kit';

import { accessTokenEndpoint, authorizationEndpoint, defaultScope, userInfoEndpoint } from './constant.js';
import createConnector, { getAccessToken } from './index.js';
import { mockedConfig } from './mock.js';

const getConfig = vi.fn().mockResolvedValue(mockedConfig);
const setSession = vi.fn().mockResolvedValue(undefined);
const getSession = vi.fn().mockResolvedValue({
  redirectUri: 'http://localhost:3000/callback',
});

afterEach(() => {
  nock.cleanAll();
  vi.clearAllMocks();
});

describe('getAuthorizationUri', () => {
  it('формирует URL авторизации и сохраняет redirect URI', async () => {
    const connector = await createConnector({ getConfig });
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'some_state',
        redirectUri: 'http://localhost:3000/callback',
        connectorId: 'some_connector_id',
        connectorFactoryId: 'some_connector_factory_id',
        jti: 'some_jti',
        headers: {},
      },
      setSession
    );

    expect(setSession).toHaveBeenCalledWith({
      redirectUri: 'http://localhost:3000/callback',
    });
    expect(authorizationUri).toBe(
      `${authorizationEndpoint}?response_type=code&client_id=%3Cclient-id%3E&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&scope=${defaultScope.replaceAll(':', '%3A').replaceAll(' ', '+')}&state=some_state`
    );
  });

  it('использует scope из запроса вместо значения по умолчанию', async () => {
    const connector = await createConnector({ getConfig });
    const authorizationUri = await connector.getAuthorizationUri(
      {
        state: 'some_state',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'login:info',
        connectorId: 'some_connector_id',
        connectorFactoryId: 'some_connector_factory_id',
        jti: 'some_jti',
        headers: {},
      },
      setSession
    );

    expect(authorizationUri).toContain('scope=login%3Ainfo');
  });
});

describe('getAccessToken', () => {
  it('обменивает код на access token', async () => {
    nock(accessTokenEndpoint)
      .matchHeader('content-type', 'application/x-www-form-urlencoded')
      .post('', (body) => {
        const parameters =
          typeof body === 'string'
            ? new URLSearchParams(body)
            : new URLSearchParams(body as Record<string, string>);

        return (
          parameters.get('grant_type') === 'authorization_code' &&
          parameters.get('code') === 'code' &&
          parameters.get('client_id') === mockedConfig.clientId &&
          parameters.get('client_secret') === mockedConfig.clientSecret
        );
      })
      .reply(200, {
        token_type: 'bearer',
        access_token: 'access_token',
        expires_in: 3600,
      });

    const response = await getAccessToken(mockedConfig, 'code', 'redirectUri');

    expect(response.access_token).toBe('access_token');
  });

  it('возвращает ошибку для ответа без access token', async () => {
    nock(accessTokenEndpoint).post('').reply(200, {
      token_type: 'bearer',
    });

    await expect(getAccessToken(mockedConfig, 'code')).rejects.toStrictEqual(
      expect.objectContaining({ code: ConnectorErrorCodes.SocialAuthCodeInvalid })
    );
  });
});

describe('getUserInfo', () => {
  it('возвращает нормализованный профиль пользователя', async () => {
    nock(accessTokenEndpoint).post('').reply(200, {
      access_token: 'access_token',
    });
    nock(userInfoEndpoint).get('').reply(200, {
      id: '1000034426',
      login: 'ivan',
      display_name: 'Ivan',
      default_email: 'ivan@yandex.ru',
      default_avatar_id: 'avatar-id',
      is_avatar_empty: false,
    });

    const connector = await createConnector({ getConfig });
    const socialUserInfo = await connector.getUserInfo(
      { code: 'code' },
      getSession
    );

    expect(socialUserInfo).toStrictEqual({
      id: '1000034426',
      name: 'Ivan',
      email: 'ivan@yandex.ru',
      avatar: 'https://avatars.yandex.net/get-yapic/avatar-id/islands-200',
      rawData: {
        id: '1000034426',
        login: 'ivan',
        display_name: 'Ivan',
        default_email: 'ivan@yandex.ru',
        default_avatar_id: 'avatar-id',
        is_avatar_empty: false,
      },
    });
  });

  it('использует схему OAuth при запросе профиля', async () => {
    nock(accessTokenEndpoint).post('').reply(200, { access_token: 'access_token' });
    nock(userInfoEndpoint)
      .get('')
      .matchHeader('authorization', 'OAuth access_token')
      .reply(200, { id: '1' });

    const connector = await createConnector({ getConfig });

    await expect(connector.getUserInfo({ code: 'code' }, getSession)).resolves.toMatchObject({
      id: '1',
    });
  });

  it('преобразует ответ 401 в ошибку недействительного токена', async () => {
    nock(accessTokenEndpoint).post('').reply(200, { access_token: 'access_token' });
    nock(userInfoEndpoint).get('').reply(401);

    const connector = await createConnector({ getConfig });

    await expect(connector.getUserInfo({ code: 'code' }, getSession)).rejects.toStrictEqual(
      new ConnectorError(ConnectorErrorCodes.SocialAccessTokenInvalid)
    );
  });
});
