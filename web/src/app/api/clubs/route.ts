import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const clubs = await prisma.club.findMany({
            include: {
                manager: { select: { id: true, name: true, email: true } },
                _count: { select: { resources: true } },
            },
            orderBy: { name: "asc" },
        });

        return success(clubs);
    } catch (err) {
        console.error("List clubs error:", err);
        return error("Internal server error", 500);
    }
}
