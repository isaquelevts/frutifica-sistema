-- AlterTable
ALTER TABLE "cells" ADD COLUMN     "last_whatsapp_inbound_at" TIMESTAMP(3),
ADD COLUMN     "last_whatsapp_opt_out_prompt_at" TIMESTAMP(3),
ADD COLUMN     "leader_phone" TEXT,
ADD COLUMN     "whatsapp_notifications_paused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "happened" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "no_report_reason" TEXT,
ADD COLUMN     "photo_url" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_leader_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "cell_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "week_date" TEXT NOT NULL,
    "draft_participants" INTEGER,
    "draft_visitors" INTEGER,
    "reminded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_leader_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_leader_sessions_cell_id_key" ON "whatsapp_leader_sessions"("cell_id");

-- CreateIndex
CREATE INDEX "whatsapp_leader_sessions_phone_idx" ON "whatsapp_leader_sessions"("phone");

-- AddForeignKey
ALTER TABLE "whatsapp_leader_sessions" ADD CONSTRAINT "whatsapp_leader_sessions_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
