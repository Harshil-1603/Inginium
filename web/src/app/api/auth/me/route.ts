import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) {
            return error("Unauthorized", 401);
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: user.userId },
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
        });

        if (!fullUser) {
            return error("User not found", 404);
        }

        return success(fullUser);
    } catch (err) {
        console.error("Get user error:", err);
        return error("Internal server error", 500);
    }
}
