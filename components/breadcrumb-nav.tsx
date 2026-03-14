"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, " ")          // kebab-case → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize each word
}

export function BreadcrumbNav() {
  const pathname = usePathname()

  // Split and filter empty segments
  const segments = pathname.split("/").filter(Boolean)

  // Build cumulative paths: ["properties", "properties/all"]
  const crumbs = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }))

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
            <BreadcrumbItem className={index < crumbs.length - 1 ? "hidden md:block" : ""}>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}