import { AUTH_API_URLS } from './constants';

export type LoginPayload = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

function getErrorMessage(response: Response, fallbackMessage: string) {
  return response
    .json()
    .then((errorData: any) => {
      if (Array.isArray(errorData?.message)) {
        return errorData.message.join(', ');
      }

      return errorData?.message || fallbackMessage;
    })
    .catch(() => fallbackMessage);
}

export async function loginOwner(
  payload: LoginPayload,
  baseUrl: string,
): Promise<any> {
  const response = await fetch(AUTH_API_URLS(baseUrl).LOGIN, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Login failed'));
  }

  return response.json();
}

export async function registerOwner(data: any, baseUrl: string): Promise<any> {
  const response = await fetch(AUTH_API_URLS(baseUrl).REGISTER_OWNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Registration failed'));
  }

  return response.json();
}
