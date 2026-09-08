import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
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
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-heading">
          <h2 id={id}>{title}</h2>
          <IconButton label="Close dialog" onClick={close}>
            <X size={18} />
          </IconButton>
        </header>
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
