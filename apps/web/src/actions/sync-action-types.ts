export type OrdersSyncActionKind = 'orders' | 'instruments';

export type PortfolioStateSyncActionKind = 'portfolio-state';

export type OrdersSyncActionResult = {
  ok: boolean;
  kind: OrdersSyncActionKind | PortfolioStateSyncActionKind;
  message: string;
};
