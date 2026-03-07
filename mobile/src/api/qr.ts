import client from './client';

export async function decodeQR(imageBase64: string): Promise<{ decoded_data: string | null }> {
  const { data } = await client.post<{ decoded_data: string | null }>('/qr/decode', { image: imageBase64 });
  return data;
}
