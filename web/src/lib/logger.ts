import prisma from "./prisma";
import { Role } from "@prisma/client";
import { JWTPayload } from "./auth";

/**
 * Log an important action to the database.
 */
export async function logAction(
    user: JWTPayload,
    action: string,
    entityType: string,
    entityId: number,
    oldState?: string | null,
    newState?: string | null
) {
    return prisma.log.create({
        data: {
            userId: user.userId,
            role: user.role as Role,
            action,
            entityType,
            entityId,
            oldState: oldState || null,
            newState: newState || null,
        },
    });
}
