-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferredCoach" TEXT NOT NULL DEFAULT 'motivational',
    "distanceUnit" TEXT NOT NULL DEFAULT 'km',
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feedbackFrequency" TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "totalDistanceM" REAL NOT NULL DEFAULT 0,
    "totalDurationS" INTEGER NOT NULL DEFAULT 0,
    "avgPaceSPerKm" REAL,
    "maxPaceSPerKm" REAL,
    "elevationGainM" REAL NOT NULL DEFAULT 0,
    "caloriesEst" REAL,
    "title" TEXT,
    "notes" TEXT,
    "coachPersonality" TEXT,
    CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "altitude" REAL,
    "accuracy" REAL,
    "speed" REAL,
    "heading" REAL,
    "distanceFromPrevM" REAL,
    "paceAtPointSPerKm" REAL,
    CONSTRAINT "RunPoint_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunSplit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "splitNumber" INTEGER NOT NULL,
    "distanceM" REAL NOT NULL,
    "durationS" INTEGER NOT NULL,
    "avgPaceSPerKm" REAL NOT NULL,
    CONSTRAINT "RunSplit_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "vapiCallId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    CONSTRAINT "CoachingSession_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachingSessionId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "triggerType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    CONSTRAINT "CoachingFeedback_coachingSessionId_fkey" FOREIGN KEY ("coachingSessionId") REFERENCES "CoachingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "Run_userId_startedAt_idx" ON "Run"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "RunPoint_runId_timestamp_idx" ON "RunPoint"("runId", "timestamp");

-- CreateIndex
CREATE INDEX "RunSplit_runId_splitNumber_idx" ON "RunSplit"("runId", "splitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingSession_runId_key" ON "CoachingSession"("runId");

-- CreateIndex
CREATE INDEX "CoachingSession_userId_startedAt_idx" ON "CoachingSession"("userId", "startedAt");
