import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canViewClubResources, canManageClubResources, isAdmin } from "@/lib/rbac";
import { logAction } from "@/lib/logger";
import { success, error } from "@/lib/api-response";
import { ResourceOwnerType } from "@prisma/client";

// GET /api/resources - List resources
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const { searchParams } = new URL(request.url);
        const ownerType = searchParams.get("ownerType") as ResourceOwnerType | null;
        const ownerId = searchParams.get("ownerId");

        // Build filter
        const where: Record<string, unknown> = {};

        if (ownerType) {
            // Professors can't view club resources
            if (ownerType === ResourceOwnerType.CLUB && !canViewClubResources(user)) {
                return error("You don't have permission to view club resources", 403);
            }
            where.ownerType = ownerType;
        } else {
            // If no filter, exclude club resources for professors
            if (!canViewClubResources(user)) {
                where.ownerType = ResourceOwnerType.DEPARTMENT;
            }
        }

        if (ownerId) {
            if (ownerType === ResourceOwnerType.DEPARTMENT) {
                where.departmentId = parseInt(ownerId);
            } else if (ownerType === ResourceOwnerType.CLUB) {
                where.clubId = parseInt(ownerId);
            }
        }

        const resources = await prisma.resource.findMany({
            where,
            include: {
                department: { select: { id: true, name: true } },
                club: { select: { id: true, name: true } },
            },
            orderBy: { name: "asc" },
        });

        return success(resources);
    } catch (err) {
        console.error("List resources error:", err);
        return error("Internal server error", 500);
    }
}

// POST /api/resources - Add a resource (Club Managers or Admin only)
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const body = await request.json();
        const { name, description, quantity, ownerType, departmentId, clubId } = body;

        if (!name || !quantity || !ownerType) {
            return error("Name, quantity, and ownerType are required");
        }

        if (ownerType === ResourceOwnerType.CLUB) {
            if (!clubId) return error("clubId is required for club resources");
            if (!canManageClubResources(user, clubId)) {
                return error("You don't have permission to add resources to this club", 403);
            }
        }

        if (ownerType === ResourceOwnerType.DEPARTMENT) {
            if (!departmentId) return error("departmentId is required for department resources");
            if (!isAdmin(user)) {
                return error("Only admin can add department resources", 403);
            }
        }

        const resource = await prisma.resource.create({
            data: {
                name,
                description: description || null,
                quantity,
                ownerType,
                departmentId: departmentId || null,
                clubId: clubId || null,
            },
            include: {
                department: { select: { id: true, name: true } },
                club: { select: { id: true, name: true } },
            },
        });

        await logAction(user, "ADD_RESOURCE", "Resource", resource.id, null, JSON.stringify(resource));

        return success(resource, 201);
    } catch (err) {
        console.error("Add resource error:", err);
        return error("Internal server error", 500);
    }
}

// DELETE /api/resources - Remove a resource
export async function DELETE(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const { searchParams } = new URL(request.url);
        const resourceId = searchParams.get("id");

        if (!resourceId) return error("Resource ID is required");

        const resource = await prisma.resource.findUnique({
            where: { id: parseInt(resourceId) },
        });

        if (!resource) return error("Resource not found", 404);

        if (resource.ownerType === ResourceOwnerType.CLUB) {
            if (!canManageClubResources(user, resource.clubId!)) {
                return error("You don't have permission to remove this resource", 403);
            }
        } else if (!isAdmin(user)) {
            return error("Only admin can remove department resources", 403);
        }

        await prisma.resource.delete({ where: { id: parseInt(resourceId) } });

        await logAction(user, "REMOVE_RESOURCE", "Resource", parseInt(resourceId), JSON.stringify(resource), null);

        return success({ message: "Resource deleted" });
    } catch (err) {
        console.error("Delete resource error:", err);
        return error("Internal server error", 500);
    }
}
