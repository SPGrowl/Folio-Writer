declare namespace Chat {

	// 单段对话数据
	interface Chat {
		dateTime: string
		text: string
		inversion?: boolean
		error?: boolean
		loading?: boolean
		conversationOptions?: ConversationRequest | null
		requestOptions: { prompt: string; options?: ConversationRequest | null }
	}


	// 会话元数据
	interface History {
		title: string
		isEdit: boolean
		uuid: number
	}
// 会话数组

	interface ChatState {
		active: number | null
		usingContext: boolean;
		history: History[]
		//{ uuid: number; data: Chat[] }：单个会话的对话数组，包装一层data和uuid
		chat: { uuid: number; data: Chat[] }[]
	}

	// 气泡数据
	interface Bubble{
		dateTime: string
		text: string | null
		error?: boolean
	}
   interface UserBubble extends Bubble{
	   role:"user"
   }
   interface AssistantBubble extends Bubble{
	   role:"assistant"
	   reasoning_content?:string
   }

	// 单轮对话
	interface ChatTurn{
          turnIndex:number
          user:UserBubble
          assistant:AssistantBubble
	}

	// 新版会话数组

	interface Session{
		title:string
		uuid:number
		context:ChatTurn[]
		createTime?:string
	}
	// state
	interface SessionState {
		sessions: Session[]
		activeUuid: number | null
	}
// TODO：建议停用，对齐OpenAI格式
	interface ConversationRequest {
		conversationId?: string
		parentMessageId?: string
	}

	interface ConversationResponse {
		conversationId: string
		detail: {
			choices: { finish_reason: string; index: number; logprobs: any; text: string }[]
			created: number
			id: string
			model: string
			object: string
			usage: { completion_tokens: number; prompt_tokens: number; total_tokens: number }
		}
		id: string
		parentMessageId: string
		role: string
		text: string
	}
}
