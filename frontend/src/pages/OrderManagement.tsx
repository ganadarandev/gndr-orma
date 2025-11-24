import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { ordersAPI } from '../services/api'
import SpreadsheetView from '../components/SpreadsheetView'
import toast from 'react-hot-toast'

interface OrderRecord {
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

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [orderData, setOrderData] = useState<any[][]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [rowColors, setRowColors] = useState<{[key: number]: string}>({})
  const [rowTextColors, setRowTextColors] = useState<{[key: number]: string}>({})
  const [zoom, setZoom] = useState(100)

  const token = useAuthStore(state => state.token)

  // 발주 데이터를 스프레드시트 형태로 변환
  const convertOrdersToSpreadsheet = (orderResponse: any) => {
    if (!orderResponse || !orderResponse.orders || orderResponse.orders.length === 0) {
      setOrderData([])
      setColumns([])
      setRowColors({})
      setRowTextColors({})
      return
    }

    // 헤더 4행 + 발주 데이터 행 결합
    const headerRows = orderResponse.header_rows || []
    const dataRows = orderResponse.orders.map((order: any) => order.original_data || [])
    const allData = [...headerRows, ...dataRows]

    if (allData.length > 0 && allData[0] && allData[0].length > 0) {
      setOrderData(allData)
      setColumns(Array.from({ length: allData[0].length }, (_, i) => `Col${i + 1}`))

      // 행 색상은 기본 탭과 동일하게 유지
      setRowColors({})
      setRowTextColors({})
    }
  }

  // 발주 데이터 가져오기
  const fetchOrders = async (date: string) => {
    setLoading(true)
    try {
      const response = await ordersAPI.getOrdersByDate(date)

      if (response.success) {
        setOrders(response.orders)
        convertOrdersToSpreadsheet(response)
        if (response.orders.length > 0) {
          toast.success(`${response.orders.length}건의 발주 내역을 불러왔습니다`)
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch orders:', error)
      toast.error('발주 내역을 불러오는데 실패했습니다')
      // 빈 시트 생성
      convertOrdersToSpreadsheet(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(selectedDate)
  }, [selectedDate])

  // 날짜 변경 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 헤더 */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: 0 }}>발주 관리</h2>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* 날짜 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>발주 일자:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* 줌 컨트롤 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              -
            </button>
            <span style={{ minWidth: '60px', textAlign: 'center' }}>{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>

          {/* 새로고침 버튼 */}
          <button
            onClick={() => fetchOrders(selectedDate)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 발주 통계 */}
      {orders.length > 0 && (
        <div style={{
          marginBottom: '20px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>발주 통계</h3>
          <div style={{ display: 'flex', gap: '30px' }}>
            <div>
              <span style={{ color: '#666' }}>총 발주 건수:</span>
              <strong style={{ marginLeft: '10px', fontSize: '18px' }}>{orders.length}건</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>총 발주 금액:</span>
              <strong style={{ marginLeft: '10px', fontSize: '18px', color: '#4CAF50' }}>
                {orders.reduce((sum, o) => sum + (o.order_amount || 0), 0).toLocaleString('ko-KR')}원
              </strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>발주 유형:</span>
              <strong style={{ marginLeft: '10px' }}>
                {orders[0]?.order_type || '-'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 스프레드시트 뷰어 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          불러오는 중...
        </div>
      ) : orderData.length > 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <SpreadsheetView
            data={orderData}
            columns={columns}
            zoom={zoom}
            sheetName={`발주관리_${selectedDate}`}
            rowColors={rowColors}
            rowTextColors={rowTextColors}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: 'white',
          borderRadius: '8px',
          color: '#999'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            선택한 날짜에 발주 내역이 없습니다.
          </p>
          <p style={{ fontSize: '14px' }}>
            스프레드시트에서 항목을 체크하고 "발주 관리로 보내기"를 클릭하세요.
          </p>
        </div>
      )}
    </div>
  )
}

export default OrderManagement
