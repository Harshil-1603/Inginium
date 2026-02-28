import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

// GET /api/rooms - List all rooms
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const rooms = await prisma.room.findMany({
            orderBy: { name: "asc" },
        });

        return success(rooms);
    } catch (err) {
        console.error("List rooms error:", err);
        return error("Internal server error", 500);
    }
}
