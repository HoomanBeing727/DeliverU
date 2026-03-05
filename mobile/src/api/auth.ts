import client from './client';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function registerUser(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/register', { email, password });
  return data;
}

export async function loginUser(email: string, password: string): Promise<TokenResponse> {
  const { data } = await client.post<TokenResponse>('/auth/login', { email, password });
  return data;
}
