import type { SwimOrgRole } from "@prisma/client";

export const MEET_EDITOR_ROLES: SwimOrgRole[] = ["admin", "manager", "director"];
export const MEET_ADMIN_ROLES: SwimOrgRole[] = ["admin", "director"];
export const MEET_EVENT_ORDER_ROLES: SwimOrgRole[] = ["admin", "director", "coach"];
export const ORG_ADMIN_ROLES: SwimOrgRole[] = ["admin"];
export const ORG_INVITE_ADMIN_ROLES: SwimOrgRole[] = ["admin"];
export const ORG_INVITE_OPERATIONAL_ROLES: SwimOrgRole[] = ["admin", "director"];
export const STUDENT_MANAGER_ROLES: SwimOrgRole[] = ["admin", "manager", "director", "coach"];
