'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'This Week' },
  { href: '/library', label: 'Library' },
]

export default function Nav() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-semibold text-stone-800 mr-2">🍳</span>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'text-orange-600'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
