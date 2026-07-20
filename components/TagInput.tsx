'use client'

import { useState } from 'react'

interface Props {
  value: string // comma-separated, matching how settings are stored
  onChange: (value: string) => void
  placeholder: string
  chipClass: string
}

export default function TagInput({ value, onChange, placeholder, chipClass }: Props) {
  const [draft, setDraft] = useState('')
  const tags = value.split(',').map(t => t.trim()).filter(Boolean)

  function add() {
    const tag = draft.replace(/,/g, '').trim()
    setDraft('')
    if (!tag || tags.some(t => t.toLowerCase() === tag.toLowerCase())) return
    onChange([...tags, tag].join(', '))
  }

  function remove(tag: string) {
    onChange(tags.filter(t => t !== tag).join(', '))
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && tags.length) {
            remove(tags[tags.length - 1])
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${chipClass}`}
            >
              {tag}
              <button
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
