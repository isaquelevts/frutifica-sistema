-- CreateTable
CREATE TABLE "consolidacao_pessoas" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birth_date" TEXT,
    "gender" TEXT,
    "marital_status" TEXT,
    "neighborhood" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'visitante',
    "visit_date" TEXT NOT NULL,
    "service" TEXT,
    "how_found" TEXT,
    "invited_by" TEXT,
    "prayer_request" TEXT,
    "notes" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'novo',
    "lost_reason" TEXT,
    "assigned_to_id" UUID,
    "created_by_id" UUID,
    "cell_id" UUID,
    "contacted_at" TIMESTAMP(3),
    "invited_at" TIMESTAMP(3),
    "in_cell_at" TIMESTAMP(3),
    "consolidated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "last_contact_at" TIMESTAMP(3),
    "next_action_date" TEXT,
    "next_action_note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidacao_pessoas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidacao_atividades" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "user_id" UUID,
    "type" TEXT NOT NULL,
    "outcome" TEXT,
    "note" TEXT,
    "from_stage" TEXT,
    "to_stage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consolidacao_atividades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consolidacao_pessoas_organization_id_stage_idx" ON "consolidacao_pessoas"("organization_id", "stage");

-- CreateIndex
CREATE INDEX "consolidacao_pessoas_assigned_to_id_idx" ON "consolidacao_pessoas"("assigned_to_id");

-- CreateIndex
CREATE INDEX "consolidacao_atividades_person_id_created_at_idx" ON "consolidacao_atividades"("person_id", "created_at");

-- CreateIndex
CREATE INDEX "consolidacao_atividades_organization_id_created_at_idx" ON "consolidacao_atividades"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "consolidacao_pessoas" ADD CONSTRAINT "consolidacao_pessoas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_pessoas" ADD CONSTRAINT "consolidacao_pessoas_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_pessoas" ADD CONSTRAINT "consolidacao_pessoas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_pessoas" ADD CONSTRAINT "consolidacao_pessoas_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "cells"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_atividades" ADD CONSTRAINT "consolidacao_atividades_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_atividades" ADD CONSTRAINT "consolidacao_atividades_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "consolidacao_pessoas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidacao_atividades" ADD CONSTRAINT "consolidacao_atividades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

