import React from 'react';
import { Upload, MessageCircle, Zap, Shield, Star, ArrowRight, FileText, Brain, Clock, Users, Check } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

const TalkToPDFLanding = () => {

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Talk To PDF</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Pricing</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">About</a>
            <SignedOut>
              <SignInButton>
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href={"/chat"} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Chat Now
              </Link>
            </SignedIn>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              AI-Powered PDF Analysis
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Have conversations with
            <br />
            <span className="text-blue-600">your PDF documents</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Upload any PDF and start asking questions. Get instant answers, summaries, and insights
            powered by advanced AI technology.
          </p>

          {/* Upload Demo */}
          <div className="mb-12">
            <div className="inline-flex items-center space-x-4 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-gray-700 font-medium">Upload PDF</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Start Chatting</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm">
              <span>Try for Free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors">
              View Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap justify-center items-center space-x-12 text-gray-500 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>10,000+ users</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>1M+ documents processed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>4.9/5 rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to understand your documents
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful AI features designed to make document analysis simple and efficient
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Smart Analysis",
                description: "Advanced AI understands context and provides accurate, relevant answers to your questions.",
                color: "blue"
              },
              {
                icon: Zap,
                title: "Instant Results",
                description: "Get immediate responses without waiting. Lightning-fast processing for real-time insights.",
                color: "purple"
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Your documents are encrypted and processed securely. We never store your files permanently.",
                color: "green"
              },
              {
                icon: FileText,
                title: "Any PDF Format",
                description: "Works with all PDF types including scanned documents, forms, and complex layouts.",
                color: "orange"
              },
              {
                icon: MessageCircle,
                title: "Natural Chat",
                description: "Ask questions in plain English and get human-like responses that make sense.",
                color: "pink"
              },
              {
                icon: Clock,
                title: "Quick Summaries",
                description: "Generate comprehensive summaries and extract key information from lengthy documents.",
                color: "indigo"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`group p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    feature.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                      feature.color === 'green' ? 'bg-green-100 text-green-600' :
                        feature.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                          feature.color === 'pink' ? 'bg-pink-100 text-pink-600' :
                            'bg-indigo-100 text-indigo-600'
                  }`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload your PDF",
                description: "Drag and drop or select any PDF document from your device. We support all common formats."
              },
              {
                step: "02",
                title: "Ask questions",
                description: "Type your questions naturally. Ask about specific topics, request summaries, or seek clarification."
              },
              {
                step: "03",
                title: "Get instant answers",
                description: "Receive accurate, contextual responses based on your document's content in seconds."
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to start chatting with your PDFs?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are transforming how they interact with documents
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Start Free Trial
              </button>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-medium hover:border-gray-400 hover:bg-white transition-colors">
                Schedule Demo
              </button>
            </div>

            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Free trial available</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Talk To PDF</span>
            </div>
            <div className="flex items-center space-x-6 text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center text-gray-500">
            <p>&copy; 2024 Talk To PDF. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TalkToPDFLanding;