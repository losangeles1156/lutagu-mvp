export type Role = 'member' | 'support' | 'admin';

export function isRoleAtLeast(role: Role, required: Role) {
    const order: Record<Role, number> = { member: 1, support: 5, admin: 10 };
    return order[role] >= order[required];
}
