import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { success, error } from "@/lib/api-response";

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        if (!isAdmin(user)) {
            return error("Only admin can list users", 403);
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                rollNumber: true,
                departmentId: true,
                clubId: true,
                department: { select: { id: true, name: true } },
                club: { select: { id: true, name: true } },
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return success(users);
    } catch (err) {
        console.error("List users error:", err);
        return error("Internal server error", 500);
    }
}
