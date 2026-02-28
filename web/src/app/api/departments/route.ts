import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const departments = await prisma.department.findMany({
            include: {
                _count: { select: { resources: true } },
            },
            orderBy: { name: "asc" },
        });

        return success(departments);
    } catch (err) {
        console.error("List departments error:", err);
        return error("Internal server error", 500);
    }
}
