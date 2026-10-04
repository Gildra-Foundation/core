import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import type { MDXComponents } from 'mdx/types';

/** Компилирует MDX при сборке страницы. Заголовки получают id для оглавления, компоненты статей даёт игра. */
export async function MdxContent({ source, components }: { source: string; components: MDXComponents }) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
  });
  return <Content components={components} />;
}
