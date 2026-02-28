import prisma from "./prisma";
import { RequestStatus } from "@prisma/client";
import { sendPromotionEmail } from "./mailer";

/**
 * Waitlist Engine for Room Bookings.
 *
 * When a new room booking request arrives:
 * 1. Check overlapping approved bookings for the same room.
 * 2. If conflict: assign queuePosition and status = WAITLISTED.
 * 3. If no conflict: approve directly.
 *
 * When a booking is cancelled:
 * 1. Find the lowest queuePosition WAITLISTED booking that no longer conflicts.
 * 2. Promote to APPROVED.
 * 3. Send email notification.
 */

export async function checkRoomConflict(
    roomId: number,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: number
): Promise<boolean> {
    const conflicting = await prisma.roomBooking.findFirst({
        where: {
            roomId,
            status: RequestStatus.APPROVED,
            id: excludeBookingId ? { not: excludeBookingId } : undefined,
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
            ],
        },
    });
    return !!conflicting;
}

export async function assignWaitlistPosition(
    roomId: number,
    startTime: Date,
    endTime: Date
): Promise<number> {
    // Find the maximum queue position for overlapping waitlisted bookings
    const maxQueue = await prisma.roomBooking.findFirst({
        where: {
            roomId,
            status: RequestStatus.WAITLISTED,
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
            ],
        },
        orderBy: { queuePosition: "desc" },
    });

    return (maxQueue?.queuePosition || 0) + 1;
}

/**
 * Process a new room booking request.
 * Returns the created booking with its status.
 */
export async function processRoomBooking(
    roomId: number,
    requesterId: number,
    startTime: Date,
    endTime: Date,
    purpose?: string
) {
    const hasConflict = await checkRoomConflict(roomId, startTime, endTime);

    if (hasConflict) {
        const queuePosition = await assignWaitlistPosition(
            roomId,
            startTime,
            endTime
        );

        return prisma.roomBooking.create({
            data: {
                roomId,
                requesterId,
                startTime,
                endTime,
                purpose,
                status: RequestStatus.WAITLISTED,
                queuePosition,
            },
            include: { room: true, requester: true },
        });
    }

    // No conflict: create as PENDING (awaits LHC approval)
    return prisma.roomBooking.create({
        data: {
            roomId,
            requesterId,
            startTime,
            endTime,
            purpose,
            status: RequestStatus.PENDING,
        },
        include: { room: true, requester: true },
    });
}

/**
 * When a booking is cancelled or rejected, promote the next waitlisted booking.
 */
export async function promoteFromWaitlist(
    roomId: number,
    startTime: Date,
    endTime: Date
) {
    // Find overlapping waitlisted bookings, ordered by queue position
    const waitlisted = await prisma.roomBooking.findMany({
        where: {
            roomId,
            status: RequestStatus.WAITLISTED,
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
            ],
        },
        orderBy: { queuePosition: "asc" },
        include: { requester: true, room: true },
    });

    for (const booking of waitlisted) {
        // Check if this booking still conflicts with any approved booking
        const stillConflicts = await checkRoomConflict(
            roomId,
            booking.startTime,
            booking.endTime,
            booking.id
        );

        if (!stillConflicts) {
            // Promote this booking
            await prisma.roomBooking.update({
                where: { id: booking.id },
                data: {
                    status: RequestStatus.APPROVED,
                    queuePosition: null,
                },
            });

            // Send email notification
            await sendPromotionEmail(
                booking.requester.email,
                "Room Booking",
                booking.room.name
            );

            return booking;
        }
    }

    return null;
}

/**
 * Check resource availability for a given time period.
 */
export async function getAvailableQuantity(
    resourceId: number,
    startTime: Date,
    endTime: Date,
    excludeRequestId?: number
): Promise<number> {
    const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
    });

    if (!resource) return 0;

    // Sum up approved quantities that overlap with the requested time
    const approvedRequests = await prisma.resourceRequest.findMany({
        where: {
            resourceId,
            status: RequestStatus.APPROVED,
            id: excludeRequestId ? { not: excludeRequestId } : undefined,
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } },
            ],
        },
    });

    const usedQuantity = approvedRequests.reduce(
        (sum, req) => sum + req.quantity,
        0
    );

    return resource.quantity - usedQuantity;
}
