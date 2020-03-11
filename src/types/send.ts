import { BaseMsg, Msg, SignMsg } from "./msg"
import * as crypto from "../crypto"
import { TxAminoPrefix } from "./stdTx"
import Big from "big.js"

export interface Coin {
  denom: string
  amount: number
}

export interface SignInputOutput {
  address: string
  coins: Coin[]
}

interface InputOutput {
  address: Buffer
  coins: Coin[]
}

export interface SignedSend extends SignMsg {
  inputs: SignInputOutput[]
  outputs: SignInputOutput[]
}

export interface SendData extends Msg {
  inputs: InputOutput[]
  outputs: InputOutput[]
  aminoPrefix: TxAminoPrefix
}

/**
 * Only support transfers of one-to-one, one-to-many
 */
export class SendMsg extends BaseMsg {
  private sender: string
  private outputs: SignInputOutput[]
  public readonly aminoPrefix: TxAminoPrefix = TxAminoPrefix.MsgSend
  constructor(sender: string, outputs: SignInputOutput[]) {
    super()
    this.sender = sender
    this.outputs = outputs
  }

  calInputCoins(inputsCoins: Coin[], coins: Coin[]) {
    coins.forEach(coin => {
      const existCoin = inputsCoins.find(c => c.denom === coin.denom)
      if (existCoin) {
        const existAmount = new Big(existCoin.amount)
        existCoin.amount = Number(existAmount.plus(coin.amount).toString())
      } else {
        inputsCoins.push({ ...coin })
      }
    })
  }

  getSignMsg() {
    const signMsg: SignedSend = {
      inputs: [{ address: this.sender, coins: [] }],
      outputs: this.outputs
    }

    this.outputs.forEach(item => {
      this.calInputCoins(signMsg.inputs[0].coins, item.coins)
    })

    return signMsg
  }

  getMsg() {
    const msg: SendData = {
      inputs: [{ address: crypto.decodeAddress(this.sender), coins: [] }],
      outputs: [],
      aminoPrefix: this.aminoPrefix
    }

    this.outputs.forEach(item => {
      this.calInputCoins(msg.inputs[0].coins, item.coins)

      const output: InputOutput = {
        address: crypto.decodeAddress(item.address),
        coins: item.coins
      }

      msg.outputs.push(output)
    })

    return msg
  }
}
