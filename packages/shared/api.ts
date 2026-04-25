import { AUTH_API_URLS } from './constants';

export async function registerOwner(data: any): Promise<any> {
  const response = await fetch(AUTH_API_URLS.REGISTER_OWNER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'Registration failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
