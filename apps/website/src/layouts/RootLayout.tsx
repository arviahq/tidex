import { Outlet } from "@tanstack/react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useTheme } from "../hooks/useTheme";

export function RootLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="site">
      <Header theme={theme} onToggleTheme={toggle} />
      <Outlet />
      <Footer />
    </div>
  );
}
