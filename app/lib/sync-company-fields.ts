import {
  getDividendsCollection,
  getPortfolioCollection,
  getTransactionsCollection,
} from "./database";

export async function syncCompanyFieldsToRelatedRecords(
  userId: string,
  previousIsin: string,
  fields: { instrument: string; isin: string; issuer: string },
): Promise<void> {
  const filter = { isin: previousIsin };
  const companyUpdate = {
    instrument: fields.instrument,
    isin: fields.isin,
    issuer: fields.issuer,
  };

  const [portfolioCollection, dividendsCollection, transactionsCollection] =
    await Promise.all([
      getPortfolioCollection(userId),
      getDividendsCollection(userId),
      getTransactionsCollection(userId),
    ]);

  await Promise.all([
    portfolioCollection.updateMany(filter, { $set: companyUpdate }),
    dividendsCollection.updateMany(filter, { $set: companyUpdate }),
    transactionsCollection.updateMany(filter, {
      $set: { ...companyUpdate, symbol: fields.instrument },
    }),
  ]);
}
