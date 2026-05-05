import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CategoryManagementClient } from './_components/CategoryManagementClient';

type CategoriesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getRedirectUrl = ({
  mode,
  params,
}: {
  mode: 'allocation' | 'risk-mappings';
  params: Record<string, string | string[] | undefined>;
}) => {
  const nextSearchParams = new URLSearchParams();

  const keysToPreserve =
    mode === 'allocation'
      ? [
          'filledFrom',
          'filledTo',
          'hideValues',
          'alphaMarketReturn',
          'alphaRiskFreeAnnual',
        ]
      : ['hideValues'];

  keysToPreserve.forEach((key) => {
    const value = params[key];

    if (typeof value === 'string' && value.length > 0) {
      nextSearchParams.set(key, value);
    }
  });

  const queryString = nextSearchParams.toString();
  const pathname = mode === 'allocation' ? '/allocation' : '/risk-mappings';

  return queryString ? `${pathname}?${queryString}` : pathname;
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const mode = resolvedSearchParams.mode;

  if (mode === 'allocation' || mode === 'risk-mappings') {
    redirect(
      getRedirectUrl({
        mode,
        params: resolvedSearchParams,
      }),
    );
  }

  return (
    <div className='flex min-h-screen w-full flex-col bg-background font-sans pt-8'>
      <div className='mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8'>
        <Suspense fallback={<p>Loading categories...</p>}>
          <CategoryManagementClient />
        </Suspense>
      </div>
    </div>
  );
}
