import React, { useEffect, useRef, useState } from 'react';
import { 
  Terminal, 
  Shield, 
  Network, 
  LogIn, 
  ChevronRight, 
  ShieldAlert, 
  Cpu, 
  Radio, 
  Lock, 
  Crosshair, 
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface LandingPageProps {
  onInitializeSession: () => void;
  onExploreTracks: () => void;
}

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  // Starting green/cyan palette
  safeColor: [number, number, number];
  safeGlow: [number, number, number];
  // Target red/orange alert palette
  alertColor: [number, number, number];
  alertGlow: [number, number, number];
}

interface TerminalLogLine {
  text: string;
  type: 'command' | 'info' | 'port' | 'divider' | 'vuln' | 'alert' | 'success' | 'highlight' | 'flag';
  phase: number;
}

const TERMINAL_LOG_DATA: TerminalLogLine[] = [
  { text: "$ nmap -sS -sV -p 22,80,443,3306,8080 -T4 10.0.42.133 --script vuln", type: "command", phase: 0 },
  { text: "[+] Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-24 10:45 UTC", type: "info", phase: 0 },
  { text: "[+] Initiating Stealth SYN scan against gateway target (10.0.42.133)", type: "info", phase: 0 },
  { text: "[+] Discovered open port 22/tcp on 10.0.42.133 (OpenSSH 8.9p1 Ubuntu)", type: "port", phase: 0 },
  { text: "[+] Discovered open port 80/tcp on 10.0.42.133 (nginx/1.18.0)", type: "port", phase: 0 },
  { text: "[+] Discovered open port 443/tcp on 10.0.42.133 (nginx/1.18.0 TLSv1.3)", type: "port", phase: 0 },
  { text: "[+] Discovered open port 3306/tcp on 10.0.42.133 (MySQL 8.0.35)", type: "port", phase: 0 },
  { text: "[+] Discovered open port 8080/tcp on 10.0.42.133 (GoAhead-Webs Proxy)", type: "port", phase: 0 },
  { text: "----------------------------------------------------------------", type: "divider", phase: 1 },
  { text: "[*] SCAN COMPLETE: 5 open attack vectors. Commencing Tier 4 CVE vulnerability audit...", type: "alert", phase: 1 },
  { text: "[!] Target: /api/v1/internal/auth - CVE-2024-3094 probe: NEGATIVE (Clean)", type: "info", phase: 1 },
  { text: "[!] Target: /api/v1/gateway - CORS Misconfiguration (Access-Control-Allow-Origin: *)", type: "vuln", phase: 1 },
  { text: "[!] Target: port 8080 - Unauthenticated Remote Code Execution in URI parser", type: "vuln", phase: 1 },
  { text: "----------------------------------------------------------------", type: "divider", phase: 2 },
  { text: "$ ./payload_gen --target x86_64-linux-gnu --evade-edr --syscall direct", type: "command", phase: 2 },
  { text: "[*] Synthesizing stageless shellcode: NtAllocateVirtualMemory direct syscall stub", type: "info", phase: 2 },
  { text: "[*] Binary footprint: 482 bytes | High Entropy Obfuscation: ACTIVE", type: "info", phase: 2 },
  { text: "[*] Injecting encrypted exploit frame -> 10.0.42.133:8080", type: "info", phase: 2 },
  { text: "[+] Memory allocated at 0x7fff8c201000 [RWX]. Kernel EDR hooks unhooked.", type: "success", phase: 2 },
  { text: "----------------------------------------------------------------", type: "divider", phase: 3 },
  { text: "[*] Triggering execution via instruction pointer rip redirection...", type: "alert", phase: 3 },
  { text: "[+] Reverse shell established: 10.0.42.133:4444 -> operator.cf-academy:4444", type: "success", phase: 3 },
  { text: "$ whoami && id && uname -a", type: "command", phase: 3 },
  { text: "root", type: "highlight", phase: 3 },
  { text: "uid=0(root) gid=0(root) groups=0(root) context=system_u:system_r:init_t:s0", type: "highlight", phase: 3 },
  { text: "Linux defense-target 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64", type: "info", phase: 3 },
  { text: "[✓] CAPTURED FLAG: CF_FLAG{z3r0_d4y_k3rn3l_d0m1n4nc3_2026}", type: "flag", phase: 3 },
  { text: "[✓] ACADEMY PROTOCOL: TIER 11 RECON & EXPLOIT OBJECTIVES VERIFIED", type: "flag", phase: 3 },
];

export default function LandingPage({ onInitializeSession, onExploreTracks }: LandingPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  // Dynamic values tracked for rendering
  const scrollRef = useRef<{
    scrollY: number;
    velocityBoost: number;
    scrollProgress: number; // 0 (safe/cyan) to 1 (alert/red)
  }>({
    scrollY: 0,
    velocityBoost: 1.0,
    scrollProgress: 0,
  });

  // 2. Intersection Observer state for feature cards
  const featuresContainerRef = useRef<HTMLDivElement | null>(null);
  const [featuresVisible, setFeaturesVisible] = useState<boolean>(false);

  // 3. Curriculum preview scroll section state
  const curriculumSectionRef = useRef<HTMLDivElement | null>(null);
  const terminalBodyRef = useRef<HTMLDivElement | null>(null);
  const [terminalScrollProgress, setTerminalScrollProgress] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // IntersectionObserver for the 3 Feature Cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setFeaturesVisible(true);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (featuresContainerRef.current) {
      observer.observe(featuresContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Scroll listener for velocity effect, color shift, and sticky terminal typing
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

    const handleScroll = () => {
      const now = performance.now();
      const currentScrollY = window.scrollY;
      const dt = Math.max(1, now - lastScrollTime);
      const dy = Math.abs(currentScrollY - lastScrollY);
      const speed = dy / dt; // pixels per ms

      // 1. Scroll velocity effect: boost node velocity dynamically
      const boost = Math.min(6.5, 1.0 + speed * 2.8);
      if (boost > scrollRef.current.velocityBoost) {
        scrollRef.current.velocityBoost = boost;
      }

      // 2. Calculate scroll progress for color shift:
      // Starts shifting as user leaves hero (150px) and reaches full alert red/orange by 800px
      const colorProgress = Math.min(Math.max((currentScrollY - 120) / 700, 0), 1);
      scrollRef.current.scrollProgress = colorProgress;
      scrollRef.current.scrollY = currentScrollY;

      lastScrollY = currentScrollY;
      lastScrollTime = now;

      // 3. Track progress inside the Curriculum Preview section
      if (curriculumSectionRef.current && !isAutoPlaying) {
        const rect = curriculumSectionRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Total scrollable travel for this section
        const scrollDistance = rect.height - windowHeight * 0.7;
        if (scrollDistance > 0) {
          const rawProgress = -rect.top / scrollDistance;
          const clamped = Math.min(Math.max(rawProgress, 0), 1);
          setTerminalScrollProgress(clamped);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial run
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isAutoPlaying]);

  // Optional manual playback / simulate run
  useEffect(() => {
    if (!isAutoPlaying) return;

    let step = terminalScrollProgress;
    const interval = setInterval(() => {
      step += 0.015;
      if (step >= 1) {
        setTerminalScrollProgress(1);
        setIsAutoPlaying(false);
        clearInterval(interval);
      } else {
        setTerminalScrollProgress(step);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isAutoPlaying, terminalScrollProgress]);

  // Auto-scroll the terminal inner console as new lines appear
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalScrollProgress]);

  // 1. Fixed & Reactive Canvas Background Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Color pairs: [Safe Green/Cyan] -> [Aggressive Red/Orange]
    const colorPairs: {
      safeFill: [number, number, number];
      safeGlow: [number, number, number];
      alertFill: [number, number, number];
      alertGlow: [number, number, number];
    }[] = [
      {
        safeFill: [6, 182, 212], // cyan-500
        safeGlow: [8, 145, 178], // cyan-600
        alertFill: [249, 115, 22], // orange-500
        alertGlow: [234, 88, 12], // orange-600
      },
      {
        safeFill: [16, 185, 129], // emerald-500
        safeGlow: [5, 150, 105], // emerald-600
        alertFill: [239, 68, 68], // red-500
        alertGlow: [220, 38, 38], // red-600
      },
      {
        safeFill: [20, 184, 166], // teal-500
        safeGlow: [13, 148, 136], // teal-600
        alertFill: [245, 158, 11], // amber-500
        alertGlow: [217, 119, 6], // amber-600
      },
      {
        safeFill: [52, 211, 153], // mint-400
        safeGlow: [16, 185, 129], // emerald-500
        alertFill: [251, 146, 60], // orange-400
        alertGlow: [239, 68, 68], // red-500
      },
      {
        safeFill: [56, 189, 248], // sky-400
        safeGlow: [2, 132, 199], // sky-600
        alertFill: [244, 63, 94], // rose-500
        alertGlow: [225, 29, 72], // rose-600
      },
    ];

    // Generate 90 glowing nodes
    const nodeCount = 90;
    const nodes: ParticleNode[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const pair = colorPairs[Math.floor(Math.random() * colorPairs.length)];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75,
        radius: Math.random() * 1.8 + 1.2,
        safeColor: pair.safeFill,
        safeGlow: pair.safeGlow,
        alertColor: pair.alertFill,
        alertGlow: pair.alertGlow,
      });
    }

    const mouse = mouseRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const connectionDistance = 135;
    const mouseRepelRadius = 140;
    const mouseConnectRadius = 180;

    // Helper: interpolate RGB
    const interpolateRgb = (
      c1: [number, number, number],
      c2: [number, number, number],
      factor: number
    ): [number, number, number] => {
      return [
        Math.round(c1[0] + (c2[0] - c1[0]) * factor),
        Math.round(c1[1] + (c2[1] - c1[1]) * factor),
        Math.round(c1[2] + (c2[2] - c1[2]) * factor),
      ];
    };

    const rgbString = (c: [number, number, number], alpha = 1): string => {
      return alpha < 1 ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly ease velocity boost back down to normal slow drift (1.0)
      const currentBoost = scrollRef.current.velocityBoost;
      scrollRef.current.velocityBoost += (1.0 - currentBoost) * 0.055;
      const speedMultiplier = scrollRef.current.velocityBoost;

      // Color shift interpolation factor (0 = terminal green/cyan, 1 = alert red/orange)
      const colorFactor = scrollRef.current.scrollProgress;

      // 1. Update node positions & handle mouse repulsion
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Velocity scaled by scroll velocity effect
        node.x += node.vx * speedMultiplier;
        node.y += node.vy * speedMultiplier;

        // Bounce gently off canvas bounds
        if (node.x < 0) {
          node.x = 0;
          node.vx *= -1;
        } else if (node.x > width) {
          node.x = width;
          node.vx *= -1;
        }

        if (node.y < 0) {
          node.y = 0;
          node.vy *= -1;
        } else if (node.y > height) {
          node.y = height;
          node.vy *= -1;
        }

        // Mouse repulsion interaction
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < mouseRepelRadius && dist > 0) {
            const force = (mouseRepelRadius - dist) / mouseRepelRadius;
            const pushX = (dx / dist) * force * 3.0;
            const pushY = (dy / dist) * force * 3.0;
            node.x += pushX;
            node.y += pushY;
          }
        }
      }

      // Base line RGB shifted with scroll percentage
      const safeLineRgb: [number, number, number] = [6, 182, 212];
      const alertLineRgb: [number, number, number] = [239, 68, 68];
      const currentLineRgb = interpolateRgb(safeLineRgb, alertLineRgb, colorFactor);

      // 2. Draw dynamic connecting lines between adjacent nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.32;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = rgbString(currentLineRgb, alpha);
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // 3. Draw temporary glowing lines from cursor to nearest nodes
      if (mouse.active) {
        const safeCursorGlow: [number, number, number] = [16, 185, 129];
        const alertCursorGlow: [number, number, number] = [249, 115, 22];
        const currentCursorGlow = interpolateRgb(safeCursorGlow, alertCursorGlow, colorFactor);

        for (let i = 0; i < nodes.length; i++) {
          const dx = nodes[i].x - mouse.x;
          const dy = nodes[i].y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < mouseConnectRadius) {
            const lineAlpha = (1 - dist / mouseConnectRadius) * 0.6;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(nodes[i].x, nodes[i].y);
            ctx.strokeStyle = rgbString(currentCursorGlow, lineAlpha);
            ctx.lineWidth = 1.3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = rgbString(currentCursorGlow, 0.9);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      }

      // 4. Draw glowing nodes with smoothly interpolated colors
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentColor = interpolateRgb(node.safeColor, node.alertColor, colorFactor);
        const currentGlow = interpolateRgb(node.safeGlow, node.alertGlow, colorFactor);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = rgbString(currentColor);
        ctx.shadowBlur = 8 + speedMultiplier * 1.5;
        ctx.shadowColor = rgbString(currentGlow);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Compute typed terminal content based on scroll progress
  const totalLogLines = TERMINAL_LOG_DATA.length;
  // Progress scaled across lines
  const rawLineIndex = terminalScrollProgress * (totalLogLines + 0.5);
  const currentLineIndex = Math.min(Math.floor(rawLineIndex), totalLogLines);
  const activePhase = currentLineIndex >= totalLogLines ? 3 : (TERMINAL_LOG_DATA[currentLineIndex]?.phase ?? 0);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Fixed & Reactive Canvas Background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
        }}
      />

      {/* Cyber Grid Texture Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none -z-[1] opacity-20 bg-[linear-gradient(to_right,#06b6d40f_1px,transparent_1px),linear-gradient(to_bottom,#06b6d40f_1px,transparent_1px)] bg-[size:4rem_4rem]" 
      />

      {/* Radial vignette mask */}
      <div className="fixed inset-0 pointer-events-none -z-[1] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.75)_80%)]" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-md">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="font-mono font-bold tracking-tight text-base text-white">
            CYBERFOUNDATIONS
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400 font-mono">
          <button 
            onClick={onExploreTracks}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Curriculum
          </button>
          <a 
            href="#features" 
            className="hover:text-emerald-400 transition-colors"
          >
            Verification
          </a>
          <a 
            href="#curriculum-preview" 
            className="hover:text-orange-400 transition-colors"
          >
            Threat Landscape
          </a>
          <button 
            onClick={onExploreTracks}
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            11 Tiers
          </button>
        </nav>

        {/* Primary Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={onInitializeSession}
            className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 font-mono text-xs font-semibold rounded-md transition-all duration-200 shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer flex items-center gap-2"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
        </div>
      </header>

      {/* Main Page Flow */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-10 md:py-14 max-w-6xl mx-auto w-full space-y-24 md:space-y-32">
        
        {/* HERO SECTION (Glassmorphism UI) */}
        <div className="w-full bg-slate-950/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 sm:p-12 md:p-16 shadow-[0_0_50px_rgba(16,185,129,0.1)] text-center relative overflow-hidden">
          {/* Top edge glow beam */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
          
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Security clearance badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEFENSE PROTOCOL // TIER 1-11 ACCESS</span>
            </div>

            {/* Headline with glowing text shadow */}
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans"
              style={{
                textShadow: '0 0 25px rgba(16, 185, 129, 0.45), 0 0 50px rgba(6, 182, 212, 0.25)',
              }}
            >
              From Fundamentals to Zero-Day.{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Master the Art of Cyber Defense.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              An interactive, 11-tier academy featuring local terminal verification, real-time threat intelligence, and capture-the-flag environments.
            </p>

            {/* CTA Buttons Cluster */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Primary CTA Button */}
              <button
                id="initialize-session-hero-btn"
                onClick={onInitializeSession}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 hover:from-blue-500 hover:via-cyan-400 hover:to-emerald-400 text-slate-950 font-mono text-sm sm:text-base font-extrabold rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer group"
              >
                <LogIn className="h-5 w-5 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>[ INITIALIZE SESSION ]</span>
              </button>

              {/* Secondary CTA: Explore Tracks */}
              <button
                onClick={onExploreTracks}
                className="w-full sm:w-auto px-6 py-4 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 font-mono text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Syllabus (Guest Mode)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Scroll Indicator Prompt */}
            <div className="pt-6 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-block animate-bounce">↓</span>
              <span>SCROLL TO DIVE INTO NETWORK TOPOLOGY</span>
              <span className="inline-block animate-bounce">↓</span>
            </div>
          </div>
        </div>

        {/* 2. CORE FEATURES (Intersection Observer Scroll Reveals) */}
        <section id="features" className="w-full scroll-mt-24">
          <div className="mb-6 flex flex-col items-center text-center space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
              Operational Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Engineered for Real-World Dominance
            </h2>
          </div>

          <div 
            ref={featuresContainerRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Card 1: Terminal Icon */}
            <div 
              onClick={onExploreTracks}
              className={`bg-slate-950/60 backdrop-blur-md border border-slate-800 hover:border-emerald-500/60 rounded-xl p-6 transition-all duration-700 ease-out transform cursor-pointer flex flex-col justify-between group ${
                featuresVisible ? 'opacity-100 translate-y-0 shadow-[0_0_30px_rgba(16,185,129,0.08)]' : 'opacity-0 translate-y-10 pointer-events-none'
              } hover:shadow-[0_0_35px_rgba(16,185,129,0.22)] hover:-translate-y-1`}
              style={{ transitionDelay: '0ms' }}
            >
              <div>
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all duration-300">
                  <Terminal className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Tier 1 to 11 Clearance
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
                  Covering basic Linux to advanced Reverse Engineering & GRC.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-emerald-400 transition-colors">
                <span>Explore 11 tiers</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Shield Icon */}
            <div 
              onClick={onInitializeSession}
              className={`bg-slate-950/60 backdrop-blur-md border border-slate-800 hover:border-cyan-500/60 rounded-xl p-6 transition-all duration-700 ease-out transform cursor-pointer flex flex-col justify-between group ${
                featuresVisible ? 'opacity-100 translate-y-0 shadow-[0_0_30px_rgba(6,182,212,0.08)]' : 'opacity-0 translate-y-10 pointer-events-none'
              } hover:shadow-[0_0_35px_rgba(6,182,212,0.22)] hover:-translate-y-1`}
              style={{ transitionDelay: '150ms' }}
            >
              <div>
                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all duration-300">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Active Terminal Verification
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
                  Dynamic homework log validators running locally.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
                <span>Validate environments</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Network Icon */}
            <div 
              onClick={onInitializeSession}
              className={`bg-slate-950/60 backdrop-blur-md border border-slate-800 hover:border-teal-500/60 rounded-xl p-6 transition-all duration-700 ease-out transform cursor-pointer flex flex-col justify-between group ${
                featuresVisible ? 'opacity-100 translate-y-0 shadow-[0_0_30px_rgba(20,184,166,0.08)]' : 'opacity-0 translate-y-10 pointer-events-none'
              } hover:shadow-[0_0_35px_rgba(20,184,166,0.22)] hover:-translate-y-1`}
              style={{ transitionDelay: '300ms' }}
            >
              <div>
                <div className="h-12 w-12 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-105 group-hover:bg-teal-500/20 transition-all duration-300">
                  <Network className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                  Encrypted Intelligence Teams
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
                  Persistent community forums and encrypted chat.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400 group-hover:text-teal-400 transition-colors">
                <span>Join operator team</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </section>

        {/* 3. CURRICULUM PREVIEW (Scroll Section with Lots of Vertical Padding & Sticky Terminal) */}
        <section 
          id="curriculum-preview" 
          ref={curriculumSectionRef}
          className="w-full relative pb-32 pt-12 scroll-mt-20"
        >
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-xs tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Crosshair className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>LIVE OFFENSIVE SIMULATION // SANDBOXED EXECUTION</span>
            </div>

            {/* Glowing Headline */}
            <h2 
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-sans"
              style={{
                textShadow: '0 0 25px rgba(249, 115, 22, 0.5), 0 0 50px rgba(239, 68, 68, 0.3)',
              }}
            >
              Engage the Threat Landscape
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Scroll down to stream real-time reconnaissance scans, memory evasion payloads, and remote shell takeovers executed against our dynamic sandbox.
            </p>

            {/* Phase badges indicator */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
              {[
                { label: '01. Recon SYN', phase: 0 },
                { label: '02. CVE Audit', phase: 1 },
                { label: '03. Syscall Evasion', phase: 2 },
                { label: '04. Root Shell', phase: 3 },
              ].map((p) => {
                const isActive = activePhase === p.phase;
                const isPassed = activePhase > p.phase;
                return (
                  <div
                    key={p.label}
                    className={`px-3 py-1 rounded border transition-all duration-300 ${
                      isActive 
                        ? 'bg-orange-500/20 border-orange-400 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.3)]' 
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    {isPassed && '✓ '}
                    {isActive && '▶ '}
                    {p.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Container Track */}
          <div className="relative min-h-[140vh]">
            
            {/* Sticky Terminal Component */}
            <div className="sticky top-24 z-20 w-full">
              <div className="bg-slate-950/80 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-[0_0_60px_rgba(249,115,22,0.18)] overflow-hidden transition-all duration-300">
                
                {/* Terminal Header Bar */}
                <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
                  {/* Left: Window Dots */}
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="ml-3 font-mono text-xs text-slate-400 hidden sm:inline-block">
                      target: <span className="text-orange-400 font-semibold">10.0.42.133</span> (LIVE-RANGE-01)
                    </span>
                  </div>

                  {/* Center: Scroll progress meter */}
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                    <Radio className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                    <span className="hidden md:inline">STREAM SYNC:</span>
                    <span className="text-orange-300 font-bold">
                      {Math.round(terminalScrollProgress * 100)}%
                    </span>
                  </div>

                  {/* Right: Interactive controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isAutoPlaying ? "Pause stream" : "Auto-play execution"}
                    >
                      {isAutoPlaying ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 text-emerald-400" />
                          <span>Auto-Play</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTerminalScrollProgress(0);
                        setIsAutoPlaying(false);
                      }}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Reset terminal"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar line right below titlebar */}
                <div className="w-full bg-slate-900 h-1 relative overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-150"
                    style={{ width: `${Math.round(terminalScrollProgress * 100)}%` }}
                  />
                </div>

                {/* Terminal Console Content */}
                <div 
                  ref={terminalBodyRef}
                  className="p-5 sm:p-7 font-mono text-xs sm:text-sm text-slate-200 h-80 sm:h-96 overflow-y-auto space-y-1.5 bg-slate-950/90 selection:bg-orange-500 selection:text-black"
                >
                  {currentLineIndex === 0 && (
                    <div className="text-slate-400 italic py-8 text-center space-y-2">
                      <p className="text-orange-400/80 font-bold not-italic">
                        [ SYSTEM ARMED // SCROLL TO COMMENCE RECONNAISSANCE SCAN ]
                      </p>
                      <p className="text-xs text-slate-400">
                        Rotate scroll wheel or click Auto-Play above to trigger network injection.
                      </p>
                    </div>
                  )}

                  {TERMINAL_LOG_DATA.slice(0, currentLineIndex).map((line, idx) => {
                    let styleClass = 'text-slate-300';

                    if (line.type === 'command') {
                      styleClass = 'text-cyan-400 font-bold';
                    } else if (line.type === 'port') {
                      styleClass = 'text-emerald-400';
                    } else if (line.type === 'vuln') {
                      styleClass = 'text-orange-400 font-semibold';
                    } else if (line.type === 'alert') {
                      styleClass = 'text-amber-400 font-semibold';
                    } else if (line.type === 'divider') {
                      return (
                        <div key={idx} className="border-t border-slate-800/80 my-2 opacity-50" />
                      );
                    } else if (line.type === 'success') {
                      styleClass = 'text-emerald-300 font-medium';
                    } else if (line.type === 'highlight') {
                      styleClass = 'text-red-400 font-bold bg-red-950/40 px-1 py-0.5 rounded border border-red-500/30 inline-block';
                    } else if (line.type === 'flag') {
                      return (
                        <div 
                          key={idx} 
                          className="my-2 p-2.5 rounded-lg bg-gradient-to-r from-red-950/70 via-orange-950/60 to-slate-900 border border-orange-500/50 text-orange-300 font-bold shadow-[0_0_20px_rgba(249,115,22,0.25)] flex items-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                          <span>{line.text}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={`${styleClass} leading-relaxed flex items-start gap-2`}>
                        <span className="text-slate-400 select-none text-[11px] w-6 text-right">
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="flex-1 break-all">{line.text}</span>
                      </div>
                    );
                  })}

                  {/* Active Blinking Cursor */}
                  {currentLineIndex > 0 && currentLineIndex < totalLogLines && (
                    <div className="flex items-center gap-2 text-orange-400 pt-1">
                      <span className="text-slate-400 select-none text-[11px] w-6 text-right">
                        {(currentLineIndex + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="inline-block w-2.5 h-4 bg-orange-400 animate-pulse" />
                      <span className="text-xs text-slate-400 italic">streaming payload...</span>
                    </div>
                  )}

                  {/* Complete Banner */}
                  {currentLineIndex >= totalLogLines && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>LIVE-RANGE ROOT ACQUIRED: Complete 11-Tier sandbox unlocked.</span>
                      </div>
                      <button
                        onClick={onInitializeSession}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
                      >
                        Enter Academy
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer status bar */}
                <div className="bg-slate-950 px-4 py-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                      TERMINAL: ACTIVE
                    </span>
                    <span className="hidden sm:inline-block text-slate-400">·</span>
                    <span className="hidden sm:inline-block text-slate-400">
                      SYS: x86_64 Ubuntu 22.04 LTS
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-orange-400 font-semibold">
                      {activePhase === 0 && 'STAGE 1: RECONNAISSANCE'}
                      {activePhase === 1 && 'STAGE 2: VULN DISCOVERY'}
                      {activePhase === 2 && 'STAGE 3: SYSCALL INJECTION'}
                      {activePhase === 3 && 'STAGE 4: ROOT COMPROMISE'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Explanatory track cards below sticky terminal */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800/90 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
                    <Cpu className="h-4 w-4" />
                    <span>DEFENSIVE CORRELATION</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Learn to audit open telemetry, reconstruct memory injections, and harden internal Linux kernels against real-world APT intrusion chains.
                  </p>
                </div>

                <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800/90 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-orange-400 font-mono text-xs font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>ZERO-DAY RESEARCH LABS</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Every homework log validator executes locally on your machine or inside cloud-isolated containers with automatic grading and flag verification.
                  </p>
                </div>
              </div>

              {/* Call to Action Bar */}
              <div className="mt-10 p-8 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border border-orange-500/40 text-center space-y-4 shadow-[0_0_40px_rgba(249,115,22,0.12)]">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Ready to test your capabilities against the threat matrix?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                  Initialize your operator identity today and begin Tier 1 verification immediately.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={onInitializeSession}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 hover:from-orange-400 hover:via-amber-400 hover:to-emerald-400 text-slate-950 font-mono text-sm font-extrabold rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4 text-slate-950" />
                    <span>[ INITIALIZE SESSION ]</span>
                  </button>
                  <button
                    onClick={onExploreTracks}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    Explore 11-Tier Curriculum
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/60 py-6 text-center text-xs font-mono text-slate-400 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span>CORE NODE: ONLINE</span>
            <span aria-hidden="true">·</span>
            <span>CLEARANCE: LEVEL 0 PUBLIC</span>
          </div>
          <p className="text-slate-400">
            CyberFoundations Academy © {new Date().getFullYear()} · Terminal Security & CTF Systems
          </p>
        </div>
      </footer>
    </div>
  );
}
