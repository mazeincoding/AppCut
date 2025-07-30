import { motion } from "motion/react";
import { ComponentType } from "react";

interface SponsorButtonProps {
  href: string;
  logo: ComponentType<{ className?: string }>;
  companyName: string;
  className?: string;
}

export function SponsorButton({
  href,
  logo: Logo,
  companyName,
  className = "",
}: SponsorButtonProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-200 group shadow-lg ${className}`}
    >
      <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
        Sponsored by
      </span>

      <div className="flex items-center gap-1.5">
        <div className="text-zinc-100 group-hover:text-white transition-colors">
          <Logo className="w-4 h-4" />
        </div>

        <span className="text-xs font-medium text-zinc-100 group-hover:text-white transition-colors">
          {companyName}
        </span>
      </div>
    </motion.a>
  );
}
