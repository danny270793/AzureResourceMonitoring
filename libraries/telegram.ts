import Axios, { AxiosRequestConfig } from "axios"

export default class Telegram {
    private readonly botToken: string
    
    constructor(botToken: string) {
        this.botToken = botToken
    }
  
    async sendMessage(chatId: string, message: string): Promise<void> {
        const axiosRequestConfig: AxiosRequestConfig = {
            method: 'POST',
            url: `https://api.telegram.org/bot${this.botToken}/sendMessage`,
            data: {
                  chat_id: chatId,
                  text: message,
              },
          }
      await Axios(axiosRequestConfig)
    }
} 
