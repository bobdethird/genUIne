"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// =============================================================================
// Context
// =============================================================================

interface LightboxImage {
  id: string;
  src: string;
  alt: string;
  /** Insertion order — used to maintain stable ordering */
  order: number;
}

interface LightboxContextValue {
  register: (img: LightboxImage) => void;
  unregister: (id: string) => void;
  open: (id: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

/** Separate context for stable order assignment */
const OrderContext = createContext<() => number>(() => 0);

// =============================================================================
// Provider
// =============================================================================

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const orderCounter = useRef(0);

  const register = useCallback((img: LightboxImage) => {
    setImages((prev) => {
      if (prev.some((i) => i.id === img.id)) return prev;
      return [...prev, img].sort((a, b) => a.order - b.order);
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setImages((prev) => {
      const next = prev.filter((i) => i.id !== id);
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const open = useCallback((id: string) => setActiveId(id), []);
  const close = useCallback(() => setActiveId(null), []);

  const activeIndex = activeId
    ? images.findIndex((i) => i.id === activeId)
    : -1;

  const goTo = useCallback(
    (idx: number) => {
      if (images.length === 0) return;
      const wrapped = ((idx % images.length) + images.length) % images.length;
      setActiveId(images[wrapped].id);
    },
    [images],
  );

  const goNext = useCallback(
    () => goTo(activeIndex + 1),
    [activeIndex, goTo],
  );
  const goPrev = useCallback(
    () => goTo(activeIndex - 1),
    [activeIndex, goTo],
  );

  // Keyboard navigation
  useEffect(() => {
    if (activeId == null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeId, close, goNext, goPrev]);

  // Lock body scroll when open
  useEffect(() => {
    if (activeId == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeId]);

  const getOrder = useCallback(() => orderCounter.current++, []);

  // Memoize so consumers don't re-render when unrelated LightboxProvider state changes
  const ctxValue = useMemo(
    () => ({ register, unregister, open }),
    [register, unregister, open],
  );

  return (
    <LightboxContext.Provider value={ctxValue}>
      <OrderContext.Provider value={getOrder}>
        {children}
      </OrderContext.Provider>

      {activeIndex >= 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <LightboxOverlay
            images={images}
            activeIndex={activeIndex}
            onClose={close}
            onNext={goNext}
            onPrev={goPrev}
            onGoTo={goTo}
          />,
          document.body,
        )}
    </LightboxContext.Provider>
  );
}

// =============================================================================
// Hook for Image components
// =============================================================================

export function useLightbox(src: string, alt: string) {
  const ctx = useContext(LightboxContext);
  const getOrder = useContext(OrderContext);
  const id = useId();
  const orderRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ctx || !src) return;
    if (orderRef.current === null) orderRef.current = getOrder();
    ctx.register({ id, src, alt, order: orderRef.current });
    return () => ctx.unregister(id);
  }, [ctx, id, src, alt, getOrder]);

  const open = useCallback(() => {
    if (ctx && src) ctx.open(id);
  }, [ctx, id, src]);

  return { open, hasLightbox: !!ctx };
}

// =============================================================================
// Overlay
// =============================================================================

function LightboxOverlay({
  images,
  activeIndex,
  onClose,
  onNext,
  onPrev,
  onGoTo,
}: {
  images: LightboxImage[];
  activeIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (idx: number) => void;
}) {
  const image = images[activeIndex];
  if (!image) return null;

  const total = images.length;
  const hasMultiple = total > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150" />

      {/* Content container — stop propagation so clicking inside doesn't close */}
      <div
        className="relative z-10 flex flex-col items-center gap-3 max-w-[92vw] max-h-[92vh] animate-in zoom-in-95 fade-in-0 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between w-full px-1 min-h-[28px]">
          <span className="text-xs text-white/50 tabular-nums min-w-[3rem]">
            {hasMultiple ? `${activeIndex + 1} / ${total}` : ""}
          </span>
          {image.alt && (
            <span className="text-sm text-white/70 truncate max-w-[50vw] text-center px-3">
              {image.alt}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Image + nav */}
        <div className="relative flex items-center">
          {hasMultiple && (
            <button
              type="button"
              onClick={onPrev}
              className="absolute -left-14 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={image.id}
            src={image.src}
            alt={image.alt}
            className="max-w-[85vw] max-h-[75vh] rounded-lg object-contain shadow-2xl select-none animate-in fade-in-0 duration-100"
            draggable={false}
          />

          {hasMultiple && (
            <button
              type="button"
              onClick={onNext}
              className="absolute -right-14 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {hasMultiple && total <= 20 && (
          <div className="flex items-center gap-1.5 mt-1 overflow-x-auto max-w-[85vw] py-1 px-1">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onGoTo(i)}
                className={`shrink-0 rounded-md overflow-hidden transition-all duration-150 ${
                  i === activeIndex
                    ? "ring-2 ring-white opacity-100 scale-105"
                    : "opacity-50 hover:opacity-80"
                }`}
                aria-label={`View image ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt=""
                  className="w-12 h-12 object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
