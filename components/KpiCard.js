'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useRef, useEffect, useState } from 'react'

export function KpiCard({ icon: Icon, label, value, color = 'text-primary', onClick }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return
    const measure = () => {
      if (!containerRef.current || !textRef.current) return
      textRef.current.style.transform = 'scale(1)' // reset to measure natural width
      const containerWidth = containerRef.current.offsetWidth
      const textWidth = textRef.current.offsetWidth
      if (textWidth > containerWidth && textWidth > 0) {
        setScale(containerWidth / textWidth)
      } else {
        setScale(1)
      }
    }
    
    measure() // initial measure
    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    if (textRef.current) ro.observe(textRef.current)
    return () => ro.disconnect()
  }, [value])

  return (
    <Card className={`glow-card border-border/60 hover:border-primary/40 transition-all ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between overflow-hidden">
          <div className="flex-1 min-w-0 mr-4" ref={containerRef}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
            <div className="w-full">
              <p 
                ref={textRef}
                className={`text-3xl font-bold ${color} whitespace-nowrap inline-block origin-left`}
                style={{ transform: `scale(${scale})`, transition: 'transform 0.1s ease-out' }}
              >
                {value}
              </p>
            </div>
          </div>
          <div className={`p-2.5 rounded-lg bg-primary/10 shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
