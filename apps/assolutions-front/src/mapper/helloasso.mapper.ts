// helloasso.mapper.ts

import { AdressePostale, CommandeAdhesion } from "@shared/lib/commande.interface";
import { HelloAssoCheckoutIntentRequest, HelloAssoPayer } from "../class/helloasso.types";


function buildAddressLine(adresse?: AdressePostale | null): string | undefined {
  if (!adresse) return undefined;
  return [
    adresse.numeroVoie,
    adresse.typeVoie,
    adresse.nomVoie,
    adresse.complement,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || undefined;
}

function normalizeEmail(email?: string | null): string | undefined {
  return email?.trim().toLowerCase() || undefined;
}

function safeString(value?: string | null): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function buildHelloAssoPayer(commande: CommandeAdhesion): HelloAssoPayer {
  return {
    firstName: commande.payeur.prenom.trim(),
    lastName: commande.payeur.nom.trim(),
    email: normalizeEmail(commande.payeur.email)!,
    address: buildAddressLine(commande.payeur.adresse),
    city: safeString(commande.payeur.adresse?.commune),
    zipCode: safeString(commande.payeur.adresse?.codePostal),
    country: safeString(commande.payeur.adresse?.pays) ?? 'France',
  };
}

export function buildHelloAssoPayload(
  commande: CommandeAdhesion,
  urls: { backUrl: string; errorUrl: string; returnUrl: string },
): HelloAssoCheckoutIntentRequest {
  const itemName =
    commande.adherents.length === 1
      ? `Adhésion ${commande.adherents[0].prenom} ${commande.adherents[0].nom}`
      : `Adhésions ${commande.adherents.length} personnes - ${commande.referenceCommande}`;

  return {
    totalAmount: commande.montantTotal,
    initialAmount: commande.montantTotal,
    itemName: itemName.slice(0, 250),
    backUrl: urls.backUrl,
    errorUrl: urls.errorUrl,
    returnUrl: urls.returnUrl,
    containsDonation: false,
    payer: buildHelloAssoPayer(commande),
    metadata: {
      referenceCommande: commande.referenceCommande,
      commandeId: commande.id ?? null,
      nbAdherents: commande.adherents.length,
      adherents: commande.adherents.map((a) => ({
        id: a.id ?? null,
        nom: a.nom,
        prenom: a.prenom,
        tarif: a.licence?.tarifLabel ?? null,
        montantTotal: a.montantTotal,
      })),
    },
  };
}