import { useEffect, useState } from "react";
import { Sparkles, Gamepad2 } from "lucide-react";
import { motion } from "motion/react";

export default function SplashView({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 450);
          return 100;
        }
        return prev + 4;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white z-50 overflow-hidden font-sans">
      {/* Abstract Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.2)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] opacity-35" />

      {/* Futuristic Tunnel visual */}
      <div className="absolute w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[120px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />

      <div className="relative flex flex-col items-center max-w-sm px-6 text-center z-10 select-none">
        {/* Animated Brand Badge */}
        <motion.div 
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative bg-gradient-to-tr from-pink-500 to-indigo-500 p-4 rounded-3xl shadow-[0_0_30px_rgba(236,72,153,0.4)] border border-pink-400/30 mb-8"
        >
          <Gamepad2 className="w-12 h-12 text-white animate-bounce stroke-[2.2]" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black p-1 rounded-full text-[9px] font-bold border border-black shadow"
          >
            <Sparkles size={10} />
          </motion.div>
        </motion.div>

        {/* Dynamic Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h1 className="text-3xl font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 uppercase">
            MOTOR SPEEDWAY
          </h1>
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-2">
            Professional Android Edition
          </p>
        </motion.div>

        {/* Interactive Gauge Loader */}
        <div className="w-60 h-2 bg-neutral-900 rounded-full overflow-hidden mt-12 border border-neutral-800 p-[1px]">
          <motion.div 
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status indicator readout */}
        <div className="font-mono text-[10px] text-neutral-400 tracking-wider mt-4">
          <span className="text-pink-500">ENGINE:</span> IGNITING TURBO CORE ({progress}%)
        </div>

        {/* Brand trademark statement */}
        <div className="absolute bottom-[-140px] text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
          Pixel Speedway Labs • Play Store Compliant
        </div>
      </div>
    </div>
  );
}
