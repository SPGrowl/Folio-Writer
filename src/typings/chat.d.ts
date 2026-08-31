declare namespace Chat {
	// 气泡数据
	interface Bubble {
		dateTime: string
		text: string | null
		error?: boolean
	}

	interface UserBubble extends Bubble {
		role: 'user'
	}

	interface AssistantBubble extends Bubble {
		role: 'assistant'
		reasoning_content?: string
	}

	// 单轮对话
	interface ChatTurn {
		turnIndex: number
		user: UserBubble
		assistant: AssistantBubble
	}

	interface Session {
		title: string
		uuid: number
		context: ChatTurn[]
		createTime?: string
	}

	interface SessionState {
		sessions: Session[]
		activeUuid: number | null
	}
}
