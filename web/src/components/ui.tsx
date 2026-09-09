import { createPortal } from "react-dom";
import { menuPosition } from "../lib/layout";
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  useContext,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { Check, X } from "lucide-react";
const MenuClose = createContext(() => {});
export function IconButton({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Menu({
  label,
  icon,
  children,
  className = '',
  disabled = false,
  contentRole = 'menu',
  viewport = false,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  contentRole?: 'menu' | 'dialog';
  viewport?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open || !viewport) return;
    const place = () => {
      if (!ref.current || !contentRef.current) return;
      setPosition(menuPosition(ref.current.getBoundingClientRect(), contentRef.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }));
    };
    place();
    contentRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, viewport]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node) && !contentRef.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const content = (
    <MenuClose.Provider value={() => setOpen(false)}>
      <div ref={contentRef} className={`menu-content ${viewport ? "viewport-menu" : ""}`} role={contentRole} aria-label={label}
        style={viewport ? position : undefined}>
        {children}
      </div>
    </MenuClose.Provider>
  );
  return (
    <div
      ref={ref}
      className={`menu ${className}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget) && !contentRef.current?.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        setOpen(false);
        ref.current?.querySelector<HTMLElement>(".icon-button")?.focus();
      }}
    >
      <IconButton
        label={label}
        disabled={disabled}
        aria-haspopup={contentRole}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </IconButton>
      {open && (viewport ? createPortal(content, document.body) : content)}
    </div>
  );
}
export function MenuLabel({ children }: { children: ReactNode }) {
  return <span className="menu-label">{children}</span>;
}
export function MenuItem({
  selected,
  children,
  onClick,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const close = useContext(MenuClose);
  return (
    <button
      role={selected === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={selected}
      onClick={() => {
        onClick();
        close();
      }}
    >
      <span>{children}</span>
      {selected && <Check size={15} />}
    </button>
  );
}
export function Dialog({
  title,
  close,
  children,
  className = "",
  initialFocus,
  minimal = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  className?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  minimal?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.showModal();
    initialFocus?.current?.focus();
    return () => {
      ref.current?.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={id}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        {minimal ? <h2 id={id} className="sr-only">{title}</h2> : <header className="dialog-heading">
          <h2 id={id}>{title}</h2>
          <IconButton label="Close dialog" onClick={close}>
            <X size={18} />
          </IconButton>
        </header>}
        {children}
      </div>
    </dialog>
  );
}
export function ErrorNotice({
  message,
  dismiss,
}: {
  message: string;
  dismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="error-notice" role="alert">
      <span>{message}</span>
      {dismiss && (
        <IconButton label="Dismiss error" onClick={dismiss}>
          <X size={16} />
        </IconButton>
      )}
    </div>
  );
}
