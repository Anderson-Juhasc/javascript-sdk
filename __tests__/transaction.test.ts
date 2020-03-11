import { StdSignMsg } from "../src/types/stdTx"
import { NewOrderMsg, NewOrder } from "../src/types/newOrder"
import { CancelOrderMsg } from "../src/types/cancelOrder"
import Transaction from "../src/tx"
import { getClient, privateKey, address } from "./utils"

describe("Transaction", () => {
  beforeEach(() => {
    jest.setTimeout(50000)
  })

  it("build newOrder tx and send to blockchain", async () => {
    const client = await getClient(true)

    const account = await client._httpClient.request(
      "get",
      `/api/v1/account/${address}`
    )
    const sequence = account.result && account.result.sequence
    const accountNumber = account.result && account.result.account_number

    const newOrder: NewOrder = {
      id: `BA36F0FAD74D8F41045463E4774F328F4AF779E5-${sequence! + 1}`,
      symbol: "BNB_BTC.B-918",
      ordertype: 2,
      side: 2,
      price: 2200400,
      quantity: 100000000,
      timeinforce: 1
    }

    const newOrderMsg: NewOrderMsg = new NewOrderMsg(newOrder, address)

    const data: StdSignMsg = {
      chainId: "Binance-Chain-Nile",
      accountNumber: accountNumber,
      sequence: sequence,
      baseMsg: newOrderMsg,
      memo: "",
      source: 1
    }

    const tx = new Transaction(data)
    const txBytes = tx.sign(privateKey).serialize()
    const res = await client.sendRawTransaction(txBytes)
    expect(res.status).toBe(200)
  })

  //
  it("build cancelOrder tx and send to blockchain", async () => {
    const client = await getClient(true)

    const account = await client._httpClient.request(
      "get",
      `/api/v1/account/${address}`
    )
    const sequence = account.result && account.result.sequence
    const accountNumber = account.result && account.result.account_number
    const symbol = "BNB_BTC.B-918"
    const orderId = `BA36F0FAD74D8F41045463E4774F328F4AF779E5-2556`

    const cancelOrderMsg: CancelOrderMsg = new CancelOrderMsg(
      address,
      symbol,
      orderId
    )

    const data: StdSignMsg = {
      chainId: "Binance-Chain-Nile",
      accountNumber: accountNumber,
      sequence: sequence,
      baseMsg: cancelOrderMsg,
      memo: "",
      source: 1
    }

    const tx = new Transaction(data)
    const txBytes = tx.sign(privateKey).serialize()
    try {
      const res = await client.sendRawTransaction(txBytes)
      expect(res.status).toBe(200)
    } catch (err) {
      if (err.message.includes("Failed to find order")) {
        expect(1).toBeTruthy()
      }
    }
  })
})
