import type {
  CreateConnector,
  GetAuthorizationUri,
  GetConnectorConfig,
  GetUserInfo,
  SocialConnector,
} from '@logto/connector-kit';
import {
  ConnectorError,
  ConnectorErrorCodes,
  ConnectorType,
  jsonGuard,
  validateConfig,
} from '@logto/connector-kit';
import { conditional } from '@silverhand/essentials';
import ky, { HTTPError } from 'ky';

import {
  accessTokenEndpoint,
  authorizationEndpoint,
  defaultMetadata,
  defaultScope,
  defaultTimeout,
  userInfoEndpoint,
} from './constant.js';
import type { YandexConfig } from './types.js';
import {
  accessTokenResponseGuard,
  authorizationErrorResponseGuard,
  authResponseGuard,
  userInfoResponseGuard,
  yandexConfigGuard,
} from './types.js';

const getResponseBody = async (response: Response): Promise<unknown> => {
  try {
    const text = await response.clone().text();

    if (!text) {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
};

const getAuthorizationUri =
  (getConfig: GetConnectorConfig): GetAuthorizationUri =>
  async ({ state, redirectUri, scope }, setSession) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, yandexConfigGuard);

    // Сохраняем redirect URI в сессии.
    await setSession({ redirectUri });

    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: scope ?? config.scope ?? defaultScope,
      state,
    });

    return `${authorizationEndpoint}?${queryParams.toString()}`;
  };

/**
 * Обменивает код авторизации на OAuth-токен Яндекс ID.
 *
 * Яндекс принимает client_id и client_secret в form body. redirect_uri, в
 * отличие от некоторых OAuth-провайдеров, в этом запросе не используется.
 */
export const getAccessToken = async (
  config: YandexConfig,
  code: string,
  _redirectUri?: string
) => {
  try {
    const response = await ky
      .post(accessTokenEndpoint, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
        timeout: defaultTimeout,
      })
      .json();

    const result = accessTokenResponseGuard.safeParse(response);

    if (!result.success) {
      throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
    }

    const { access_token } = result.data;

    if (!access_token) {
      throw new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid);
    }

    return { ...result.data, access_token };
  } catch (error: unknown) {
    if (error instanceof HTTPError) {
      const rawBody = await getResponseBody(error.response);
      const errorCode =
        typeof rawBody === 'object' && rawBody !== null && 'error' in rawBody
          ? rawBody.error
          : undefined;

      if (
        error.response.status === 400 &&
        (errorCode === 'invalid_grant' || errorCode === 'bad_verification_code')
      ) {
        throw new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid, rawBody);
      }

      throw new ConnectorError(ConnectorErrorCodes.General, rawBody);
    }

    throw error;
  }
};

const getAuthorizationCode = (data: unknown) => {
  const authResponseResult = authResponseGuard.safeParse(data);

  if (authResponseResult.success) {
    return authResponseResult.data.code;
  }

  const authorizationErrorResult = authorizationErrorResponseGuard.safeParse(data);

  if (authorizationErrorResult.success) {
    const { error, error_description } = authorizationErrorResult.data;

    if (error === 'access_denied') {
      throw new ConnectorError(ConnectorErrorCodes.AuthorizationFailed, error_description);
    }

    throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(data));
  }

  throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(data));
};

const getUserInfo =
  (getConfig: GetConnectorConfig): GetUserInfo =>
  async (data, getSession) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, yandexConfigGuard);

    const code = getAuthorizationCode(data);
    const { redirectUri } = await getSession();

    if (!redirectUri) {
      throw new ConnectorError(ConnectorErrorCodes.General, {
        message: 'Cannot find `redirectUri` from connector session.',
      });
    }

    try {
      const { access_token } = await getAccessToken(config, code, redirectUri);

      const userInfo = await ky
        .get(userInfoEndpoint, {
          headers: {
            // У API Яндекс ID тип схемы — OAuth, а не Bearer.
            Authorization: `OAuth ${access_token}`,
          },
          timeout: defaultTimeout,
        })
        .json();

      const userInfoResult = userInfoResponseGuard.safeParse(userInfo);

      if (!userInfoResult.success) {
        throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, userInfoResult.error);
      }

      const {
        id,
        login,
        default_email,
        emails,
        display_name,
        real_name,
        first_name,
        last_name,
        default_avatar_id,
        is_avatar_empty,
      } = userInfoResult.data;
      const fullName = [first_name, last_name].filter(Boolean).join(' ');
      const name = display_name || real_name || fullName || login;
      const avatar =
        !is_avatar_empty && default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${default_avatar_id}/islands-200`
          : undefined;

      return {
        id: String(id),
        name: conditional(name),
        email: conditional(default_email || emails?.[0]),
        avatar: conditional(avatar),
        rawData: jsonGuard.parse(userInfo),
      };
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        const { status } = error.response;

        if (status === 401) {
          throw new ConnectorError(ConnectorErrorCodes.SocialAccessTokenInvalid);
        }

        throw new ConnectorError(ConnectorErrorCodes.General, await getResponseBody(error.response));
      }

      throw error;
    }
  };

const createYandexConnector: CreateConnector<SocialConnector> = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: yandexConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig),
  };
};

export default createYandexConnector;
