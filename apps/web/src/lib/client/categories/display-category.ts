const MAX_DISPLAY_CATEGORY_LENGTH = 50;

function formatCategoryName(category: string | null | undefined) {
  const trimmed = category?.trim() ?? '';

  if (!trimmed) {
    return '-';
  }

  const titleCased = trimmed
    .toLowerCase()
    .replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));

  return truncateCategoryName(titleCased);
}

function truncateCategoryName(category: string) {
  if (category.length <= MAX_DISPLAY_CATEGORY_LENGTH) {
    return category;
  }

  return `${category.slice(0, MAX_DISPLAY_CATEGORY_LENGTH - 3)}...`;
}

export { formatCategoryName, MAX_DISPLAY_CATEGORY_LENGTH };
