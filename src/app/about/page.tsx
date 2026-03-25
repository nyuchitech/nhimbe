import type { Metadata } from "next";
import { Users, Heart, Globe, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about nhimbe — a community events discovery and management platform connecting people across Africa.",
};

export default function AboutPage() {
  const values = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community First",
      description:
        "Every feature we build strengthens connections between people. We believe in the power of gathering.",
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Ubuntu Philosophy",
      description:
        '"I am because we are." We embrace the African philosophy of interconnectedness and shared humanity.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Pan-African Vision",
      description:
        "Built in Africa, for Africa, connecting communities across the continent and diaspora.",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Celebrate Together",
      description:
        "From tech meetups to cultural festivals, we make it easy to discover and create meaningful gatherings.",
    },
  ];

  return (
    <div className="max-w-200 mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
          About <span className="text-primary">nhimbe</span>
        </h1>
        <p className="text-xl text-text-secondary leading-relaxed">
          The gatherings and events platform built for African communities
        </p>
      </div>

      {/* Story */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-4">Our Story</h2>
        <div className="prose prose-lg text-text-secondary space-y-4">
          <p>
            <strong className="text-foreground">Nhimbe</strong> (pronounced /ˈnhimbɛ/)
            is the traditional Shona practice of communal work where community members
            come together to help each other with large tasks—harvesting, building,
            celebrations.
          </p>
          <p>
            The concept embodies <em>Ubuntu</em>: collective effort for shared benefit.
            When a family needed to harvest their fields or build a home, the community
            would gather to help. In return, that family would do the same for others.
            Together, everyone thrived.
          </p>
          <p>
            We built nhimbe to bring this spirit into the digital age. In a world where
            we&apos;re more connected than ever yet often feel isolated, nhimbe helps
            communities come together—whether for a tech meetup, a cultural celebration,
            a wellness session, or a simple gathering of friends.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8">What We Believe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((value) => (
            <div
              key={value.title}
              className="p-6 bg-surface rounded-xl border border-elevated"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-4">
                {value.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {value.title}
              </h3>
              <p className="text-text-secondary">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Part of Mukoko */}
      <section className="mb-16">
        <div className="p-8 bg-surface rounded-xl border border-elevated text-center">
          <p className="text-text-secondary mb-2">nhimbe is part of</p>
          <h3 className="text-2xl font-bold text-secondary mb-4">Mukoko</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            The digital ecosystem connecting African communities through technology.
            From payments to social connections, Mukoko is building Africa&apos;s
            digital future.
          </p>
        </div>
      </section>

      {/* Tagline */}
      <section className="text-center">
        <p className="font-serif italic text-2xl text-text-secondary">
          &ldquo;Together we gather, together we grow&rdquo;
        </p>
      </section>
    </div>
  );
}
