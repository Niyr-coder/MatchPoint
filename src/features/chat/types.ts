export interface MessageSender {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

export interface Message {
  id: string
  content: string
  sender: MessageSender
  created_at: string
}

export interface ConversationParticipant {
  user: MessageSender
}

export interface Conversation {
  id: string
  type: string
  title: string | null
  club_id: string | null
  updated_at: string
  participants: ConversationParticipant[]
}

export interface ClubMember {
  userId: string
  fullName: string
  username: string
  avatarUrl: string | null
  role: string
}
