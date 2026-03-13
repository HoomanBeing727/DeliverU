import client from './client';
import { Order, GroupOrderResponse, GroupOrderJoinRequest } from '../types';

export async function getOpenGroupOrders(hall?: string): Promise<Order[]> {
  const params = hall ? { hall } : {};
  const { data } = await client.get<Order[]>('/orders/group/hall-open', { params });
  return data;
}

export async function getGroupOrderDetail(rootOrderId: string): Promise<GroupOrderResponse> {
  const { data } = await client.get<GroupOrderResponse>(`/orders/group/${rootOrderId}`);
  return data;
}

export async function joinGroupOrder(rootOrderId: string, note?: string | null): Promise<Order> {
  const { data } = await client.post<Order>(`/orders/group/${rootOrderId}/join`, { note });
  return data;
}

export async function closeGroupOrder(rootOrderId: string): Promise<Order> {
  const { data } = await client.patch<Order>(`/orders/group/${rootOrderId}/close`);
  return data;
}

export async function acceptGroupOrder(rootOrderId: string): Promise<Order[]> {
  const { data } = await client.patch<Order[]>(`/orders/group/${rootOrderId}/accept`);
  return data;
}

export async function pickupGroupOrder(rootOrderId: string): Promise<Order[]> {
  const { data } = await client.patch<Order[]>(`/orders/group/${rootOrderId}/pickup`);
  return data;
}

export async function deliverGroupOrder(rootOrderId: string): Promise<Order[]> {
  const { data } = await client.patch<Order[]>(`/orders/group/${rootOrderId}/deliver`);
  return data;
}

export async function createJoinRequest(
  rootOrderId: string,
  note?: string | null,
): Promise<GroupOrderJoinRequest> {
  const { data } = await client.post<GroupOrderJoinRequest>(
    `/orders/group/${rootOrderId}/join-requests`,
    { note },
  );
  return data;
}

export async function listJoinRequests(
  rootOrderId: string,
  statusFilter: string = 'pending',
): Promise<GroupOrderJoinRequest[]> {
  const { data } = await client.get<GroupOrderJoinRequest[]>(
    `/orders/group/${rootOrderId}/join-requests`,
    { params: { status_filter: statusFilter } },
  );
  return data;
}

export async function approveJoinRequest(
  joinRequestId: string,
): Promise<GroupOrderJoinRequest> {
  const { data } = await client.patch<GroupOrderJoinRequest>(
    `/orders/group/join-requests/${joinRequestId}/approve`,
  );
  return data;
}

export async function rejectJoinRequest(
  joinRequestId: string,
  reason?: string | null,
): Promise<GroupOrderJoinRequest> {
  const { data } = await client.patch<GroupOrderJoinRequest>(
    `/orders/group/join-requests/${joinRequestId}/reject`,
    { reason },
  );
  return data;
}

export async function cancelJoinRequest(
  joinRequestId: string,
): Promise<GroupOrderJoinRequest> {
  const { data } = await client.patch<GroupOrderJoinRequest>(
    `/orders/group/join-requests/${joinRequestId}/cancel`,
  );
  return data;
}
