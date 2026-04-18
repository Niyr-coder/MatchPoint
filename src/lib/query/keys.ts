export const tournamentKeys = {
  all: () => ['tournaments'] as const,
  open: () => [...tournamentKeys.all(), 'open'] as const,
  mine: (userId: string) => [...tournamentKeys.all(), 'mine', userId] as const,
  detail: (id: string) => [...tournamentKeys.all(), id] as const,
} as const

export const bookingKeys = {
  all: () => ['bookings'] as const,
  user: (userId: string) => [...bookingKeys.all(), 'user', userId] as const,
  invites: (userId: string) => [...bookingKeys.all(), 'invites', userId] as const,
} as const

export const profileKeys = {
  all: () => ['profile'] as const,
  stats: (userId: string) => [...profileKeys.all(), 'stats', userId] as const,
  roles: (userId: string) => [...profileKeys.all(), 'roles', userId] as const,
} as const

export const adminKeys = {
  all: () => ['admin'] as const,
  users: () => [...adminKeys.all(), 'users'] as const,
  tournaments: () => [...adminKeys.all(), 'tournaments'] as const,
} as const
