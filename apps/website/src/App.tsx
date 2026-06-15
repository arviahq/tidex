import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { TestingTrinity } from "./components/TestingTrinity";
import { Comparison } from "./components/Comparison";
import { ConfigExample } from "./components/ConfigExample";
import { GetStarted } from "./components/GetStarted";
import { Footer } from "./components/Footer";
import { useTheme } from "./hooks/useTheme";
import "./site.css";

export function App() {
  const { theme, toggle } = useTheme();

  return (
    <div className="site">
      <Header theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero />
        <Features />
        <TestingTrinity />
        <Comparison />
        <ConfigExample />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
}
