import { curve } from "elliptic"
import * as crypto from "../crypto"
import * as encoder from "../encoder"
import { UVarInt } from "../encoder/varint"
import { BaseMsg, SignData, SignMsg } from "../types/msg"
import { StdSignMsg, StdSignature, StdTx, TxAminoPrefix } from "../types/stdTx"

/**
 * Creates a new transaction object.
 * @example
 * var rawTx = {
 *   account_number: 1,
 *   chain_id: 'bnbchain-1000',
 *   memo: '',
 *   msg: {},
 *   type: 'NewOrderMsg',
 *   sequence: 29,
 *   source: 0
 * };
 * var tx = new Transaction(rawTx);
 * @property {Buffer} raw The raw vstruct encoded transaction
 * @param {Number} data.account_number account number
 * @param {String} data.chain_id bnbChain Id
 * @param {String} data.memo transaction memo
 * @param {String} type transaction type
 * @param {Msg} data.msg object data of tx type
 * @param {Number} data.sequence transaction counts
 * @param {Number} data.source where does this transaction come from
 */
class Transaction {
  private sequence: NonNullable<StdSignMsg["sequence"]>
  private account_number: NonNullable<StdSignMsg["accountNumber"]>
  private chain_id: StdSignMsg["chainId"]
  private msg: NonNullable<BaseMsg>
  private memo: StdSignMsg["memo"]
  private source: NonNullable<StdSignMsg["source"]>
  private signatures: Array<StdSignature>

  constructor(data: StdSignMsg) {
    data = data || {}
    if (!data.chainId) {
      throw new Error("chain id should not be null")
    }

    if (!data.msg) {
      throw new Error("Transaction type should not be null")
    }

    this.sequence = data.sequence || 0
    this.account_number = data.accountNumber || 0
    this.chain_id = data.chainId
    this.msg = data.msg
    this.memo = data.memo
    this.source = data.source || 0 // default value is 0
    this.signatures = []
  }

  /**
   * generate the sign bytes for a transaction, given a msg
   * @param {Object} concrete msg object
   * @return {Buffer}
   **/
  getSignBytes(msg?: SignMsg) {
    msg = msg || this.msg.getSignMsg()
    const signMsg = {
      account_number: this.account_number.toString(),
      chain_id: this.chain_id,
      data: null,
      memo: this.memo,
      msgs: [msg],
      sequence: this.sequence.toString(),
      source: this.source.toString()
    }

    return encoder.convertObjectToSignBytes(signMsg)
  }

  /**
   * attaches a signature to the transaction
   * @param {Elliptic.PublicKey} pubKey
   * @param {Buffer} signature
   * @return {Transaction}
   **/
  addSignature(pubKey: curve.base.BasePoint, signature: Buffer) {
    const pubKeyBuf = this._serializePubKey(pubKey) // => Buffer
    this.signatures = [
      {
        pub_key: pubKeyBuf,
        signature: signature,
        account_number: this.account_number,
        sequence: this.sequence
      }
    ]
    return this
  }

  /**
   * sign transaction with a given private key and msg
   * @param {string} privateKey private key hex string
   * @param {Object} concrete msg object
   * @return {Transaction}
   **/
  sign(privateKey: string, msg?: SignMsg) {
    if (!privateKey) {
      throw new Error("private key should not be null")
    }

    const signBytes = this.getSignBytes(msg)
    const privKeyBuf = Buffer.from(privateKey, "hex")
    const signature = crypto.generateSignature(
      signBytes.toString("hex"),
      privKeyBuf
    )
    console.log("s: " + signature.toString("hex"))
    this.addSignature(crypto.generatePubKey(privKeyBuf), signature)
    return this
  }

  /**
   * encode signed transaction to hex which is compatible with amino
   * @param {object} opts msg field
   */
  serialize(): string {
    if (!this.signatures) {
      throw new Error("need signature")
    }

    const stdTx: StdTx = {
      msg: [this.msg.getMsg()],
      signatures: this.signatures,
      memo: this.memo,
      source: this.source, // sdk value is 0, web wallet value is 1
      data: "",
      aminoPrefix: TxAminoPrefix.StdTx
    }

    const bytes = encoder.marshalBinary(stdTx)
    return bytes.toString("hex")
  }

  /**
   * serializes a public key in a 33-byte compressed format.
   * @param {Elliptic.PublicKey} unencodedPubKey
   * @return {Buffer}
   */
  _serializePubKey(unencodedPubKey: curve.base.BasePoint) {
    let format = 0x2
    const y = unencodedPubKey.getY()
    const x = unencodedPubKey.getX()
    if (y && y.isOdd()) {
      format |= 0x1
    }
    let pubBz = Buffer.concat([
      UVarInt.encode(format),
      x.toArrayLike(Buffer, "be", 32)
    ])
    // prefixed with length
    pubBz = encoder.encodeBinaryByteArray(pubBz)
    // add the amino prefix
    pubBz = Buffer.concat([Buffer.from("EB5AE987", "hex"), pubBz])
    return pubBz
  }
}

// Transaction.TxTypes = TxTypes
// Transaction.TypePrefixes = TypePrefixes

// DEPRECATED: Retained for backward compatibility
// Transaction.txType = TxTypes
// Transaction.typePrefix = TypePrefixes

export default Transaction
