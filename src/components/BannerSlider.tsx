import React, { useState, useEffect, useRef } from 'react';
import { BannerSlide } from '../types';
import { ChevronRight, ChevronLeft, ExternalLink, Image as ImageIcon, Sparkles } from 'lucide-react';
import { formatPersianNumber } from '../utils/formatters';

interface BannerSliderProps {
  slides: BannerSlide[];
  isController?: boolean;
  onOpenBannerManager?: () => void;
  onNavigateToSection?: (section: 'prayers' | 'quizzes') => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  slides,
  isController,
  onOpenBannerManager,
  onNavigateToSection,
}) => {
  const publishedSlides = slides.filter((s) => s.isPublished);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch and mouse drag states for swipe navigation
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-slide every 6 seconds if not paused and not dragging
  useEffect(() => {
    if (publishedSlides.length <= 1 || isPaused || isDragging) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % publishedSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [publishedSlides.length, isPaused, isDragging]);

  if (publishedSlides.length === 0) {
    if (isController && onOpenBannerManager) {
      return (
        <div className="bg-stone-100 rounded-2xl p-6 border-2 border-dashed border-stone-300 text-center">
          <ImageIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-600 font-bold mb-3">
            هیچ بنری برای نمایش در بالای صفحه بارگذاری نشده است.
          </p>
          <button
            type="button"
            onClick={onOpenBannerManager}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors"
          >
            مدیریت و بارگذاری بنرها در بخش کنترلر
          </button>
        </div>
      );
    }
    return null;
  }

  const currentSlide = publishedSlides[currentIndex] || publishedSlides[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % publishedSlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + publishedSlides.length) % publishedSlides.length);
  };

  // Touch events handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || dragStartX === null || dragCurrentX === null) {
      setIsDragging(false);
      setDragStartX(null);
      setDragCurrentX(null);
      return;
    }

    const diff = dragStartX - dragCurrentX;
    // Threshold of 45px for swipe
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped left (in RTL, next slide)
        handleNext();
      } else {
        // Swiped right (in RTL, prev slide)
        handlePrev();
      }
    }

    setIsDragging(false);
    setDragStartX(null);
    setDragCurrentX(null);
  };

  // Mouse drag events handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragCurrentX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStartX === null || dragCurrentX === null) {
      setIsDragging(false);
      setDragStartX(null);
      setDragCurrentX(null);
      return;
    }

    const diff = dragStartX - dragCurrentX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    setIsDragging(false);
    setDragStartX(null);
    setDragCurrentX(null);
  };

  // Handle slide click (navigation or opening link)
  const handleSlideClick = (e: React.MouseEvent) => {
    // If user dragged more than 10px, don't trigger click action
    if (dragStartX !== null && dragCurrentX !== null && Math.abs(dragStartX - dragCurrentX) > 10) {
      return;
    }

    if (!currentSlide.linkUrl) return;

    if (currentSlide.linkUrl.includes('prayers') || currentSlide.linkUrl === '#prayers') {
      onNavigateToSection?.('prayers');
    } else if (currentSlide.linkUrl.includes('quizzes') || currentSlide.linkUrl === '#quizzes') {
      onNavigateToSection?.('quizzes');
    } else {
      let targetUrl = currentSlide.linkUrl;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      try {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Could not open link:', err);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id="top-banner-slider-container"
      className="relative w-full rounded-2xl overflow-hidden shadow-md border border-stone-200/80 group select-none transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        if (isDragging) handleMouseUp();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Banner Slide Frame */}
      <div
        className={`relative w-full aspect-[16/7] sm:aspect-[21/8] md:aspect-[24/8] min-h-[170px] sm:min-h-[220px] bg-stone-900 cursor-pointer overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
        onClick={handleSlideClick}
        title={currentSlide.linkUrl ? `لمس برای باز کردن لینک: ${currentSlide.linkUrl}` : undefined}
      >
        {/* Background Image with smooth fade */}
        <img
          key={currentSlide.id}
          src={currentSlide.imageUrl}
          alt={currentSlide.title || 'تصویر بنر'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          draggable={false}
        />

        {/* Gradient Overlay for high contrast text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-right">
          {currentSlide.title && (
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-amber-400 text-stone-950 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-sm sm:text-lg md:text-xl font-black text-white drop-shadow-md line-clamp-1">
                {currentSlide.title}
              </h2>
            </div>
          )}

          {currentSlide.subtitle && (
            <p className="text-xs sm:text-sm text-stone-200 font-medium drop-shadow line-clamp-2 max-w-2xl mt-0.5">
              {currentSlide.subtitle}
            </p>
          )}

          {/* Link Badge if defined */}
          {currentSlide.linkUrl && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-300 font-bold bg-stone-900/60 backdrop-blur-xs px-3 py-1 rounded-full w-fit border border-amber-400/30">
              <ExternalLink className="w-3 h-3" />
              <span>مشاهده و انتقال به پیوند مربوطه</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows (Visible if more than 1 slide) */}
      {publishedSlides.length > 1 && (
        <>
          <button
            type="button"
            id="banner-prev-slide-btn"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="بنر قبلی"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="banner-next-slide-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="بنر بعدی"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Slide Indicators and Controller Management Quick Link */}
      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        {/* Management button for Controller */}
        {isController && onOpenBannerManager ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBannerManager();
            }}
            className="pointer-events-auto text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-amber-300 border border-amber-400/40 backdrop-blur-xs transition-colors cursor-pointer"
          >
            مدیریت بنرها در کنترلر
          </button>
        ) : (
          <div />
        )}

        {/* Indicator dots */}
        {publishedSlides.length > 1 && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-stone-950/50 backdrop-blur-xs px-2.5 py-1 rounded-full">
            {publishedSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-5 h-2 bg-amber-400'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`اسلاید ${formatPersianNumber(idx + 1)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
