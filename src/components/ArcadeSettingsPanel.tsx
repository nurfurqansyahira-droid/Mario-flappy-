import { useState } from "react";
import { BookOpen, FileText, Smartphone, ShieldCheck, ShieldAlert, ArrowRight, X, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { retroAudio } from "../audio";

interface ArcadeSettingsPanelProps {
  onClose: () => void;
}

type PanelTab = "PUBLISHING" | "MANIFEST" | "POLICIES" | "TERMS";

export default function ArcadeSettingsPanel({ onClose }: ArcadeSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("PUBLISHING");
  const [copied, setCopied] = useState(false);

  // High-fidelity standard AndroidManifest.xml configuration
  const androidManifestCode = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.pixelarcade.motorspeedway">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Design.NoActionBar">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:theme="@style/Theme.Design.NoActionBar.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(androidManifestCode);
    setCopied(true);
    retroAudio.playPoint();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-40 p-4 font-sans select-none text-white">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-neutral-900 w-full max-w-[500px] h-[600px] border border-neutral-808 rounded-3xl flex flex-col justify-between overflow-hidden shadow-2xl"
      >
        
        {/* Header */}
        <header className="p-4 border-b border-neutral-805/85 flex justify-between items-center bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <div className="bg-pink-500/10 p-1.5 rounded-xl border border-pink-500/30 text-pink-400">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-pink-500 uppercase">
                PLAY STORE PUBLISHER PANEL
              </h2>
              <p className="font-mono text-[8px] text-neutral-500 uppercase mt-0.5 tracking-widest">
                Compliance & Asset blueprints
              </p>
            </div>
          </div>
          
          <button 
            id="close-publishing"
            onClick={onClose}
            className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-805 rounded-xl text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </header>

        {/* Tab Selector */}
        <nav className="flex px-4 pt-3 border-b border-neutral-800 bg-neutral-950/20 gap-1.5">
          {(["PUBLISHING", "MANIFEST", "POLICIES", "TERMS"] as PanelTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 font-mono text-[8px] sm:text-[9px] tracking-widest uppercase text-center border-b-2 transition ${activeTab === tab ? "text-pink-500 border-pink-500 font-extrabold" : "text-neutral-400 border-transparent hover:text-neutral-200"}`}
            >
              {tab === "PUBLISHING" ? "Play Guide" : tab === "MANIFEST" ? "Manifest" : tab === "POLICIES" ? "Privacy" : "Terms"}
            </button>
          ))}
        </nav>

        {/* Main core detailed content panels scrollbox */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono tracking-wider text-left min-h-0 custom-scrollbar-thin">
          
          {/* TAB 1: Step by Step publishing guidelines */}
          {activeTab === "PUBLISHING" && (
            <div className="space-y-4 uppercase">
              <div className="bg-pink-500/5 p-3 rounded-2xl border border-pink-500/10 text-pink-400 text-[10px] uppercase leading-relaxed font-semibold">
                🏁 Transform this PWA into a Native Android APK/AAB for upload to the Google Play Console in 4 simple steps!
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-1">
                  <h4 className="text-[10px] font-black tracking-wider text-white">1. SETUP WORKSPACE & CORDOVA/CAPACITOR</h4>
                  <p className="text-[9px] text-neutral-400 leading-normal lowercase font-sans">
                    run <code className="bg-neutral-900 border px-1 rounded text-pink-400 font-mono">npm install @capacitor/core @capacitor/cli</code> then initialization via npx. add android platform container wrapping the static Vite build folder.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-1">
                  <h4 className="text-[10px] font-black tracking-wider text-white">2. PREPARE APP EXTRAS</h4>
                  <p className="text-[9px] text-neutral-400 leading-normal lowercase font-sans">
                    ensure icon graphics are exported at 512x512px. populate splash screen png files in standard layout directories according to material guidelines.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-1">
                  <h4 className="text-[10px] font-black tracking-wider text-white">3. REGISTER PLAY DEVELOPER ACCOUNT</h4>
                  <p className="text-[9px] text-neutral-400 leading-normal lowercase font-sans">
                    sign up at console.google.com. create a listing profile under "motor speedway racer". populate ratings forms, target children restrictions, and supply privacy URLs.
                  </p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-2xl space-y-1">
                  <h4 className="text-[10px] font-black tracking-wider text-white">4. GENERATE SIGNED BUNDLE (.AAB)</h4>
                  <p className="text-[9px] text-neutral-400 leading-normal lowercase font-sans">
                    use android studio to build a release-target bundle, signing with your secure credentials keystore file. drop the generated .aab directly into play release portal!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AndroidManifest.xml code generator */}
          {activeTab === "MANIFEST" && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-neutral-950/40 p-2 border border-neutral-850 rounded-xl">
                <span className="text-[9px] text-neutral-400 uppercase font-bold">AndroidManifest.xml Template</span>
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold text-[8.5px] cursor-pointer flex items-center gap-1 uppercase tracking-wide transition"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? "COPIED" : "COPY XML"}
                </button>
              </div>
              <pre className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-850 text-[9px] font-mono leading-relaxed text-cyan-400 overflow-x-auto select-text select-all font-semibold">
                {androidManifestCode}
              </pre>
            </div>
          )}

          {/* TAB 3: Privacy check documentation */}
          {activeTab === "POLICIES" && (
            <div className="space-y-3 select-text leading-relaxed">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider">Privacy Policy for Motor Speedway</h3>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                this Privacy Policy outlines how com.pixelarcade.motorspeedway collects, protects, and leverages player data structures.
              </p>
              
              <h4 className="text-[9px] font-bold text-pink-500 uppercase">1. Collected Information</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                we do not capture telemetry, biometric values, or phone location sensors. profile high scores, accumulated currency balances, and level points are cached locally or synced to your firebase credentials.
              </p>

              <h4 className="text-[9px] font-bold text-pink-500 uppercase">2. Storage & Security</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                all profile data synchronization leverages secure encrypted communication pipes connecting cloud run clusters to verified firebase authentication storage modules.
              </p>

              <h4 className="text-[9px] font-bold text-pink-500 uppercase">3. Information Deletion</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                players may wipe cache variables instantly inside active game configs or request full ledger removals of signed credentials accounts.
              </p>
            </div>
          )}

          {/* TAB 4: Agreements checklist */}
          {activeTab === "TERMS" && (
            <div className="space-y-3 select-text leading-relaxed">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider">Terms of Service agreements</h3>
              
              <h4 className="text-[9px] font-bold text-pink-500 uppercase">1. Licensing Agreements</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                this speedway app is provided on a temporary personal licensing model suitable for sandbox testing. you are prohibited from utilizing automated coordinate bots to spoof championship high scores.
              </p>

              <h4 className="text-[9px] font-bold text-pink-500 uppercase">2. Financial Policies</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                all in-game currency balances (golds) are entirely fictional. they do not carry real fiat redemption values, external monetary links, or blockchain ledgers.
              </p>

              <h4 className="text-[9px] font-bold text-pink-500 uppercase">3. Liability Limits</h4>
              <p className="text-[9px] text-neutral-400 lowercase font-sans">
                pixel arcade labs holds zero liability regarding screen flickering, player thumb strain, or any device battery drain due to excessive turbo cycles.
              </p>
            </div>
          )}

        </div>

        {/* Footer compliance */}
        <footer className="p-4 bg-neutral-950 border-t border-neutral-850 flex justify-between items-center text-[8px] uppercase tracking-widest text-neutral-600 font-mono">
          <span>Target SDK 34 READY</span>
          <span>Google Play Policy Compliant</span>
        </footer>

      </motion.div>
    </div>
  );
}
