import { useState } from 'react'
import { ordersAPI } from '../services/api'
import toast from 'react-hot-toast'

export interface OrderRecord {
  id: number
  company_name: string
  order_type: string
  product_code: string
  product_name: string
  product_option: string
  unit_price: number
  order_qty: number
  order_amount: number
  status: string
  original_data: any[]
  created_at: string
}

export const useOrderData = () => {
  const [ordersByDate, setOrdersByDate] = useState<{[date: string]: OrderRecord[]}>({})
  const [loading, setLoading] = useState(false)

  const fetchOrdersByDate = async (date: string) => {
    setLoading(true)
    try {
      const response = await ordersAPI.getOrdersByDate(date)

      if (response.success) {
        setOrdersByDate(prev => ({
          ...prev,
          [date]: response.orders
        }))
        return response.orders
      }
      return []
    } catch (error: any) {
      console.error('Failed to fetch orders:', error)
      toast.error('발주 내역을 불러오는데 실패했습니다')
      return []
    } finally {
      setLoading(false)
    }
  }

  const saveOrderData = async (
    orderDate: string,
    companyName: string,
    orderType: string,
    items: any[]
  ) => {
    setLoading(true)
    try {
      const response = await ordersAPI.saveOrders({
        order_date: orderDate,
        company_name: companyName,
        order_type: orderType,
        items: items
      })

      if (response.success) {
        toast.success(response.message)
        // 저장 후 데이터 새로고침
        await fetchOrdersByDate(orderDate)
        return true
      }
      return false
    } catch (error: any) {
      console.error('Failed to save order:', error)
      toast.error(`발주 저장 실패: ${error.message}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    ordersByDate,
    loading,
    fetchOrdersByDate,
    saveOrderData
  }
}
