import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Mic, MicOff, Activity, Loader2, Volume2 } from 'lucide-react';

interface VoiceAssistantProps {
  onAddTransaction: (type: 'income' | 'expense', amount: number, category: string, description: string) => void;
  currentBalance: number;
}

// --- Audio Utils ---
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Tool Definitions ---
const addTransactionTool: FunctionDeclaration = {
  name: 'addTransaction',
  parameters: {
    type: Type.OBJECT,
    description: 'Add a new financial transaction (expense or income) to the wallet.',
    properties: {
      type: { type: Type.STRING, description: 'Type of transaction: "expense" (gasto) or "income" (ingreso).' },
      amount: { type: Type.NUMBER, description: 'The amount of money in Euros.' },
      category: { type: Type.STRING, description: 'Category name (e.g., Comida, Transporte, Salario).' },
      description: { type: Type.STRING, description: 'Short description of the transaction.' }
    },
    required: ['type', 'amount', 'category']
  }
};

const getBalanceTool: FunctionDeclaration = {
  name: 'getBalance',
  parameters: {
    type: Type.OBJECT,
    description: 'Get the current wallet balance (money available).',
    properties: {},
  }
};

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddTransaction, currentBalance }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnecting(false);
            setIsActive(true);

            // Start Input Streaming
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            
            sourceRef.current = source;
            processorRef.current = scriptProcessor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let result = "Error executing command";
                
                if (fc.name === 'addTransaction') {
                   const args = fc.args as any;
                   onAddTransaction(args.type, args.amount, args.category, args.description || 'Voz');
                   result = "Transacción añadida correctamente.";
                } else if (fc.name === 'getBalance') {
                   result = `Tu saldo actual es de ${currentBalance.toFixed(2)} euros.`;
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: result }
                    }
                  });
                });
              }
            }

            // 2. Handle Audio Output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
               setIsSpeaking(true);
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
               
               const buffer = await decodeAudioData(
                 new Uint8Array(atob(audioData).split('').map(c => c.charCodeAt(0))),
                 audioContextRef.current,
                 24000,
                 1
               );

               const source = audioContextRef.current.createBufferSource();
               source.buffer = buffer;
               source.connect(audioContextRef.current.destination);
               source.onended = () => {
                 sourcesRef.current.delete(source);
                 if (sourcesRef.current.size === 0) setIsSpeaking(false);
               };
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += buffer.duration;
               sourcesRef.current.add(source);
            }
          },
          onclose: () => cleanup(),
          onerror: (err) => {
            console.error(err);
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "Eres Violet, un asistente financiero útil y conciso. Hablas español. Ayudas al usuario a registrar gastos e ingresos y consultar su saldo.",
          tools: [{ functionDeclarations: [addTransactionTool, getBalanceTool] }]
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      cleanup();
    }
  };

  const toggleVoice = () => {
    if (isActive || isConnecting) {
      cleanup();
    } else {
      startSession();
    }
  };

  return (
    <button
      onClick={toggleVoice}
      className={`
        fixed bottom-24 right-5 z-50 
        p-4 rounded-full shadow-2xl transition-all duration-300
        flex items-center justify-center
        ${isActive 
          ? 'bg-red-500 hover:bg-red-600 shadow-red-500/40 animate-pulse' 
          : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/40 hover:scale-105'
        }
      `}
    >
      {isConnecting ? (
        <Loader2 className="text-white animate-spin" size={24} />
      ) : isActive ? (
        isSpeaking ? <Activity className="text-white animate-bounce" size={24} /> : <Mic className="text-white" size={24} />
      ) : (
        <MicOff className="text-white" size={24} />
      )}
    </button>
  );
};
