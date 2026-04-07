"use client"

import { createContext, useContext } from "react"
import type { UserRoleEntry } from "@/types"

interface RoleContextValue {
  availableRoles: UserRoleEntry[]
}

export const RoleContext = createContext<RoleContextValue>({ availableRoles: [] })

export function RoleContextProvider({
  children,
  availableRoles,
}: {
  children: React.ReactNode
  availableRoles: UserRoleEntry[]
}) {
  return (
    <RoleContext.Provider value={{ availableRoles }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRoleContext(): RoleContextValue {
  return useContext(RoleContext)
}
