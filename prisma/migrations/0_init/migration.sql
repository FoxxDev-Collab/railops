[dotenv@17.2.3] injecting env (20) from .env.local -- tip: 🗂️ backup and recover secrets: https://dotenvx.com/ops
Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('PASSENGER_STATION', 'YARD', 'INTERCHANGE', 'JUNCTION', 'STAGING', 'TEAM_TRACK', 'SIDING');

-- CreateEnum
CREATE TYPE "YardTrackType" AS ENUM ('ARRIVAL', 'CLASSIFICATION', 'DEPARTURE', 'LEAD', 'RIP', 'ENGINE_SERVICE', 'CABOOSE', 'RUNAROUND', 'SWITCHER_POCKET');

-- CreateEnum
CREATE TYPE "LocomotiveType" AS ENUM ('STEAM', 'DIESEL_SWITCHER', 'DIESEL_ROAD', 'DIESEL_CAB', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "LocomotiveService" AS ENUM ('ROAD_FREIGHT', 'PASSENGER', 'YARD_SWITCHER', 'HELPER');

-- CreateEnum
CREATE TYPE "RollingStockStatus" AS ENUM ('SERVICEABLE', 'BAD_ORDER', 'STORED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PassengerCarType" AS ENUM ('COACH', 'SLEEPER', 'DINER', 'LOUNGE', 'BAGGAGE', 'RPO', 'COMBINE', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "ClassOfService" AS ENUM ('FIRST', 'BUSINESS', 'COACH');

-- CreateEnum
CREATE TYPE "CabooseType" AS ENUM ('STANDARD', 'EXTENDED_VISION', 'BAY_WINDOW', 'TRANSFER', 'BOBBER');

-- CreateEnum
CREATE TYPE "MOWEquipmentType" AS ENUM ('BALLAST_CAR', 'CRANE', 'TOOL_CAR', 'TAMPER', 'SPREADER', 'FLAT_WITH_RAILS', 'WEED_SPRAYER', 'SCALE_TEST', 'OTHER');

-- CreateEnum
CREATE TYPE "SilhouetteCategory" AS ENUM ('DIESEL_GP', 'DIESEL_SD', 'DIESEL_ERA', 'STEAM', 'FREIGHT_CAR', 'PASSENGER_CAR', 'CABOOSE', 'MOW');

-- CreateEnum
CREATE TYPE "TrainClass" AS ENUM ('MANIFEST', 'UNIT', 'INTERMODAL', 'LOCAL', 'PASSENGER', 'WORK', 'LIGHT_ENGINE');

-- CreateEnum
CREATE TYPE "TrainServiceType" AS ENUM ('FREIGHT', 'PASSENGER', 'MIXED', 'MOW');

-- CreateEnum
CREATE TYPE "WaybillStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED_EMPTY');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('LOADED', 'EMPTY');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'REPAIR', 'INSPECTION', 'CLEANING', 'WEATHERING', 'DCC_PROGRAMMING');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LOCOMOTIVE', 'FREIGHT_CAR', 'PASSENGER_CAR', 'MOW_EQUIPMENT', 'CABOOSE');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "selectedLayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "planExpiresAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scale" TEXT,
    "era" TEXT,
    "imageUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "layoutId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" INTEGER,
    "typeAttributes" JSONB,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinX" DOUBLE PRECISION,
    "pinY" DOUBLE PRECISION,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Industry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "spotCount" INTEGER,
    "trackLength" DOUBLE PRECISION,
    "description" TEXT,
    "commoditiesIn" TEXT[],
    "commoditiesOut" TEXT[],
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YardTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackType" "YardTrackType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "length" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YardTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Silhouette" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "SilhouetteCategory" NOT NULL,
    "filePath" TEXT NOT NULL,
    "darkPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Silhouette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Locomotive" (
    "id" TEXT NOT NULL,
    "road" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "locomotiveType" "LocomotiveType" NOT NULL,
    "serviceType" "LocomotiveService" NOT NULL DEFAULT 'ROAD_FREIGHT',
    "horsepower" INTEGER,
    "status" "RollingStockStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "dccAddress" INTEGER,
    "decoderManufacturer" TEXT,
    "decoderModel" TEXT,
    "hasSound" BOOLEAN NOT NULL DEFAULT false,
    "length" DOUBLE PRECISION,
    "fuelType" TEXT,
    "canPull" INTEGER,
    "imageUrl" TEXT,
    "silhouetteId" TEXT,
    "currentLocationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Locomotive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightCar" (
    "id" TEXT NOT NULL,
    "reportingMarks" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "carType" TEXT NOT NULL,
    "aarTypeCode" TEXT,
    "subtype" TEXT,
    "length" DOUBLE PRECISION,
    "capacity" INTEGER,
    "homeRoad" TEXT,
    "status" "RollingStockStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "commodities" TEXT[],
    "imageUrl" TEXT,
    "silhouetteId" TEXT,
    "currentLocationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreightCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassengerCar" (
    "id" TEXT NOT NULL,
    "reportingMarks" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "carName" TEXT,
    "carType" "PassengerCarType" NOT NULL,
    "seats" INTEGER,
    "berths" INTEGER,
    "classOfService" "ClassOfService" NOT NULL DEFAULT 'COACH',
    "length" DOUBLE PRECISION,
    "status" "RollingStockStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "imageUrl" TEXT,
    "silhouetteId" TEXT,
    "currentLocationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerCar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MOWEquipment" (
    "id" TEXT NOT NULL,
    "reportingMarks" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "equipmentType" "MOWEquipmentType" NOT NULL,
    "description" TEXT,
    "length" DOUBLE PRECISION,
    "status" "RollingStockStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "imageUrl" TEXT,
    "silhouetteId" TEXT,
    "currentLocationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MOWEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caboose" (
    "id" TEXT NOT NULL,
    "reportingMarks" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "cabooseType" "CabooseType" NOT NULL DEFAULT 'STANDARD',
    "road" TEXT,
    "length" DOUBLE PRECISION,
    "status" "RollingStockStatus" NOT NULL DEFAULT 'SERVICEABLE',
    "imageUrl" TEXT,
    "silhouetteId" TEXT,
    "currentLocationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caboose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Train" (
    "id" TEXT NOT NULL,
    "trainNumber" TEXT NOT NULL,
    "trainName" TEXT,
    "trainClass" "TrainClass" NOT NULL DEFAULT 'MANIFEST',
    "serviceType" "TrainServiceType" NOT NULL DEFAULT 'FREIGHT',
    "departureTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "symbol" TEXT,
    "description" TEXT,
    "originId" TEXT,
    "destinationId" TEXT,
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Train_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainStop" (
    "id" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "instructions" TEXT,
    "trainId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainConsist" (
    "id" TEXT NOT NULL,
    "trainId" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainConsist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsistPosition" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "facing" TEXT,
    "consistId" TEXT NOT NULL,
    "locomotiveId" TEXT,
    "freightCarId" TEXT,
    "passengerCarId" TEXT,
    "mowEquipmentId" TEXT,
    "cabooseId" TEXT,
    "carCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsistPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waybill" (
    "id" TEXT NOT NULL,
    "status" "WaybillStatus" NOT NULL DEFAULT 'PENDING',
    "currentPanel" INTEGER NOT NULL DEFAULT 1,
    "isReturnable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waybill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaybillPanel" (
    "id" TEXT NOT NULL,
    "panelNumber" INTEGER NOT NULL,
    "loadStatus" "LoadStatus" NOT NULL,
    "commodity" TEXT,
    "weight" DOUBLE PRECISION,
    "specialInstructions" TEXT,
    "routeVia" TEXT,
    "waybillId" TEXT NOT NULL,
    "originId" TEXT,
    "shipperIndustryId" TEXT,
    "destinationId" TEXT,
    "consigneeIndustryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaybillPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarCard" (
    "id" TEXT NOT NULL,
    "freightCarId" TEXT NOT NULL,
    "waybillId" TEXT,
    "currentLocationId" TEXT,
    "currentYardTrackId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwitchList" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "consistId" TEXT NOT NULL,

    CONSTRAINT "SwitchList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwitchListEntry" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "carDescription" TEXT NOT NULL,
    "commodity" TEXT,
    "destinationDesc" TEXT,
    "trackAssignment" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "switchListId" TEXT NOT NULL,
    "trainStopId" TEXT,
    "carCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwitchListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatingSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "layoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTrain" (
    "id" TEXT NOT NULL,
    "status" TEXT,
    "sessionId" TEXT NOT NULL,
    "trainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "locomotiveId" TEXT,
    "freightCarId" TEXT,
    "passengerCarId" TEXT,
    "mowEquipmentId" TEXT,
    "cabooseId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadOrder" (
    "id" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "defectDescription" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedDate" TIMESTAMP(3),
    "resolution" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "locationId" TEXT,
    "locomotiveId" TEXT,
    "freightCarId" TEXT,
    "passengerCarId" TEXT,
    "mowEquipmentId" TEXT,
    "cabooseId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_email_type_idx" ON "VerificationToken"("email", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubId_key" ON "User"("stripeSubId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Layout_userId_idx" ON "Layout"("userId");

-- CreateIndex
CREATE INDEX "CrewMember_userId_idx" ON "CrewMember"("userId");

-- CreateIndex
CREATE INDEX "CrewMember_layoutId_idx" ON "CrewMember"("layoutId");

-- CreateIndex
CREATE INDEX "CrewMember_roleId_idx" ON "CrewMember"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_userId_layoutId_key" ON "CrewMember"("userId", "layoutId");

-- CreateIndex
CREATE INDEX "Role_layoutId_idx" ON "Role"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_layoutId_name_key" ON "Role"("layoutId", "name");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_section_key" ON "RolePermission"("roleId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_code_key" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "InviteLink_layoutId_idx" ON "InviteLink"("layoutId");

-- CreateIndex
CREATE INDEX "InviteLink_code_idx" ON "InviteLink"("code");

-- CreateIndex
CREATE INDEX "Location_userId_layoutId_idx" ON "Location"("userId", "layoutId");

-- CreateIndex
CREATE INDEX "Location_locationType_idx" ON "Location"("locationType");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_layoutId_key" ON "Location"("code", "layoutId");

-- CreateIndex
CREATE INDEX "Industry_userId_locationId_idx" ON "Industry"("userId", "locationId");

-- CreateIndex
CREATE INDEX "YardTrack_userId_locationId_idx" ON "YardTrack"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Silhouette_slug_key" ON "Silhouette"("slug");

-- CreateIndex
CREATE INDEX "Silhouette_category_idx" ON "Silhouette"("category");

-- CreateIndex
CREATE INDEX "Locomotive_userId_layoutId_idx" ON "Locomotive"("userId", "layoutId");

-- CreateIndex
CREATE INDEX "Locomotive_status_idx" ON "Locomotive"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Locomotive_road_number_userId_key" ON "Locomotive"("road", "number", "userId");

-- CreateIndex
CREATE INDEX "FreightCar_userId_layoutId_idx" ON "FreightCar"("userId", "layoutId");

-- CreateIndex
CREATE INDEX "FreightCar_status_idx" ON "FreightCar"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FreightCar_reportingMarks_number_userId_key" ON "FreightCar"("reportingMarks", "number", "userId");

-- CreateIndex
CREATE INDEX "PassengerCar_userId_layoutId_idx" ON "PassengerCar"("userId", "layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "PassengerCar_reportingMarks_number_userId_key" ON "PassengerCar"("reportingMarks", "number", "userId");

-- CreateIndex
CREATE INDEX "MOWEquipment_userId_layoutId_idx" ON "MOWEquipment"("userId", "layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "MOWEquipment_reportingMarks_number_userId_key" ON "MOWEquipment"("reportingMarks", "number", "userId");

-- CreateIndex
CREATE INDEX "Caboose_userId_layoutId_idx" ON "Caboose"("userId", "layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Caboose_reportingMarks_number_userId_key" ON "Caboose"("reportingMarks", "number", "userId");

-- CreateIndex
CREATE INDEX "Train_userId_layoutId_idx" ON "Train"("userId", "layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Train_trainNumber_layoutId_key" ON "Train"("trainNumber", "layoutId");

-- CreateIndex
CREATE INDEX "TrainStop_trainId_idx" ON "TrainStop"("trainId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainStop_trainId_stopOrder_key" ON "TrainStop"("trainId", "stopOrder");

-- CreateIndex
CREATE INDEX "TrainConsist_trainId_idx" ON "TrainConsist"("trainId");

-- CreateIndex
CREATE INDEX "TrainConsist_sessionId_idx" ON "TrainConsist"("sessionId");

-- CreateIndex
CREATE INDEX "ConsistPosition_consistId_idx" ON "ConsistPosition"("consistId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsistPosition_consistId_position_key" ON "ConsistPosition"("consistId", "position");

-- CreateIndex
CREATE INDEX "Waybill_userId_idx" ON "Waybill"("userId");

-- CreateIndex
CREATE INDEX "Waybill_status_idx" ON "Waybill"("status");

-- CreateIndex
CREATE INDEX "WaybillPanel_waybillId_idx" ON "WaybillPanel"("waybillId");

-- CreateIndex
CREATE UNIQUE INDEX "WaybillPanel_waybillId_panelNumber_key" ON "WaybillPanel"("waybillId", "panelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CarCard_freightCarId_key" ON "CarCard"("freightCarId");

-- CreateIndex
CREATE UNIQUE INDEX "CarCard_waybillId_key" ON "CarCard"("waybillId");

-- CreateIndex
CREATE INDEX "CarCard_userId_idx" ON "CarCard"("userId");

-- CreateIndex
CREATE INDEX "SwitchList_consistId_idx" ON "SwitchList"("consistId");

-- CreateIndex
CREATE INDEX "SwitchListEntry_switchListId_idx" ON "SwitchListEntry"("switchListId");

-- CreateIndex
CREATE INDEX "OperatingSession_userId_layoutId_idx" ON "OperatingSession"("userId", "layoutId");

-- CreateIndex
CREATE INDEX "OperatingSession_date_idx" ON "OperatingSession"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTrain_sessionId_trainId_key" ON "SessionTrain"("sessionId", "trainId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_userId_idx" ON "MaintenanceTask"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_assetType_status_idx" ON "MaintenanceTask"("assetType", "status");

-- CreateIndex
CREATE INDEX "BadOrder_userId_idx" ON "BadOrder"("userId");

-- CreateIndex
CREATE INDEX "BadOrder_isResolved_idx" ON "BadOrder"("isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedLayoutId_fkey" FOREIGN KEY ("selectedLayoutId") REFERENCES "Layout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Industry" ADD CONSTRAINT "Industry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Industry" ADD CONSTRAINT "Industry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YardTrack" ADD CONSTRAINT "YardTrack_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YardTrack" ADD CONSTRAINT "YardTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locomotive" ADD CONSTRAINT "Locomotive_silhouetteId_fkey" FOREIGN KEY ("silhouetteId") REFERENCES "Silhouette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locomotive" ADD CONSTRAINT "Locomotive_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locomotive" ADD CONSTRAINT "Locomotive_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Locomotive" ADD CONSTRAINT "Locomotive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightCar" ADD CONSTRAINT "FreightCar_silhouetteId_fkey" FOREIGN KEY ("silhouetteId") REFERENCES "Silhouette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightCar" ADD CONSTRAINT "FreightCar_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightCar" ADD CONSTRAINT "FreightCar_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreightCar" ADD CONSTRAINT "FreightCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerCar" ADD CONSTRAINT "PassengerCar_silhouetteId_fkey" FOREIGN KEY ("silhouetteId") REFERENCES "Silhouette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerCar" ADD CONSTRAINT "PassengerCar_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerCar" ADD CONSTRAINT "PassengerCar_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerCar" ADD CONSTRAINT "PassengerCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOWEquipment" ADD CONSTRAINT "MOWEquipment_silhouetteId_fkey" FOREIGN KEY ("silhouetteId") REFERENCES "Silhouette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOWEquipment" ADD CONSTRAINT "MOWEquipment_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOWEquipment" ADD CONSTRAINT "MOWEquipment_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOWEquipment" ADD CONSTRAINT "MOWEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caboose" ADD CONSTRAINT "Caboose_silhouetteId_fkey" FOREIGN KEY ("silhouetteId") REFERENCES "Silhouette"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caboose" ADD CONSTRAINT "Caboose_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caboose" ADD CONSTRAINT "Caboose_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caboose" ADD CONSTRAINT "Caboose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Train" ADD CONSTRAINT "Train_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainStop" ADD CONSTRAINT "TrainStop_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainStop" ADD CONSTRAINT "TrainStop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainConsist" ADD CONSTRAINT "TrainConsist_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainConsist" ADD CONSTRAINT "TrainConsist_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OperatingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_consistId_fkey" FOREIGN KEY ("consistId") REFERENCES "TrainConsist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_locomotiveId_fkey" FOREIGN KEY ("locomotiveId") REFERENCES "Locomotive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_freightCarId_fkey" FOREIGN KEY ("freightCarId") REFERENCES "FreightCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_passengerCarId_fkey" FOREIGN KEY ("passengerCarId") REFERENCES "PassengerCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_mowEquipmentId_fkey" FOREIGN KEY ("mowEquipmentId") REFERENCES "MOWEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_cabooseId_fkey" FOREIGN KEY ("cabooseId") REFERENCES "Caboose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsistPosition" ADD CONSTRAINT "ConsistPosition_carCardId_fkey" FOREIGN KEY ("carCardId") REFERENCES "CarCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Waybill" ADD CONSTRAINT "Waybill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaybillPanel" ADD CONSTRAINT "WaybillPanel_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "Waybill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaybillPanel" ADD CONSTRAINT "WaybillPanel_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaybillPanel" ADD CONSTRAINT "WaybillPanel_shipperIndustryId_fkey" FOREIGN KEY ("shipperIndustryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaybillPanel" ADD CONSTRAINT "WaybillPanel_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaybillPanel" ADD CONSTRAINT "WaybillPanel_consigneeIndustryId_fkey" FOREIGN KEY ("consigneeIndustryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCard" ADD CONSTRAINT "CarCard_freightCarId_fkey" FOREIGN KEY ("freightCarId") REFERENCES "FreightCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCard" ADD CONSTRAINT "CarCard_waybillId_fkey" FOREIGN KEY ("waybillId") REFERENCES "Waybill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCard" ADD CONSTRAINT "CarCard_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCard" ADD CONSTRAINT "CarCard_currentYardTrackId_fkey" FOREIGN KEY ("currentYardTrackId") REFERENCES "YardTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarCard" ADD CONSTRAINT "CarCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchList" ADD CONSTRAINT "SwitchList_consistId_fkey" FOREIGN KEY ("consistId") REFERENCES "TrainConsist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchListEntry" ADD CONSTRAINT "SwitchListEntry_switchListId_fkey" FOREIGN KEY ("switchListId") REFERENCES "SwitchList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchListEntry" ADD CONSTRAINT "SwitchListEntry_trainStopId_fkey" FOREIGN KEY ("trainStopId") REFERENCES "TrainStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwitchListEntry" ADD CONSTRAINT "SwitchListEntry_carCardId_fkey" FOREIGN KEY ("carCardId") REFERENCES "CarCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingSession" ADD CONSTRAINT "OperatingSession_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "Layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatingSession" ADD CONSTRAINT "OperatingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTrain" ADD CONSTRAINT "SessionTrain_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OperatingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTrain" ADD CONSTRAINT "SessionTrain_trainId_fkey" FOREIGN KEY ("trainId") REFERENCES "Train"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_locomotiveId_fkey" FOREIGN KEY ("locomotiveId") REFERENCES "Locomotive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_freightCarId_fkey" FOREIGN KEY ("freightCarId") REFERENCES "FreightCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_passengerCarId_fkey" FOREIGN KEY ("passengerCarId") REFERENCES "PassengerCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_mowEquipmentId_fkey" FOREIGN KEY ("mowEquipmentId") REFERENCES "MOWEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_cabooseId_fkey" FOREIGN KEY ("cabooseId") REFERENCES "Caboose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_locomotiveId_fkey" FOREIGN KEY ("locomotiveId") REFERENCES "Locomotive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_freightCarId_fkey" FOREIGN KEY ("freightCarId") REFERENCES "FreightCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_passengerCarId_fkey" FOREIGN KEY ("passengerCarId") REFERENCES "PassengerCar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_mowEquipmentId_fkey" FOREIGN KEY ("mowEquipmentId") REFERENCES "MOWEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_cabooseId_fkey" FOREIGN KEY ("cabooseId") REFERENCES "Caboose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadOrder" ADD CONSTRAINT "BadOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.2 -> 7.6.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

