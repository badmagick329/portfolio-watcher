'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  getHideValuesFromSearchParams,
  getSearchParamsWithHideValues,
} from '@/lib/client/presentation/privacy-values';

function PrivacyToggleButton() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideValues = getHideValuesFromSearchParams(searchParams);

  return (
    <Button
      onClick={() => {
        const nextSearchParams = getSearchParamsWithHideValues(
          searchParams,
          !hideValues,
        );
        const queryString = nextSearchParams.toString();

        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
          scroll: false,
        });
      }}
      type='button'
      variant='outline'
    >
      {hideValues ? 'Show values' : 'Hide values'}
    </Button>
  );
}

export { PrivacyToggleButton };
