"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Ad = {
  id: string
  title: string
  description: string
  imageUrl: string
  url: string
  category: string
  clicks: number
}

export function AdDisplay() {
  const [ad, setAd] = useState<Ad | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAd() {
      try {
        const response = await fetch("/api/ads")
        if (!response.ok) {
          throw new Error("Failed to fetch ad")
        }

        const data = await response.json()
        setAd(data)
      } catch (error) {
        console.error("Error fetching ad:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAd()
  }, [])

  async function handleAdClick() {
    if (!ad) return

    try {
      // Track ad click
      await fetch(`/api/ads?id=${ad.id}&action=click`, {
        method: "POST",
      })

      // Open ad URL in new tab
      window.open(ad.url, "_blank")
    } catch (error) {
      console.error("Error tracking ad click:", error)
    }
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Skeleton className="h-[120px] w-full" />
          <div className="p-4">
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!ad) {
    return null
  }

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleAdClick}>
      <CardContent className="p-0">
        <div className="relative h-[120px] w-full">
          <Image
            src={ad.imageUrl || "/placeholder.svg?height=120&width=400"}
            alt={ad.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="font-medium">{ad.title}</h3>
          <p className="text-sm text-muted-foreground">{ad.description}</p>
          <div className="mt-2 text-xs text-muted-foreground">Sponsored</div>
        </div>
      </CardContent>
    </Card>
  )
}
