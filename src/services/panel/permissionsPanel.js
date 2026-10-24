// Web\Authorization\RolePermissionsController@update: the permissions matrix
// form posts roles[<role id>][] = permission ids; every role is synced (a role
// without checked boxes loses all its permissions), then PermissionsUpdated
// logs "Updated role permissions." once.
import { db, table } from '../../database/knex.js';
import { logActivity } from '../../repositories/activityRepository.js';

const ok = (body, status = 200) => ({ status, body });

export async function save(ctx, input) {
  const roles = input.roles && typeof input.roles === 'object' ? input.roles : {};
  const roleIds = await db(table('roles')).pluck('id');
  await db.transaction(async (trx) => {
    for (const roleId of roleIds) {
      const given = roles[roleId] ?? roles[String(roleId)] ?? [];
      const ids = [...new Set((Array.isArray(given) ? given : Object.values(given)).map(Number))];
      await trx(table('permission_role')).where('role_id', roleId).delete();
      if (ids.length) await trx(table('permission_role')).insert(ids.map((permission_id) => ({ permission_id, role_id: roleId })));
    }
  });
  await logActivity({ userId: ctx.user.id, description: 'Updated role permissions.', ip: ctx.ip, userAgent: ctx.userAgent });
  return ok({ message: 'Permissions saved successfully.' });
}
