// Client-safe utilities that don't require server-side dependencies

export const ID = {
  unique: () => Math.random().toString(36).substr(2, 9),
};

export const Query = {
  equal: (attribute: string, value: any) => ({ method: 'equal', attribute, value }),
  notEqual: (attribute: string, value: any) => ({ method: 'notEqual', attribute, value }),
  search: (attribute: string, value: string) => ({ method: 'search', attribute, value }),
  greaterThan: (attribute: string, value: any) => ({ method: 'greaterThan', attribute, value }),
  lessThan: (attribute: string, value: any) => ({ method: 'lessThan', attribute, value }),
  limit: (value: number) => ({ method: 'limit', attribute: '', value }),
  offset: (value: number) => ({ method: 'offset', attribute: '', value }),
  orderDesc: (attribute: string) => ({ method: 'orderDesc', attribute, value: null }),
  orderAsc: (attribute: string) => ({ method: 'orderAsc', attribute, value: null }),
};

// Permission and Role types for compatibility (placeholder)
export const Permission = {
  read: (resourceId: string) => ({ type: 'read', resourceId }),
  write: (resourceId: string) => ({ type: 'write', resourceId }),
  delete: (resourceId: string) => ({ type: 'delete', resourceId }),
};

export const Role = {
  users: (userId: string) => ({ type: 'users', userId }),
  guests: () => ({ type: 'guests' }),
  any: () => ({ type: 'any' }),
};
