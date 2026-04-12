export type NotificationType =
  | 'club_request_approved'
  | 'club_request_rejected'
  | 'team_invite'
  | 'system'
  | 'announcement'
  | 'event_created'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}
