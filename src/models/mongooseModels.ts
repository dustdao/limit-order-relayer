import Mongoose from 'mongoose'
import { ILimitOrderModel, IWatchPairModel } from './models'
import { isLessThan } from '../utils/orderTokens'
import { getPairAddress } from '../utils/pairAddress'
import dotenv from 'dotenv'
dotenv.config()

require('mongoose-long')(Mongoose)

const Long = (Mongoose.Types as any).Long

const Schema = Mongoose.Schema

export const watchPairModel = new Schema({
  token0: {
    address: String,
    addressMainnet: String,
    decimals: Number,
    symbol: String,
  },
  token1: {
    address: String,
    addressMainnet: String,
    decimals: Number,
    symbol: String,
  },
  pairAddress: String,
})

export const limitOrderModel = new Schema(
  {
    price: String, // Long,
    digest: { type: String, unique: true },
    order: {
      maker: String,
      tokenIn: String,
      tokenOut: String,
      tokenInDecimals: Number,
      tokenOutDecimals: Number,
      amountIn: String,
      amountOut: String,
      recipient: String,
      startTime: Number,
      endTime: Number,
      stopPrice: String,
      oracleAddress: String,
      oracleData: String,
      v: Number,
      r: String,
      s: String,
      chainId: Number,
    },
    pairAddress: String,
    valid: Boolean,
  },
  { timestamps: true }
)

export const executedOrderModel = new Schema(
  {
    digest: String,
    order: {
      maker: String,
      tokenIn: String,
      tokenOut: String,
      tokenInDecimals: Number,
      tokenOutDecimals: Number,
      amountIn: String,
      amountOut: String,
      recipient: String,
      startTime: Number,
      endTime: Number,
      stopPrice: String,
      oracleAddress: String,
      oracleData: String,
      v: Number,
      r: String,
      s: String,
      chainId: Number,
    },
    fillAmount: String,
    txHash: { type: String, unique: true },
    status: Number, // -1 unknown, 0 failed, 1 passed
  },
  { timestamps: true }
)

export const orderCounterModel = new Schema({
  timestamp: Number,
  counter: Number,
})

watchPairModel.set('collection', `watchpairs_${process.env.CHAINID}`)
limitOrderModel.set('collection', `limitorders_${process.env.CHAINID}`)
executedOrderModel.set('collection', `executedorders_${process.env.CHAINID}`)
orderCounterModel.set('collection', `orderCounter_${process.env.CHAINID}`)

// middleware - execute before saving a "watch pair"
watchPairModel.pre<IWatchPairModel>('save', function (next) {
  // sort tokens so token0 < token1 always holds true
  if (!isLessThan(this.token0.address, this.token1.address)) {
    const tmp = { ...this.token0 }
    this.token0 = { ...this.token1 }
    this.token1 = tmp
  }

  this.pairAddress = getPairAddress(this.token0.address, this.token1.address)

  next()
})

limitOrderModel.pre<ILimitOrderModel>('save', function (next) {
  this.pairAddress = getPairAddress(this.order.tokenIn, this.order.tokenOut)

  const startTime = this.order.startTime.toString()
  const endTime = this.order.endTime.toString()

  this.order.startTime = parseInt(startTime)
  this.order.endTime = parseInt(endTime)

  if (this.price.toString()[0] == '-') throw new Error('Price overflow')
  if (this.order.startTime.toString() !== startTime) throw new Error('start time overflow')
  if (this.order.endTime.toString() !== endTime) throw new Error('end time overflow')

  next()
})
