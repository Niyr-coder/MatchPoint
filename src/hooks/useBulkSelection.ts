"use client"

import { useState, useCallback } from "react"

interface BulkSelectionState {
  selectedIds: Set<string>
  isAllSelected: boolean
  isIndeterminate: boolean
  toggleOne: (id: string) => void
  toggleAll: (ids: string[]) => void
  clearSelection: () => void
  selectedCount: number
}

export function useBulkSelection(allIds: string[]): BulkSelectionState {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (ids: string[]) => {
      setSelectedIds((prev) => {
        const allSelected = ids.every((id) => prev.has(id))
        if (allSelected) {
          // Deselect all from the current visible set
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        }
        // Select all
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = selectedIds.size
  const visibleSelected = allIds.filter((id) => selectedIds.has(id)).length
  const isAllSelected = allIds.length > 0 && visibleSelected === allIds.length
  const isIndeterminate = visibleSelected > 0 && visibleSelected < allIds.length

  return {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleOne,
    toggleAll,
    clearSelection,
    selectedCount,
  }
}
