import type { CurrentHoldingMover } from '@portfolio/domain';
import type { MoversSortMode } from './movers-view-url-state';

const MOVERS_PAGE_SIZE = 10;

type MoversTableViewModel = {
  page: number;
  pageSize: number;
  rows: CurrentHoldingMover[];
  totalRows: number;
  totalPages: number;
};

type MoversViewModel = {
  gainers: MoversTableViewModel;
  losers: MoversTableViewModel;
};

const buildMoversViewModel = ({
  gainersPage,
  items,
  losersPage,
  sort,
}: {
  gainersPage: number;
  items: CurrentHoldingMover[];
  losersPage: number;
  sort: MoversSortMode;
}): MoversViewModel => {
  const splitValue = (item: CurrentHoldingMover) =>
    sort === 'impact' ? item.walletImpact : item.returnPercent;
  const gainers = items.filter((item) => splitValue(item) > 0);
  const losers = items.filter((item) => splitValue(item) < 0);
  const sortValue = (item: CurrentHoldingMover) =>
    sort === 'impact' ? Math.abs(item.walletImpact) : Math.abs(item.returnPercent);

  return {
    gainers: paginateRows(
      gainers.sort((left, right) => sortValue(right) - sortValue(left)),
      gainersPage,
    ),
    losers: paginateRows(
      losers.sort((left, right) => sortValue(right) - sortValue(left)),
      losersPage,
    ),
  };
};

const paginateRows = (
  rows: CurrentHoldingMover[],
  requestedPage: number,
): MoversTableViewModel => {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / MOVERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * MOVERS_PAGE_SIZE;

  return {
    page,
    pageSize: MOVERS_PAGE_SIZE,
    rows: rows.slice(start, start + MOVERS_PAGE_SIZE),
    totalRows,
    totalPages,
  };
};

export { MOVERS_PAGE_SIZE, buildMoversViewModel };
export type { MoversTableViewModel, MoversViewModel };
