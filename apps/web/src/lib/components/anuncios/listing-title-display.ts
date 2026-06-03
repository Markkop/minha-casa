export function truncateListingTitle(title: string, maxLength = 50) {
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength)}...`;
}
