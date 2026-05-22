import { useChatStore } from '@/store'

export function useChat() {
  const chatStore = useChatStore()

  const getChatByUuidAndIndex = (uuid: number, index: number) => {
    return chatStore.getChatByUuidAndIndex(uuid, index)
  }

  // 根据UUID和对话内容在对话数组中追加
  // 形如：	interface Chat {
	// 	dateTime: string
	// 	text: string
	// 	inversion?: boolean
	// 	error?: boolean
	// 	loading?: boolean
	// 	conversationOptions?: ConversationRequest | null
	// 	requestOptions: { prompt: string; options?: ConversationRequest | null }
	// }
  // 
  const addChat = (uuid: number, chat: Chat.Chat) => {
    chatStore.addChatByUuid(uuid, chat)
  }

  const updateChat = (uuid: number, index: number, chat: Chat.Chat) => {
    chatStore.updateChatByUuid(uuid, index, chat)
  }

  const updateChatSome = (uuid: number, index: number, chat: Partial<Chat.Chat>) => {
    chatStore.updateChatSomeByUuid(uuid, index, chat)
  }

  return {
    addChat,
    updateChat,
    updateChatSome,
    getChatByUuidAndIndex,
  }
}
