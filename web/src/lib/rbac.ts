import { Role, Resource, ResourceOwnerType } from "@prisma/client";
import { JWTPayload } from "./auth";

/**
 * Check if a user has one of the allowed roles.
 */
export function requireRole(
    user: JWTPayload,
    allowedRoles: Role[]
): boolean {
    return allowedRoles.includes(user.role);
}

/**
 * Check if a user can approve a resource request.
 * - Club resources: only the club manager (CLUB_MANAGER with matching clubId) can approve
 * - Department resources: only the lab technician (LAB_TECH with matching departmentId) can approve
 * - Admin can always approve
 */
export function canApproveResource(
    user: JWTPayload,
    resource: Resource
): boolean {
    if (user.role === Role.ADMIN) return true;

    if (resource.ownerType === ResourceOwnerType.CLUB) {
        return user.role === Role.CLUB_MANAGER && user.clubId === resource.clubId;
    }

    if (resource.ownerType === ResourceOwnerType.DEPARTMENT) {
        return (
            user.role === Role.LAB_TECH &&
            user.departmentId === resource.departmentId
        );
    }

    return false;
}

/**
 * Check if user can approve room bookings.
 * Only LHC and ADMIN can approve room bookings.
 */
export function canApproveRoom(user: JWTPayload): boolean {
    return user.role === Role.LHC || user.role === Role.ADMIN;
}

/**
 * Check if user can request resources.
 * Students, Professors, Club Managers can request.
 */
export function canRequestResource(user: JWTPayload): boolean {
    return ([Role.STUDENT, Role.PROFESSOR, Role.CLUB_MANAGER, Role.ADMIN] as Role[]).includes(
        user.role
    );
}

/**
 * Check if user can view club resources.
 * - Professors CANNOT browse club resources
 * - Everyone else can
 */
export function canViewClubResources(user: JWTPayload): boolean {
    return user.role !== Role.PROFESSOR && user.role !== Role.LAB_TECH;
}

/**
 * Check if user can book a room.
 * Only Professors and Club Managers can book rooms.
 * Students CANNOT book rooms.
 */
export function canBookRoom(user: JWTPayload): boolean {
    return ([Role.PROFESSOR, Role.CLUB_MANAGER, Role.ADMIN] as Role[]).includes(user.role);
}

/**
 * Check if user can manage (add/remove) club resources.
 */
export function canManageClubResources(
    user: JWTPayload,
    clubId: number
): boolean {
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.CLUB_MANAGER && user.clubId === clubId;
}

/**
 * Check if user is admin.
 */
export function isAdmin(user: JWTPayload): boolean {
    return user.role === Role.ADMIN;
}
