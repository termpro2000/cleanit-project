import React, { useEffect, useState } from 'react';
interface AddressSearchResult {
  address: string;
  zonecode: string;
  addressType: string;
  bname: string;
  buildingName: string;
}
interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}
declare global {
  interface Window {
    daum: any;
  }
}
const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  useEffect(() => {
    if (isOpen) {
      const script = document.createElement('script');
      script.src =
        '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      document.head.appendChild(script);
      return () => {
        document.head.removeChild(script);
      };
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && isScriptLoaded && window.daum) {
      const element = document.getElementById('postcode-container');
      if (element) {
        new window.daum.Postcode({
          oncomplete: function (data: AddressSearchResult) {
            // 선택한 주소 정보 처리
            let fullAddress = data.address;
            let extraAddress = '';
            // 건물명이 있으면 추가
            if (data.buildingName !== '') {
              extraAddress += data.buildingName;
            }
            // 동/로가 있으면 추가
            if (data.bname !== '') {
              extraAddress +=
                extraAddress !== '' ? `, ${data.bname}` : data.bname;
            }
            // 최종 주소
            if (extraAddress !== '') {
              fullAddress += ` (${extraAddress})`;
            }
            onSelect(fullAddress);
            onClose();
          },
          onclose: function () {
            onClose();
          },
          width: '100%',
          height: '100%',
        }).embed(element);
      }
    }
  }, [isOpen, isScriptLoaded, onSelect, onClose]);
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          width: '500px',
          maxWidth: '90vw',
          height: '600px',
          maxHeight: '90vh',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <h3
            style={{
              margin: 0,
              color: '#333',
              fontSize: '18px',
              fontWeight: '600',
            }}
          >
            주소 검색
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        {!isScriptLoaded ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
              color: '#666',
            }}
          >
            주소 검색 로딩 중...
          </div>
        ) : (
          <div
            id="postcode-container"
            style={{
              width: '100%',
              height: '500px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}
          />
        )}
      </div>
    </div>
  );
};
export default AddressSearchModal;
