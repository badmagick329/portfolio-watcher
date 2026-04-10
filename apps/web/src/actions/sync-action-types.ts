export type OrdersSyncActionKind =
  | 'orders'
  | 'portfolio-state'
  | 'instruments';

export type OrdersSyncActionResult = {
  ok: boolean;
  kind: OrdersSyncActionKind;
  message: string;
};
