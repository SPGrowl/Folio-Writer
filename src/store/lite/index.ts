import {defineStore} from "pinia";

interface liteState {
state:boolean
}
export const useLiteStore=defineStore(
	'lite-store',{
		state:():liteState=>({state:false}),
		actions:{
		changeLite(){
			this.state=!this.state
		}
		}
	}

)
