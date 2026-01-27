'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Sparkles, FileText, Clock, Users, Zap, Globe, ArrowRight, Check, BookOpen, PenTool, Lightbulb } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState('');

  const handleQuickStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      router.push(`/generator?topic=${encodeURIComponent(topic)}`);
    } else {
      router.push('/generator');
    }
  };

  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'AI-Powered',
      description: 'Smart questions tailored to your curriculum and teaching style.',
      color: 'bg-teal-100 text-teal-600',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Multiple Formats',
      description: 'MCQ, fill-in-blank, true/false, short answer, and essay question types.',
      color: 'bg-amber-100 text-amber-600',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Save Hours',
      description: 'Create professional worksheets in seconds, not hours.',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: '40+ Languages',
      description: 'Generate worksheets in any language your students need.',
      color: 'bg-rose-100 text-rose-600',
    },
  ];

  const howItWorks = [
    { step: '1', title: 'Pick a Topic', desc: 'Enter any subject you want to teach', emoji: '✨' },
    { step: '2', title: 'Customize', desc: 'Choose grade, difficulty & question types', emoji: '🎯' },
    { step: '3', title: 'Generate', desc: 'AI creates your worksheet instantly', emoji: '🚀' },
    { step: '4', title: 'Share', desc: 'Export as PDF, HTML or share online', emoji: '📤' },
  ];

  const popularTopics = [
    'Photosynthesis', 'Fractions', 'World War II', 'Solar System',
    'Grammar', 'Chemical Reactions', 'Ancient Egypt', 'Climate Change'
  ];

  return (
    <div className="min-h-screen bg-pattern">
      <Header />

      <main>
        {/* Hero Section - Chalkie-inspired */}
        <section className="hero-gradient text-white py-16 md:py-24 relative overflow-hidden">
          {/* Floating worksheet previews - Left Side */}
          <div className="absolute left-4 top-[15%] w-48 md:w-64 opacity-90 worksheet-float hidden lg:block" style={{ transform: 'rotate(-8deg)' }}>
            <div className="paper-effect p-4 text-gray-800 text-xs">
              <div className="font-bold text-sm mb-2 text-teal-700">📚 The Human Heart</div>
              <div className="text-gray-600 mb-2">1. What are the four chambers of the heart?</div>
              <div className="h-4 border-b border-dashed border-gray-300"></div>
            </div>
          </div>

          <div className="absolute left-8 top-[45%] w-44 opacity-85 worksheet-float-delayed hidden lg:block" style={{ transform: 'rotate(4deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-2 text-rose-600">🔬 Science Quiz</div>
              <div className="text-gray-600 mb-1">What gas do plants release?</div>
              <div className="flex gap-1 mt-2">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px]">CO₂</span>
                <span className="px-2 py-0.5 bg-green-100 rounded text-[10px]">O₂</span>
              </div>
            </div>
          </div>

          <div className="absolute left-2 bottom-[15%] w-40 opacity-80 worksheet-float-slow hidden xl:block" style={{ transform: 'rotate(-4deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-1 text-purple-600">🌍 Geography</div>
              <div className="text-gray-500 text-[10px]">Name the capital of France...</div>
            </div>
          </div>

          {/* Floating worksheet previews - Right Side */}
          <div className="absolute right-4 top-[12%] w-48 md:w-56 opacity-90 worksheet-float-delayed hidden lg:block" style={{ transform: 'rotate(6deg)' }}>
            <div className="paper-effect p-4 text-gray-800 text-xs">
              <div className="font-bold text-sm mb-2 text-amber-600">🧮 Fractions Quiz</div>
              <div className="text-gray-600 mb-1">What is 1/2 + 1/4?</div>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 rounded">A) 3/4</span>
                <span className="px-2 py-1 bg-teal-100 rounded">B) 2/4</span>
              </div>
            </div>
          </div>

          <div className="absolute right-6 top-[40%] w-44 opacity-85 worksheet-float hidden lg:block" style={{ transform: 'rotate(-5deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-2 text-blue-600">📖 English Grammar</div>
              <div className="text-gray-600 mb-1">Fill in the blank:</div>
              <div className="text-gray-500 text-[10px]">She ___ to school every day.</div>
              <div className="mt-1 border-b border-dashed border-gray-300 w-16"></div>
            </div>
          </div>

          <div className="absolute right-2 bottom-[18%] w-40 opacity-80 worksheet-float-slow hidden xl:block" style={{ transform: 'rotate(3deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-1 text-orange-600">⚗️ Chemistry</div>
              <div className="text-gray-500 text-[10px]">H₂O is the formula for...</div>
              <div className="flex gap-1 mt-1">
                <span className="px-1.5 py-0.5 bg-blue-100 rounded text-[9px]">Water</span>
              </div>
            </div>
          </div>

          <div className="absolute right-20 top-[65%] w-36 opacity-75 worksheet-float hidden xl:block" style={{ transform: 'rotate(-3deg)' }}>
            <div className="paper-effect p-2 text-gray-800 text-xs">
              <div className="font-bold text-[10px] mb-1 text-indigo-600">🔢 Algebra</div>
              <div className="text-gray-500 text-[9px]">Solve: 2x + 5 = 15</div>
            </div>
          </div>

          {/* Additional cards - Left bottom area */}
          <div className="absolute left-[15%] bottom-[5%] w-44 opacity-85 worksheet-float-delayed hidden xl:block" style={{ transform: 'rotate(5deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-1 text-cyan-600">🌊 Water Cycle</div>
              <div className="text-gray-500 text-[10px]">What is evaporation?</div>
              <div className="mt-1 border-b border-dashed border-gray-300 w-20"></div>
            </div>
          </div>

          <div className="absolute left-[25%] top-[30%] w-36 opacity-70 worksheet-float-slow hidden xl:block" style={{ transform: 'rotate(-6deg)' }}>
            <div className="paper-effect p-2 text-gray-800 text-xs">
              <div className="font-bold text-[10px] mb-1 text-emerald-600">🌱 Biology</div>
              <div className="text-gray-500 text-[9px]">Name 3 plant parts</div>
            </div>
          </div>

          {/* Additional cards - Right bottom area */}
          <div className="absolute right-[12%] bottom-[3%] w-40 opacity-80 worksheet-float hidden xl:block" style={{ transform: 'rotate(-4deg)' }}>
            <div className="paper-effect p-3 text-gray-800 text-xs">
              <div className="font-bold text-xs mb-1 text-pink-600">📐 Geometry</div>
              <div className="text-gray-500 text-[10px]">Area of a circle = ?</div>
              <div className="flex gap-1 mt-1">
                <span className="px-1.5 py-0.5 bg-pink-100 rounded text-[9px]">πr²</span>
              </div>
            </div>
          </div>

          {/* Feature badges - 45 degree angle */}
          <div className="absolute right-[8%] top-[75%] hidden lg:block" style={{ transform: 'rotate(45deg)' }}>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
              <span className="text-lg">🖼️</span>
              <span className="text-white font-semibold text-sm whitespace-nowrap">Unsplash Images for K-2</span>
            </div>
          </div>

          <div className="absolute right-[25%] bottom-[8%] w-36 opacity-75 worksheet-float-delayed hidden xl:block" style={{ transform: 'rotate(7deg)' }}>
            <div className="paper-effect p-2 text-gray-800 text-xs">
              <div className="font-bold text-[10px] mb-1 text-violet-600">📜 History</div>
              <div className="text-gray-500 text-[9px]">When did WWII end?</div>
            </div>
          </div>

          <div className="absolute right-[30%] top-[20%] w-36 opacity-70 worksheet-float-slow hidden xl:block" style={{ transform: 'rotate(-3deg)' }}>
            <div className="paper-effect p-2 text-gray-800 text-xs">
              <div className="font-bold text-[10px] mb-1 text-red-600">🎵 Music</div>
              <div className="text-gray-500 text-[9px]">How many notes in an octave?</div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
            {/* Logo/Brand accent */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-8 py-4 rounded-full mb-8">
              <img src="/logo.png" alt="Makos.ai" className="h-48 w-auto" />
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6">
              Worksheets in
              <span className="block text-amber-300 drop-shadow-lg">seconds</span>
            </h1>

            <p className="text-lg md:text-xl mb-4 opacity-95 max-w-2xl mx-auto font-medium">
              Standards-aligned learning materials, designed by you and generated by AI
            </p>

            <p className="text-base mb-10 text-teal-100 font-medium">
              Give it a go ✨
            </p>

            {/* Hero Input Form */}
            <form onSubmit={handleQuickStart} className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Pick a topic..."
                  className="flex-grow px-6 py-4 text-gray-800 text-lg font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-transparent"
                />
              <button
                  type="submit"
                  className="btn-primary py-4 px-8 text-lg whitespace-nowrap"
                >
                  Create worksheet
              </button>
              </div>
            </form>

            {/* Popular topics */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {popularTopics.slice(0, 5).map((t, i) => (
              <button
                  key={i}
                  onClick={() => {
                    setTopic(t);
                    router.push(`/generator?topic=${encodeURIComponent(t)}`);
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-all hover:scale-105"
              >
                  {t}
              </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Bar - Orange/Amber like Chalkie */}
        <section className="stats-bar py-6 text-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌍</span>
                <span className="font-bold text-lg">100+ countries</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤝</span>
                <span className="font-bold text-lg">250,000+ teachers helped</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <span className="font-bold text-lg">40 languages</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
                Everything you need to teach
                <span className="block text-teal-600">and assess learning</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="feature-card animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`icon-wrapper ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gradient-to-b from-teal-50 to-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
                Create worksheets in <span className="text-teal-600">4 easy steps</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {howItWorks.map((item, index) => (
                <div key={index} className="relative">
                  <div className="card p-8 text-center h-full hover:shadow-xl">
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <div className="step-circle mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 w-6 h-6 items-center justify-center text-teal-400 -translate-y-1/2 z-10">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Types of Content Section */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
                Generate all types of
                <span className="text-amber-500"> educational content</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group cursor-pointer">
                <div className="card p-8 h-full border-2 border-transparent hover:border-teal-500 transition-all">
                  <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Worksheets</h3>
                  <p className="text-gray-600 mb-4">
                    Engaging activities to go with your lessons. Ready to share, export or print.
                  </p>
                  <span className="text-teal-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              <div className="group cursor-pointer">
                <div className="card p-8 h-full border-2 border-transparent hover:border-amber-500 transition-all">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <PenTool className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Quizzes</h3>
                  <p className="text-gray-600 mb-4">
                    Interactive quizzes with instant grading. Perfect for quick assessments.
                  </p>
                  <span className="text-amber-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
          </div>
        </div>

              <div className="group cursor-pointer">
                <div className="card p-8 h-full border-2 border-transparent hover:border-purple-500 transition-all">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Lightbulb className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Activities</h3>
                  <p className="text-gray-600 mb-4">
                    Fun classroom activities designed to boost engagement and understanding.
                  </p>
                  <span className="text-purple-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-amber-300 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Try Makos.ai for free
            </h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of teachers creating better worksheets in less time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/generator" className="btn-accent py-4 px-10 text-lg inline-flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Start Creating Free
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-300" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-300" />
                5 free worksheets/month
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-300" />
                Export to PDF & HTML
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="Makos.ai" className="h-14 w-auto" />
              </Link>
              <p className="text-sm leading-relaxed">
                AI-powered worksheet generator helping teachers save time and engage students.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="/generator" className="hover:text-teal-400 transition-colors">Create Worksheet</Link></li>
                <li><Link href="/my-worksheets" className="hover:text-teal-400 transition-colors">My Worksheets</Link></li>
                <li><Link href="/pricing" className="hover:text-teal-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Support</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4 text-lg">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 Makos.ai. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-500 hover:text-teal-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-slate-500 hover:text-teal-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
