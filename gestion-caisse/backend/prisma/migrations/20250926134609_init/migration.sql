-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PERCEPTEUR',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'SOUMIS',
    "devise" TEXT NOT NULL,
    "montantCents" INTEGER NOT NULL,
    "dateValeur" DATETIME NOT NULL,
    "payeur" TEXT,
    "motif" TEXT,
    "benef" TEXT,
    "objet" TEXT,
    "mode" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME,
    "canceledAt" DATETIME,
    CONSTRAINT "Operation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "refId" TEXT,
    "devise" TEXT,
    "montantCents" INTEGER,
    "motif" TEXT,
    "meta" TEXT,
    CONSTRAINT "History_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "History_refId_fkey" FOREIGN KEY ("refId") REFERENCES "Operation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "payload" TEXT,
    CONSTRAINT "AdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");
