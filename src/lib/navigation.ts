export const merchantNav = [
  { href: "/dashboard", key: "nav.dashboard", icon: "home" },
  { href: "/sales/new", key: "nav.newSale", icon: "plus" },
  { href: "/payments", key: "nav.payments", icon: "bolt" },
  { href: "/products", key: "nav.products", icon: "box" },
  { href: "/customers", key: "nav.customers", icon: "users" },
  { href: "/expenses", key: "nav.expenses", icon: "receipt" },
  { href: "/assistant", key: "nav.assistant", icon: "spark" },
  { href: "/settings", key: "nav.settings", icon: "settings" },
] as const;

export type NavIcon = (typeof merchantNav)[number]["icon"];

/** Primary items for mobile bottom bar (max 5). */
export const mobilePrimaryNav = [
  merchantNav[0],
  merchantNav[1],
  merchantNav[2],
  merchantNav[6],
  { href: "/more", key: "nav.more", icon: "menu" as const },
] as const;

export const mobileMoreNav = [
  merchantNav[3],
  merchantNav[4],
  merchantNav[5],
  merchantNav[7],
] as const;
