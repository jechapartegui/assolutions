
export class StaticClass{

  parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }
  
    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) {
      return null; // La chaîne n'est pas dans le format attendu, renvoyer null ou gérer l'erreur selon votre besoin.
    }
  
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[2]);
    return new Date(year, month, day);
  }
  
  parseExcelDate(excelDate: number): Date | null {
    if (typeof excelDate !== 'number') {
      return null;
    }
  
    const date = new Date(1900, 0, excelDate - 1);
  
    // Pour compenser un problème avec les années bissextiles en 1900,
    // ajustez l'année pour les dates avant le 1er mars 1900
    if (excelDate <= 60) {
      date.setFullYear(date.getFullYear() + 1);
    }
    date.setHours(12);
    return date;
  }
   convertListToString(list: string[]): string {
    return list.join(',');
  }
  convertStringToList(inputString: string): string[] {
    return inputString.split(',');
  }

  

  
}
export enum code_alert {
  OK = 1,
  KO = 2,
  Warning = 3,
  Info = 4
}
export enum jour_semaine{
  lundi = 1,
  mardi = 2,
  mercredi =3,
  jeudi = 4,
  vendredi = 5,
  samedi = 6,
  dimanche = 7
}
export  const configapi= [
  {
    country: "France",
    apiaddress: 'https://api-adresse.data.gouv.fr/',
    apisportscourt: 'https://equipements.sports.gouv.fr/api/records/1.0/search/?dataset=data-es&',
  }
]