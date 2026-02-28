import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canRequestResource } from "@/lib/rbac";
import { getAvailableQuantity } from "@/lib/waitlist";
import { logAction } from "@/lib/logger";
import { success, error } from "@/lib/api-response";
import { Role } from "@prisma/client";

// POST /api/resources/request - Create a resource request
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        if (!canRequestResource(user)) {
            return error("You don't have permission to request resources", 403);
        }

        const body = await request.json();
        const { resourceId, quantity, startTime, endTime, rollNumber, reason } = body;

        if (!resourceId || !quantity || !startTime || !endTime) {
            return error("resourceId, quantity, startTime, and endTime are required");
        }

        // Students must provide roll number
        if (user.role === Role.STUDENT && !rollNumber) {
            return error("Roll number is required for student requests");
        }

        const resource = await prisma.resource.findUnique({
            where: { id: resourceId },
            include: { department: true, club: true },
        });

        if (!resource) return error("Resource not found", 404);

        // Check availability
        const start = new Date(startTime);
        const end = new Date(endTime);

        const available = await getAvailableQuantity(resourceId, start, end);

        if (quantity > available) {
            return error(
                `Only ${available} units available for the requested time period. Cannot over-request.`,
                400
            );
        }

        const req = await prisma.resourceRequest.create({
            data: {
                resourceId,
                requesterId: user.userId,
                quantity,
                startTime: start,
                endTime: end,
                rollNumber: rollNumber || null,
                reason: reason || null,
            },
            include: {
                resource: {
                    include: {
                        department: { select: { id: true, name: true } },
                        club: { select: { id: true, name: true } },
                    },
                },
                requester: { select: { id: true, name: true, email: true, role: true } },
            },
        });

        return success(req, 201);
    } catch (err) {
        console.error("Resource request error:", err);
        return error("Internal server error", 500);
    }
}

// GET /api/resources/request - List resource requests
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const mine = searchParams.get("mine");

        const where: Record<string, unknown> = {};

        if (mine === "true") {
            where.requesterId = user.userId;
        }

        if (status) {
            where.status = status;
        }

        // Lab techs see only their department's resource requests
        if (user.role === Role.LAB_TECH && user.departmentId) {
            where.resource = {
                ownerType: "DEPARTMENT",
                departmentId: user.departmentId,
            };
        }

        // Club managers see only their club's resource requests
        if (user.role === Role.CLUB_MANAGER && user.clubId && mine !== "true") {
            where.resource = {
                ownerType: "CLUB",
                clubId: user.clubId,
            };
        }

        const requests = await prisma.resourceRequest.findMany({
            where,
            include: {
                resource: {
                    include: {
                        department: { select: { id: true, name: true } },
                        club: { select: { id: true, name: true } },
                    },
                },
                requester: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        rollNumber: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return success(requests);
    } catch (err) {
        console.error("List requests error:", err);
        return error("Internal server error", 500);
    }
}
