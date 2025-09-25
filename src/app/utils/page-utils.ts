export function prepareSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function minifyHtml(html: string): string {
  return html
    .replace(/\>[\r\n]+\</g, '><')
    .replace(/(<.*?>)|\s+/g, (match, group) => (group ? group : ' '))
    .trim();
}

export type PageFormValue = {
  title: string;
  metaTitle: string;
  image: string;
  description: string;
  url: string;
  position: string;
  hidden: string;
  onlyHTML: string;
  content: string;
};

export function mapPageToFormValue(page: Record<string, unknown>): PageFormValue {
  return {
    title: String(page['title'] ?? ''),
    metaTitle: String(page['metaTitle'] ?? ''),
    image: String(page['image'] ?? ''),
    description: String(page['description'] ?? ''),
    url: String(page['url'] ?? ''),
    position: String(page['position'] ?? ''),
    hidden: String(page['hidden'] ?? 'false'),
    onlyHTML: String(page['onlyHTML'] ?? 'false'),
    content: String(page['content'] ?? ''),
  };
}
