declare namespace OpenAI {
export interface OpenAIRequest {
  model: string
  messages: Message[]
  temperature?: number
  top_p?: number
  extra_body?:ExtraBody
  reasoning_effort:"high" | "max"
  stream:boolean
}
export interface Message {
    role:"user" | "assistant" | "system"
    content:string
}
export interface ExtraBody {
    thinking?: { type: "enabled" | "disabled" }

}
}