import { useState } from 'react'

function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  required = false,
  autoComplete = 'current-password',
  id = '',
  className = '',
  disabled = false,
  autoFocus = false,
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`password-input ${className}`.trim()}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setShowPassword(prev => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? '👁️' : '🙈'}
      </button>
    </div>
  )
}

export default PasswordInput
