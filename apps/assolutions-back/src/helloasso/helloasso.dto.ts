// create-helloasso-checkout.dto.ts
export interface HelloAssoCheckoutLineDto {
  personneId: number;
  tarifId: number;
}

export interface CreateHelloAssoCheckoutDto {
  lignes: HelloAssoCheckoutLineDto[];
}