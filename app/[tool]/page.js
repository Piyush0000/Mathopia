import { notFound } from 'next/navigation';
import ToolPage from '@/components/ToolPage';
import { TOOLS, toolBySlug } from '@/lib/tools';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map(t => ({ tool: t.slug }));
}

export async function generateMetadata({ params }) {
  const { tool } = await params;
  const t = toolBySlug(tool);
  return t ? { title: t.title, description: t.blurb } : {};
}

export default async function Page({ params }) {
  const { tool } = await params;
  const t = toolBySlug(tool);
  if (!t) notFound();
  return <ToolPage tool={t.key} title={t.title} emoji={t.emoji} />;
}
