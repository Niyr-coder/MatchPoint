"use client"

import { useEffect, useRef, useState } from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  /** Animation variant: fade-up (default), fade-in */
  variant?: "fade-up" | "fade-in"
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  variant = "fade-up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animClass = variant === "fade-in" ? "animate-fade-in" : "animate-fade-in-up-16"

  return (
    <div
      ref={ref}
      className={`${visible ? animClass : "opacity-0"} ${className}`}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
