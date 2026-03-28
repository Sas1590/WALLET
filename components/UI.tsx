import React from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

// iOS Style "Liquid Glass" Card
// Ultra-thin border, heavy blur, subtle gradient overlay
export const GlassCard = ({ children, className = '', onClick }: { children?: React.ReactNode; className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`
      relative overflow-hidden
      backdrop-blur-2xl bg-white/[0.03] 
      border border-white/[0.08] 
      shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] 
      rounded-[32px] 
      transition-all duration-300
      ${onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-white/[0.06]' : ''}
      ${className}
    `}
  >
    {/* Subtle noise texture or gradient shine could go here */}
    {children}
  </div>
);

export const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-white/60 text-[11px] font-bold uppercase tracking-[0.15em] mb-4 px-2">{children}</h3>
);

export const ActionButton = ({ onClick, children, variant = 'primary', className = '', disabled = false }: { onClick: () => void; children?: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'success'; className?: string; disabled?: boolean }) => {
  const variants = {
    // iOS Primary Button: Bold gradient, high saturation
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 border border-white/10",
    secondary: "bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.05]",
    danger: "bg-gradient-to-r from-rose-600/20 to-rose-900/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30",
    success: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`
        py-3.5 px-6 rounded-2xl font-semibold text-sm tracking-wide
        transition-all duration-300 ease-out 
        active:scale-95 
        flex items-center justify-center gap-2 
        disabled:opacity-50 disabled:cursor-not-allowed 
        ${variants[variant]} ${className}
      `}
    >
      {disabled ? <Loader2 className="animate-spin w-5 h-5" /> : children}
    </button>
  );
};

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isDanger = false,
  isSuccess = false,
  showCancel = true,
  confirmText = "Confirmar"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm?: () => void; 
  title: string; 
  message: string; 
  isDanger?: boolean;
  isSuccess?: boolean;
  showCancel?: boolean;
  confirmText?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-md animate-in fade-in duration-300">
       <div className={`
          w-full max-w-[320px] p-6 
          backdrop-blur-3xl bg-[#1a1a24]/90 
          border border-white/10 
          shadow-2xl rounded-[32px]
          transform transition-all scale-100
          animate-in zoom-in-95 duration-200
       `}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`
              p-4 rounded-full mb-4 shadow-inner
              ${isDanger ? 'bg-rose-500/10 text-rose-500' : isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'}
            `}>
              {isSuccess ? <CheckCircle2 size={36} strokeWidth={1.5} /> : <AlertTriangle size={36} strokeWidth={1.5} />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
             <button 
               onClick={() => { if(onConfirm) onConfirm(); onClose(); }} 
               className={`
                 w-full py-3.5 rounded-2xl font-bold text-white shadow-lg
                 transition-transform active:scale-95
                 ${isDanger ? 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-900/40' : 
                   isSuccess ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-900/40' :
                   'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-900/40'
                 }
               `}
             >
               {confirmText}
             </button>
             
             {showCancel && (
               <button 
                 onClick={onClose} 
                 className="w-full py-3.5 rounded-2xl font-semibold text-white/70 hover:bg-white/5 transition-colors"
               >
                 Cancelar
               </button>
             )}
          </div>
       </div>
    </div>
  );
};