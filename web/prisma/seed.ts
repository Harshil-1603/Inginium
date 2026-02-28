import { PrismaClient, Role, ResourceOwnerType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

async function main() {
    console.log("🌱 Seeding database...");

    // Clean existing data
    await prisma.log.deleteMany();
    await prisma.roomBooking.deleteMany();
    await prisma.resourceRequest.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.room.deleteMany();
    await prisma.user.deleteMany();
    await prisma.club.deleteMany();
    await prisma.department.deleteMany();

    const defaultPassword = await hashPassword("password123");

    // ── DEPARTMENTS (5) ──────────────────────────────────────────────
    const departments = await Promise.all([
        prisma.department.create({ data: { name: "Computer Science" } }),
        prisma.department.create({ data: { name: "Electrical Engineering" } }),
        prisma.department.create({ data: { name: "Mechanical Engineering" } }),
        prisma.department.create({ data: { name: "Civil Engineering" } }),
        prisma.department.create({ data: { name: "Physics" } }),
    ]);
    console.log(`✅ Created ${departments.length} departments`);

    // ── ADMIN (1) ────────────────────────────────────────────────────
    const admin = await prisma.user.create({
        data: {
            email: "admin@inginium.edu",
            password: defaultPassword,
            name: "System Admin",
            role: Role.ADMIN,
        },
    });
    console.log("✅ Created admin user");

    // ── LHC (1) ──────────────────────────────────────────────────────
    const lhc = await prisma.user.create({
        data: {
            email: "lhc@inginium.edu",
            password: defaultPassword,
            name: "LHC Manager",
            role: Role.LHC,
        },
    });
    console.log("✅ Created LHC user");

    // ── CLUB MANAGERS (5) ────────────────────────────────────────────
    const clubManagers = await Promise.all([
        prisma.user.create({
            data: {
                email: "robotics.manager@inginium.edu",
                password: defaultPassword,
                name: "Arjun Mehta",
                role: Role.CLUB_MANAGER,
            },
        }),
        prisma.user.create({
            data: {
                email: "coding.manager@inginium.edu",
                password: defaultPassword,
                name: "Priya Sharma",
                role: Role.CLUB_MANAGER,
            },
        }),
        prisma.user.create({
            data: {
                email: "music.manager@inginium.edu",
                password: defaultPassword,
                name: "Rahul Verma",
                role: Role.CLUB_MANAGER,
            },
        }),
        prisma.user.create({
            data: {
                email: "drama.manager@inginium.edu",
                password: defaultPassword,
                name: "Sneha Patel",
                role: Role.CLUB_MANAGER,
            },
        }),
        prisma.user.create({
            data: {
                email: "sports.manager@inginium.edu",
                password: defaultPassword,
                name: "Vikram Singh",
                role: Role.CLUB_MANAGER,
            },
        }),
    ]);
    console.log(`✅ Created ${clubManagers.length} club managers`);

    // ── CLUBS (5) ────────────────────────────────────────────────────
    const clubs = await Promise.all([
        prisma.club.create({
            data: { name: "Robotics Club", managerId: clubManagers[0].id },
        }),
        prisma.club.create({
            data: { name: "Coding Club", managerId: clubManagers[1].id },
        }),
        prisma.club.create({
            data: { name: "Music Club", managerId: clubManagers[2].id },
        }),
        prisma.club.create({
            data: { name: "Drama Club", managerId: clubManagers[3].id },
        }),
        prisma.club.create({
            data: { name: "Sports Club", managerId: clubManagers[4].id },
        }),
    ]);
    console.log(`✅ Created ${clubs.length} clubs`);

    // Update club managers with their clubId
    for (let i = 0; i < clubManagers.length; i++) {
        await prisma.user.update({
            where: { id: clubManagers[i].id },
            data: { clubId: clubs[i].id },
        });
    }

    // ── LAB TECHNICIANS (5, one per department) ──────────────────────
    const labTechs = await Promise.all(
        departments.map((dept: { id: number; name: string }, i: number) =>
            prisma.user.create({
                data: {
                    email: `labtech.${dept.name.toLowerCase().replace(/\s+/g, "")}@inginium.edu`,
                    password: defaultPassword,
                    name: `Lab Tech ${i + 1} (${dept.name})`,
                    role: Role.LAB_TECH,
                    departmentId: dept.id,
                },
            })
        )
    );
    console.log(`✅ Created ${labTechs.length} lab technicians`);

    // ── PROFESSORS (5) ───────────────────────────────────────────────
    const professors = await Promise.all([
        prisma.user.create({
            data: {
                email: "prof.kumar@inginium.edu",
                password: defaultPassword,
                name: "Dr. Anil Kumar",
                role: Role.PROFESSOR,
                departmentId: departments[0].id,
            },
        }),
        prisma.user.create({
            data: {
                email: "prof.gupta@inginium.edu",
                password: defaultPassword,
                name: "Dr. Neeta Gupta",
                role: Role.PROFESSOR,
                departmentId: departments[1].id,
            },
        }),
        prisma.user.create({
            data: {
                email: "prof.shah@inginium.edu",
                password: defaultPassword,
                name: "Dr. Rajesh Shah",
                role: Role.PROFESSOR,
                departmentId: departments[2].id,
            },
        }),
        prisma.user.create({
            data: {
                email: "prof.iyer@inginium.edu",
                password: defaultPassword,
                name: "Dr. Lakshmi Iyer",
                role: Role.PROFESSOR,
                departmentId: departments[3].id,
            },
        }),
        prisma.user.create({
            data: {
                email: "prof.das@inginium.edu",
                password: defaultPassword,
                name: "Dr. Suman Das",
                role: Role.PROFESSOR,
                departmentId: departments[4].id,
            },
        }),
    ]);
    console.log(`✅ Created ${professors.length} professors`);

    // ── STUDENTS (12) ────────────────────────────────────────────────
    const studentNames = [
        { name: "Aarav Patel", roll: "CS2024001" },
        { name: "Diya Sharma", roll: "CS2024002" },
        { name: "Kabir Singh", roll: "EE2024001" },
        { name: "Anaya Gupta", roll: "EE2024002" },
        { name: "Vihaan Mehta", roll: "ME2024001" },
        { name: "Ishita Joshi", roll: "ME2024002" },
        { name: "Aditya Reddy", roll: "CE2024001" },
        { name: "Myra Khan", roll: "CE2024002" },
        { name: "Reyansh Nair", roll: "PH2024001" },
        { name: "Sara Ali", roll: "PH2024002" },
        { name: "Aryan Chopra", roll: "CS2024003" },
        { name: "Zara Hussain", roll: "EE2024003" },
    ];

    const students = await Promise.all(
        studentNames.map((s, i) =>
            prisma.user.create({
                data: {
                    email: `${s.name.toLowerCase().replace(/\s+/g, ".")}@inginium.edu`,
                    password: defaultPassword,
                    name: s.name,
                    role: Role.STUDENT,
                    rollNumber: s.roll,
                    departmentId: departments[i % 5].id,
                },
            })
        )
    );
    console.log(`✅ Created ${students.length} students`);

    // ── DEPARTMENT RESOURCES ─────────────────────────────────────────
    const deptResources = [
        // Computer Science
        { name: "Laptop", description: "Dell Latitude 5520", quantity: 20, deptIdx: 0 },
        { name: "GPU Server Access", description: "NVIDIA A100 compute time", quantity: 5, deptIdx: 0 },
        { name: "Projector", description: "Epson EB-X51", quantity: 8, deptIdx: 0 },
        // Electrical Engineering
        { name: "Oscilloscope", description: "Tektronix TBS1072C", quantity: 15, deptIdx: 1 },
        { name: "Multimeter", description: "Fluke 87V", quantity: 25, deptIdx: 1 },
        { name: "Signal Generator", description: "Rigol DG1062Z", quantity: 10, deptIdx: 1 },
        // Mechanical Engineering
        { name: "3D Printer", description: "Creality Ender 3 V2", quantity: 5, deptIdx: 2 },
        { name: "CNC Machine Access", description: "HAAS VF-2", quantity: 3, deptIdx: 2 },
        { name: "Vernier Caliper Set", description: "Mitutoyo Digital", quantity: 30, deptIdx: 2 },
        // Civil Engineering
        { name: "Total Station", description: "Leica TS16", quantity: 4, deptIdx: 3 },
        { name: "Concrete Testing Kit", description: "Compression tester", quantity: 6, deptIdx: 3 },
        // Physics
        { name: "Spectrometer", description: "Ocean Insight USB4000", quantity: 8, deptIdx: 4 },
        { name: "Laser Kit", description: "HeNe Laser set", quantity: 10, deptIdx: 4 },
    ];

    await Promise.all(
        deptResources.map((r) =>
            prisma.resource.create({
                data: {
                    name: r.name,
                    description: r.description,
                    quantity: r.quantity,
                    ownerType: ResourceOwnerType.DEPARTMENT,
                    departmentId: departments[r.deptIdx].id,
                },
            })
        )
    );
    console.log(`✅ Created ${deptResources.length} department resources`);

    // ── CLUB RESOURCES ────────────────────────────────────────────────
    const clubResources = [
        // Robotics Club
        { name: "Arduino Kit", description: "Arduino Mega 2560 starter kit", quantity: 15, clubIdx: 0 },
        { name: "Drone Kit", description: "DJI F450 frame kit", quantity: 3, clubIdx: 0 },
        { name: "Servo Motor Pack", description: "MG996R servo motors", quantity: 20, clubIdx: 0 },
        // Coding Club
        { name: "Raspberry Pi 4", description: "8GB RAM variant", quantity: 10, clubIdx: 1 },
        { name: "Monitor", description: "Dell 24-inch IPS", quantity: 8, clubIdx: 1 },
        // Music Club
        { name: "Guitar", description: "Yamaha F310", quantity: 6, clubIdx: 2 },
        { name: "Keyboard", description: "Casio CTK-3500", quantity: 4, clubIdx: 2 },
        { name: "Microphone", description: "Shure SM58", quantity: 8, clubIdx: 2 },
        // Drama Club
        { name: "Spotlight", description: "LED Par Light", quantity: 12, clubIdx: 3 },
        { name: "Costume Set", description: "Period piece collection", quantity: 5, clubIdx: 3 },
        // Sports Club
        { name: "Cricket Kit", description: "Full batting set", quantity: 6, clubIdx: 4 },
        { name: "Football", description: "Nivia storm size 5", quantity: 15, clubIdx: 4 },
        { name: "Badminton Set", description: "Yonex racket set", quantity: 10, clubIdx: 4 },
    ];

    await Promise.all(
        clubResources.map((r) =>
            prisma.resource.create({
                data: {
                    name: r.name,
                    description: r.description,
                    quantity: r.quantity,
                    ownerType: ResourceOwnerType.CLUB,
                    clubId: clubs[r.clubIdx].id,
                },
            })
        )
    );
    console.log(`✅ Created ${clubResources.length} club resources`);

    // ── ROOMS (3) ────────────────────────────────────────────────────
    const rooms = await Promise.all([
        prisma.room.create({
            data: { name: "LHC-101 (Lecture Hall)", capacity: 200 },
        }),
        prisma.room.create({
            data: { name: "LHC-202 (Seminar Room)", capacity: 80 },
        }),
        prisma.room.create({
            data: { name: "LHC-303 (Conference Room)", capacity: 30 },
        }),
    ]);
    console.log(`✅ Created ${rooms.length} rooms`);

    // ── SUMMARY ──────────────────────────────────────────────────────
    console.log("\n📋 SEED SUMMARY:");
    console.log("─────────────────────────────────────");
    console.log(`  Admin:         1  (admin@inginium.edu)`);
    console.log(`  LHC:           1  (lhc@inginium.edu)`);
    console.log(`  Professors:    ${professors.length}`);
    console.log(`  Lab Techs:     ${labTechs.length}`);
    console.log(`  Club Managers: ${clubManagers.length}`);
    console.log(`  Students:      ${students.length}`);
    console.log(`  Departments:   ${departments.length}`);
    console.log(`  Clubs:         ${clubs.length}`);
    console.log(`  Dept Resources:${deptResources.length}`);
    console.log(`  Club Resources:${clubResources.length}`);
    console.log(`  Rooms:         ${rooms.length}`);
    console.log("─────────────────────────────────────");
    console.log("  Default password: password123");
    console.log("─────────────────────────────────────");
    console.log("\n🎉 Seed complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
