import client from './client';
import { LeaderboardResponse } from '../types';

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const { data } = await client.get<LeaderboardResponse>('/stats/leaderboard');
  return data;
}
