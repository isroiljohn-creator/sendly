import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  footerLabel?: string;
  onFooterClick?: () => void;
  trigger?: React.ReactNode;
  containerClassName?: string;
}

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Tanlang...",
  className,
  dropdownClassName,
  disabled = false,
  footerLabel,
  onFooterClick,
  trigger,
  containerClassName,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={cn("relative w-full", containerClassName)}>
      {trigger ? (
        <div onClick={() => !disabled && setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-[12px] bg-white border border-[#E8E8E8] rounded-[12px] text-left focus:outline-none focus:border-black cursor-pointer font-semibold text-[#505050] transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none",
            isOpen && "border-black shadow-sm",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                {selectedOption.icon}
                <span className="truncate">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-[#A0A0A0]">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            size={14}
            className={cn("text-[#808080] transition-transform duration-200 shrink-0 ml-1", isOpen && "rotate-180 text-black")}
          />
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] left-0 right-0 mt-1 max-h-[220px] overflow-y-auto bg-white border border-[#E8E8E8] rounded-[16px] p-1.5 shadow-lg animate-in fade-in-50 zoom-in-95 duration-100",
            dropdownClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-[#A0A0A0] text-center">{"Ma'lumot mavjud emas"}</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-[12px] rounded-[10px] text-left font-semibold transition-all hover:bg-[#F5F5F5] select-none",
                    isSelected ? "bg-[#C7F33C]/20 text-black font-bold" : "text-[#505050]"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.icon}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check size={12} className="text-black shrink-0 ml-2" />}
                </button>
              );
            })
          )}
          {footerLabel && onFooterClick && (
            <button
              type="button"
              onClick={() => {
                onFooterClick();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-black border-t border-[#F0F0F0] mt-1 hover:bg-[#F5F5F5] select-none text-left rounded-[10px]"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#F0F0F0] text-black">
                +
              </span>
              {footerLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
