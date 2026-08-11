import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';

const FFRS_HEADERS = [
  'numero-de-licence-obligatoire-si-deja-licenciee',
  'civilite',
  'lastname',
  'firstname',
  'sexe',
  'date-de-naissance-de-ladherent',
  'pays-de-naissance-de-ladherent',
  'nationalite-de-ladherent',
  'droit-a-limage-jautorise-le-club-la-federation-ou-ses-liguescomites-departementaux-a-utiliser-sur-ses-supports-de-communication-ma-photo-didentite-inseree-sur-la-licence-a-des-fins-exclusives-de-promotion-de-ses-activites-et-a-des-fins-non',
  'collecte-et-traitement-de-mes-donnees-dans-les-conditions-de-la-charte-dans-la-poursuite-des-finalites-de-loutil-de-gestion-de-licences-a-defaut-le-service-de-licence-dematerialisee-ne-me-sera-pas-accessible',
  'je-ou-son-representant-legal-donne-mon-consentement-a-la-reception-par-voie-electronique-de-newsletters-et-dinformations-federales',
  'je-ou-son-representant-legal-donne-mon-consentement-a-la-reception-par-voie-electronique-doffres-commerciales',
  'protection-des-donnees-personnelles-pour-la-souscription-a-une-licence-aupres-de-la-federation-francaise-de-roller-et-skateboard-voir-informations-page-precedente',
  'numero-de-voie',
  'type-de-voie',
  'nom-de-la-voie',
  'complement',
  'code-postal',
  'commune',
  'pays',
  'email-de-ladherent',
  'telephone-de-ladherent',
  'telephone-mobile',
  'nom-du-tuteur-legal-1-obligatoire-si-adherent-mineur',
  'prenom-du-tuteur-legal-1-obligatoire-si-adherent-mineur',
  'telephone-du-tuteur-legal-1-obligatoire-si-adherent-mineur',
  'email-du-tuteur-legal-1-obligatoire-si-adherent-mineur',
  'nom-du-tuteur-legal-2-obligatoire-si-adherent-mineur',
  'prenom-du-tuteur-legal-2-obligatoire-si-adherent-mineur',
  'telephone-du-tuteur-legal-2-obligatoire-si-adherent-mineur',
  'email-du-tuteur-legal-2-obligatoire-si-adherent-mineur',
  'photo-didentite-pour-la-competition-uniquement',
] as const;

type Scalar = string | number | boolean | null | undefined;

type PersonRow = {
  id: number;
  compte: number;
  date_naissance: string;
  last_name: string;
  first_name: string;
  gender: boolean;
  address: string;
  pays: string | null;
};

type ContactRow = {
  object_id: number;
  contact_type: string;
  contact_value: string | null;
  contact_list: string;
  info: string | null;
  pref: boolean;
};

type AddInfoRow = {
  id: number;
  object_id: number;
  value_type: string;
  text: string;
};

type RequirementResponseRow = {
  personne_id: number;
  code: string | null;
  libelle: string | null;
  source_code: string | null;
  valeur_boolean: boolean | null;
  valeur_texte: string | null;
  valeur_date: string | null;
};

type PhotoRow = {
  objet_id: number;
};

type MedicalRow = {
  objet_id: number;
  date_document: string | null;
};

export interface FfrsExportResult {
  headers: string[];
  rows: Array<Array<string | number>>;
  warnings: string[];
  medicalCertificateDates: Record<number, string | null>;
}

@Injectable()
export class FfrsExportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async build(
    rawIds: number[],
    projectId: number,
    saisonId: number | null,
    publicBaseUrl: string,
  ): Promise<FfrsExportResult> {
    const ids = this.cleanIds(rawIds);
    if (!ids.length) {
      return { headers: [...FFRS_HEADERS], rows: [], warnings: [], medicalCertificateDates: {} };
    }

    const personnes = (await this.dataSource.query(
      `
        SELECT p.id, p.compte, p.date_naissance, p.last_name, p.first_name,
               p.gender, p.address, p.pays
        FROM personne p
        INNER JOIN login_project lp
          ON lp.login_id = p.compte
         AND lp.project_id = $1
        WHERE p.id = ANY($2::int[])
        ORDER BY p.last_name, p.first_name, p.id
      `,
      [projectId, ids],
    )) as PersonRow[];

    const allowedIds = personnes.map((p) => Number(p.id));
    if (!allowedIds.length) {
      return { headers: [...FFRS_HEADERS], rows: [], warnings: [], medicalCertificateDates: {} };
    }

    const accountIds = [...new Set(personnes.map((p) => Number(p.compte)).filter(Boolean))];

    const [familyPersons, addInfoFields, addInfoValues, photos, medicalDocs, requirementResponses] =
      await Promise.all([
        accountIds.length
          ? (this.dataSource.query(
              `
                SELECT p.id, p.compte, p.date_naissance, p.last_name, p.first_name,
                       p.gender, p.address, p.pays
                FROM personne p
                INNER JOIN login_project lp
                  ON lp.login_id = p.compte
                 AND lp.project_id = $1
                WHERE p.compte = ANY($2::int[])
                  AND COALESCE(p.archive, false) = false
                ORDER BY p.compte, p.date_naissance, p.last_name, p.first_name
              `,
              [projectId, accountIds],
            ) as Promise<PersonRow[]>)
          : Promise.resolve([] as PersonRow[]),
        this.dataSource.query(
          `
            SELECT id, object_id, value_type, text
            FROM addinfo
            WHERE project_id = $1
              AND object_type = 'PERSONNE'
              AND object_id = 0
            ORDER BY id
          `,
          [projectId],
        ) as Promise<AddInfoRow[]>,
        this.dataSource.query(
          `
            SELECT id, object_id, value_type, text
            FROM addinfo
            WHERE project_id = $1
              AND object_type = 'PERSONNE'
              AND object_id = ANY($2::int[])
            ORDER BY id
          `,
          [projectId, allowedIds],
        ) as Promise<AddInfoRow[]>,
        this.dataSource.query(
          `
            SELECT DISTINCT ON (objet_id) objet_id
            FROM document
            WHERE objet_type = 'member'
              AND LOWER(typedoc) = 'photo'
              AND objet_id = ANY($1::int[])
              AND (project_id = $2 OR project_id IS NULL)
              AND file_data IS NOT NULL
            ORDER BY objet_id, date_import DESC, id DESC
          `,
          [allowedIds, projectId],
        ) as Promise<PhotoRow[]>,
        this.dataSource.query(
          `
            SELECT DISTINCT ON (objet_id) objet_id, date_document
            FROM document
            WHERE objet_type = 'rider'
              AND objet_id = ANY($1::int[])
              AND (project_id = $2 OR project_id IS NULL)
              AND (
                LOWER(typedoc) IN ('certificat_medical', 'certificat-medical', 'certificatmedical', 'medical_certificate', 'certificat')
                OR LOWER(titre) LIKE '%certificat%médical%'
                OR LOWER(titre) LIKE '%certificat%medical%'
              )
            ORDER BY objet_id, COALESCE(date_document, date_import::date) DESC, date_import DESC, id DESC
          `,
          [allowedIds, projectId],
        ) as Promise<MedicalRow[]>,
        saisonId
          ? (this.dataSource.query(
              `
                SELECT r.personne_id, e.code, e.libelle, e.source_code,
                       r.valeur_boolean, r.valeur_texte, r.valeur_date
                FROM reponse_exigence_dossier r
                INNER JOIN exigence_dossier e ON e.id = r.exigence_id
                WHERE r.personne_id = ANY($1::int[])
                  AND r.saison_id = $2
                  AND e.project_id = $3
                ORDER BY r.personne_id, COALESCE(r.updated_at, r.date_reponse) DESC
              `,
              [allowedIds, saisonId, projectId],
            ) as Promise<RequirementResponseRow[]>)
          : Promise.resolve([] as RequirementResponseRow[]),
      ]);

    const allPersonIds = this.cleanIds([
      ...allowedIds,
      ...familyPersons.map((p) => Number(p.id)),
    ]);

    const contacts = (await this.dataSource.query(
      `
        SELECT object_id, contact_type, contact_value, contact_list, info, pref
        FROM contacts
        WHERE object_type = 'rider'
          AND object_id = ANY($1::int[])
        ORDER BY object_id, pref DESC, id ASC
      `,
      [allPersonIds],
    )) as ContactRow[];

    const contactsByPerson = this.groupBy(contacts, (x) => Number(x.object_id));
    const familyByAccount = this.groupBy(familyPersons, (x) => Number(x.compte));
    const fieldsById = new Map(addInfoFields.map((x) => [String(x.id), x]));
    const valuesByPerson = this.groupBy(addInfoValues, (x) => Number(x.object_id));
    const responsesByPerson = this.groupBy(requirementResponses, (x) => Number(x.personne_id));
    const photoIds = new Set(photos.map((x) => Number(x.objet_id)));
    const medicalByPerson = new Map(medicalDocs.map((x) => [Number(x.objet_id), x.date_document ?? null]));

    const warnings: string[] = [];
    const medicalCertificateDates: Record<number, string | null> = {};
    const rows = personnes.map((personne) => {
      const extras = this.buildExtraMap(valuesByPerson.get(personne.id) ?? [], fieldsById);
      const responses = this.buildResponseMap(responsesByPerson.get(personne.id) ?? []);
      const contactsForPerson = contactsByPerson.get(personne.id) ?? [];
      const address = this.parseAddress(personne.address, personne.pays ?? 'France');
      const phones = this.pickPhones(contactsForPerson);
      const guardians = this.pickGuardians(
        personne,
        familyByAccount.get(Number(personne.compte)) ?? [],
        contactsByPerson,
      );
      const photoUrl = photoIds.has(personne.id)
        ? this.buildSignedPhotoUrl(personne.id, projectId, publicBaseUrl)
        : '';

      const licence = this.pickExtra(extras, [
        'numero licence',
        'num licence',
        'n licence',
        'licence ffrs',
        'licence',
      ]);
      const birthCountry = this.pickExtra(extras, ['pays de naissance', 'pays naissance']);
      const nationality = this.pickExtra(extras, ['nationalite', 'nationalité']);
      const complement = this.pickExtra(extras, [
        'complement adresse',
        'complément adresse',
        'complement d adresse',
      ]);

      medicalCertificateDates[personne.id] = medicalByPerson.get(personne.id) ?? null;

      if (!licence) warnings.push(`${personne.first_name} ${personne.last_name}: numéro de licence non renseigné.`);
      if (!photoUrl) warnings.push(`${personne.first_name} ${personne.last_name}: photo FFRS non disponible.`);

      const imageConsent = this.pickBoolean(extras, responses, [
        'droit image',
        'droit a image',
        'autorisation image',
        'photo identite',
      ]);
      const dataCollectionConsent = this.pickBoolean(extras, responses, [
        'collecte traitement donnees',
        'traitement donnees',
        'charte donnees',
        'licence dematerialisee',
      ]);
      const newsletterConsent = this.pickBoolean(extras, responses, [
        'newsletter',
        'informations federales',
        'information federale',
      ]);
      const commercialConsent = this.pickBoolean(extras, responses, [
        'offres commerciales',
        'offre commerciale',
        'commercial',
      ]);
      const dataProtectionConsent = this.pickBoolean(extras, responses, [
        'protection donnees personnelles',
        'donnees personnelles souscription licence',
        'rgpd',
      ]);

      return [
        this.limit(licence, 30),
        personne.gender ? 'M' : 'Mme',
        this.limit(personne.last_name, 100),
        this.limit(personne.first_name, 100),
        personne.gender ? 'M' : 'F',
        this.formatDate(personne.date_naissance),
        this.limit(birthCountry, 100),
        this.limit(nationality, 100),
        imageConsent,
        dataCollectionConsent,
        newsletterConsent,
        commercialConsent,
        dataProtectionConsent,
        this.limit(address.number, 20),
        this.limit(address.type, 20),
        this.limit(address.name, 120),
        this.limit(complement, 120),
        this.limit(address.postCode, 20),
        this.limit(address.city, 100),
        this.limit(address.country, 100),
        this.limit(this.pickEmail(contactsForPerson), 180),
        this.limit(phones.fixed, 30),
        this.limit(phones.mobile, 30),
        this.limit(guardians[0]?.lastName ?? '', 100),
        this.limit(guardians[0]?.firstName ?? '', 100),
        this.limit(guardians[0]?.phone ?? '', 30),
        this.limit(guardians[0]?.email ?? '', 180),
        this.limit(guardians[1]?.lastName ?? '', 100),
        this.limit(guardians[1]?.firstName ?? '', 100),
        this.limit(guardians[1]?.phone ?? '', 30),
        this.limit(guardians[1]?.email ?? '', 180),
        photoUrl,
      ].map((value) => (value === null || value === undefined ? '' : value)) as Array<string | number>;
    });

    return {
      headers: [...FFRS_HEADERS],
      rows,
      warnings,
      medicalCertificateDates,
    };
  }

  async getPhoto(personId: number, token: string): Promise<{ buffer: Buffer; mimetype: string }> {
    const verified = this.verifyPhotoToken(personId, token);
    if (!verified) throw new ForbiddenException('Lien photo FFRS invalide ou expiré');

    const rows = (await this.dataSource.query(
      `
        SELECT file_data, mimetype
        FROM document
        WHERE objet_type = 'member'
          AND LOWER(typedoc) = 'photo'
          AND objet_id = $1
          AND (project_id = $2 OR project_id IS NULL)
          AND file_data IS NOT NULL
        ORDER BY date_import DESC, id DESC
        LIMIT 1
      `,
      [personId, verified.projectId],
    )) as Array<{ file_data: Buffer; mimetype: string }>;

    const photo = rows[0];
    if (!photo?.file_data) throw new NotFoundException('Photo introuvable');
    return { buffer: photo.file_data, mimetype: photo.mimetype || 'image/jpeg' };
  }

  private buildExtraMap(values: AddInfoRow[], fieldsById: Map<string, AddInfoRow>): Map<string, string> {
    const result = new Map<string, string>();
    for (const value of values) {
      const field = fieldsById.get(String(value.value_type));
      if (!field) continue;
      result.set(this.normalize(field.text), value.text ?? '');
    }
    return result;
  }

  private buildResponseMap(values: RequirementResponseRow[]): Map<string, Scalar> {
    const result = new Map<string, Scalar>();
    for (const value of values) {
      const scalar: Scalar = value.valeur_boolean ?? value.valeur_texte ?? value.valeur_date;
      for (const rawKey of [value.code, value.libelle, value.source_code]) {
        const key = this.normalize(rawKey ?? '');
        if (key && !result.has(key)) result.set(key, scalar);
      }
    }
    return result;
  }

  private pickExtra(values: Map<string, string>, aliases: string[]): string {
    return this.pickFromMap(values, aliases) ?? '';
  }

  private pickBoolean(
    extras: Map<string, string>,
    responses: Map<string, Scalar>,
    aliases: string[],
  ): number {
    const response = this.pickFromMap(responses, aliases);
    if (response !== undefined && response !== null && response !== '') return this.toBoolean01(response);
    const extra = this.pickFromMap(extras, aliases);
    if (extra !== undefined && extra !== null && extra !== '') return this.toBoolean01(extra);
    return 0;
  }

  private pickFromMap<T>(values: Map<string, T>, aliases: string[]): T | undefined {
    const normalizedAliases = aliases.map((x) => this.normalize(x));
    for (const alias of normalizedAliases) {
      if (values.has(alias)) return values.get(alias);
    }
    for (const [key, value] of values.entries()) {
      if (normalizedAliases.some((alias) => key.includes(alias) || alias.includes(key))) return value;
    }
    return undefined;
  }

  private toBoolean01(value: Scalar): number {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return value !== 0 ? 1 : 0;
    const normalized = this.normalize(String(value ?? ''));
    return ['1', 'true', 'oui', 'yes', 'ok', 'accepte', 'acceptee'].includes(normalized) ? 1 : 0;
  }

  private pickEmail(contacts: ContactRow[]): string {
    const emails = contacts.filter(
      (x) => this.normalize(x.contact_type).includes('email') && !!x.contact_value?.trim(),
    );
    return (emails.find((x) => x.pref) ?? emails[0])?.contact_value?.trim() ?? '';
  }

  private pickPhones(contacts: ContactRow[]): { fixed: string; mobile: string } {
    const phones = contacts.filter(
      (x) => this.normalize(x.contact_type).includes('phone') && !!x.contact_value?.trim(),
    );
    let fixed = '';
    let mobile = '';
    for (const phone of phones) {
      const value = phone.contact_value?.trim() ?? '';
      const digits = value.replace(/\D/g, '').replace(/^33/, '0');
      const info = this.normalize(phone.info ?? '');
      const isMobile = info.includes('mobile') || info.includes('portable') || /^0[67]/.test(digits);
      if (isMobile && !mobile) mobile = value;
      else if (!isMobile && !fixed) fixed = value;
    }
    if (!mobile && phones.length === 1 && !fixed) mobile = phones[0].contact_value?.trim() ?? '';
    return { fixed, mobile };
  }

  private pickGuardians(
    person: PersonRow,
    family: PersonRow[],
    contactsByPerson: Map<number, ContactRow[]>,
  ): Array<{ lastName: string; firstName: string; phone: string; email: string }> {
    if (this.ageOnDate(person.date_naissance, new Date()) >= 18) return [];

    return family
      .filter((candidate) => candidate.id !== person.id)
      .filter((candidate) => this.ageOnDate(candidate.date_naissance, new Date()) >= 18)
      .slice(0, 2)
      .map((candidate) => {
        const contacts = contactsByPerson.get(candidate.id) ?? [];
        const phones = this.pickPhones(contacts);
        return {
          lastName: candidate.last_name ?? '',
          firstName: candidate.first_name ?? '',
          phone: phones.mobile || phones.fixed,
          email: this.pickEmail(contacts),
        };
      });
  }

  private parseAddress(raw: string, fallbackCountry: string): {
    number: string;
    type: string;
    name: string;
    postCode: string;
    city: string;
    country: string;
  } {
    let street = raw ?? '';
    let postCode = '';
    let city = '';
    let country = fallbackCountry || 'France';

    try {
      const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
      street = String(parsed['Street'] ?? parsed['street'] ?? '');
      postCode = String(parsed['PostCode'] ?? parsed['postCode'] ?? parsed['post_code'] ?? '');
      city = String(parsed['City'] ?? parsed['city'] ?? '');
      country = String(parsed['Country'] ?? parsed['country'] ?? fallbackCountry ?? 'France');
    } catch {
      // Anciennes données : address peut encore être une simple chaîne.
    }

    const cleanStreet = street.trim().replace(/\s+/g, ' ');
    const match = cleanStreet.match(/^(\d+[A-Za-z]?(?:\s*(?:bis|ter|quater))?)\s+(.+)$/i);
    const number = match?.[1] ?? '';
    const remaining = match?.[2] ?? cleanStreet;
    const tokens = remaining.split(/\s+/).filter(Boolean);
    const first = this.normalize(tokens[0] ?? '');
    const type = this.streetTypeCode(first);
    const name = type ? tokens.slice(1).join(' ') : remaining;

    return { number, type, name, postCode, city, country };
  }

  private streetTypeCode(type: string): string {
    const codes: Record<string, string> = {
      rue: 'RUE', avenue: 'AV', av: 'AV', boulevard: 'BD', bd: 'BD',
      allee: 'ALL', allees: 'ALL', chemin: 'CHE', impasse: 'IMP', place: 'PL',
      route: 'RTE', quai: 'QUA', square: 'SQU', passage: 'PAS', parc: 'PAR',
      residence: 'RES', villa: 'VLA', sentier: 'SEN', traverse: 'TRA',
      lieudit: 'LIE', lieu: 'LIE', cours: 'CRS', montee: 'MTE', voie: 'VOI',
    };
    return codes[type] ?? '';
  }

  private buildSignedPhotoUrl(personId: number, projectId: number, publicBaseUrl: string): string {
    const secret = this.photoSecret();
    if (!secret || !publicBaseUrl) return '';
    const expires = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const payload = `${personId}.${projectId}.${expires}`;
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    const token = `${projectId}.${expires}.${signature}`;
    return `${publicBaseUrl.replace(/\/$/, '')}/api/personnes/ffrs-photo/${personId}?token=${encodeURIComponent(token)}`;
  }

  private verifyPhotoToken(personId: number, token: string): { projectId: number } | null {
    const secret = this.photoSecret();
    if (!secret) return null;
    const [projectRaw, expiresRaw, signature] = String(token ?? '').split('.');
    const projectId = Number(projectRaw);
    const expires = Number(expiresRaw);
    if (!Number.isFinite(projectId) || projectId <= 0 || !Number.isFinite(expires)) return null;
    if (expires < Math.floor(Date.now() / 1000)) return null;

    const payload = `${personId}.${projectId}.${expires}`;
    const expected = createHmac('sha256', secret).update(payload).digest('base64url');
    const actualBuffer = Buffer.from(signature ?? '');
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) return null;
    return timingSafeEqual(actualBuffer, expectedBuffer) ? { projectId } : null;
  }

  private photoSecret(): string {
    return (
      this.config.get<string>('FFRS_EXPORT_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      ''
    );
  }

  private publicBaseUrlFromText(value: string): string {
    return value.trim().replace(/\/$/, '');
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const raw = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  }

  private ageOnDate(value: string | Date | null | undefined, at: Date): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 0;
    let age = at.getFullYear() - date.getFullYear();
    const beforeBirthday =
      at.getMonth() < date.getMonth() ||
      (at.getMonth() === date.getMonth() && at.getDate() < date.getDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private limit(value: Scalar, length: number): string {
    return String(value ?? '').trim().slice(0, length);
  }

  private cleanIds(ids: number[]): number[] {
    return [...new Set((ids ?? []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  }

  private groupBy<T>(items: T[], key: (item: T) => number): Map<number, T[]> {
    const result = new Map<number, T[]>();
    for (const item of items) {
      const k = key(item);
      const bucket = result.get(k) ?? [];
      bucket.push(item);
      result.set(k, bucket);
    }
    return result;
  }
}
