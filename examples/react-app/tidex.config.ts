import { defineConfig } from "@tidex/core";

export default defineConfig({
  scan: {
    include: ["src/**/*.tsx"],
    exclude: ["**/preview/**"],
    componentsDir: "src/components",
  },
  tokens: "tokens.json",
  // Seed nice demo data for collection-heavy components. Values are baked into
  // generated stories via JSON, so Map/Set props can't be seeded here (they'd
  // serialize to {}) — those start empty and are populated through the controls.
  defaults: {
    "layout/Stack": { direction: "row", gap: 12, align: "center", wrap: true, items: 3 },
    "layout/Grid": { columns: 3, gap: 8, cells: 6, aspect: "square" },
    "layout/Divider": {
      orientation: "horizontal",
      color: "#e2e8f0",
      thickness: 1,
      variant: "solid",
      label: "OR",
    },
    "typography/Prose": {
      title: "What's new",
      content:
        "Tidex turns your component library into a living, explorable catalog.\n\nEvery prop gets a control that matches its shape — no JSON editing required.",
      size: "md",
      align: "left",
    },
    "forms/RangeSlider": {
      label: "Price range",
      value: [25, 75],
      min: 0,
      max: 100,
      tone: "primary",
    },
    "forms/RatingInput": { value: 3.5, count: 5, icon: "star", color: "#f59e0b", readonly: false },
    "forms/TagInput": {
      label: "Skills",
      tags: ["React", "TypeScript", "CSS"],
      max: 8,
      placeholder: "Add a skill…",
    },
    "forms/SelectMenu": {
      label: "Assignee",
      options: [
        { label: "Jane Cooper", value: "jane" },
        { label: "Devon Lane", value: "devon" },
        { label: "Arlene McCoy (away)", value: "arlene", disabled: true },
      ],
      value: "jane",
      placeholder: "Select a person…",
      open: true,
    },
    "feedback/ProgressBar": {
      label: "Uploading",
      value: 64,
      tone: "primary",
      striped: true,
      showLabel: true,
    },
    "feedback/Notification": {
      title: "Deployment complete",
      message: "Your changes are live on production.",
      tone: "success",
      media: { type: "icon", glyph: "🚀" },
      dismissible: true,
    },
    "feedback/EmptyState": {
      icon: "inbox",
      title: "No messages yet",
      description: "When you get messages, they'll show up here.",
      action: { label: "Compose", href: "#" },
    },
    "feedback/Spinner": { size: "md", speed: 1, color: "#4f46e5", label: "Loading…" },
    "data/Timeline": {
      compact: false,
      events: [
        { time: "09:00", title: "Order placed", description: "Payment confirmed.", status: "done" },
        { time: "11:30", title: "Packed", description: "Ready to ship.", status: "done" },
        {
          time: "14:00",
          title: "Out for delivery",
          description: "On the way to you.",
          status: "active",
        },
        { time: "—", title: "Delivered", status: "pending" },
      ],
    },
    "data/BarChart": {
      barColor: "#4f46e5",
      height: 200,
      showValues: true,
      data: [
        { label: "Mon", value: 12 },
        { label: "Tue", value: 19 },
        { label: "Wed", value: 8 },
        { label: "Thu", value: 24 },
        { label: "Fri", value: 16 },
      ],
    },
    "composite/UserDirectory": {
      title: "Engineering",
      users: {
        jcooper: { name: "Jane Cooper", role: "admin", active: true },
        dlane: { name: "Devon Lane", role: "editor", active: true },
        amccoy: { name: "Arlene McCoy", role: "viewer", active: false },
      },
    },
    "composite/SettingsPanel": {
      theme: "system",
      density: "comfortable",
      notifications: { email: true, push: false, frequency: "daily" },
      privacy: { profileVisible: true, searchable: false },
    },
    "composite/Feed": {
      items: [
        { type: "post", author: "Jane Cooper", body: "Shipped the new controls system today 🎉" },
        { type: "photo", author: "Devon Lane", caption: "Our offsite view", color: "#0ea5e9" },
      ],
    },
    "media/AvatarGroup": {
      max: 3,
      size: "md",
      members: [
        { name: "Jane Cooper" },
        { name: "Devon Lane", color: "#0ea5e9" },
        { name: "Arlene McCoy", color: "#8b5cf6" },
        { name: "Cody Fisher" },
        { name: "Esther Howard" },
      ],
    },
    "marketing/Hero": {
      eyebrow: "v2.0",
      title: "Ship your design system faster",
      subtitle:
        "A polished, themeable component library your whole team can explore, tweak, and trust.",
      primaryCta: "Get started",
      secondaryCta: "View docs",
      align: "center",
    },
    "layout/CardGrid": {
      minWidth: 200,
      gap: 16,
      cards: [
        {
          icon: "⚡",
          title: "Fast",
          description: "Instant previews with hot-reload on every edit.",
        },
        {
          icon: "🎨",
          title: "Themeable",
          description: "Light and dark out of the box, token-driven.",
        },
        {
          icon: "🧩",
          title: "Shape-aware",
          description: "Controls that match each prop's data shape.",
        },
        {
          icon: "🛡️",
          title: "Type-safe",
          description: "Props inferred straight from your TypeScript.",
        },
      ],
    },
    "navigation/Navbar": {
      brand: "Tidex",
      links: ["Product", "Components", "Docs", "Pricing"],
      activeIndex: 1,
      cta: "Sign in",
    },
    "data/StatRow": {
      stats: [
        { label: "Revenue", value: "$48.2k", delta: 12.5 },
        { label: "Active users", value: "2,310", delta: 4.1 },
        { label: "Churn", value: "1.8%", delta: -0.6 },
        { label: "NPS", value: "62", delta: 8 },
      ],
    },
    "composite/PricingTiers": {
      currency: "$",
      tiers: [
        {
          name: "Starter",
          price: 0,
          period: "mo",
          featured: false,
          features: ["1 project", "Community support"],
        },
        {
          name: "Pro",
          price: 19,
          period: "mo",
          featured: true,
          features: ["Unlimited projects", "Dark mode", "Priority support"],
        },
        {
          name: "Team",
          price: 49,
          period: "mo",
          featured: false,
          features: ["Everything in Pro", "SSO", "Audit log"],
        },
      ],
    },
    "composite/Testimonial": {
      quote:
        "Tidex changed how our team reviews UI. Every prop is just there, ready to tweak — no more digging through Storybook stories.",
      author: "Jane Cooper",
      role: "Head of Design, Acme",
      avatarColor: "#4f46e5",
      rating: 5,
    },
  },
});
