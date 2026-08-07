import concurrent.futures
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

INVENTORY = Path('/tmp/assolutions-i18n/inventory.jsonl')
OUTPUT = Path('/tmp/assolutions-i18n/messages.en.generated.json')
REPORT = Path('/tmp/assolutions-i18n/translation-report.json')

# Consistent UI/business vocabulary for Assolutions. Exact source overrides win over
# machine translation; longer sentences still benefit from automatic translation.
EXACT = {
    'ID': 'ID',
    'AS': 'AS',
    'Email': 'Email',
    'HTML': 'HTML',
    'IBAN': 'IBAN',
    'BIC': 'BIC',
    'URL': 'URL',
    'CSV': 'CSV',
    'WhatsApp': 'WhatsApp',
    'HelloAsso': 'HelloAsso',
    'Assolutions': 'Assolutions',
    'Sauvegarder': 'Save',
    'Enregistrer': 'Save',
    'Supprimer': 'Delete',
    'Retirer': 'Remove',
    'Modifier': 'Edit',
    'Créer': 'Create',
    'Ajouter': 'Add',
    'Annuler': 'Cancel',
    'Retour': 'Back',
    'Fermer': 'Close',
    'Valider': 'Confirm',
    'Continuer': 'Continue',
    'Précédent': 'Previous',
    'Suivant': 'Next',
    'Rechercher': 'Search',
    'Actualiser': 'Refresh',
    'Choisir': 'Choose',
    'Sélectionner': 'Select',
    'Vider': 'Clear',
    'Oui': 'Yes',
    'Non': 'No',
    'Actif': 'Active',
    'Inactif': 'Inactive',
    'Archivé': 'Archived',
    'Archivés': 'Archived',
    'Non archivés': 'Not archived',
    'Archiver': 'Archive',
    'Desarchiver': 'Unarchive',
    'Désarchiver': 'Unarchive',
    'Identité': 'Identity',
    'Nom': 'Last name',
    'Prénom': 'First name',
    'Surnom': 'Nickname',
    'Sexe': 'Gender',
    'Femme': 'Female',
    'Homme': 'Male',
    'Adresse': 'Address',
    'Téléphone': 'Phone',
    'Pays': 'Country',
    'Ville': 'City',
    'Code postal': 'Postal code',
    'Libellé': 'Label',
    'Libellé :': 'Label:',
    'Valeur': 'Value',
    'Statut': 'Status',
    'État': 'State',
    'Date': 'Date',
    'Heure': 'Time',
    'Durée': 'Duration',
    'Lieu': 'Location',
    'Lieux': 'Locations',
    'Adhérent': 'Member',
    'Adhérents': 'Members',
    'Professeur': 'Instructor',
    'Professeurs': 'Instructors',
    'Cours': 'Classes',
    'Séance': 'Session',
    'Séances': 'Sessions',
    'Groupe': 'Group',
    'Groupes': 'Groups',
    'Saison': 'Season',
    'Saisons': 'Seasons',
    'Inscription': 'Registration',
    'Inscriptions': 'Registrations',
    'Souscription': 'Registration',
    'Tarif': 'Fee',
    'Tarifs': 'Fees',
    'Essai': 'Trial',
    'Prévue': 'Scheduled',
    'Réalisée': 'Completed',
    'Annulée': 'Cancelled',
    'Présent': 'Present',
    'Absent': 'Absent',
    'Convoqué': 'Invited',
    'Compte': 'Account',
    'Mon compte': 'My account',
    'Gestion': 'Management',
    'Finances': 'Finances',
    'Communication': 'Communication',
    'Paramétrage': 'Settings',
    'Tableau de bord': 'Dashboard',
    'Budget': 'Budget',
    'Opérations': 'Transactions',
    'Opération': 'Transaction',
    'Comptabilité': 'Accounting',
    'Flux financiers': 'Financial flows',
    'Flux financier': 'Financial flow',
    'Document': 'Document',
    'Documents': 'Documents',
    'Photo': 'Photo',
    'Aucun résultat.': 'No results.',
    'Non renseigné': 'Not specified',
    'Non renseignée': 'Not specified',
    'Informations complémentaires': 'Additional information',
    'Situation médicale': 'Medical information',
    'Contact à prévenir': 'Emergency contact',
    'Contacts à prévenir': 'Emergency contacts',
    'Contacts à prévenir :': 'Emergency contacts:',
    'Tarifs d\'inscription': 'Registration fees',
    'Codes promotionnels': 'Promo codes',
    'Contrats professeurs': 'Instructor contracts',
    'Envoyer des mails': 'Send emails',
    'Configuration mails': 'Email settings',
    'Suivi des mails': 'Email tracking',
    'Comptes bancaires': 'Bank accounts',
    'Tunnel de souscription': 'Registration flow',
    'Créer une souscription pour cette personne': 'Create a registration for this person',
    'Souscription administrateur': 'Administrator registration',
    'Modifier la fiche adhérent': 'Edit member profile',
    'Modifier la fiche': 'Edit profile',
    'Voir la fiche': 'View profile',
    'Liste des opérations': 'Transaction list',
    'Opérations bancaires': 'Bank transactions',
    'Libellé bancaire': 'Bank description',
    'Nouvelle opération': 'New transaction',
    'Créer une séance': 'Create a session',
    'Éditer une séance': 'Edit a session',
    'Ma séance': 'My session',
    'Créer un cours': 'Create a class',
    'Éditer un cours': 'Edit a class',
    'Nom du cours': 'Class name',
    'Liste des cours': 'Class list',
}

# Match the whole XLIFF placeholder before HTML-unescaping equiv-text attributes.
PLACEHOLDER_RE = re.compile(r'<x\s+id="([^"]+)"(?:\s+[^>]*)?/>')


def protect(source: str):
    ids = []

    def repl(match):
        ids.append(match.group(1))
        return f' ZXQPH{len(ids) - 1:03d}QXZ '

    protected = PLACEHOLDER_RE.sub(repl, source)
    return html.unescape(protected), ids


def restore(text: str, ids):
    for index, placeholder_id in enumerate(ids):
        token = f'ZXQPH{index:03d}QXZ'
        text = re.sub(
            r'\s*' + re.escape(token) + r'\s*',
            '{$' + placeholder_id + '}',
            text,
            flags=re.IGNORECASE,
        )
    return re.sub(r'\s+', ' ', text).strip()


def translate_text(source: str):
    clean_source = html.unescape(PLACEHOLDER_RE.sub('', source)).strip()
    if clean_source in EXACT and not PLACEHOLDER_RE.search(source):
        return EXACT[clean_source], None

    plain, ids = protect(source)
    compact = plain.strip()
    if not re.search(r'[A-Za-zÀ-ÖØ-öø-ÿ]', compact):
        return restore(compact, ids), None

    params = urllib.parse.urlencode(
        {'client': 'gtx', 'sl': 'fr', 'tl': 'en', 'dt': 't', 'q': compact}
    )
    url = 'https://translate.googleapis.com/translate_a/single?' + params
    last_error = None

    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode('utf-8'))
            translated = ''.join(part[0] for part in payload[0] if part and part[0])
            translated = restore(translated, ids)
            # Apply exact terminology when the whole translated source is a known simple label.
            if clean_source in EXACT and not ids:
                translated = EXACT[clean_source]
            return translated, None
        except Exception as exc:
            last_error = str(exc)
            time.sleep(0.4 * (attempt + 1))

    # Preserve placeholders even if the external translator is temporarily unavailable.
    return restore(plain, ids), last_error


def main():
    rows = [json.loads(line) for line in INVENTORY.read_text(encoding='utf-8').splitlines() if line.strip()]
    unique_sources = dict.fromkeys(row['source'] for row in rows)
    failures = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(translate_text, source): source for source in unique_sources}
        for future in concurrent.futures.as_completed(futures):
            source = futures[future]
            target, error = future.result()
            unique_sources[source] = target
            if error:
                failures[source] = error

    translations = {}
    source_by_id = {}
    duplicate_conflicts = []
    for row in rows:
        message_id = row['id']
        source = row['source']
        if message_id in source_by_id and source_by_id[message_id] != source:
            duplicate_conflicts.append({'id': message_id, 'first': source_by_id[message_id], 'second': source})
            continue
        source_by_id[message_id] = source
        translations[message_id] = unique_sources[source]

    OUTPUT.write_text(
        json.dumps({'locale': 'en', 'translations': translations}, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    REPORT.write_text(
        json.dumps(
            {
                'units': len(rows),
                'uniqueSources': len(unique_sources),
                'translations': len(translations),
                'failures': failures,
                'duplicateConflicts': duplicate_conflicts,
            },
            ensure_ascii=False,
            indent=2,
        ) + '\n',
        encoding='utf-8',
    )

    print(f'TRANSLATED_UNITS={len(translations)}')
    print(f'TRANSLATION_FAILURES={len(failures)}')
    print(f'DUPLICATE_ID_CONFLICTS={len(duplicate_conflicts)}')
    if failures:
        for source, error in list(failures.items())[:20]:
            print('TRANSLATION_FAILURE', source, error)
    if duplicate_conflicts:
        for conflict in duplicate_conflicts:
            print('DUPLICATE_ID', json.dumps(conflict, ensure_ascii=False))


if __name__ == '__main__':
    main()
