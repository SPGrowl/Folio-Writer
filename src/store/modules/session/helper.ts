import { ss } from '@/utils/storage'
import { t } from '@/locales'

const LOCAL_NAME = 'sessionStorage'

export function defaultState(): Chat.SessionState {
  const uuid = Date.now()
  return {
    activeUuid: uuid,
    sessions: [{
      uuid,
      title: t('chat.newChatTitle'),
      context: [],
      createTime: new Date().toISOString(),
    }],
  }
}

export function getLocalState(): Chat.SessionState {
  const localState = ss.get(LOCAL_NAME)
  return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.SessionState) {
  ss.set(LOCAL_NAME, state)
}
