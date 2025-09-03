import { useState, useEffect } from 'react';

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Thiết lập một hẹn giờ
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Xóa hẹn giờ trước đó mỗi khi `value` hoặc `delay` thay đổi
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
export default useDebounce