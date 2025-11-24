import React from 'react'

/**
 * PaymentDateModal 컴포넌트
 *
 * 입금 일자 선택 모달
 */

interface PaymentDateModalProps {
  isOpen: boolean
  checkedCount: number
  selectedDate: string
  onDateChange: (date: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export const PaymentDateModal: React.FC<PaymentDateModalProps> = ({
  isOpen,
  checkedCount,
  selectedDate,
  onDateChange,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">입금 일자 선택</h2>
        <p className="text-sm text-gray-600 mb-4">
          체크된 {checkedCount}개 항목의 입금 일자를 선택하세요.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            입금 일자
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
