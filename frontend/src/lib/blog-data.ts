export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  image?: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-ai-is-transforming-education',
    title: 'How AI is Transforming Education: A Guide for Teachers',
    excerpt: 'Discover how artificial intelligence is revolutionizing the way teachers create educational content and engage with students.',
    content: `
      <p>Artificial Intelligence is no longer a futuristic concept—it's here, and it's changing the way we teach. From personalized learning experiences to automated grading, AI tools are helping educators save time and improve student outcomes.</p>

      <h2>The Rise of AI in Education</h2>
      <p>Over the past few years, we've seen a dramatic increase in AI-powered educational tools. These range from intelligent tutoring systems to content generation platforms like Makos.ai that help teachers create customized worksheets in seconds.</p>

      <h2>Benefits for Teachers</h2>
      <ul>
        <li><strong>Time Savings:</strong> AI can generate worksheets, quizzes, and lesson plans in minutes instead of hours.</li>
        <li><strong>Personalization:</strong> Create content tailored to different learning levels and styles.</li>
        <li><strong>Consistency:</strong> Maintain high-quality educational materials across all your classes.</li>
        <li><strong>Focus on Teaching:</strong> Spend less time on administrative tasks and more time with students.</li>
      </ul>

      <h2>Getting Started with AI Tools</h2>
      <p>The best way to start is with simple, practical tools. Worksheet generators like Makos.ai are perfect for teachers who want to experience the benefits of AI without a steep learning curve.</p>

      <p>Try creating your first AI-generated worksheet today and see how much time you can save!</p>
    `,
    date: '2026-01-31',
    author: 'Makos.ai Team',
    tags: ['AI', 'Education', 'Teaching', 'Technology']
  },
  {
    slug: 'creating-effective-worksheets',
    title: '5 Tips for Creating Effective Worksheets That Students Love',
    excerpt: 'Learn the secrets to designing worksheets that engage students and reinforce learning effectively.',
    content: `
      <p>Worksheets remain one of the most versatile teaching tools available. But not all worksheets are created equal. Here are five tips to make yours more effective.</p>

      <h2>1. Start with Clear Learning Objectives</h2>
      <p>Before creating any worksheet, ask yourself: What should students learn from this? Clear objectives lead to focused, purposeful content.</p>

      <h2>2. Mix Question Types</h2>
      <p>Variety keeps students engaged. Combine multiple choice, fill-in-the-blank, short answer, and essay questions to address different cognitive levels.</p>

      <h2>3. Use Visual Elements</h2>
      <p>Images, diagrams, and charts make worksheets more engaging, especially for younger learners or visual learners.</p>

      <h2>4. Include Progressive Difficulty</h2>
      <p>Start with easier questions to build confidence, then gradually increase complexity. This scaffolding approach helps all students succeed.</p>

      <h2>5. Provide Clear Instructions</h2>
      <p>Never assume students know what to do. Clear, concise instructions reduce confusion and frustration.</p>

      <h2>Save Time with AI</h2>
      <p>Creating great worksheets takes time—unless you use AI. Tools like Makos.ai can generate professional worksheets with varied question types in seconds, giving you more time to focus on teaching.</p>
    `,
    date: '2026-01-30',
    author: 'Makos.ai Team',
    tags: ['Worksheets', 'Teaching Tips', 'Education']
  }
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getAllBlogPosts(): BlogPost[] {
  return blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
