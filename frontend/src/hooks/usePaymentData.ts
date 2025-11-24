import { useState } from 'react'
import { paymentAPI } from '../services/api'
import toast from 'react-hot-toast'

export interface PaymentRecord {
  id: number
  company_name: string
  product_code: string
  product_name: string
  product_option: string
  unit_price: number
  receipt_qty: number
  payment_amount: number
  original_data: any[]
  created_at: string
}

export const usePaymentData = () => {
  const [paymentsByDate, setPaymentsByDate] = useState<{[date: string]: any}>({})
  const [loading, setLoading] = useState(false)

  const fetchPaymentsByDate = async (date: string) => {
    setLoading(true)
    try {
      const response = await paymentAPI.getPaymentsByDate(date)

      if (response.success) {
        setPaymentsByDate(prev => ({
          ...prev,
          [date]: response
        }))
        return response
      }
    } catch (error: any) {
      console.error('Failed to fetch payments:', error)
      toast.error('입금 내역을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const savePaymentData = async (paymentDate: string, data: any[][], createdBy: string) => {
    setLoading(true)
    try {
      const response = await paymentAPI.savePaymentData({
        payment_date: paymentDate,
        data: data,
        created_by: createdBy
      })

      if (response.success) {
        toast.success(response.message)
        // 저장 후 데이터 새로고침
        await fetchPaymentsByDate(paymentDate)
        return true
      }
      return false
    } catch (error: any) {
      console.error('Failed to save payment:', error)
      toast.error(`입금 저장 실패: ${error.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    paymentsByDate,
    loading,
    fetchPaymentsByDate,
    savePaymentData
  }
}
