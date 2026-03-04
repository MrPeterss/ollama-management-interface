-- CreateTable
CREATE TABLE "ApiKeyUsageDaily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiKeyId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ApiKeyUsageDaily_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ApiKeyUsageDaily_apiKeyId_idx" ON "ApiKeyUsageDaily"("apiKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyUsageDaily_apiKeyId_date_key" ON "ApiKeyUsageDaily"("apiKeyId", "date");
