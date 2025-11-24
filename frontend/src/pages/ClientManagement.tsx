import { useState, useEffect } from 'react'
import { Upload, Search, Edit2, Trash2, X, Save, Building2, Phone, Mail, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { clientsAPI } from '../services/api'

interface Client {
  id: number
  code: string
  company_name: string
  user_id?: string
  manager_md?: string
  ceo_name?: string
  business_number?: string
  business_type?: string
  business_category?: string
  additional_code1?: string
  additional_code2?: string
  contact_person?: string
  postal_code?: string
  address?: string
  address_detail?: string
  phone?: string
  mobile?: string
  email?: string
  notes?: string
  group_name?: string
  account_number?: string
  bank_name?: string
  account_holder?: string
  balance?: number
  use_purchase_service?: number
  auto_calculate_receipt?: number
  is_disabled?: number
  total_order_count?: number
  total_payment_amount?: number
  success_order_count?: number
  last_order_date?: string
  last_payment_date?: string
  created_at: string
  updated_at: string
}

function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [includeDisabled, setIncludeDisabled] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedClient, setEditedClient] = useState<Client | null>(null)

  // 거래처 목록 로드
  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await clientsAPI.listClients(searchQuery || undefined, includeDisabled)
      // Cloud Functions에서는 success 필드 없이 바로 clients를 반환
      if (response.clients) {
        setClients(response.clients)
      }
    } catch (error: any) {
      toast.error('거래처 목록을 불러오는데 실패했습니다')
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [includeDisabled])

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 엑셀 파일 확인
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('엑셀 파일만 업로드 가능합니다')
      event.target.value = ''
      return
    }

    let loadingToast: string | number | undefined
    try {
      loadingToast = toast.loading('거래처 정보를 업로드 중...')
      const response = await clientsAPI.uploadClients(file)
      toast.dismiss(String(loadingToast))

      if (response.success) {
        toast.success(response.message)
        loadClients() // 목록 새로고침
      } else {
        toast.error(response.message || '업로드 실패')
      }
    } catch (error: any) {
      // 로딩 토스트 반드시 제거
      if (loadingToast) {
        toast.dismiss(String(loadingToast))
      }

      const errorMessage = error.response?.data?.detail || error.message || '알 수 없는 오류'
      toast.error('거래처 업로드 실패: ' + errorMessage)
      console.error('Error uploading clients:', error)
    } finally {
      // 파일 입력 초기화
      event.target.value = ''
    }
  }

  // 검색
  const handleSearch = () => {
    loadClients()
  }

  // 상세 보기
  const handleViewClient = async (client: Client) => {
    setSelectedClient(client)
    setEditedClient(client)
    setShowDetailModal(true)
    setEditMode(false)
  }

  // 수정 모드 토글
  const toggleEditMode = () => {
    if (editMode) {
      // 취소
      setEditedClient(selectedClient)
    }
    setEditMode(!editMode)
  }

  // 거래처 정보 수정
  const handleUpdateClient = async () => {
    if (!editedClient || !selectedClient) return

    try {
      const response = await clientsAPI.updateClient(selectedClient.id, editedClient)
      if (response.success) {
        toast.success('거래처 정보가 수정되었습니다')
        setShowDetailModal(false)
        setEditMode(false)
        loadClients()
      }
    } catch (error: any) {
      toast.error('수정 실패: ' + (error.response?.data?.detail || error.message))
      console.error('Error updating client:', error)
    }
  }

  // 거래처 삭제
  const handleDeleteClient = async (clientId: number) => {
    if (!confirm('이 거래처를 삭제하시겠습니까?')) return

    try {
      const response = await clientsAPI.deleteClient(clientId)
      if (response.success) {
        toast.success('거래처가 삭제되었습니다')
        setShowDetailModal(false)
        loadClients()
      }
    } catch (error: any) {
      toast.error('삭제 실패: ' + (error.response?.data?.detail || error.message))
      console.error('Error deleting client:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-7 w-7 mr-2 text-indigo-600" />
            거래처 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            거래처 코드(Code) 기준으로 정렬됩니다
          </p>
        </div>

        {/* 상단 액션 바 */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* 검색 */}
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="거래처 코드 또는 업체명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                검색
              </button>
            </div>

            {/* 필터 & 업로드 */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={includeDisabled}
                  onChange={(e) => setIncludeDisabled(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                사용안함 포함
              </label>

              {/* 파일 업로드 */}
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="h-4 w-4 mr-2" />
                엑셀 업로드
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">전체 거래처</div>
            <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">활성 거래처</div>
            <div className="text-2xl font-bold text-green-600">
              {clients.filter(c => !c.is_disabled).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">총 주문 건수</div>
            <div className="text-2xl font-bold text-blue-600">
              {clients.reduce((sum, c) => sum + (c.total_order_count || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">총 입금 금액</div>
            <div className="text-2xl font-bold text-indigo-600">
              {clients.reduce((sum, c) => sum + (c.total_payment_amount || 0), 0).toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 거래처 테이블 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2">로딩 중...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>거래처가 없습니다</p>
              <p className="text-sm mt-1">엑셀 파일을 업로드하여 거래처를 추가하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      거래처 코드
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      업체명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      담당자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주소
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 주문
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 입금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.company_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.contact_person || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.phone || client.mobile || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {client.address || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(client.total_order_count || 0).toLocaleString()}건
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(client.total_payment_amount || 0).toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.is_disabled ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            사용안함
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            활성
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewClient(client)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {showDetailModal && selectedClient && editedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">거래처 상세 정보</h2>
              </div>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={handleUpdateClient}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </button>
                    <button
                      onClick={toggleEditMode}
                      className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleEditMode}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteClient(selectedClient.id)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setEditMode(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      거래처 코드 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedClient.code}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업체명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedClient.company_name}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">담당MD</label>
                    <input
                      type="text"
                      value={editedClient.manager_md || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, manager_md: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">대표이사</label>
                    <input
                      type="text"
                      value={editedClient.ceo_name || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, ceo_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                    <input
                      type="text"
                      value={editedClient.business_number || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, business_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">업태/업종</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="업태"
                        value={editedClient.business_type || ''}
                        disabled={!editMode}
                        onChange={(e) => setEditedClient({ ...editedClient, business_type: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      />
                      <input
                        type="text"
                        placeholder="업종"
                        value={editedClient.business_category || ''}
                        disabled={!editMode}
                        onChange={(e) => setEditedClient({ ...editedClient, business_category: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 연락처 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-indigo-600" />
                  연락처 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">담당자명</label>
                    <input
                      type="text"
                      value={editedClient.contact_person || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                    <input
                      type="text"
                      value={editedClient.phone || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰번호</label>
                    <input
                      type="text"
                      value={editedClient.mobile || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, mobile: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      이메일
                    </label>
                    <input
                      type="email"
                      value={editedClient.email || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                    <input
                      type="text"
                      value={editedClient.address || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">상세주소</label>
                    <input
                      type="text"
                      value={editedClient.address_detail || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, address_detail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* 계좌 정보 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">계좌 정보</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">은행</label>
                    <input
                      type="text"
                      value={editedClient.bank_name || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, bank_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
                    <input
                      type="text"
                      value={editedClient.account_number || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">예금주</label>
                    <input
                      type="text"
                      value={editedClient.account_holder || ''}
                      disabled={!editMode}
                      onChange={(e) => setEditedClient({ ...editedClient, account_holder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* 통계 정보 (읽기 전용) */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">거래 통계</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">총 주문 건수</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {(selectedClient.total_order_count || 0).toLocaleString()}건
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">총 입금 금액</div>
                    <div className="text-2xl font-bold text-green-900">
                      {(selectedClient.total_payment_amount || 0).toLocaleString()}원
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-sm text-indigo-600 font-medium">정상처리 건수</div>
                    <div className="text-2xl font-bold text-indigo-900">
                      {(selectedClient.success_order_count || 0).toLocaleString()}건
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">마지막 주문 일자</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      {selectedClient.last_order_date || '-'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">마지막 입금 일자</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                      {selectedClient.last_payment_date || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea
                  value={editedClient.notes || ''}
                  disabled={!editMode}
                  onChange={(e) => setEditedClient({ ...editedClient, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientManagement
