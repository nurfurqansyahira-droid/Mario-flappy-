import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Sparkles, LogIn, ChevronRight, HelpCircle, Gamepad2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { retroAudio } from "../audio";

interface LoginViewProps {
  onLoginSuccess: (email: string, username: string, isAnon: boolean) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple state arrays for background rendering animation tick
  const [roadOffset, setRoadOffset] = useState(0);

  // Infinite road scroll simulation
  useEffect(() => {
    let frameId: number;
    const tick = () => {
      setRoadOffset((prev) => (prev - 1.5) % 80);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    // Simulate short server delay for polish
    setTimeout(() => {
      setIsSubmitting(false);
      try {
        if (recoveryMode) {
          alert(`Password recovery instructions were dispatched to: ${email}`);
          setRecoveryMode(false);
          return;
        }

        if (!email || !password) {
          setErrorMessage("Please supply your login email and secure password.");
          return;
        }

        if (isRegistering) {
          if (!username) {
            setErrorMessage("Please choose a custom racer username.");
            return;
          }
          retroAudio.playPoint();
          onLoginSuccess(email, username, false);
        } else {
          // Preset email logins lookups
          const defaultUsername = email.split("@")[0];
          retroAudio.playPoint();
          onLoginSuccess(email, defaultUsername, false);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "An authenticator session error occurred.");
      }
    }, 800);
  };

  const triggerGoogleSignIn = () => {
    setIsSubmitting(true);
    setErrorMessage("");
    
    // Simulate neat authentic Play Login popup delay
    setTimeout(() => {
      setIsSubmitting(false);
      const randomPlayID = `PlayRacer_${Math.floor(100 + Math.random() * 900)}`;
      retroAudio.playPoint();
      onLoginSuccess("play_games@google.com", randomPlayID, false);
    }, 900);
  };

  const triggerGuestMode = () => {
    setIsSubmitting(true);
    setErrorMessage("");
    
    setTimeout(() => {
      setIsSubmitting(false);
      const guestID = `Guest_${Math.floor(1000 + Math.random() * 8999)}`;
      retroAudio.playPoint();
      onLoginSuccess("guest@speedway.com", guestID, true);
    }, 400);
  };

  return (
    <div className="w-full max-w-[500px] h-[640px] bg-neutral-950 font-sans flex flex-col justify-between items-center relative overflow-hidden rounded-3xl border border-neutral-805 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      
      {/* 🌌 High-fidelity 3D Parallax Sky with animated rotating stars */}
      <div className="absolute inset-0 bg-radial from-neutral-900 to-black pointer-events-none" />
      
      {/* Nebular light aura */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-pink-500/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Floating interactive clouds */}
      <div className="absolute top-8 left-[10%] w-24 h-6 bg-white/5 blur-[2px] rounded-full animate-pulse pointer-events-none" />
      <div className="absolute top-24 right-[15%] w-32 h-8 bg-white/5 blur-[3px] rounded-full animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      {/* 🛣️ Parallax Speedway background scrolling layer */}
      <div className="absolute bottom-0 inset-x-0 h-44 pointer-events-none overflow-hidden">
        {/* Soft mountain line */}
        <div className="absolute bottom-16 inset-x-0 h-16 bg-[#161327] opacity-60" style={{ clipPath: "polygon(0% 100%, 15% 40%, 30% 70%, 45% 20%, 65% 65%, 80% 30%, 100% 100%)" }} />
        
        {/* Speedway pavement asphalt */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-[#0c0a18] border-t-4 border-neutral-800" />
        
        {/* Asphalt grid lines scrolling */}
        <div className="absolute bottom-0 inset-x-0 h-16" style={{ background: `repeating-linear-gradient(90deg, transparent, transparent ${76 + roadOffset}px, #FF2E93 2px, #3BF3FF 6px, transparent ${80 + roadOffset}px)` }} />
        
        {/* Cyber motorcycle silhouette cruising */}
        <div className="absolute bottom-4 left-[20%] w-14 h-8 animate-bounce flex items-end">
          <div className="w-10 h-6 bg-pink-500 rounded-lg relative">
            <div className="absolute -top-2 right-1 w-4 h-4 bg-yellow-400 rounded-full" /> {/* Helmet */}
            <div className="absolute -bottom-1 -left-1.5 w-4 h-4 bg-neutral-900 rounded-full border border-pink-400" />
            <div className="absolute -bottom-1 -right-1.5 w-4 h-4 bg-neutral-900 rounded-full border border-pink-400" />
          </div>
        </div>
      </div>

      {/* Primary header branding panel */}
      <header className="pt-8 px-6 text-center z-10 w-full">
        <div className="flex gap-2 items-center justify-center">
          <div className="bg-gradient-to-r from-pink-500 to-indigo-500 p-2 rounded-xl border border-pink-400/30">
            <Gamepad2 className="w-6 h-6 text-white stroke-[2.2]" />
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] font-extrabold text-neutral-400 uppercase">
            Play Store Core
          </span>
        </div>
        <h2 className="text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 mt-2">
          MOTOR SPEEDWAY
        </h2>
        <p className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-1">
          DRIVE • EARN COINS • LEVEL UP
        </p>
      </header>

      {/* Main authenticator forms zone */}
      <main className="w-full px-6 z-10 flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!recoveryMode ? (
            <motion.div
              key={isRegistering ? "register" : "login"}
              initial={{ x: isRegistering ? 150 : -150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRegistering ? -150 : 150, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-neutral-900/80 backdrop-blur-md p-5 rounded-3xl border border-neutral-800/80 shadow-2xl relative"
            >
              {/* Animated Tab headers */}
              <div className="flex border-b border-neutral-800 pb-3 mb-4 gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className={`pb-1 ${!isRegistering ? "text-pink-500 border-b-2 border-pink-500" : "text-neutral-400 hover:text-white"}`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className={`pb-1 ${isRegistering ? "text-pink-500 border-b-2 border-pink-500" : "text-neutral-400 hover:text-white"}`}
                >
                  SIGN UP
                </button>
              </div>

              {/* Error messages reporting */}
              {errorMessage && (
                <div id="login-error" className="mb-4 bg-red-950/40 border border-red-500/30 text-red-400 text-[11px] p-2.5 rounded-xl font-mono">
                  ⚠ {errorMessage}
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
                {isRegistering && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
                      Choose Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-[11px] text-neutral-500" size={15} />
                      <input
                        id="username-field"
                        type="text"
                        placeholder="CyberDrifter"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-neutral-950 hover:bg-neutral-950/80 rounded-xl border border-neutral-800 pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-sans tracking-wide"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-[11px] text-neutral-500" size={15} />
                    <input
                      id="email-field"
                      type="email"
                      placeholder="driver@speedway.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 hover:bg-neutral-950/80 rounded-xl border border-neutral-800 pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-sans tracking-wide"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      Password
                    </label>
                    {!isRegistering && (
                      <button
                        type="button"
                        onClick={() => setRecoveryMode(true)}
                        className="text-[9px] font-mono text-purple-400 hover:text-white hover:underline uppercase"
                      >
                        Help?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-[11px] text-neutral-500" size={15} />
                    <input
                      id="password-field"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 hover:bg-neutral-950/80 rounded-xl border border-neutral-800 pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-sans tracking-wide"
                    />
                  </div>
                </div>

                {/* Remember Me controller */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="remember-checkbox"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-neutral-800 bg-neutral-950 text-pink-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer accent-pink-500"
                    />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Remember Me</span>
                  </label>
                </div>

                {/* Submit trigger button */}
                <button
                  id="submit-auth"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:from-neutral-700 disabled:to-neutral-800 rounded-xl text-white font-extrabold tracking-widest text-[11px] transition shadow-[0_4px_12px_rgba(219,39,119,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {isRegistering ? "CREATE ACCOUNT" : "RIDE ENGINE START"}
                      <LogIn size={12} className="stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="recovery"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900/80 backdrop-blur-md p-5 rounded-3xl border border-neutral-800 shadow-2xl space-y-4"
            >
              <div className="text-center">
                <h3 className="font-bold text-xs font-mono uppercase text-pink-500">
                  Password Recovery
                </h3>
                <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase leading-relaxed">
                  Supply your registered racing address to recover your key.
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 rounded-xl border border-neutral-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 font-sans tracking-wide"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRecoveryMode(false)}
                    className="flex-1 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold text-[10px] uppercase cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-[10px] uppercase cursor-pointer"
                  >
                    SEND LINK
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎮 OAuth Google Play Sign-In Alternative */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <hr className="flex-1 border-neutral-900" />
            <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
              OR PLAY SECURELY VIA
            </span>
            <hr className="flex-1 border-neutral-900" />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              id="google-signin-btn"
              type="button"
              onClick={triggerGoogleSignIn}
              className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-xl text-[10px] font-bold tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <svg className="w-3.5 h-3.5 fill-current shrink-0 text-red-500" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.4-2.4C17.3 1.7 14.9 1 12.24 1c-5.5 0-10 4.5-10 10s4.5 10 10 10c5.5 0 10-4.5 10-10 0-.6-.05-1.1-.15-1.6l-9.85-.115z" />
              </svg>
              Google
            </button>

            <button
              id="guest-signin-btn"
              type="button"
              onClick={triggerGuestMode}
              className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 rounded-xl text-[10px] font-bold tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer uppercase"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              Guest Ride
            </button>
          </div>
        </div>
      </main>

      {/* Footer compliance indicators */}
      <footer className="w-full pb-6 px-6 z-10 text-center">
        <p className="text-[10px] text-neutral-600 font-mono tracking-wide leading-relaxed uppercase">
          Complies with Google Play Policies • Privacy Preserved
        </p>
      </footer>
      
    </div>
  );
}
