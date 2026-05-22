-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MONITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "birthDate" TEXT,
    "color" TEXT,
    "weight" REAL,
    "photoUrl" TEXT,
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "notes" TEXT,
    "feedingInstructions" TEXT,
    "medications" TEXT,
    "allergies" TEXT,
    "vetName" TEXT,
    "vetPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dogId" TEXT NOT NULL,
    "checkIn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" DATETIME,
    "room" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stay_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dogId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "breakfastStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "breakfastQty" TEXT,
    "breakfastNotes" TEXT,
    "lunchStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lunchQty" TEXT,
    "lunchNotes" TEXT,
    "dinnerStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "dinnerQty" TEXT,
    "dinnerNotes" TEXT,
    "hasMedication" BOOLEAN NOT NULL DEFAULT false,
    "medicationGiven" BOOLEAN,
    "medicationNotes" TEXT,
    "mood" TEXT,
    "generalNotes" TEXT,
    "sentToWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyReport_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "participated" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportPhoto_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_dogId_date_key" ON "DailyReport"("dogId", "date");
