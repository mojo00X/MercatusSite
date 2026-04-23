import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Collection } from "../../types";

interface Props {
  slides: Collection[];
}

const FALLBACK: Collection[] = [
  {
    id: 0,
    title: "Shop the Latest Collection",
    subtitle:
      "Discover curated fashion pieces designed for the modern wardrobe. Premium materials, timeless style.",
    image_url:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
    link_url: "/products",
    button_text: "Shop Now",
    sort_order: 0,
    is_active: true,
  },
];

export default function Slideshow({ slides }: Props) {
  const effectiveSlides = slides.length ? slides : FALLBACK;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || effectiveSlides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % effectiveSlides.length);
    }, 7000);
    return () => clearInterval(id);
  }, [paused, effectiveSlides.length]);

  return (
    <section
      className="relative w-full h-[520px] md:h-[640px] overflow-hidden bg-gray-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {effectiveSlides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <img
            src={slide.image_url}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto h-full flex items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-white">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="mt-5 text-lg text-gray-200 leading-relaxed">
                  {slide.subtitle}
                </p>
              )}
              {slide.link_url && (
                <div className="mt-8">
                  <Link
                    to={slide.link_url}
                    className="inline-block bg-white text-black px-8 py-3 text-base font-medium rounded-md hover:bg-gray-100 transition-colors"
                  >
                    {slide.button_text || "Shop Now"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {effectiveSlides.length > 1 && (
        <>
          <button
            onClick={() =>
              setIndex((i) => (i - 1 + effectiveSlides.length) % effectiveSlides.length)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % effectiveSlides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-sm transition"
            aria-label="Next slide"
          >
            ›
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {effectiveSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-4 bg-white/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
