import { z } from 'zod';

export const yandexConfigGuard = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  scope: z.string().optional(),
});

export type YandexConfig = z.infer<typeof yandexConfigGuard>;

export const authResponseGuard = z.object({
  code: z.string(),
});

export const authorizationErrorResponseGuard = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

export const accessTokenResponseGuard = z.object({
  access_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.union([z.number(), z.string()]).optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type AccessTokenResponse = z.infer<typeof accessTokenResponseGuard>;

// API Яндекс ID возвращает дополнительные поля в зависимости от выданных прав.
export const userInfoResponseGuard = z
  .object({
    id: z.union([z.string(), z.number()]),
    login: z.string().nullish(),
    client_id: z.string().nullish(),
    psuid: z.string().nullish(),
    default_email: z.string().nullish(),
    emails: z.array(z.string()).nullish(),
    display_name: z.string().nullish(),
    real_name: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    default_avatar_id: z.union([z.string(), z.number()]).nullish(),
    is_avatar_empty: z.boolean().nullish(),
  })
  .passthrough();

export type UserInfoResponse = z.infer<typeof userInfoResponseGuard>;
