/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Type, 
  MoveHorizontal, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Monitor,
  ChevronUp,
  ChevronDown,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// --- Types ---

type Alignment = 'left' | 'center' | 'right';

interface PrompterSettings {
  fontSize: number;
  speed: number;
  isMirror: boolean;
  alignment: Alignment;
  showIndicator: boolean;
  lineHeight: number;
  textColor: string;
}

const DEFAULT_SETTINGS: PrompterSettings = {
  fontSize: 48,
  speed: 3,
  isMirror: false,
  alignment: 'center',
  showIndicator: true,
  lineHeight: 1.5,
  textColor: '#39FF14',
};

// --- Main App Component ---

export default function App() {
  const [text, setText] = useState<string>(() => {
    return localStorage.getItem('teleprompter-text') || "Bienvenue dans Teleprompter Pro.\n\nCollez votre script ici pour commencer.\n\nUtilisez le panneau de configuration pour ajuster la vitesse, la taille du texte et le mode miroir.\n\nBonne lecture !";
  });
  
  const [settings, setSettings] = useState<PrompterSettings>(() => {
    const saved = localStorage.getItem('teleprompter-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Persist data
  useEffect(() => {
    localStorage.setItem('teleprompter-text', text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem('teleprompter-settings', JSON.stringify(settings));
  }, [settings]);

  // Scroll Logic
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      // Speed factor: 1 speed unit = ~20 pixels per second
      const speedFactor = settings.speed * 15; 
      const increment = (speedFactor * deltaTime) / 1000;
      
      setScrollPos(prev => prev + increment);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [settings.speed]);

  useEffect(() => {
    if (isPlaying && !isEditing) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isEditing, animate]);

  // Reset scroll
  const handleReset = () => {
    setScrollPos(0);
    setIsPlaying(false);
  };

  // Toggle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setShowControls(false); // Hide controls when starting
    }
  };

  // Handle tap to play/pause
  const handleContainerClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on UI elements
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="dialog"]')) return;
    
    if (!isEditing) {
      togglePlay();
    }
  };

  // Handle double tap to reset
  const handleDoubleTap = () => {
    if (!isEditing) {
      handleReset();
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* --- Header / Navigation --- */}
      <AnimatePresence>
        {(showControls || isEditing) && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md border-bottom border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">Teleprompter Pro</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)}
                className={cn("gap-2", isEditing && "bg-white/10")}
              >
                {isEditing ? <Monitor className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                {isEditing ? "Aperçu" : "Éditer"}
              </Button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* --- Main Content Area --- */}
      <main 
        className="flex-1 relative overflow-hidden cursor-pointer"
        onClick={handleContainerClick}
        onDoubleClick={handleDoubleTap}
      >
        {isEditing ? (
          <div className="absolute inset-0 p-6 pt-20">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-full bg-zinc-900/50 border border-white/10 rounded-2xl p-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono"
              placeholder="Collez votre script ici..."
            />
          </div>
        ) : (
          <div 
            ref={containerRef}
            className={cn(
              "absolute inset-0 flex flex-col items-center",
              settings.isMirror && "scale-x-[-1]"
            )}
          >
            {/* Reading Indicator */}
            {settings.showIndicator && (
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-600/60 z-10 pointer-events-none shadow-[0_0_15px_rgba(37,99,235,0.8)]">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full blur-sm" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full blur-sm" />
              </div>
            )}

            {/* Scrolling Text */}
            <div 
              ref={contentRef}
              style={{ 
                transform: `translateY(${-scrollPos}px)`,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                textAlign: settings.alignment,
                color: settings.textColor,
                paddingTop: '50vh', // Start from middle
                paddingBottom: '100vh',
                maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
              }}
              className="w-full max-w-4xl px-8 font-bold transition-transform duration-75 ease-linear"
            >
              {text.split('\n').map((line, i) => (
                <p key={i} className="mb-[0.5em]">
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* --- Floating Controls (Bottom) --- */}
        <AnimatePresence>
          {!isEditing && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: showControls ? 0 : 80 }}
              className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-8 px-6 flex flex-col items-center gap-6"
            >
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full w-12 h-12 bg-white/5 border-white/10 hover:bg-white/10"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                
                <Button 
                  size="icon" 
                  className="rounded-full w-16 h-16 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </Button>

                <SettingsDrawer settings={settings} setSettings={setSettings} />
              </div>

              <button 
                onClick={() => setShowControls(!showControls)}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                {showControls ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Settings Drawer Component ---

function SettingsDrawer({ 
  settings, 
  setSettings 
}: { 
  settings: PrompterSettings, 
  setSettings: React.Dispatch<React.SetStateAction<PrompterSettings>> 
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full w-12 h-12 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-xl font-bold">Paramètres du Prompter</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-6 space-y-8">
          {/* Speed Control */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-white/60 uppercase tracking-wider">Vitesse de défilement</Label>
              <span className="text-blue-400 font-mono font-bold">{settings.speed}</span>
            </div>
            <Slider 
              value={[settings.speed]} 
              min={1} 
              max={10} 
              step={0.5}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                setSettings(s => ({ ...s, speed: v }));
              }}
              className="py-4"
            />
          </div>

          {/* Font Size Control */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-white/60 uppercase tracking-wider">Taille du texte</Label>
              <span className="text-blue-400 font-mono font-bold">{settings.fontSize}px</span>
            </div>
            <Slider 
              value={[settings.fontSize]} 
              min={16} 
              max={120} 
              step={2}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                setSettings(s => ({ ...s, fontSize: v }));
              }}
              className="py-4"
            />
          </div>

          {/* Alignment & Mirror */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-sm font-medium text-white/60 uppercase tracking-wider">Alignement</Label>
              <Tabs 
                value={settings.alignment} 
                onValueChange={(val) => setSettings(s => ({ ...s, alignment: val as Alignment }))}
                className="w-full"
              >
                <TabsList className="bg-white/5 border border-white/10 w-full">
                  <TabsTrigger value="left" className="flex-1"><AlignLeft className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="center" className="flex-1"><AlignCenter className="w-4 h-4" /></TabsTrigger>
                  <TabsTrigger value="right" className="flex-1"><AlignRight className="w-4 h-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-white/60 uppercase tracking-wider">Options</Label>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mode Miroir</span>
                  <Switch 
                    checked={settings.isMirror} 
                    onCheckedChange={(val) => setSettings(s => ({ ...s, isMirror: val }))} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Indicateur</span>
                  <Switch 
                    checked={settings.showIndicator} 
                    onCheckedChange={(val) => setSettings(s => ({ ...s, showIndicator: val }))} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-white/60 uppercase tracking-wider">Couleur du texte</Label>
            <div className="flex gap-3">
              {['#ffffff', '#00ff00', '#ffff00', '#00ffff', '#ff00ff'].map(color => (
                <button
                  key={color}
                  onClick={() => setSettings(s => ({ ...s, textColor: color }))}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
                    settings.textColor === color ? "border-blue-500 scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
