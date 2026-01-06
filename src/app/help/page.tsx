"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  CalendarPlus,
  Ticket,
  User,
  CreditCard,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "Creating Events",
    icon: <CalendarPlus className="w-5 h-5" />,
    items: [
      {
        question: "How do I create an event?",
        answer:
          'Click the "Create Event" button in the header or on your My Events page. Fill in your event details including title, date, location, and description. You can add a cover image or use our gradient backgrounds.',
      },
      {
        question: "Can I edit my event after publishing?",
        answer:
          "Yes, you can edit your event at any time from your My Events page. Click on the event and select Edit. Changes will be reflected immediately.",
      },
      {
        question: "How do I cancel an event?",
        answer:
          "Go to your My Events page, find the event, and click Cancel Event. All registered attendees will be automatically notified via email.",
      },
    ],
  },
  {
    title: "Attending Events",
    icon: <Ticket className="w-5 h-5" />,
    items: [
      {
        question: "How do I register for an event?",
        answer:
          'Click on any event to view its details, then click the "Register" or "Get Tickets" button. Follow the prompts to complete your registration.',
      },
      {
        question: "Can I get a refund if I can\'t attend?",
        answer:
          "Refund policies are set by individual event hosts. Check the event details for the specific refund policy, or contact the host directly.",
      },
      {
        question: "How do I find events near me?",
        answer:
          "Use the location filter on the Discover page to select your city. You can also enable location services for automatic local event discovery.",
      },
    ],
  },
  {
    title: "Account & Profile",
    icon: <User className="w-5 h-5" />,
    items: [
      {
        question: "How do I create an account?",
        answer:
          "Click Sign Up and enter your email address. You can also sign up using your Mukoko ID for seamless integration across Mukoko products.",
      },
      {
        question: "How do I update my profile?",
        answer:
          "Click on your avatar in the top right corner and select Profile Settings. Here you can update your name, bio, and profile picture.",
      },
    ],
  },
  {
    title: "Payments & Tickets",
    icon: <CreditCard className="w-5 h-5" />,
    items: [
      {
        question: "What payment methods are accepted?",
        answer:
          "We accept mobile money (EcoCash, OneMoney, Innbucks), Visa, Mastercard, and bank transfers. Payment options may vary by region.",
      },
      {
        question: "Where can I find my tickets?",
        answer:
          "Your tickets are available in the My Events section under Attending. You can also access them via the confirmation email sent after registration.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(key)) {
      newOpenItems.delete(key);
    } else {
      newOpenItems.add(key);
    }
    setOpenItems(newOpenItems);
  };

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="max-w-200 mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          How can we help?
        </h1>
        <p className="text-text-secondary mb-8">
          Find answers to common questions about using nhimbe
        </p>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-elevated rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: <CalendarPlus className="w-5 h-5" />, label: "Create Event", href: "/events/create" },
          { icon: <MapPin className="w-5 h-5" />, label: "Find Events", href: "/" },
          { icon: <Ticket className="w-5 h-5" />, label: "My Tickets", href: "/my-events" },
          { icon: <User className="w-5 h-5" />, label: "Account", href: "/my-events" },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex flex-col items-center gap-2 p-4 bg-surface rounded-xl border border-elevated hover:border-primary/50 transition-colors"
          >
            <div className="text-primary">{link.icon}</div>
            <span className="text-sm font-medium text-foreground">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {filteredCategories.map((category, categoryIndex) => (
          <div key={category.title}>
            <div className="flex items-center gap-2 mb-4">
              <div className="text-primary">{category.icon}</div>
              <h2 className="text-xl font-semibold text-foreground">
                {category.title}
              </h2>
            </div>
            <div className="space-y-2">
              {category.items.map((item, itemIndex) => {
                const isOpen = openItems.has(`${categoryIndex}-${itemIndex}`);
                return (
                  <div
                    key={itemIndex}
                    className="bg-surface rounded-xl border border-elevated overflow-hidden"
                  >
                    <button
                      onClick={() => toggleItem(categoryIndex, itemIndex)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="font-medium text-foreground">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-text-tertiary transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <p className="text-text-secondary">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="mt-16 p-8 bg-surface rounded-xl border border-elevated text-center">
        <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Still need help?
        </h3>
        <p className="text-text-secondary mb-6">
          Our support team is here to assist you with any questions
        </p>
        <Button variant="primary">Contact Support</Button>
      </div>
    </div>
  );
}
