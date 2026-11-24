import { Role } from "@prisma/client";

export type RoleOption = {
  value: Role;
  label: string;
  description: string;
  badgeColor: string;
};

export const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    value: Role.SUPER_ADMIN,
    label: "Super Administrator",
    description: "Full administrative system access",
    badgeColor: "bg-[#101827]",
  },
  {
    value: Role.PROJECT_MANAGER,
    label: "Project Manager (Gebyian)",
    description: "Gebyian Network e-commerce, orders, stock, and supplies",
    badgeColor: "bg-[#FF8A00]",
  },
  {
    value: Role.CELL_MANAGER,
    label: "Cell Manager",
    description: "Akagari cell cooperative, animal stock reports, and feed sales",
    badgeColor: "bg-slate-700",
  },
  {
    value: Role.COOPERATIVE_LEADER,
    label: "Cooperative Leader",
    description: "Member reports and supply coordination",
    badgeColor: "bg-amber-600",
  },
  {
    value: Role.COOPERATIVE_MEMBER,
    label: "Cooperative Member",
    description: "Individual pig stock and leader reporting",
    badgeColor: "bg-orange-500",
  },
  {
    value: Role.VETERINARIAN,
    label: "Veterinarian",
    description: "Pig health verification and inspection reports",
    badgeColor: "bg-sky-600",
  },
  {
    value: Role.FINANCE_OFFICER,
    label: "Finance Officer",
    description: "Verify cell feed sales, income, expenses, and fund balance",
    badgeColor: "bg-amber-700",
  },
] as const;

export const ALL_ROLE_VALUES: readonly Role[] = ROLE_OPTIONS.map((r) => r.value);

/**
 * Roles selectable on the Sign-In form (all active non-admin database roles).
 * Super Administrators sign in directly without needing a role dropdown selection.
 */
export const SIGN_IN_ROLE_OPTIONS: readonly RoleOption[] = ROLE_OPTIONS.filter(
  (r) => r.value !== Role.SUPER_ADMIN
);

/**
 * Staff roles assignable on Admin Staff Registration (/dashboard/admin/users/new).
 * Matches the Sign-In form roles (plus Super Administrator), excluding
 * Cooperative Leader and Cooperative Member which are managed by Cell Managers.
 */
export const ADMIN_STAFF_ROLE_OPTIONS: readonly RoleOption[] = ROLE_OPTIONS.filter(
  (r) => r.value !== Role.COOPERATIVE_LEADER && r.value !== Role.COOPERATIVE_MEMBER
);

/**
 * Cooperative roles managed under Cell Manager workflows.
 */
export const CELL_MANAGER_COOP_ROLE_OPTIONS: readonly RoleOption[] = ROLE_OPTIONS.filter(
  (r) => r.value === Role.COOPERATIVE_LEADER || r.value === Role.COOPERATIVE_MEMBER
);

export const FIELD_OPERATIONS_ROLES: readonly Role[] = [
  Role.CELL_MANAGER,
  Role.COOPERATIVE_LEADER,
  Role.COOPERATIVE_MEMBER,
];

export const FINANCE_OPERATIONS_ROLES: readonly Role[] = [
  Role.FINANCE_OFFICER,
];

export function normalizeRoleValue(role?: string | null): Role | "" {
  if (!role) return "";
  const cleanRole = role.replace(/^ROLE_/, "").trim().toUpperCase();
  if (cleanRole === "ADMIN") return Role.SUPER_ADMIN;
  if (cleanRole === "FIELD_OFFICER") return Role.CELL_MANAGER;
  return ALL_ROLE_VALUES.includes(cleanRole as Role) ? (cleanRole as Role) : "";
}

export function getRoleLabel(role?: string | null): string {
  const norm = normalizeRoleValue(role);
  if (!norm) return role ? role.replace(/_/g, " ") : "Unknown";
  return ROLE_OPTIONS.find((r) => r.value === norm)?.label ?? norm;
}

export function getRoleMeta(role: Role): RoleOption {
  return (
    ROLE_OPTIONS.find((r) => r.value === role) ?? {
      value: role,
      label: String(role),
      description: "",
      badgeColor: "bg-slate-600",
    }
  );
}
