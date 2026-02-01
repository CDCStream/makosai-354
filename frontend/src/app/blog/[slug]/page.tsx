import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, getAllBlogPosts } from '@/lib/blog-data';
import { Calendar, User, ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return { title: 'Post Not Found - Makos.ai' };
  }

  return {
    title: `${post.title} - Makos.ai Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-gray-800">Makos.ai</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600 transition-colors">Home</Link>
            <Link href="/blog" className="text-teal-600 font-medium">Blog</Link>
            <Link href="/generator" className="btn-primary btn-sm">Create Worksheet</Link>
          </nav>
        </div>
      </header>

      {/* Back Link */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {post.author}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          {post.title}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map(tag => (
            <span key={tag} className="text-sm bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Hero Image Placeholder */}
        <div className="h-64 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-8">
          <BookOpen className="w-20 h-20 text-white/50" />
        </div>

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-teal-600 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:text-gray-600"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA Box */}
        <div className="mt-12 p-8 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Create Worksheets in Seconds</h3>
          <p className="text-gray-600 mb-4">
            Try Makos.ai and see how AI can transform your teaching workflow.
          </p>
          <Link
            href="/generator"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Try Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400 text-center mt-16">
        <p>&copy; 2026 Makos.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
