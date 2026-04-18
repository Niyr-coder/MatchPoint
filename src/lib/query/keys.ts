export const tournamentKeys = {
  all: () => ['tournaments'] as const,
  open: () => ['tournaments', 'open'] as const,
  mine: (userId: string) => ['tournaments', 'mine', userId] as const,
  detail: (id: string) => ['tournaments', id] as const,
}

export const bookingKeys = {
  all: () => ['bookings'] as const,
  user: (userId: string) => ['bookings', 'user', userId] as const,
  invites: (userId: string) => ['bookings', 'invites', userId] as const,
}

export const profileKeys = {
  all: () => ['profile'] as const,
  stats: (userId: string) => ['profile', 'stats', userId] as const,
  roles: (userId: string) => ['profile', 'roles', userId] as const,
}

export const adminKeys = {
  all: () => ['admin'] as const,
  users: () => ['admin', 'users'] as const,
  tournaments: () => ['admin', 'tournaments'] as const,
}
