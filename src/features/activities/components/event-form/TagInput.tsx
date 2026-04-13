"use client"

import { useState } from "react"
import { X, Plus } from "lucide-react"

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")

  function addTag() {
    const t = input.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= 10) return
    onChange([...tags, t])
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-xl min-h-[42px] focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/8 bg-card">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-[11px] font-bold bg-muted text-zinc-700 rounded-full px-2 py-0.5">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? "Añadir etiquetas…" : ""}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-zinc-400"
      />
      {input && (
        <button type="button" onClick={addTag} className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <Plus className="size-3.5" />
        </button>
      )}
    </div>
  )
}
