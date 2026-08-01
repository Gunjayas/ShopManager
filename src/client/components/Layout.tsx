import { NavLink, Outlet } from "react-router-dom";
import styles from "./Layout.module.css";

const navItems = [
  { to: "/pos", icon: "cart", label: "POS" },
  { to: "/inventory", icon: "box", label: "Inventory" },
  { to: "/orders", icon: "plus", label: "Orders" },
  { to: "/reports", icon: "chart", label: "Reports" },
] as const;

type NavigationIconName = (typeof navItems)[number]["icon"];

// Draws dependency-free navigation icons that remain crisp on old Android screens.
function NavigationIcon({ name }: { name: NavigationIconName }) {
  if (name === "cart") return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" /></svg>;
  if (name === "box") return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /><path d="M12 11v10" /></svg>;
  if (name === "plus") return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
  return <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
}

// Provides consistent page spacing and thumb-friendly primary navigation on the phone.
export function Layout() {
  return <div className={styles.app}><main className={styles.main}><Outlet /></main><nav className={styles.navigation} aria-label="Primary navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}><NavigationIcon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav></div>;
}