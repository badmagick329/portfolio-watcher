import { Suspense } from 'react';

import { InstrumentCategoriesClient } from './_components/InstrumentCategoriesClient';

export default function CategoriesPage() {
  return (
    <div className='flex min-h-screen w-full flex-col bg-background font-sans pt-8'>
      <div className='mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8'>
        <Suspense fallback={<p>Loading categories...</p>}>
          <InstrumentCategoriesClient />
        </Suspense>
      </div>
    </div>
  );
}
