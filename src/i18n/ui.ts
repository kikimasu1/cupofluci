export type TimelineItem = {
  year: string;
  text: string;
};

export const copy = {
  brand: "cupofluci",
  navHome: "home",
  navAbout: "about",
  navNow: "now",
  navBlog: "blog",
  footerOther: "OTHER PLATFORMS",
  instagramUrl: "https://www.instagram.com/cupofluci/",
  xiaohongshuUrl:
    "https://www.xiaohongshu.com/user/profile/629cf576000000001b024f44",
  spotifyUrl:
    "https://open.spotify.com/user/31k7rquypcbzdi5iuteo3vval5mi",
  homeMe10s: "ME IN 10 SECONDS",
  homeAiDisclaimer: "(Writing is 100% done by me, not AI)",
  homeTagline: "Curious human, writer, builder, and existentialist.",
  homeTimeline: [
    {
      year: "(2016-2024)",
      text: "Adulting. Learning by making mistakes, breaking hearts, feeling kinda lost.",
    },
    {
      year: "(2024-2026)",
      text: "Growing. Taking responsibilities, talking to people, accepting myself.",
    },
    {
      year: "(2026-)",
      text: "?",
    },
  ] satisfies TimelineItem[],
  homeMe10m: "ME IN 10 MINUTES",
  homeNowBlurb: "WHAT AM I DOING NOW",
  homeContact: "CONTACT ME",
  homeContactEmail: "lucidreaminxx@gmail.com",
  homeNewestPrefix: "NEWEST ",
  homeNewestArticles: "ARTICLES",
  homeMore: "… and more here.",
  searchTitle: "SEARCH",
  searchButton: "search",
  searchPlaceholder: "",
  searchEmpty: "No matching articles.",
  searchHint: "Type a keyword to find articles.",
  searchInvalid: "Use letters, numbers, and simple punctuation only.",
  contactTitle: "contact me",
  contactLead: "I reply to every email, and I enjoy it.",
  contactSubmit: "email me",
  contactThanks: "Opening your email app…",
  contactHumanAnswer: "luci",
  contactHumanFail: "Type my first name to prove you’re human.",
  contactFillAll: "Please fill in every required field.",
  contactNeedState: "Please choose your state.",
  contactBadEmail: "Please enter a valid email address.",
  contactSlowDown: "Please wait a few seconds before trying again.",
  nowTitle: "Now",
  nowUpdated: "Updated",
  nowBody: [
    "Building personal site.",
    "Selling my stuff in Tampa.",
    "Doing apartment hunting for Tokyo.",
  ],
  blogTitle: "ARTICLES",
  blogEmpty: "No posts yet.",
  blogAllMeta: "ALL ({count}) ARTICLES, NEW TO OLD",
} as const;

export type CopyKey = keyof typeof copy;
