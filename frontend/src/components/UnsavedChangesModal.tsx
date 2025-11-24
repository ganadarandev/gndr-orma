import { AlertTriangle } from 'lucide-react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onSaveDraft: () => void
  onContinueWork: () => void
  onDiscard: () => void
}

export default function UnsavedChangesModal({
  isOpen,
  onSaveDraft,
  onContinueWork,
  onDiscard
}: UnsavedChangesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onContinueWork} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          작업 중입니다
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 text-center mb-6">
          저장하지 않은 변경사항이 있습니다.<br />
          어떻게 하시겠습니까?
        </p>

        {/* Buttons */}
        <div className="space-y-2">
          {/* Continue Working */}
          <button
            onClick={onContinueWork}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            작업 계속하기
          </button>

          {/* Save Draft */}
          <button
            onClick={onSaveDraft}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            중간 저장
          </button>

          {/* Discard Changes */}
          <button
            onClick={onDiscard}
            className="w-full px-4 py-2.5 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            종료 (변경사항 삭제)
          </button>
        </div>
      </div>
    </div>
  )
}
