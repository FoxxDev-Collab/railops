import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const db = new PrismaClient({});

async function main() {
  const email = "demo@railroadops.com";
  const password = "Demo1234!";

  console.log("Seeding demo customer...");

  const hashedPassword = await bcrypt.hash(password, 10);

  // ── User ──
  const user = await db.user.upsert({
    where: { email },
    update: { password: hashedPassword, plan: "PRO" },
    create: {
      email,
      password: hashedPassword,
      name: "Demo Operator",
      role: "USER",
      plan: "PRO",
      emailVerified: new Date(),
    },
  });
  console.log(`  User: ${user.email} (${user.id})`);

  // ── Layout ──
  const layout = await db.layout.upsert({
    where: { id: "seed-layout-01" },
    update: {},
    create: {
      id: "seed-layout-01",
      name: "Allegheny Western Railway",
      description:
        "A freelanced Appalachian coal-hauling railroad set in the late 1970s transition era.",
      scale: "HO",
      era: "Transition (1970s)",
      userId: user.id,
    },
  });
  console.log(`  Layout: ${layout.name}`);

  // Set as selected layout
  await db.user.update({
    where: { id: user.id },
    data: { selectedLayoutId: layout.id },
  });

  // ── Locations ──
  const locationData = [
    {
      id: "seed-loc-yard",
      name: "Grafton Yard",
      code: "GY",
      locationType: "YARD" as const,
      description: "Main classification yard and engine terminal",
    },
    {
      id: "seed-loc-station",
      name: "Elkins",
      code: "ELK",
      locationType: "PASSENGER_STATION" as const,
      description: "Division point with passenger station and freight house",
    },
    {
      id: "seed-loc-interchange",
      name: "Durbin Junction",
      code: "DUR",
      locationType: "INTERCHANGE" as const,
      description: "Interchange with C&O and connecting lines",
    },
    {
      id: "seed-loc-siding",
      name: "Spruce Knob Mine",
      code: "SKM",
      locationType: "SIDING" as const,
      description: "Coal loading facility at Spruce Knob tipple",
    },
  ];

  const locations: Record<string, Awaited<ReturnType<typeof db.location.upsert>>> = {};
  for (const loc of locationData) {
    locations[loc.id] = await db.location.upsert({
      where: { code_layoutId: { code: loc.code, layoutId: layout.id } },
      update: {},
      create: {
        ...loc,
        layoutId: layout.id,
        userId: user.id,
      },
    });
    console.log(`  Location: ${loc.name} (${loc.code})`);
  }

  // ── Industries (at select locations) ──
  const industryData = [
    {
      name: "Spruce Knob Tipple",
      type: "Coal Mine",
      locationId: locations["seed-loc-siding"].id,
      commoditiesOut: ["Coal"],
      commoditiesIn: ["Empty hoppers"],
      spotCount: 6,
    },
    {
      name: "Elkins Freight House",
      type: "Freight House",
      locationId: locations["seed-loc-station"].id,
      commoditiesOut: ["LCL Freight"],
      commoditiesIn: ["Merchandise", "Farm Equipment"],
      spotCount: 2,
    },
  ];

  for (const ind of industryData) {
    await db.industry.create({
      data: {
        ...ind,
        userId: user.id,
      },
    });
    console.log(`  Industry: ${ind.name}`);
  }

  // ── Locomotives ──
  const locoData = [
    {
      road: "AW",
      number: "3501",
      model: "SD40-2",
      locomotiveType: "DIESEL_ROAD" as const,
      serviceType: "ROAD_FREIGHT" as const,
      horsepower: 3000,
      dccAddress: 3501,
      hasSound: true,
      currentLocationId: locations["seed-loc-yard"].id,
    },
    {
      road: "AW",
      number: "1200",
      model: "GP38-2",
      locomotiveType: "DIESEL_SWITCHER" as const,
      serviceType: "YARD_SWITCHER" as const,
      horsepower: 2000,
      dccAddress: 1200,
      hasSound: true,
      currentLocationId: locations["seed-loc-yard"].id,
    },
  ];

  for (const loco of locoData) {
    await db.locomotive.upsert({
      where: {
        road_number_userId: { road: loco.road, number: loco.number, userId: user.id },
      },
      update: {},
      create: {
        ...loco,
        layoutId: layout.id,
        userId: user.id,
      },
    });
    console.log(`  Locomotive: ${loco.road} ${loco.number} (${loco.model})`);
  }

  // ── Freight Cars ──
  const freightData = [
    {
      reportingMarks: "AW",
      number: "10001",
      carType: "Hopper",
      aarTypeCode: "HT",
      capacity: 100,
      commodities: ["Coal"],
      currentLocationId: locations["seed-loc-siding"].id,
    },
    {
      reportingMarks: "AW",
      number: "10002",
      carType: "Hopper",
      aarTypeCode: "HT",
      capacity: 100,
      commodities: ["Coal"],
      currentLocationId: locations["seed-loc-siding"].id,
    },
    {
      reportingMarks: "CR",
      number: "223456",
      carType: "Boxcar",
      aarTypeCode: "XM",
      capacity: 70,
      homeRoad: "Conrail",
      commodities: ["Merchandise", "Auto Parts"],
      currentLocationId: locations["seed-loc-station"].id,
    },
    {
      reportingMarks: "UP",
      number: "98712",
      carType: "Gondola",
      aarTypeCode: "GB",
      capacity: 80,
      homeRoad: "Union Pacific",
      commodities: ["Scrap", "Steel"],
      currentLocationId: locations["seed-loc-interchange"].id,
    },
  ];

  for (const car of freightData) {
    await db.freightCar.upsert({
      where: {
        reportingMarks_number_userId: {
          reportingMarks: car.reportingMarks,
          number: car.number,
          userId: user.id,
        },
      },
      update: {},
      create: {
        ...car,
        layoutId: layout.id,
        userId: user.id,
      },
    });
    console.log(`  Freight Car: ${car.reportingMarks} ${car.number} (${car.carType})`);
  }

  console.log("\nSeed complete!");
  console.log(`  Login: ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
