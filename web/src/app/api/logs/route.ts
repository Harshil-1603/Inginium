import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { success, error } from "@/lib/api-response";

// GET /api/logs - List log entries (admin only, or specific role filters)
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        if (!isAdmin(user)) {
            return error("Only admin can view logs", 403);
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const action = searchParams.get("action");
        const entityType = searchParams.get("entityType");

        const where: Record<string, unknown> = {};
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;

        const [logs, total] = await Promise.all([
            prisma.log.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.log.count({ where }),
        ]);

        return success({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("List logs error:", err);
        return error("Internal server error", 500);
    }
}
