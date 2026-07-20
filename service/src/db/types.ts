export interface CreateTurnBody {
  sessionUuid: number
  title?: string
  turnIndex: number
  user: {
    text: string
    dateTime?: string
  }
  assistant?: {
    text?: string | null
    reasoning_content?: string
    error?: boolean
    dateTime?: string
  }
}

export interface ChatTurnRow {
  id: string
  session_id: string
  turn_index: number
  user_text: string
  user_datetime: Date
  assistant_text: string | null
  assistant_reasoning: string | null
  assistant_error: boolean
  assistant_datetime: Date | null
  created_at: Date
  updated_at: Date
}

export interface ChatSessionRow {
  id: string
  uuid: string
  title: string
  create_time: Date
  updated_at: Date
}

export interface CreateTurnResult {
  session: ChatSessionRow
  turn: ChatTurnRow
}
