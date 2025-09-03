// ThemeContextCustom.js
import React, { createContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export const ThemeContextCustom = createContext();

export default function ThemeContextCustomProvider({ children }) {
  const [isDark, setIsDark] = useState(localStorage.getItem('darkTheme') == '1');


  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
    }
  }), [isDark]);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('darkTheme');
      localStorage.setItem('darkTheme', '1'); 
    } else {
      document.body.classList.remove('darkTheme');
      localStorage.setItem('darkTheme', '0'); // tắt dark mode
    }
  }, [isDark]);

  return (
    <ThemeContextCustom.Provider value={{ isDark, toggleTheme }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContextCustom.Provider>
  );
}
