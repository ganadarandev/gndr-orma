import React, { useState, useEffect } from 'react'
import { usePaymentData } from '../hooks/usePaymentData'
import { useSpreadsheet } from '../hooks/useSpreadsheet'
import SpreadsheetView from '../components/SpreadsheetView'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { paymentAPI } from '../services/api'
import toast from 'react-hot-toast'

const PaymentManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentData, setPaymentData] = useState<any[][]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [rowColors, setRowColors] = useState<{[key: number]: string}>({})
  const [rowTextColors, setRowTextColors] = useState<{[key: number]: string}>({})
  const [zoom, setZoom] = useState(100)
  const [companyTotals, setCompanyTotals] = useState<{[company: string]: number}>({})
  const [showTotals, setShowTotals] = useState(true)  // 거래처별 합계 접기/펼치기 상태
  const [payments, setPayments] = useState<any[]>([])  // 실제 입금 레코드 저장

  const { loading, fetchPaymentsByDate } = usePaymentData()
  const { checkedRows, handleCheckRow, toggleAllChecks, getCheckedCount, clearChecks } = useSpreadsheet()

  // 입금 데이터를 스프레드시트 형태로 변환
  const convertPaymentsToSpreadsheet = (paymentsData: any) => {
    if (!paymentsData || !paymentsData.payments || paymentsData.payments.length === 0) {
      setPaymentData([])
      setColumns([])
      setRowColors({})
      setRowTextColors({})
      setCompanyTotals({})
      setPayments([])
      return
    }

    // 헤더 4행 + 입금 데이터 행 결합
    const headerRows = paymentsData.header_rows || []
    const dataRows = paymentsData.payments.map((payment: any) => payment.original_data || [])
    const allData = [...headerRows, ...dataRows]

    if (allData.length > 0 && allData[0] && allData[0].length > 0) {
      setPaymentData(allData)
      setColumns(Array.from({ length: allData[0].length }, (_, i) => `Col${i + 1}`))

      // 행 색상은 기본 탭과 동일하게 유지
      setRowColors({})
      setRowTextColors({})
    }

    // 거래처별 합계 설정
    setCompanyTotals(paymentsData.company_totals || {})

    // 실제 레코드 저장 (삭제 시 ID 필요)
    setPayments(paymentsData.payments || [])
  }

  // 체크된 항목 삭제
  const deleteCheckedPayments = async () => {
    const checkedCount = getCheckedCount()
    if (checkedCount === 0) {
      toast.error('삭제할 항목을 선택해주세요')
      return
    }

    if (!confirm(`선택한 ${checkedCount}개 항목을 삭제하시겠습니까?`)) {
      return
    }

    try {
      // 체크된 행의 payment ID 수집 (헤더 4행 제외)
      const paymentIds: number[] = []
      for (let i = 4; i < paymentData.length; i++) {
        if (checkedRows[i]) {
          const paymentIndex = i - 4 // 헤더 4행 제외
          if (payments[paymentIndex]?.id) {
            paymentIds.push(payments[paymentIndex].id)
          }
        }
      }

      if (paymentIds.length === 0) {
        toast.error('삭제할 항목이 없습니다')
        return
      }

      const result = await paymentAPI.deletePaymentRecords(paymentIds)

      if (result.success) {
        toast.success(result.message)
        clearChecks()
        // 데이터 새로고침
        await fetchPayments(selectedDate)
      }
    } catch (error: any) {
      console.error('Failed to delete payments:', error)
      toast.error('삭제 중 오류가 발생했습니다')
    }
  }

  // 입금 데이터 가져오기
  const fetchPayments = async (date: string) => {
    const data = await fetchPaymentsByDate(date)
    if (data) {
      convertPaymentsToSpreadsheet(data)
      if (data.payments && data.payments.length > 0) {
        toast.success(`${data.payments.length}건의 입금 내역을 불러왔습니다`)
      }
    } else {
      convertPaymentsToSpreadsheet(null)
    }
  }

  useEffect(() => {
    fetchPayments(selectedDate)
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
        <h2 style={{ margin: 0 }}>입금 관리</h2>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* 날짜 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>입금 일자:</label>
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
            onClick={() => fetchPayments(selectedDate)}
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

          {/* 삭제 버튼 */}
          <button
            onClick={deleteCheckedPayments}
            disabled={loading || getCheckedCount() === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (loading || getCheckedCount() === 0) ? 'not-allowed' : 'pointer',
              opacity: (loading || getCheckedCount() === 0) ? 0.6 : 1
            }}
          >
            내역 삭제하기 ({getCheckedCount()})
          </button>
        </div>
      </div>

      {/* 스프레드시트 뷰어 - 제일 위로 이동 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          불러오는 중...
        </div>
      ) : paymentData.length > 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <SpreadsheetView
            data={paymentData}
            columns={columns}
            zoom={zoom}
            sheetName={`입금관리_${selectedDate}`}
            rowColors={rowColors}
            rowTextColors={rowTextColors}
            checkedRows={checkedRows}
            onCheckRow={handleCheckRow}
            onToggleAll={toggleAllChecks}
            enableCheckboxes={true}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          backgroundColor: 'white',
          borderRadius: '8px',
          color: '#999',
          marginBottom: '20px'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            선택한 날짜에 입금 내역이 없습니다.
          </p>
          <p style={{ fontSize: '14px' }}>
            스프레드시트에서 항목을 체크하고 "입금 관리로 보내기"를 클릭하세요.
          </p>
        </div>
      )}

      {/* 거래처별 합계 - 접기 기능 추가 */}
      {Object.keys(companyTotals).length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* 헤더 - 클릭하여 접기/펼치기 */}
          <div
            onClick={() => setShowTotals(!showTotals)}
            style={{
              padding: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8f9fa',
              borderBottom: showTotals ? '1px solid #e0e0e0' : 'none',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {showTotals ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              거래처별 입금 합계
            </h3>
            <span style={{ fontSize: '14px', color: '#666' }}>
              총 {Object.keys(companyTotals).length}개 업체
            </span>
          </div>

          {/* 내용 - 접기/펼치기 */}
          {showTotals && (
            <div style={{ padding: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {Object.entries(companyTotals).map(([company, total]) => (
                  <div
                    key={company}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>{company}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
                      {typeof total === 'number' ? total.toLocaleString('ko-KR') : total}원
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PaymentManagement
