'use client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ToastContainer } from '@/components/common/Toastr';
import { SessionProvider } from './SessionProvider';
import { I18nProvider } from './I18nProvider';


const theme = createTheme({
  palette: { primary: { main: '#673ab7' }, secondary: { main: '#ffd740' } },
  typography: { fontFamily: 'Roboto, "Helvetica Neue", sans-serif' },
});

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SessionProvider>
          <I18nProvider>
            {children}
            {/* ngx-toastr (timeOut 3000, bottom-right): see components/common/Toastr.jsx */}
            <ToastContainer />
          </I18nProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
