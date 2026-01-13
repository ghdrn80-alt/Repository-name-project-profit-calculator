import { useState, useRef, KeyboardEvent, FocusEvent } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  min?: number
  onTabFromLast?: () => void
}

function NumberInput({ value, onChange, placeholder = '0', min, onTabFromLast }: Props) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // value가 undefined/null이면 0으로 처리
  const safeValue = value ?? 0

  const formatNumber = (num: number): string => {
    if (num === 0 || num === undefined || num === null) return ''
    return num.toLocaleString('ko-KR')
  }

  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/[^0-9]/g, '')
    return cleaned ? parseInt(cleaned, 10) : 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseNumber(e.target.value)
    if (min !== undefined && parsed < min) {
      onChange(min)
    } else {
      onChange(parsed)
    }
  }

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    e.target.select()
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && !e.shiftKey && onTabFromLast) {
      onTabFromLast()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={isFocused ? (safeValue || '') : formatNumber(safeValue)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onTabFromLast ? handleKeyDown : undefined}
      onDragStart={(e) => e.preventDefault()}
      draggable={false}
      placeholder={placeholder}
    />
  )
}

export default NumberInput
