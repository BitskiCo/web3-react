import { useState, useEffect, useContext, useReducer, useMemo } from 'react'

import Web3Context from './Web3Context'
import {
  getNetworkName, getEtherscanLink, getAccountBalance, getERC20Balance,
  signPersonal, sendTransaction, TRANSACTION_ERROR_CODES
} from './web3Utilities'

export function useWeb3Context () {
  return useContext(Web3Context)
}

export function useNetworkName (networkId) {
  const context = useWeb3Context()
  return useMemo(() => getNetworkName(networkId || context.networkId), [networkId, context.networkId])
}

export function useEtherscanLink (type, data, networkId) {
  const context = useWeb3Context()
  return useMemo(
    () => getEtherscanLink(networkId || context.networkId, type, data), [networkId, context.networkId, type, data]
  )
}

export function useAccountEffect(effect, depends = []) {
  const context = useWeb3Context()
  useEffect(effect, [...depends, context.networkId, context.account, context.reRenderers.accountReRenderer])
}

export function useNetworkEffect(effect, depends = []) {
  const context = useWeb3Context()
  useEffect(effect, [...depends, context.networkId, context.reRenderers.networkReRenderer])
}

export function useAccountBalance (address, {numberOfDigits = 3, format} = {}) {
  const context = useWeb3Context()
  const [ balance, setBalance ] = useState(undefined)

  useAccountEffect(() => {
    getAccountBalance(context.web3js, address || context.account, format)
      .then(balance =>
        setBalance(Number(balance).toLocaleString(undefined, { maximumFractionDigits: numberOfDigits }))
      )
  })

  return balance
}

export function useERC20Balance (ERC20Address, address, numberOfDigits = 3) {
  const context = useWeb3Context()
  const [ ERC20Balance, setERC20Balance ] = useState(undefined)

  useAccountEffect(() => {
    getERC20Balance(context.web3js, ERC20Address, address || context.account)
      .then(balance =>
        setERC20Balance(Number(balance).toLocaleString(undefined, { maximumFractionDigits: numberOfDigits }))
      )
  })

  return ERC20Balance
}

export function useSignPersonal () {
  const context = useWeb3Context()

  return function wrappedSignPersonal (message) {
    return signPersonal(context.web3js, context.account, message)
  }
}

const initialTransaction = {
  state: 'ready',
  data: {
    transactionHash:          undefined,
    transactionReceipt:       undefined,
    transactionConfirmations: undefined,
    transactionError:         undefined,
    transactionErrorCode:     undefined
  }
}

function transactionReducer (state, action) {
  switch (action.type) {
    case 'ready':
      return initialTransaction
    case 'sending':
      return { state: 'sending', data: initialTransaction.data }
    case 'pending':
      return { state: 'pending', data: { ...state.data, ...action.data } }
    case 'success':
      return { state: 'success', data: { ...state.data, ...action.data } }
    case 'error':
      return { state: 'error',   data: { ...state.data, ...action.data } }
    default:
      return initialTransaction
  }
}

export function useTransactionManager (method, { transactionOptions, maximumConfirmations } = {}) {
  const context = useWeb3Context()

  const [transaction, dispatch] = useReducer(transactionReducer, initialTransaction)

  const handlers = {
    transactionHash: transactionHash => dispatch({ type: 'pending', data: { transactionHash:    transactionHash } }),
    receipt: transactionReceipt =>      dispatch({ type: 'success', data: { transactionReceipt: transactionReceipt } }),
    confirmation: (transactionConfirmations, transactionReceipt) => {
      if (maximumConfirmations && transactionConfirmations <= maximumConfirmations) {
        dispatch({
          type: 'success',
          data: { transactionConfirmations: transactionConfirmations, transactionReceipt: transactionReceipt }
        })
      }
    }
  }

  function _sendTransaction () {
    dispatch({ type: 'sending' })
    sendTransaction(context.web3js, context.account, method, handlers, transactionOptions)
      .catch(error => {
        const transactionErrorCode = TRANSACTION_ERROR_CODES.includes(error.code) ? error.code : undefined
        dispatch({ type: 'error', data: { transactionError: error, transactionErrorCode: transactionErrorCode } })
      })
  }

  function resetTransaction () { dispatch({ type: 'ready' }) }

  return [transaction.state, transaction.data, _sendTransaction, resetTransaction, TRANSACTION_ERROR_CODES]
}
