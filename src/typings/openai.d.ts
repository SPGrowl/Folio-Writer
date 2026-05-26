export interface OpenAIRequest {
  model: string
  messages: Message[]
  temperature?: number
  top_p?: number
  extra_body?:ExtraBody
  reasoning_effort: boolean
}
export interface Message {
    role:"user" | "assistant" | "system"
    content:string
}
export interface ExtraBody {
    thinking?: { type: "enabled" | "disabled" }

}