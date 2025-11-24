import React from 'react'

/**
 * OrderDateModal 컴포넌트
 *
 * 발주 일자 선택 모달
 */

interface OrderDateModalProps {
  isOpen: boolean
  checkedCount: number
  selectedDate: string
  orderType: string
  onDateChange: (date: string) => void
  onTypeChange: (type: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export const OrderDateModal: React.FC<OrderDateModalProps> = ({
  isOpen,
  checkedCount,
  selectedDate,
  orderType,
  onDateChange,
  onTypeChange,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">발주 일자 선택</h2>
        <p className="text-sm text-gray-600 mb-4">
          체크된 {checkedCount}개 항목의 발주 일자를 선택하세요.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            발주 일자
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            발주 유형
          </label>
          <select
            value={orderType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="교환">교환</option>
            <option value="미송">미송</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
