-- CreateEnum
CREATE TYPE "SwimOrgRole" AS ENUM ('admin', 'manager');

-- CreateEnum
CREATE TYPE "SwimInviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateTable
CREATE TABLE "SwimOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "website" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimOrgMember" (
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SwimOrgRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimOrgMember_pkey" PRIMARY KEY ("orgId","userId")
);

-- CreateTable
CREATE TABLE "SwimOrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SwimOrgRole" NOT NULL,
    "status" "SwimInviteStatus" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimOrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimTeam" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "SwimTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimMeet" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimMeet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimMeetTeam" (
    "meetId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "SwimMeetTeam_pkey" PRIMARY KEY ("meetId","teamId")
);

-- CreateTable
CREATE TABLE "SwimEvent" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "distanceYards" INTEGER NOT NULL,
    "stroke" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SwimEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimHeat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "heatNumber" INTEGER NOT NULL,
    "totalHeats" INTEGER NOT NULL,

    CONSTRAINT "SwimHeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimSwimmer" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "SwimSwimmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimEntry" (
    "id" TEXT NOT NULL,
    "heatId" TEXT NOT NULL,
    "swimmerId" TEXT NOT NULL,
    "lane" INTEGER NOT NULL,
    "seedTimeDisplay" TEXT NOT NULL,
    "seedTimeSeconds" DOUBLE PRECISION,
    "isAlternate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SwimEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimOrgFollower" (
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "emailMeetUpdates" BOOLEAN NOT NULL DEFAULT true,
    "savedSwimmerIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimOrgFollower_pkey" PRIMARY KEY ("userId","orgId")
);

-- CreateTable
CREATE TABLE "SwimImportLog" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwimOrganization_slug_key" ON "SwimOrganization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SwimOrgInvite_token_key" ON "SwimOrgInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SwimOrgInvite_orgId_email_key" ON "SwimOrgInvite"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SwimTeam_code_key" ON "SwimTeam"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SwimMeet_slug_key" ON "SwimMeet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SwimEvent_meetId_number_key" ON "SwimEvent"("meetId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SwimHeat_eventId_heatNumber_key" ON "SwimHeat"("eventId", "heatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SwimSwimmer_meetId_lastName_firstName_age_teamId_key" ON "SwimSwimmer"("meetId", "lastName", "firstName", "age", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "SwimEntry_heatId_lane_key" ON "SwimEntry"("heatId", "lane");

-- AddForeignKey
ALTER TABLE "SwimOrgMember" ADD CONSTRAINT "SwimOrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimOrgMember" ADD CONSTRAINT "SwimOrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimOrgInvite" ADD CONSTRAINT "SwimOrgInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimMeet" ADD CONSTRAINT "SwimMeet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimMeetTeam" ADD CONSTRAINT "SwimMeetTeam_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "SwimMeet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimMeetTeam" ADD CONSTRAINT "SwimMeetTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SwimTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimEvent" ADD CONSTRAINT "SwimEvent_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "SwimMeet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimHeat" ADD CONSTRAINT "SwimHeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SwimEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimSwimmer" ADD CONSTRAINT "SwimSwimmer_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "SwimMeet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimSwimmer" ADD CONSTRAINT "SwimSwimmer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SwimTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimEntry" ADD CONSTRAINT "SwimEntry_heatId_fkey" FOREIGN KEY ("heatId") REFERENCES "SwimHeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimEntry" ADD CONSTRAINT "SwimEntry_swimmerId_fkey" FOREIGN KEY ("swimmerId") REFERENCES "SwimSwimmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimOrgFollower" ADD CONSTRAINT "SwimOrgFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimOrgFollower" ADD CONSTRAINT "SwimOrgFollower_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimImportLog" ADD CONSTRAINT "SwimImportLog_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "SwimMeet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
