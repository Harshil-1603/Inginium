import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canBookRoom } from "@/lib/rbac";
import { processRoomBooking } from "@/lib/waitlist";
import { success, error } from "@/lib/api-response";

// POST /api/rooms/book - Book a room
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        if (!canBookRoom(user)) {
            return error("Students cannot book rooms. Only professors and club managers can.", 403);
        }

        const body = await request.json();
        const { roomId, startTime, endTime, purpose } = body;

        if (!roomId || !startTime || !endTime) {
            return error("roomId, startTime, and endTime are required");
        }

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) return error("Room not found", 404);

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return error("Start time must be before end time");
        }

        const booking = await processRoomBooking(
            roomId,
            user.userId,
            start,
            end,
            purpose
        );

        return success(booking, 201);
    } catch (err) {
        console.error("Room booking error:", err);
        return error("Internal server error", 500);
    }
}

// GET /api/rooms/book - List all bookings (with filters)
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user) return error("Unauthorized", 401);

        const { searchParams } = new URL(request.url);
        const mine = searchParams.get("mine");
        const status = searchParams.get("status");
        const roomId = searchParams.get("roomId");

        const where: Record<string, unknown> = {};

        if (mine === "true") {
            where.requesterId = user.userId;
        }

        if (status) {
            where.status = status;
        }

        if (roomId) {
            where.roomId = parseInt(roomId);
        }

        const bookings = await prisma.roomBooking.findMany({
            where,
            include: {
                room: true,
                requester: {
                    select: { id: true, name: true, email: true, role: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return success(bookings);
    } catch (err) {
        console.error("List bookings error:", err);
        return error("Internal server error", 500);
    }
}
