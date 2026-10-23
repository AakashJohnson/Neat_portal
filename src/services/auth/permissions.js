// Role/permission checks — AuthorizationUserTrait / AuthorizationRoleTrait and
// the `permission:` / `role:` route middleware.
import { db, table } from '../../database/knex.js';
import { resolveAuth } from '../../middleware/auth.js';
import { httpException } from '../../http/respond.js';

/** Role::cachedPermissions(): permissions attached through permission_role. */
export function rolePermissions(roleId) {
  const p = table('permissions');
  const pr = table('permission_role');
  return db(p).join(pr, `${pr}.permission_id`, '=', `${p}.id`).where(`${pr}.role_id`, roleId).select(`${p}.*`);
}

/** User::hasPermission($perms) with $allRequired = true. */
export async function hasPermissions(user, names) {
  const granted = new Set((await rolePermissions(user.role_id)).map((r) => r.name));
  return names.every((n) => granted.has(n));
}

export async function hasRole(user, roleName) {
  const role = await db(table('roles')).where('id', user.role_id).first('name');
  return role?.name === roleName;
}

/** `permission:a|b` middleware → abort(403, "Forbidden."). Use after requireAuth. */
export const requirePermission = (...names) => async (req, _res, next) => {
  try {
    const auth = await resolveAuth(req);
    if (!auth || !(await hasPermissions(auth.user, names))) return next(httpException(403, 'Forbidden.'));
    next();
  } catch (err) {
    next(err);
  }
};

/** `role:Name` middleware → abort(403) (empty message). */
export const requireRole = (roleName) => async (req, _res, next) => {
  try {
    const auth = await resolveAuth(req);
    if (!auth || !(await hasRole(auth.user, roleName))) return next(httpException(403, ''));
    next();
  } catch (err) {
    next(err);
  }
};
