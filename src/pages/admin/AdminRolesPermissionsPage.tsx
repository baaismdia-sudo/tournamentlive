import { useEffect, useState, Fragment } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Check } from "lucide-react";

interface Role {
  id: string;
  name: string;
  label: string;
  is_system: boolean;
}
interface Permission {
  id: string;
  code: string;
  category: string;
  description: string | null;
}

/**
 * A real permission matrix backed by the roles / permissions / role_permissions
 * tables — toggling a checkbox here immediately inserts/deletes the matching
 * row_permissions row. Role names/is_system are read-only (renaming a system
 * role's `name` would break every RLS policy that checks current_role_name()),
 * but which permissions each role grants is fully editable.
 */
export default function AdminRolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grants, setGrants] = useState<Set<string>>(new Set()); // "roleId:permissionId"
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    const [rolesRes, permsRes, grantsRes] = await Promise.all([
      supabase.from("roles").select("id, name, label, is_system").order("name"),
      supabase.from("permissions").select("id, code, category, description").order("category").order("code"),
      supabase.from("role_permissions").select("role_id, permission_id"),
    ]);
    if (rolesRes.error || permsRes.error || grantsRes.error) {
      setError(rolesRes.error?.message ?? permsRes.error?.message ?? grantsRes.error?.message ?? "Failed to load");
      setIsLoading(false);
      return;
    }
    setRoles(rolesRes.data ?? []);
    setPermissions(permsRes.data ?? []);
    setGrants(new Set((grantsRes.data ?? []).map((g) => `${g.role_id}:${g.permission_id}`)));
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggle = async (role: Role, perm: Permission) => {
    const key = `${role.id}:${perm.id}`;
    const has = grants.has(key);
    setPending(key);

    // Optimistic update, rolled back on failure.
    const next = new Set(grants);
    if (has) next.delete(key); else next.add(key);
    setGrants(next);

    const err = has
      ? (await supabase.from("role_permissions").delete().eq("role_id", role.id).eq("permission_id", perm.id)).error
      : (await supabase.from("role_permissions").insert({ role_id: role.id, permission_id: perm.id })).error;

    setPending(null);
    if (err) {
      setGrants(grants); // roll back
      notify(`Failed: ${err.message}`);
    }
  };

  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <>
      <title>Roles &amp; Permissions · Scorio Admin</title>
      {toast && <div className="fixed right-4 top-4 z-50 rounded-lg bg-[var(--color-heading)] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}

      {error && <p className="mb-4 rounded-lg bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                <th className="sticky left-0 min-w-[220px] bg-[var(--color-surface-secondary)] px-4 py-3 text-left font-semibold text-[var(--color-heading)]">
                  Permission
                </th>
                {roles.map((r) => (
                  <th key={r.id} className="px-3 py-3 text-center font-semibold text-[var(--color-heading)]">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <Fragment key={cat}>
                  <tr>
                    <td colSpan={roles.length + 1} className="bg-[var(--color-surface-secondary)]/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      {cat}
                    </td>
                  </tr>
                  {permissions.filter((p) => p.category === cat).map((perm) => (
                    <tr key={perm.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="sticky left-0 bg-[var(--color-surface)] px-4 py-2.5 text-[var(--color-text)]">
                        <div className="font-medium">{perm.code}</div>
                        {perm.description && <div className="text-xs text-[var(--color-muted)]">{perm.description}</div>}
                      </td>
                      {roles.map((role) => {
                        const key = `${role.id}:${perm.id}`;
                        const checked = grants.has(key);
                        const isSuperAdmin = role.name === "super_admin";
                        return (
                          <td key={key} className="px-3 py-2.5 text-center">
                            <button
                              disabled={isSuperAdmin || pending === key}
                              onClick={() => toggle(role, perm)}
                              title={isSuperAdmin ? "Super Admin always has every permission" : undefined}
                              className={`mx-auto flex h-5 w-5 items-center justify-center rounded border transition disabled:cursor-not-allowed ${
                                checked || isSuperAdmin
                                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                              }`}
                            >
                              {(checked || isSuperAdmin) && <Check size={13} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Changes save immediately — there's no separate "Save" step. Super Admin always has every permission and can't be edited.
      </p>
    </>
  );
}
