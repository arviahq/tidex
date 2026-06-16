import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { TestingTrinity } from "../components/TestingTrinity";
import { Comparison } from "../components/Comparison";
import { ConfigExample } from "../components/ConfigExample";
import { GetStarted } from "../components/GetStarted";

export function HomePage() {
  return (
    <main>
      <Hero />
      <Features />
      <TestingTrinity />
      <Comparison />
      <ConfigExample />
      <GetStarted />
    </main>
  );
}
