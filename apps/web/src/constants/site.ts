export const SITE_URL = "https://opencut.app";

export const SITE_INFO = {
  title: "OpenCut",
  description:
    "A simple but powerful video editor that gets the job done. In your browser.",
  url: SITE_URL,
  openGraphImage: "/open-graph/default.jpg",
  twitterImage: "/open-graph/default.jpg",
  favicon: "/favicon.ico",
};

export const EXTERNAL_TOOLS = [
  {
    name: "Marble",
    description: "Modern headless CMS for content management",
    url: "https://marblecms.com?utm_source=opencut",
    icon: "MarbleIcon" as const,
  },
  {
    name: "Vercel",
    description: "Platform for frontend frameworks and static sites",
    url: "https://vercel.com?utm_source=opencut",
    icon: "VercelIcon" as const,
  },
  {
    name: "DataBuddy",
    description: "GDPR compliant analytics and user insights",
    url: "https://databuddy.cc?utm_source=opencut",
    icon: "DataBuddyIcon" as const,
  },
];
