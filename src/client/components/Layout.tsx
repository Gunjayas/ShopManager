import { NavLink, Outlet } from "react-router-dom";
import styles from "../styles/app.module.css";

const navItems = [["/pos", "▣", "POS"], ["/inventory", "◫", "Inventory"], ["/intake", "＋", "Intake"], ["/reports", "⌁", "Reports"]] as const;

// Provides consistent page spacing and thumb-friendly primary navigation on the phone.
export function Layout() { return <div className={styles.app}><main className={styles.main}><Outlet /></main><nav className={styles.nav} aria-label="Primary navigation">{navItems.map(([to, icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}><span className={styles.navIcon} aria-hidden="true">{icon}</span><span>{label}</span></NavLink>)}</nav></div>; }