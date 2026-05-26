export const API_ERROR_CODES = {
  missingRequiredFields: "missingRequiredFields",
  missingCompanyFields: "missingCompanyFields",
  validationFailed: "validationFailed",
  noChangesToSave: "noChangesToSave",

  invalidCompanyId: "invalidCompanyId",
  companyNotFound: "companyNotFound",
  companyDuplicateInstrument: "companyDuplicateInstrument",
  failedFetchCompanies: "failedFetchCompanies",
  failedCreateCompany: "failedCreateCompany",
  failedUpdateCompany: "failedUpdateCompany",
  failedDeleteCompany: "failedDeleteCompany",

  invalidPortfolioEntryId: "invalidPortfolioEntryId",
  portfolioEntryNotFound: "portfolioEntryNotFound",
  portfolioEntryDuplicate: "portfolioEntryDuplicate",
  failedFetchPortfolioEntries: "failedFetchPortfolioEntries",
  failedCreatePortfolioEntry: "failedCreatePortfolioEntry",
  failedUpdatePortfolioEntry: "failedUpdatePortfolioEntry",
  failedDeletePortfolioEntry: "failedDeletePortfolioEntry",

  invalidTransactionId: "invalidTransactionId",
  transactionNotFound: "transactionNotFound",
  failedFetchTransactions: "failedFetchTransactions",
  failedFetchTransaction: "failedFetchTransaction",
  failedCreateTransaction: "failedCreateTransaction",
  failedUpdateTransaction: "failedUpdateTransaction",
  failedDeleteTransaction: "failedDeleteTransaction",

  invalidDepositId: "invalidDepositId",
  depositNotFound: "depositNotFound",
  depositDuplicate: "depositDuplicate",
  failedFetchDeposits: "failedFetchDeposits",
  failedCreateDeposit: "failedCreateDeposit",
  failedUpdateDeposit: "failedUpdateDeposit",
  failedDeleteDeposit: "failedDeleteDeposit",

  invalidDividendId: "invalidDividendId",
  dividendNotFound: "dividendNotFound",
  failedFetchDividends: "failedFetchDividends",
  failedCreateDividend: "failedCreateDividend",
  failedUpdateDividend: "failedUpdateDividend",
  failedDeleteDividend: "failedDeleteDividend",

  invalidEtfId: "invalidEtfId",
  etfNotFound: "etfNotFound",
  etfDuplicateSymbol: "etfDuplicateSymbol",
  failedFetchEtfs: "failedFetchEtfs",
  failedCreateEtf: "failedCreateEtf",
  failedUpdateEtf: "failedUpdateEtf",
  failedDeleteEtf: "failedDeleteEtf",

  invalidFundUnitId: "invalidFundUnitId",
  fundUnitNotFound: "fundUnitNotFound",
  fundUnitDuplicateName: "fundUnitDuplicateName",
  failedFetchFundUnits: "failedFetchFundUnits",
  failedCreateFundUnit: "failedCreateFundUnit",
  failedUpdateFundUnit: "failedUpdateFundUnit",
  failedDeleteFundUnit: "failedDeleteFundUnit",

  failedFetchExchangeRates: "failedFetchExchangeRates",

  networkError: "networkError",
  invalidPayload: "invalidPayload",
  idRequired: "idRequired",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
