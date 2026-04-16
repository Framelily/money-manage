import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import thTH from 'antd/locale/th_TH';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InstallmentsPage } from '@/pages/InstallmentsPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { DebtsPage } from '@/pages/DebtsPage';
import { PayoffPage } from '@/pages/PayoffPage';
import { DailyPage } from '@/pages/DailyPage';
import { DailyReportPage } from '@/pages/DailyReportPage';
import { ChoosePage } from '@/pages/ChoosePage';

export default function App() {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          fontFamily: "'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif",
          colorPrimary: '#4DA8DA',
        },
      }}
    >
      <AntApp>
        <ThemeProvider theme={theme}>
          <GlobalStyle />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/choose" element={<ChoosePage />} />
                  <Route path="/daily" element={<DailyPage />} />
                  <Route path="/daily/report" element={<DailyReportPage />} />
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/installments" element={<InstallmentsPage />} />
                    <Route path="/budget" element={<BudgetPage />} />
                    <Route path="/debts" element={<DebtsPage />} />
                    <Route path="/payoff" element={<PayoffPage />} />
                  </Route>
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </AntApp>
    </ConfigProvider>
  );
}
