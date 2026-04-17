import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen relative overflow-hidden bg-hero-gradient text-white flex">
      <svg
        className="absolute inset-y-0 left-0 w-1/2 h-full opacity-80"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {Array.from({ length: 28 }).map((_, i) => {
          const hue = 190 + (i * 4) % 80;
          const x = 160 - i * 3;
          const y = 360 - i * 4;
          const rx = 80 + i * 14;
          const ry = 60 + i * 11;
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={`hsl(${hue} 80% 60%)`}
              strokeWidth="1.2"
              opacity={0.5 - i * 0.01}
            />
          );
        })}
      </svg>

      <div className="absolute top-10 right-12">
        <Logo variant="light" />
      </div>

      <div className="ml-auto w-1/2 flex items-center px-16 relative">
        <div className="max-w-xl">
          <h1 className="text-5xl font-extrabold leading-tight mb-2">
            Start your investment plan now
          </h1>
          <p className="text-3xl font-light text-white/90 mb-6">be one step ahead</p>
          <p className="text-white/75 max-w-md mb-10 leading-relaxed">
            Marsa Financial Planning Tool is developed for financial advisors to help their
            clients make investment decisions through comprehensive insights.
          </p>
          <button
            className="btn-primary h-12 px-8 text-sm bg-primary-500/90 backdrop-blur hover:bg-primary-500"
            onClick={() => nav("/login")}
          >
            Financial Advisors Portal
          </button>
        </div>
      </div>
    </div>
  );
}
