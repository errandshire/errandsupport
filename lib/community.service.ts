import { ApiService } from './api';

export interface Community {
  $id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  estateName?: string;
  locationLat?: number;
  locationLng?: number;
  coverImage?: string;
  creatorId: string;
  inviteCode?: string;
  rules?: string;
  memberCount: number;
  postCount: number;
  status: 'active' | 'banned';
  $createdAt: string;
  $updatedAt: string;
}

export interface CommunityMember {
  $id: string;
  communityId: string;
  userId: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  name?: string;
  profileImage?: string;
}

export class AdminCommunityService {
  /** List all communities (platform admin sees everything) */
  static async list(params?: { search?: string; type?: 'public' | 'private' }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type) query.append('type', params.type);
    const qs = query.toString();
    return ApiService.request<Community[]>(`/communities${qs ? `?${qs}` : ''}`);
  }

  static async getById(communityId: string) {
    return ApiService.request<Community>(`/communities/${communityId}`);
  }

  /** Update community settings — platform admins can toggle type, status, etc. */
  static async update(communityId: string, userId: string, data: Partial<{
    name: string;
    description: string;
    type: 'public' | 'private';
    status: 'active' | 'banned';
    rules: string;
    inviteCode: string;
  }>) {
    return ApiService.request<Community>(`/communities/${communityId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...data }),
    });
  }

  static async remove(communityId: string, userId: string) {
    return ApiService.request<{ success: boolean }>(`/communities/${communityId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  static async getMembers(communityId: string, status?: 'active' | 'pending' | 'banned') {
    const qs = status ? `?status=${status}` : '';
    return ApiService.request<CommunityMember[]>(`/communities/${communityId}/members${qs}`);
  }

  static async approveMember(communityId: string, userId: string, adminId: string) {
    return ApiService.request<{ success: boolean }>(
      `/communities/${communityId}/members/${userId}/approve`,
      { method: 'POST', body: JSON.stringify({ adminId }) }
    );
  }

  static async rejectMember(communityId: string, userId: string, adminId: string) {
    return ApiService.request<{ success: boolean }>(
      `/communities/${communityId}/members/${userId}/reject`,
      { method: 'POST', body: JSON.stringify({ adminId }) }
    );
  }

  static async banMember(communityId: string, userId: string, adminId: string) {
    return ApiService.request<{ success: boolean }>(
      `/communities/${communityId}/members/${userId}/ban`,
      { method: 'POST', body: JSON.stringify({ adminId }) }
    );
  }

  static async removeMember(communityId: string, userId: string, requesterId: string) {
    return ApiService.request<{ success: boolean }>(
      `/communities/${communityId}/members/${userId}`,
      { method: 'DELETE', body: JSON.stringify({ requesterId }) }
    );
  }

  static async getJobs(communityId: string) {
    return ApiService.request<any[]>(`/communities/${communityId}/jobs`);
  }

  static async unlinkJob(communityId: string, jobId: string, userId: string) {
    return ApiService.request<{ success: boolean }>(
      `/communities/${communityId}/jobs/${jobId}`,
      { method: 'DELETE', body: JSON.stringify({ userId }) }
    );
  }
}
