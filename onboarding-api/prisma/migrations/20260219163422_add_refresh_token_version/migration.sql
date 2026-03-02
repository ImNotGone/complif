-- Add refreshTokenVersion column for token invalidation on logout
ALTER TABLE "User" ADD COLUMN "refreshTokenVersion" INTEGER NOT NULL DEFAULT 0;
