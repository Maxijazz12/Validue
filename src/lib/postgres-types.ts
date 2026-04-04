/**
 * Minimal callable surface shared by the top-level `sql` client and transaction
 * runners. The postgres package's published `TransactionSql` type drops its
 * call signature through `Omit<>`, so we model only the tagged-template shape
 * these helpers actually depend on.
 */
export type SqlRunner = <TRow extends Record<string, unknown> = Record<string, unknown>>(
  template: TemplateStringsArray,
  ...values: unknown[]
) => PromiseLike<TRow[]>;
