-- CreateIndex
CREATE INDEX "Operation_statut_type_dateValeur_idx" ON "Operation"("statut", "type", "dateValeur");

-- CreateIndex
CREATE INDEX "Operation_createdById_idx" ON "Operation"("createdById");
