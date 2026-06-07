-- Wipe swim meet program data (user approved data deletion)
DELETE FROM "SwimEntry";
DELETE FROM "SwimHeat";
DELETE FROM "SwimEvent";
DELETE FROM "SwimSwimmer";
DELETE FROM "SwimImportLog";
DELETE FROM "SwimMeetTeam";
DELETE FROM "SwimMeet";

-- Extend org role enum
ALTER TYPE "SwimOrgRole" ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE "SwimOrgRole" ADD VALUE IF NOT EXISTS 'coach';
ALTER TYPE "SwimOrgRole" ADD VALUE IF NOT EXISTS 'guardian';
ALTER TYPE "SwimOrgRole" ADD VALUE IF NOT EXISTS 'student';

-- Follower saved IDs rename
ALTER TABLE "SwimOrgFollower" RENAME COLUMN "savedSwimmerIds" TO "savedStudentIds";

-- Restructure SwimEvent
ALTER TABLE "SwimEvent" DROP COLUMN "gender";
ALTER TABLE "SwimEvent" DROP COLUMN "ageGroup";
ALTER TABLE "SwimEvent" DROP COLUMN "distanceYards";
ALTER TABLE "SwimEvent" DROP COLUMN "stroke";
ALTER TABLE "SwimEvent" RENAME COLUMN "label" TO "title";

-- Restructure SwimHeat
ALTER TABLE "SwimHeat" DROP CONSTRAINT IF EXISTS "SwimHeat_eventId_heatNumber_key";
ALTER TABLE "SwimHeat" RENAME COLUMN "heatNumber" TO "number";
ALTER TABLE "SwimHeat" DROP COLUMN "totalHeats";
CREATE UNIQUE INDEX "SwimHeat_eventId_number_key" ON "SwimHeat"("eventId", "number");

-- Drop old participant tables
DROP TABLE "SwimEntry";
DROP TABLE "SwimSwimmer";

-- Org-scoped students
CREATE TABLE "SwimStudent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimStudent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SwimStudent_userId_key" ON "SwimStudent"("userId");
CREATE UNIQUE INDEX "SwimStudent_orgId_firstName_lastName_key" ON "SwimStudent"("orgId", "firstName", "lastName");

ALTER TABLE "SwimStudent" ADD CONSTRAINT "SwimStudent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimStudent" ADD CONSTRAINT "SwimStudent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Participants (replaces SwimEntry)
CREATE TABLE "SwimParticipant" (
    "id" TEXT NOT NULL,
    "heatId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teamId" TEXT,
    "lane" INTEGER NOT NULL,
    "seedTimeDisplay" TEXT NOT NULL,
    "seedTimeSeconds" DOUBLE PRECISION,
    "isAlternate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SwimParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SwimParticipant_heatId_lane_key" ON "SwimParticipant"("heatId", "lane");

ALTER TABLE "SwimParticipant" ADD CONSTRAINT "SwimParticipant_heatId_fkey" FOREIGN KEY ("heatId") REFERENCES "SwimHeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimParticipant" ADD CONSTRAINT "SwimParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SwimStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimParticipant" ADD CONSTRAINT "SwimParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SwimTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guardian-student bridge
CREATE TABLE "SwimGuardianStudent" (
    "orgId" TEXT NOT NULL,
    "guardianUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimGuardianStudent_pkey" PRIMARY KEY ("guardianUserId","studentId")
);

ALTER TABLE "SwimGuardianStudent" ADD CONSTRAINT "SwimGuardianStudent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimGuardianStudent" ADD CONSTRAINT "SwimGuardianStudent_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimGuardianStudent" ADD CONSTRAINT "SwimGuardianStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SwimStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coach cohorts
CREATE TABLE "SwimCohort" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SwimCohortMember" (
    "cohortId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimCohortMember_pkey" PRIMARY KEY ("cohortId","studentId")
);

ALTER TABLE "SwimCohort" ADD CONSTRAINT "SwimCohort_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "SwimOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimCohort" ADD CONSTRAINT "SwimCohort_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimCohortMember" ADD CONSTRAINT "SwimCohortMember_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "SwimCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SwimCohortMember" ADD CONSTRAINT "SwimCohortMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "SwimStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
