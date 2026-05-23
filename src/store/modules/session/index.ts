import { defineStore } from 'pinia'
import { defaultState, getLocalState, setLocalState } from './helper'
import { router } from '@/router'
import { t } from '@/locales'

export const useChatStore = defineStore('chat-store', {
	state: (): Chat.SessionState=> getLocalState(),
	actions:
		{
			addTurn(uuid: number, turn: Chat.ChatTurn) {
				const index = this.sessions.findIndex(item => item.uuid === uuid)
				if (index > -1) {
					this.sessions[index].context.push(turn)
				}
				this.recordState()
			},
			recordState() {
				setLocalState(this.$state)
			},
		}

})
