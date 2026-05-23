import { ss } from '@/utils/storage'
import { t } from '@/locales'

const LOCAL_NAME = 'sessionStorage'

// 返回一个会话数组
export function defaultState(): Chat.SessionState {
	const uuid = 1002
	return {
		activeUuid: uuid,
		sessions:[]
	}
	}

export function getLocalState(): Chat.SessionState {
	const localState = ss.get(LOCAL_NAME)
	return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.SessionState) {
	ss.set(LOCAL_NAME, state)
}
