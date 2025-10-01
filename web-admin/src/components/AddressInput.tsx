import React, { useState } from 'react';
import AddressSearchModal from './AddressSearchModal';
interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}
const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = '주소를 입력하세요',
  style = {},
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    fontSize: '14px',
    ...style,
  };
  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: '8px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s',
  };
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  };
  const inputContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
  };
  const handleAddressSelect = (selectedAddress: string) => {
    onChange(selectedAddress);
    setIsModalOpen(false);
  };
  return (
    <>
      <div style={containerStyle}>
        <div style={inputContainerStyle}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={defaultStyle}
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={buttonStyle}
          disabled={disabled}
          onMouseEnter={(e) => {
            if (!disabled) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2980b9';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3498db';
            }
          }}
        >
          주소 검색
        </button>
      </div>
      <AddressSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAddressSelect}
      />
    </>
  );
};
export default AddressInput;
