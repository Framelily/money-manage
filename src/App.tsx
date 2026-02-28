import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { InstallmentsPage } from '@/pages/InstallmentsPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { DebtsPage } from '@/pages/DebtsPage';

export default function App() {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          fontFamily: "'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif",
          colorPrimary: '#4f46e5',
        },
      }}
    >
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/installments" element={<InstallmentsPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/debts" element={<DebtsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ConfigProvider>
  );
}
