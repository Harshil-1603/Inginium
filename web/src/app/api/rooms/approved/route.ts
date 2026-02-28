import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { RequestStatus } from "@prisma/client";

// GET /api/rooms/approved - Get all approved room bookings (for calendar)
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get("weekStart");
        const weekEnd = searchParams.get("weekEnd");

        const where: Record<string, unknown> = {
            status: RequestStatus.APPROVED,
        };

        if (weekStart && weekEnd) {
            where.startTime = { gte: new Date(weekStart) };
            where.endTime = { lte: new Date(weekEnd) };
        }

        const bookings = await prisma.roomBooking.findMany({
            where,
            include: {
                room: true,
                requester: {
                    select: { id: true, name: true, role: true },
                },
            },
            orderBy: { startTime: "asc" },
        });

        return success(bookings);
    } catch (err) {
        console.error("Get approved bookings error:", err);
        return error("Internal server error", 500);
    }
}
